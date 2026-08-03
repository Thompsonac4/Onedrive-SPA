import { useEffect, useState } from "react";
import { Tab } from "react-bootstrap";
import Tabs from "react-bootstrap/Tabs";
import Button from '@mui/material/Button';
import { useIsAuthenticated } from "@azure/msal-react";
import { authService } from "@/auth/authService.js";
import pathManager from "@/services/pathmanager.js";
import { sortFoldersByName } from "@/services/folder-name-sort.js";

/**
 * JobsiteDropdown
 * ---------------
 * Finds job folders the signed-in user can access, including folders shared
 * directly with the user. Parent folders do not need to be accessible.
 */
export default function SubfolderTabs() {
  const isAuthenticated = useIsAuthenticated();

  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [uploadPermission, setUploadPermission] = useState(false);
  const [showNoFolders, setShowNoFolders] = useState(false);
  const driveID = import.meta.env.VITE_DRIVE_ID;

//   useEffect(() => {
//     if (isAuthenticated) {
//       loadFolders();
//     }
//   }, [isAuthenticated]);

 //Event Handler to reload the images depending on what the Jobsite and Folder Selection has been changed
  useEffect(() => {
    if (authService.isAuthenticated()) {
        loadFolders();
    }

    async function reloadFolders() {
      await loadFolders();
    }

    window.addEventListener("pathChanged", reloadFolders);
    window.addEventListener("dateAdded", reloadFolders);
    return () => {
      window.removeEventListener("pathChanged", reloadFolders);
      window.removeEventListener("dateAdded", reloadFolders);
    };
  }, []);

  async function loadFolders() {
    setLoading(true);
    setError(null);

    try {
      const accessToken = await authService.getAccessToken();
      if (!accessToken) return;
        //Response fetch
      const url = `https://graph.microsoft.com/v1.0/drives/${driveID}/items/${pathManager.folderId}/children`;
      const response = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            throw new Error(`Graph returned ${response.status}`);
        }

        const data = await response.json();
        const folderWithStatus = await Promise.all(
            (data.value || [])
                .filter((item) => item.folder)
                .map(async(folder)=>{
                    const childrenUrl = `https://graph.microsoft.com/v1.0/drives/${driveID}/items/${folder.id}/children`;
                    const childResponse = await fetch(childrenUrl, {
                        headers: { Authorization: `Bearer ${accessToken}` },
                    });
                    const childData = await childResponse.json();

                    const isEmpty = !childData.value || childData.value.length === 0;

                    return{
                        ...folder,
                        isEmpty,
                        displayName: isEmpty ? `${folder.name} (Empty)` : folder.name,
                    };

                })
        );
        if (folderWithStatus.length === 0) {
          // Clear the previous folder's tabs, otherwise they stay on screen
          setFolders([]);
          setShowNoFolders(true);
        }
        else {
          setShowNoFolders(false);
          setFolders(sortFoldersByName(folderWithStatus, "name"));
        }
        const filesOnly = data.value.filter((item) => !item.folder);
        if(filesOnly.length !== 0)
        {
            window.dispatchEvent(new CustomEvent("showFiles", { }));
        }
        else{
            window.dispatchEvent(new CustomEvent("hideFiles", { }));
        }
        const itemUrl = await `https://graph.microsoft.com/v1.0/drives/${driveID}/items/${pathManager.folderId}/permissions`;
        
        const uploadPermissionResponse = await checkUploadPermission(itemUrl);
        console.log("Permissions: " + uploadPermissionResponse);
        setUploadPermission(uploadPermissionResponse);
        window.dispatchEvent(new CustomEvent("uploadPermissionChanged", {detail:uploadPermissionResponse}));
        if(uploadPermissionResponse){
            console.log("Dispatching");
            const filesUrl = await `https://graph.microsoft.com/v1.0/drives/${driveID}/items/${pathManager.folderId}`;
            pathManager.filePath = filesUrl;
        }
        console.log(pathManager.folderName);
        if (/\d{2}[/-]\d{2}[/-]\d{2}/.test(pathManager.folderName)) {
          console.log("Date detected");
          setUploadPermission(false);
        }

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(folderKey) {
    const folder = folders.find(
      (item) => `${item.driveId}:${item.id}` === folderKey
    );
    if (!folder) return;

    setSelectedFolder(folderKey);
    pathManager.addId(pathManager.folderId, pathManager.folderName);
    pathManager.folderId = folder.id;
    pathManager.folderName = folder.name;
    setCanGoBack(true);

    // Navigate from the shared folder itself. This does not traverse Jobs or
    // "<year> Jobs", which recipients might not have permission to access.
    // const childrenUrl =
    //   `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(folder.driveId)}` +
    //   `/items/${encodeURIComponent(folder.id)}/children`;
    //   console.log("URl : " + childrenUrl);
    // pathManager.Path = childrenUrl;
    window.dispatchEvent(
      new CustomEvent("pathChanged", {})
    );
    window.dispatchEvent(
      new CustomEvent("imagesChanged", {})
    );
    window.dispatchEvent(new CustomEvent("setFolderName", {detail: folder.name}));
    window.dispatchEvent(new CustomEvent("setPathName", {detail: folder.name}));
    const itemUrl = await `https://graph.microsoft.com/v1.0/drives/${driveID}/items/${folder.id}/permissions`;
    
    const uploadPermissionResponse = await checkUploadPermission(itemUrl);
    console.log("Permissions: " + uploadPermissionResponse);
    setUploadPermission(uploadPermissionResponse);
    console.log("Upload Permission: ", uploadPermission);
    if(uploadPermissionResponse){
        console.log("Dispatching");
        pathManager.folderName = await folder.name;
        const filesUrl = await `https://graph.microsoft.com/v1.0/drives/${driveID}/items/${folder.id}`;
        pathManager.filePath = filesUrl;
        window.dispatchEvent(new CustomEvent("uploadPermissionChanged", {detail:uploadPermissionResponse}));
    }
  }

  function handleBack() {
    const previousFolder = pathManager.getLastFolder();
    if (!previousFolder) return;

    pathManager.folderId = previousFolder.id;
    pathManager.folderName = previousFolder.name;
    setSelectedFolder("");
    setCanGoBack(pathManager.canGoBack());

    window.dispatchEvent(new CustomEvent("pathChanged", {}));
    window.dispatchEvent(new CustomEvent("imagesChanged", {}));
    window.dispatchEvent(
      new CustomEvent("setFolderName", {
        detail: previousFolder.name || "Files",
      })
    );
    window.dispatchEvent(new CustomEvent("folderBack", {}));
  }

  function handleShowCalendar() {
    window.dispatchEvent(new CustomEvent("showCalendar", { detail: "SubfolderTabs" }));
  }

  if (!isAuthenticated) {
    return null;
  }
  if (loading) {
    return <div>Loading jobsites...</div>;
  }
  if (error) {
    return <div>Error: {error}</div>;
  }
        async function checkUploadPermission(folderName){
                    try{
                        const accessToken = await authService.getAccessToken();
                        console.log("Folder Path "+ folderName);
                        const folderPermissionsUrl = folderName;
                        

                        const response = await fetch(folderPermissionsUrl, {
                            headers: {
                                Authorization: `Bearer ${accessToken}`,
                            },
                        });
            
                        if (!response.ok){
                            console.error("permission check failed:", response.status);
                            return false;
                        }
            
                        const data = await response.json();
            
                        const canWrite = data.value.some(permission => permission.roles?.includes("write"));
                        
                        return canWrite;
                        } catch (error){
                            console.error("Upload Permission Error: ", error);
                            return false;
                        }
                }
  return (
    <div className="SubfolderTabs">
      {showNoFolders ? (
        <p className="subfolder-empty"></p>
      ) : (
        <Tabs
            fill
            id="jobsite-tabs"
            activeKey={selectedFolder}// Controls which tab is highlighted
            onSelect={(value) => handleSelect(value)}// Fires whenever user clicks a tab
        >
            {/* Generate tabs dynamically from Graph folders.
                Tabs only drive the date/image selection, so the tab body is
                intentionally empty to keep the card layout clean. */}
            {folders.map(folder => (
                <Tab
                    key={`${folder.driveId}:${folder.id}`}
                    eventKey={`${folder.driveId}:${folder.id}`}
                    title={folder.displayName}
                />
            ))}
        </Tabs>
      )}
      <div className="subfolder-footer">
        {canGoBack ? (
          <Button variant="contained" onClick={handleBack}>
            ← Back
          </Button>
        ) : (
          <span />
        )}
        {uploadPermission && <Button variant="outlined" onClick={handleShowCalendar}>
          Create New Folder
        </Button>}
      </div>
    </div>
    
  );
}
