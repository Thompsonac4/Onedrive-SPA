import { useEffect, useState } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { authService } from "@/auth/authService.js";
import { graphConfig } from "@/auth/msal-config.jsx";
import { handleDriveId } from "@/services/handleDriveId.jsx";
import pathManager from "@/services/pathmanager.js";
import CalendarSelection from "./calendar-selection";

let defaultDate = false;

//Main Date dropdown for selecting the date of subfolders to display files in the carousel
export default function DateDropdown({ onFolderSelect }) {

    // State Variables for folders
    const [folders, setFolders] = useState([]);
    const [selectedFolder, setSelectedFolder] = useState("Select Date");
    // State Variables for progress
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [warning, setWarning] = useState(null);
    const [createPermission, setCreatePermission] = useState(false);


    //Effect Handler for the parent folder changing so we reload the date selection
    useEffect(() => {
        async function updateFolders() {
            //console.log(event);
            if (authService.isAuthenticated()) {
                if (event.type !== "folderChanged" || event.detail === "default") {
                    defaultDate = await false;
                    setSelectedFolder("Select Date");
                    await loadFolders();
                }
                else {
                    handleSelect(event.detail);
                    await loadFolders();
                }
            }
        }
        async function reloadFolders() {
            //console.log(event);
            if (authService.isAuthenticated()) {
                handleSelect(pathManager.uploadFolderName);
                await loadFolders();
            }
        }
        async function checkPermission(event) {
            console.log("Folder Permission: " + event.detail);
            setCreatePermission(event.detail);
        }
        
        // Load immediately
        updateFolders();
        // Listen for future changes
        window.addEventListener("folderChanged", updateFolders);
        window.addEventListener("reloadFolders", reloadFolders);
        window.addEventListener("folderCreationPermission", checkPermission);
        return () => {
            window.removeEventListener("folderChanged", updateFolders);
            window.removeEventListener("reloadFolders", reloadFolders);
            window.removeEventListener("folderCreationPermission", checkPermission);
        };
    }, []);

    //Function to load in folders from out parent path and store them into an array for the dropdown
    async function loadFolders() {
        setLoading(true);
        //console.log("Loading folders for date dropdown from:", pathManager.datePath);
        try {

            if (!pathManager.datePath) {
                //console.log("No date path yet");
                setFolders([]);
                
                return;
            }
            const accessToken = await authService.getAccessToken();
            if (!accessToken) return;
            
            //console.log("Loading folders from:", pathManager.datePath);

            const response = await fetch(pathManager.datePath, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            //console.log("DateDropdown response:", response.url);

            if (!response.ok) {
                throw new Error(`Graph returned ${response.status}`);
            }

            const data = await response.json();
            const dateList = await Promise.all(data.value
                .filter((item) => item.folder)
                .map(async (item) => {
                    const folderUrl = 
                    `${pathManager.datePath.replace(":/children", "")}/${encodeURIComponent(item.name)}:/children`;

                    try {
                        const folderResponse = await fetch(folderUrl,{
                            headers: {
                                Authorization: `Bearer ${accessToken}`,

                            },
                        });
                        const folderData = await folderResponse.json();

                        return {
                            name: item.name,
                            hasFiles: (folderData.value ?? []).length > 0,
                        };
                    } catch {
                        return {
                            name: item.name,
                            hasFiles: false,
                        };
                    }
                })
            )
            dateList.sort((a, b) =>
                a.name.localeCompare(b.name, undefined, {
                    numeric: true,
                    sensitivity: "base",
                })
            );
            console.log(dateList);
            setFolders(dateList);

            if (dateList.length > 0 && !defaultDate) {
                defaultDate = true;
                handleSelect(dateList[0].name);   // Sets selectedDate and updates pathManager
            }
            else{
                window.dispatchEvent(new CustomEvent("jobsiteImagesChanged"));
            }
            

        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }
    //Dispatch event for our Calendar Modal, this is to let App.jsx know to open that modal
    function openCalendar(){
       window.dispatchEvent(new CustomEvent("showCalendar", { detail:  "DateDropdown" }));
    }
    //Selection Handler
    async function handleSelect(folder) {
        setSelectedFolder(folder);
      
        const MainUrl = `${pathManager.datePath}`;
        pathManager.imagePath = `${MainUrl.replace(':/children', '')}/${folder}:/children`;
        pathManager.datePathName = folder;
        // console.log("DateDropdown: Updated image path:", pathManager.imagePath);
        
        const canUpload = await checkUploadPermission(folder);

        window.dispatchEvent(new CustomEvent("uploadPermissionChanged", {detail: canUpload}));
      
        onFolderSelect?.(folder);
        
        window.dispatchEvent(new CustomEvent("imagesChanged", { isJobsitePlace: false}));
        window.dispatchEvent(new CustomEvent("showFiles", {}));
    }
    if (!authService.isAuthenticated()) {
        return null;
    }
    if (loading) {
        return <div>Loading dates...</div>;
    }
    if (error) {
        return <div>Error: {error}</div>;
    }

    async function checkUploadPermission(folderName){
        try{
            const accessToken = await authService.getAccessToken();
            
            const folderPermissionsUrl = 
                `${pathManager.datePath.replace(":/children", "")}/${encodeURIComponent(folderName)}:/permissions`;
        
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
    //console.log(folders);
    return (
        <div className="DateDropdown">
            {warning && <div className="text-warning mb-2">{warning}</div>}
            <Dropdown>
                <Dropdown.Toggle variant="success" id="dropdown-basic">
                    {selectedFolder}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                    {folders.length === 0 ? (
                        <Dropdown.Item disabled>
                            No folders found
                        </Dropdown.Item>
                    ) : (
                        folders.map((folder) => (
                            <Dropdown.Item
                                key={folder.name}
                                onClick={() => handleSelect(folder.name)}
                                style={{
                                    color: folder.hasFiles ? "":"#999",
                                    opacity: folder.hasFiles ? 1: 0.6,
                                    fontStyle: folder.hasFiles ? "normal" : "italic",
                                }}
                            >
                                {folder.name}
                                {!folder.hasFiles && " (No Files)"}
                            </Dropdown.Item>
                        ))
                    )}
                    {createPermission && <Dropdown.Item href="#/action-1" className="text-primary" onClick={() => openCalendar()}>
                        Add New Date
                    </Dropdown.Item>}
                </Dropdown.Menu>
            </Dropdown>
        </div>
    );
}