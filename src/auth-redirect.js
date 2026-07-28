/**
 * auth-redirect.js
 * ----------------
 * Script loaded ONLY by auth.html (the SPA redirect URI registered in Entra).
 *
 * Why this page exists:
 *   Entra is configured with redirect URI http://localhost:5173/auth.html
 *   After Microsoft signs the user in, the browser lands HERE with ?code=...
 *   (or hash params), not on the main React app.
 *
 * What MSAL 5 expects:
 *   This page must call broadcastResponseToMainFrame() from
 *   @azure/msal-browser/redirect-bridge. That helper:
 *     - Reads the OAuth response from the URL
 *     - For loginRedirect: caches it and navigates back to the main app (/)
 *     - For popup flows: BroadcastChannels the payload and closes the window
 *
 * The main app then runs authService.initialize() → handleRedirectPromise()
 * which completes token exchange and stores the signed-in account.
 *
 * Do NOT mount the full React app on this page — keep it lightweight.
 */
import { broadcastResponseToMainFrame } from "@azure/msal-browser/redirect-bridge";

const statusEl = document.getElementById("status");
const debugEl = document.getElementById("debug");

/** Console + on-page logger so you can debug without DevTools if needed. */
function log(...parts) {
  const line = parts
    .map((p) => (typeof p === "string" ? p : JSON.stringify(p, null, 2)))
    .join(" ");
  console.log("[auth-redirect]", ...parts);
  if (debugEl) {
    debugEl.textContent += `${line}\n`;
  }
}

// --- Startup diagnostics (safe: only short previews of secrets) ---
log("loaded");
log("href:", window.location.href);
log("search:", window.location.search || "(empty)");
log("hash:", window.location.hash || "(empty)");
log("has opener:", Boolean(window.opener)); // true if opened as a popup

// Normalize hash/query (strip leading # or ?) for URLSearchParams parsing.
const hash = window.location.hash.startsWith("#")
  ? window.location.hash.slice(1)
  : window.location.hash;
const query = window.location.search.startsWith("?")
  ? window.location.search.slice(1)
  : window.location.search;

// True when Microsoft (or an error) actually sent an OAuth payload back.
const hasAuthResponse =
  /[?#&](code|error|access_token|id_token|client_info)=/.test(
    window.location.href
  ) ||
  new URLSearchParams(hash).has("code") ||
  new URLSearchParams(query).has("code") ||
  new URLSearchParams(hash).has("error") ||
  new URLSearchParams(query).has("error");

log("hasAuthResponse:", hasAuthResponse);

// Log parameter NAMES and short value previews (never full auth codes).
for (const [label, raw] of [
  ["hash params", hash],
  ["query params", query],
]) {
  if (!raw) continue;
  const params = new URLSearchParams(raw);
  const keys = [...params.keys()];
  log(`${label} keys:`, keys);
  for (const key of keys) {
    const value = params.get(key) || "";
    const preview =
      value.length > 12 ? `${value.slice(0, 8)}…(${value.length} chars)` : value;
    log(`  ${key}:`, preview);
  }
}

/**
 * Main entry: either bounce home (logout / empty visit) or finish the login.
 */
async function run() {
  // Logout redirect and direct visits hit auth.html with no code/error.
  // Send the user back to the React app instead of showing an empty page.
  if (!hasAuthResponse) {
    statusEl.textContent = "No auth response — returning to app…";
    log("no auth response; redirecting to /");
    window.location.replace("/");
    return;
  }

  try {
    statusEl.textContent = "Completing sign-in…";
    log("calling broadcastResponseToMainFrame()");

    // Hands the auth response off to MSAL / the main window, then navigates.
    await broadcastResponseToMainFrame();

    statusEl.textContent = "Sign-in processed. Returning to app…";
    log("broadcastResponseToMainFrame() resolved");

    // Safety net: if the bridge didn't navigate away for some reason,
    // force the user back to the app after a short delay.
    if (!window.opener) {
      setTimeout(() => {
        if (window.location.pathname.includes("auth.html")) {
          log("still on auth.html — forcing redirect to /");
          window.location.replace("/");
        }
      }, 1500);
    }
  } catch (err) {
    statusEl.textContent = "Auth redirect failed — see debug below.";
    log("ERROR name:", err?.name);
    log("ERROR code:", err?.errorCode || "(none)");
    log("ERROR message:", err?.message || String(err));
  }
}

run();
