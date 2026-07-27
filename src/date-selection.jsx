import { useEffect, useState } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { authService } from "./authService.js";
import { graphConfig } from "./msal-config.jsx";
import { handleDriveId } from "./handleDriveId.jsx";
import pathManager from "./pathmanager.js";
import CalendarSelection from "./calendar-selection.jsx";

let defaultDate = false;

//This is for the Upload.jsx to select where to upload
export default function DateSelection({ onFolderSelect, setShow}) {

    // State Variables for folders
    const [folders, setFolders] = useState([]);
    const [selectedFolder, setSelectedFolder] = useState("Select Date");
    const [uploadFolder, setUploadFolder] = useState("");
    
    // State Variables for progress
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [warning, setWarning] = useState(null);
    
    //Effect to refresh folders
    useEffect(() => {
        async function updateFolders(event) {
            console.log(event);
            if (authService.isAuthenticated()) {
                if(!event){
                    await loadFolders();
                    return;
                }
                if (event.type === "folderCreated" && event.detail !== "default") {
                    console.log(event.detail);
                    handleSelect(event.detail);
                    await loadFolders();
                }
                else {
                    defaultDate = await false;
                    await loadFolders();
                }
            }
        }
        // Load immediately
        updateFolders();
        
        window.addEventListener("folderCreated", updateFolders);
        return () => {
            window.removeEventListener("folderCreated", updateFolders);
        };
    }, []);

    //Event dispatch for showing Calendar modal and closing our upload modal
    const handleShowCalendar = () => {
        window.dispatchEvent(new CustomEvent("calendarOpened",{})); //Hide Upload Modal
       window.dispatchEvent(new CustomEvent("showCalendar", { detail:  "UploadModal" })); //Show Calendar Modal
    }

    //Load folders into dropdown
    async function loadFolders() {
        setLoading(true);
        //console.log("Loading folders for date dropdown from:", pathManager.datePath);
        try {

            if (!pathManager.datePath) {
                //console.log("No date path yet");
                setFolders([]);
                return;
            }
            //Access Token For API
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

            //Create Folder List
            const data = await response.json();
            const dateList = data.value.filter((item) => item.folder).map((item) => item.name);
            setFolders(dateList);

            if (dateList.length > 0 && !defaultDate) {
                defaultDate = true;
                handleSelect(dateList[0]);   // Sets selectedDate and updates pathManager
            }
            

        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }
    
    //Select Function for Dropdown
    async function handleSelect(folder) {
        setSelectedFolder(folder);
        //Create folderpath for selection to load images and get the child path
        const MainUrl = `${pathManager.datePath}`;
        pathManager.uploadFolderName = folder;
        setUploadFolder(`${MainUrl.replace(':/children', '')}/${folder}:/children`);
        pathManager.uploadPath = `${MainUrl.replace(':/children', '')}/${folder}`;
        onFolderSelect?.(folder);
    }

    // useEffect(() => {
    //     console.log("Selected folder:", uploadFolder);
    //   }, [uploadFolder]);
      
    if (!authService.isAuthenticated()) {
        return null;
    }
    if (loading) {
        return <div>Loading dates...</div>;
    }
    if (error) {
        return <div>Error: {error}</div>;
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
                                key={folder}
                                onClick={() => handleSelect(folder)}
                            >
                                {folder}
                            </Dropdown.Item>
                        ))
                    )}
                    <Dropdown.Item href="#/action-1" className="text-primary" onClick={() => handleShowCalendar()}>
                        Add New Date
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>
        </div>
    );
}