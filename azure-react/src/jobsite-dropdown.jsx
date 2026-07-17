import { useEffect, useState } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { authService } from "./authService.js";
import { graphConfig } from "./msal-config.jsx";
import {handleDriveId} from "./handleDriveId.jsx";
import pathManager from "./pathmanager.js";
import subfolderTabs from "./subfolder-tabs.jsx";
//import {graphFetch, listFolderChildren} from "./oneDriveService.js"

// Folder that contains the jobsite subfolders (from env via msal-config)
const FOLDER_ID = graphConfig.jobsitesFolderId;

/**
 * Builds a Microsoft Graph URL that lists children of a OneDrive path.
 *
 * Graph path syntax:
 *   root children     → /me/drive/root/children
 *   named folder      → /me/drive/root:/project:/children
 *   nested folder     → /me/drive/root:/Documents/Jobs:/children
 *
 * @param {string} folderPath  Path relative to OneDrive root ("" = root itself)
 */
async function childrenUrl() {

  
  //console.log("Drive ID:", driveId);
  return `https://graph.microsoft.com/v1.0/drives/${graphConfig.driveId}/items/${FOLDER_ID}/children`;
}
async function pathUrl() {

  
  return `https://graph.microsoft.com/v1.0/drives/${graphConfig.driveId}/items/${FOLDER_ID}`;
}
/**
 * JobsiteDropdown
 * ---------------
 * UI for:
 *   1. Signing in (when MSAL has no account)
 *   2. Loading jobsite folder names from OneDrive via Microsoft Graph
 *   3. Letting the user pick a folder (notifies parent via onFolderSelect)
 *
 * Auth vs data:
 *   - Sign-in state comes from @azure/msal-react hooks (MsalProvider in main.jsx)
 *   - Tokens and redirect login go through authService
 *   - Folder listing is plain fetch() to Graph with the Bearer token
 *
 * Props:
 *   onFolderSelect(folderName) — optional callback when the user picks a jobsite
 */
export default function JobsiteDropdown({ onFolderSelect }) {
  // accounts: cached signed-in users from the shared MSAL instance
  const { accounts } = useMsal();
  // true once MSAL reports at least one account (updates after redirect return)
  const isAuthenticated = useIsAuthenticated();

  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("Select Jobsite");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Soft message when configured path is missing but root folders still load
  const [warning, setWarning] = useState(null);
  const [signingIn, setSigningIn] = useState(false);


  
  // When login completes (including after redirect back to /), load folders once.
  useEffect(() => {
    if (isAuthenticated && accounts.length > 0) {
      loadFolders();
    }
  }, [isAuthenticated, accounts]);

  /**
   * GET children of a OneDrive folder; return folder names only (not files).
   * Throws an Error with .status / .body / .url attached on Graph failures.
   */
  async function fetchFolderNames(accessToken, folderPath) {
    const url = await childrenUrl();
    //console.log("[JobsiteDropdown] Graph GET", url);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    //console.log(response);
    if (!response.ok) {
      const body = await response.text();
      const err = new Error(`Graph API error: ${response.status}`);
      err.status = response.status;
      err.body = body;
      err.url = url;
      throw err;
    }
    
    const data = await response.json();
    // Graph returns files and folders mixed; keep folders for the jobsite list.
    return (data.value || [])
      .filter((item) => item.folder)
      .map((item) => item.name);
  }

  /**
   * Load jobsite folders from graphConfig.jobsitesFolderPath.
   * If that path 404s, fall back to OneDrive root so the UI still works.
   */
  async function loadFolders() {
    setLoading(true);
    setError(null);
    setWarning(null);

    try {
      // May return null if a redirect login/token flow was just triggered.
      const accessToken = await authService.getAccessToken();
      if (!accessToken) return;

      const configuredPath = childrenUrl();

      try {
        const folderNames = await fetchFolderNames(accessToken, configuredPath);
        setFolders(folderNames);
      } catch (err) {
        if (err.status === 404 && configuredPath) {
          // e.g. "project" does not exist yet under OneDrive root
          console.warn(
            `[JobsiteDropdown] Folder "${configuredPath}" not found. Listing OneDrive root instead.`
          );
          const rootFolders = await fetchFolderNames(accessToken, "");
          setFolders(rootFolders);
          setWarning(
            `OneDrive folder "/${configuredPath}" was not found. Showing root folders instead. ` +
              `Create that folder or change jobsitesFolderPath in msal-config.jsx.`
          );
        } else {
          throw err;
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Kicks off loginRedirect. The page navigates away to Microsoft;
   * when the user returns, isAuthenticated becomes true and useEffect loads folders.
   */
  async function handleLogin() {
    setSigningIn(true);
    setError(null);
    try {
      await authService.login();
    } catch (err) {
      console.error("Login failed:", err);
      setError(err.message || "Login failed");
      setSigningIn(false);
    }
  }

  

  /** Remember selection locally and notify a parent (images/upload) if provided. */
  async function handleSelect(folder) {
    setSelectedFolder(folder);
    const MainUrl = `${await pathUrl()}:/${folder}:/children`.replaceAll(' ', '%20'); // Assuming the folder is directly under the root
    //console.log("Selected jobsite folder:", folder);
    window.dispatchEvent(new CustomEvent("pathChanged", { detail:  MainUrl }));
    pathManager.Path = MainUrl; // Store the URL of the jobsite folder for later use
    onFolderSelect?.(folder);
  }

  // ----- Render states: signed out → loading → error → dropdown -----

  if (!isAuthenticated) {
    return (
      <div className="JobsiteDropdown">
        <button
          className="btn btn-primary"
          onClick={handleLogin}
          disabled={signingIn}
        >
          {signingIn ? "Redirecting to Microsoft…" : "Sign in with Microsoft"}
        </button>
        {error && <div className="text-danger mt-2">{error}</div>}
      </div>
    );
  }

  if (loading) {
    return <div>Loading jobsites...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="JobsiteDropdown">
      {warning && <div className="text-warning mb-2">{warning}</div>}
      <Dropdown>
        <Dropdown.Toggle variant="success" id="dropdown-basic">
          {selectedFolder}
        </Dropdown.Toggle>

        <Dropdown.Menu>
          {folders.length === 0 ? (
            <Dropdown.Item disabled>No folders found</Dropdown.Item>
          ) : (
            folders.map((folder) => (
              <Dropdown.Item key={folder} onClick={() => handleSelect(folder)}>
                {folder}
              </Dropdown.Item>
            ))
          )}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
}
