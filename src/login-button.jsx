import { useState } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { authService } from "./authService.js";

/** True when running inside an iframe (e.g. a phone previewer extension). */
function inIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * LoginButton
 * -----------
 * Top-right sign-in / sign-out control.
 *
 * Auth can't run inside a previewer that iframes the app and blocks popups
 * (Microsoft's login page can't be framed, and popups get blocked). In that
 * case we offer a link to open the app in a real browser tab, where the normal
 * redirect flow works.
 */
export default function LoginButton() {
  const isAuthenticated = useIsAuthenticated();
  const { accounts } = useMsal();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  // Show a "open in browser" fallback if popup/redirect can't run here
  const [needsBrowser, setNeedsBrowser] = useState(false);

  async function handleLogin() {
    setError(null);

    if (!window.isSecureContext || !window.crypto?.subtle) {
      setError(
        "This page isn't running in a secure context, so Microsoft login is blocked. " +
          "Open the app over https:// (or localhost) and try again."
      );
      return;
    }

    setBusy(true);
    try {
      await authService.login();
    } catch (err) {
      console.error("Login failed:", err);
      setBusy(false);

      // Popup blocked or redirect blocked inside a previewer iframe
      if (
        err?.errorCode === "popup_window_error" ||
        err?.errorCode === "redirect_in_iframe" ||
        err?.errorCode === "block_iframe_reload" ||
        inIframe()
      ) {
        setNeedsBrowser(true);
        setError(null);
      } else {
        setError(err?.errorMessage || err?.message || "Login failed. Please try again.");
      }
    }
  }

  async function handleLogout() {
    setError(null);
    setBusy(true);
    try {
      await authService.logout();
    } catch (err) {
      console.error("Logout failed:", err);
      setBusy(false);
      setError(err?.errorMessage || err?.message || "Logout failed.");
    }
  }

  if (isAuthenticated) {
    return (
      <div className="login-area">
        <span className="login-user">{accounts[0]?.username}</span>
        <button
          className="btn btn-outline-secondary"
          onClick={handleLogout}
          disabled={busy}
        >
          Sign out
        </button>
      </div>
    );
  }

  // Fallback: open the app top-level in a real browser tab to sign in
  if (needsBrowser || inIframe()) {
    return (
      <div className="login-area">
        <a
          className="btn btn-primary login-btn"
          href={window.location.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in browser to sign in
        </a>
        <div className="login-hint">
          Sign-in can’t run inside the preview. Open the app in a real browser
          tab (this link) to log in.
        </div>
      </div>
    );
  }

  return (
    <div className="login-area">
      <button
        className="btn btn-primary login-btn"
        onClick={handleLogin}
        disabled={busy}
      >
        {busy ? "Redirecting…" : "Sign in with Microsoft"}
      </button>
      {error && <div className="login-error">{error}</div>}
    </div>
  );
}
