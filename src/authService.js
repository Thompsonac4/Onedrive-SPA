import { PublicClientApplication, InteractionRequiredAuthError } from "@azure/msal-browser";
import { msalConfig, loginRequest } from "./msal-config.jsx";

// MSAL stores this key while a login/logout redirect is in flight.
// If a previous attempt is interrupted, the flag can get stuck and block new logins.
const INTERACTION_STATUS_KEY = "msal.interaction.status";

function debug(...args) {
  console.log("[authService]", ...args);
}

/**
 * AuthService
 * -----------
 * Single place for Microsoft sign-in and Graph access tokens.
 *
 * MSAL only handles authentication (who is the user + tokens).
 * OneDrive/file APIs are called separately with the token from getAccessToken().
 *
 * Typical lifecycle:
 *   1. main.jsx calls authService.initialize() once at startup
 *   2. JobsiteDropdown (or any UI) calls login() when the user is signed out
 *   3. After Microsoft redirects back through /auth.html, initialize()'s
 *      handleRedirectPromise() finishes the login and caches the account
 *   4. Components call getAccessToken() before any Microsoft Graph request
 *
 * Export is a singleton (`authService`) so every module shares one MSAL instance.
 */
class AuthService {
  constructor() {
    // PublicClientApplication is the MSAL browser client for SPA apps.
    this.pca = new PublicClientApplication(msalConfig);
    // Prevents initialize() from running twice after the first successful boot.
    this.ready = false;
  }

  /**
   * Must run once before render (see main.jsx).
   * - Boots MSAL
   * - Completes any pending redirect login (account + tokens into cache)
   * - Picks an active account if one already exists from a prior visit
   * Returns the pca instance for <MsalProvider instance={pca}>.
   */
  async initialize() {
    if (this.ready) {
      debug("initialize() skipped — already ready");
      return this.pca;
    }

    debug("initialize() start");
    debug("href:", window.location.href);
    debug("redirectUri:", msalConfig.auth.redirectUri);

    // Required in MSAL Browser 3+/5+ before any other API calls.
    await this.pca.initialize();
    debug("pca.initialize() done");

    // After loginRedirect, Microsoft eventually returns the user to the app.
    // /auth.html stages the auth response; this call consumes it (or a cached
    // copy) and creates the signed-in account in localStorage.
    try {
      const redirectResult = await this.pca.handleRedirectPromise();
      if (redirectResult?.account) {
        debug("handleRedirectPromise account:", redirectResult.account.username);
        // Active account is the one silent token calls will use by default.
        this.pca.setActiveAccount(redirectResult.account);
      } else {
        debug("handleRedirectPromise(): null");
      }
    } catch (err) {
      console.error("[authService] handleRedirectPromise failed:", err);
      this.#clearAuthParamsFromUrl();
      this.#clearInteractionInProgress();
      // Do not rethrow — app should still load so the user can try again.
    }

    const accounts = this.pca.getAllAccounts();
    debug(
      "accounts after init:",
      accounts.map((a) => a.username)
    );

    // Returning visitor: tokens/accounts survive in localStorage across reloads.
    if (accounts.length > 0 && !this.pca.getActiveAccount()) {
      this.pca.setActiveAccount(accounts[0]);
      debug("setActiveAccount:", accounts[0].username);
    }

    this.ready = true;
    debug("initialize() complete, authenticated:", this.isAuthenticated());
    return this.pca;
  }

  /** Removes a stuck "login already in progress" lock from browser storage. */
  #clearInteractionInProgress() {
    try {
      localStorage.removeItem(INTERACTION_STATUS_KEY);
      sessionStorage.removeItem(INTERACTION_STATUS_KEY);
    } catch {
      // ignore storage access errors (private mode quirks, etc.)
    }
  }

  /**
   * Strips leftover OAuth params (?code= / #code=) from the address bar.
   * Useful if a failed redirect left junk in the URL.
   */
  #clearAuthParamsFromUrl() {
    const url = new URL(window.location.href);
    const hadHashAuth =
      url.hash.includes("code=") ||
      url.hash.includes("error=") ||
      url.hash.includes("client_info=");
    const hadQueryAuth =
      url.searchParams.has("code") ||
      url.searchParams.has("error") ||
      url.searchParams.has("client_info");

    if (hadHashAuth || hadQueryAuth) {
      debug("clearing auth params from URL");
      window.history.replaceState({}, document.title, url.pathname);
    }
  }

  /** Raw MSAL client — pass this to MsalProvider. */
  getInstance() {
    return this.pca;
  }

  /** Currently signed-in account, or null. */
  getAccount() {
    return this.pca.getActiveAccount() || this.pca.getAllAccounts()[0] || null;
  }

  /** True when at least one account is in the MSAL cache. */
  isAuthenticated() {
    return !!this.getAccount();
  }

  /**
   * True when the app is running inside an iframe (e.g. a phone previewer
   * extension). Redirect-based auth can't work in an iframe because Microsoft's
   * login page refuses to be framed, so we fall back to a popup there.
   */
  #inIframe() {
    try {
      return window.self !== window.top;
    } catch {
      // Cross-origin access to window.top throws → we are framed
      return true;
    }
  }

  /**
   * Starts interactive sign-in.
   * - Top-level window: full-page redirect (user leaves tab → /auth.html → back)
   * - Inside an iframe (previewer): popup, which opens a top-level window and
   *   escapes the frame so Microsoft's login page can render.
   */
  async login() {
    await this.initialize();
    this.#clearInteractionInProgress();

    if (this.#inIframe()) {
      debug("loginPopup() starting (in iframe)… scopes:", loginRequest.scopes);
      const response = await this.pca.loginPopup(loginRequest);
      if (response?.account) {
        this.pca.setActiveAccount(response.account);
      }
      return response;
    }

    debug("loginRedirect() starting… scopes:", loginRequest.scopes);
    await this.pca.loginRedirect(loginRequest);
  }

  /**
   * Signs the user out and clears the local MSAL session.
   * Uses popup when framed (see #inIframe), redirect otherwise.
   */
  async logout() {
    await this.initialize();
    this.#clearInteractionInProgress();
    const account = this.getAccount();
    debug("logout for", account?.username);

    if (this.#inIframe()) {
      await this.pca.logoutPopup({ account: account || undefined });
      return;
    }

    await this.pca.logoutRedirect({ account: account || undefined });
  }

  /**
   * Returns a Bearer token for Microsoft Graph (OneDrive, profile, etc.).
   *
   * Strategy:
   *   1. If not signed in → kick off loginRedirect and return null
   *   2. Try acquireTokenSilent (no UI; uses cached refresh token)
   *   3. If consent/reauth needed → acquireTokenRedirect and return null
   *
   * Callers must treat null as "redirect in progress; stop this request".
   */
  async getAccessToken(scopes = loginRequest.scopes) {
    await this.initialize();

    const account = this.getAccount();
    if (!account) {
      debug("getAccessToken: no account, starting loginRedirect");
      await this.login();
      return null;
    }

    const tokenRequest = { scopes, account };
    debug("getAccessToken silent for", account.username, scopes);

    try {
      const silent = await this.pca.acquireTokenSilent(tokenRequest);
      debug("acquireTokenSilent ok");
      return silent.accessToken;
    } catch (err) {
      debug("acquireTokenSilent failed:", err?.errorCode || err?.message);
      // Expired session, missing consent, or Conditional Access — need interaction.
      if (err instanceof InteractionRequiredAuthError) {
        if (this.#inIframe()) {
          // Popup works inside a framed previewer; redirect does not
          debug("acquireTokenPopup…");
          const interactive = await this.pca.acquireTokenPopup(tokenRequest);
          return interactive.accessToken;
        }
        debug("acquireTokenRedirect…");
        await this.pca.acquireTokenRedirect(tokenRequest);
        return null;
      }
      throw err;
    }
  }
}

// Shared singleton — import { authService } from "./authService.js"
export const authService = new AuthService();
