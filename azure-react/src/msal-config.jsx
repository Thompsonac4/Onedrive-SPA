const origin = window.location.origin;

/**
 * All tenant-specific / auth values come from environment variables so no
 * secrets are committed to git. See .env.example for the list of variables.
 * Vite only exposes variables prefixed with VITE_ to the browser.
 */
const env = import.meta.env;

const clientId = env.VITE_MSAL_CLIENT_ID;
const authority =
  env.VITE_MSAL_AUTHORITY || "https://login.microsoftonline.com/common";

if (!clientId) {
  console.warn(
    "[msal-config] VITE_MSAL_CLIENT_ID is not set. Copy .env.example to .env and fill it in."
  );
}

export const msalConfig = {
  auth: {
    clientId,
    authority,
    // Must match Entra SPA redirect URI exactly
    redirectUri: `${origin}/auth.html`,
    // Same registered SPA URI (your Entra app only lists auth.html)
    postLogoutRedirectUri: `${origin}/auth.html`,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ["User.Read", "Files.ReadWrite.All", "Sites.ReadWrite.All"],
};

export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
  graphDriveRoot: "https://graph.microsoft.com/v1.0/me/drive/root",
  // Target OneDrive/SharePoint drive and the folder that holds the jobsites
  driveId: env.VITE_DRIVE_ID,
  jobsitesFolderId: env.VITE_JOBSITES_FOLDER_ID,
  jobsitesFolderPath: env.VITE_JOBSITES_FOLDER_PATH || "Projects",
};
