import { useState, useEffect } from 'react';
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { authService } from "@/auth/authService.js";
import { graphConfig } from "@/auth/msal-config.jsx";
import { handleDriveId } from "@/services/handleDriveId.jsx";
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import { fetchFolderNames } from "@/files/load-folders.jsx";
import pathManager from "@/services/pathmanager.js";

function SubfolderTabs() {
    
    const [key, setKey] = useState('home'); // Current selected tab/folder
    const [homeTabName, setHomeTabName] = useState(pathManager.Path || "Home"); // Stores the current Jobsite path from pathManager
    const [folders, setFolders] = useState([]);  // Stores folders returned from OneDrive/Graph API
    const handlePathEvent = (event) => {

    if(event.detail){

        setHomeTabName("Home");

        setKey("home");

    }
};
    /*
        Listen for changes to the selected Jobsite path.

        Example:
        User selects "Jobsite 1"
        pathManager.Path becomes "Jobsite 1"
        A custom event is fired
        This updates the component.
    */
    useEffect(() => {
        const handlePathEvent = (event) => {
            if (event.detail) {
                setHomeTabName(event.detail);
               
                
                setKey('home'); // Reset tab selection when changing jobsites
            }
        };
        window.addEventListener("pathChanged", handlePathEvent);
        return () => {
            window.removeEventListener("pathChanged", handlePathEvent);
        };
    }, []);


    /*
        Load subfolders whenever the selected Jobsite changes.

        This runs when:
        - User selects a different Jobsite
        - pathManager.Path changes
    */
    useEffect(() => {
        async function loadFolders() {
            if (!pathManager.Path) return;
            const names = await fetchFolderNames(pathManager.Path);
            setFolders(names);
        }
        loadFolders();

    }, [homeTabName]);
    async function setCreationPermission(){
        const permissionCheck = await checkUploadPermission(`${pathManager.Path.replace(':/children', '')}/${key}:/permissions`);
        console.log("folder Permission Check: " + permissionCheck);
        window.dispatchEvent(new CustomEvent("folderCreationPermissionChanged", {detail: permissionCheck}));
        pathManager.folderPermission = permissionCheck;
        window.dispatchEvent(new CustomEvent("folderCreationPermission", { detail:  permissionCheck }));
    }
    /*
        Update imagePath ONLY when the active tab changes.

        Previously this was inside the cleanup function of another
        useEffect, which caused it to update at the wrong time.
    */
    useEffect(() => {
        if (!pathManager.Path || !key) return;

        if (key === "home") {

            // Root Jobsite folder
            pathManager.datePath = `${pathManager.Path}`;
        } 
        else {
            // Selected subfolder
            pathManager.datePath = `${pathManager.Path.replace(':/children', '')}/${key}:/children`;
            setCreationPermission();
            window.dispatchEvent(new CustomEvent("folderChanged", { detail: "default" }));
            window.dispatchEvent(new CustomEvent("showDates", {}));
            
        }
        //console.log("Subfolder: Updated date path:", pathManager.datePath);
        
    }, [key]);
    
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
        <Tabs
            fill
            id="controlled-tab-example"
            activeKey={key}// Controls which tab is highlighted
            onSelect={(k) => setKey(k)}// Fires whenever user clicks a tab
        >

            {/* Generate tabs dynamically from Graph folders.
                Tabs only drive the date/image selection, so the tab body is
                intentionally empty to keep the card layout clean. */}
            {folders.map(folder => (
                <Tab
                    key={folder}
                    eventKey={folder}
                    title={folder}
                />
            ))}
        </Tabs>
    );
}

export default SubfolderTabs;