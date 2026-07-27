import { useEffect, useState } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { authService } from "./authService.js";
import { graphConfig } from "./msal-config.jsx";
import { handleDriveId } from "./handleDriveId.jsx";
import pathManager from "./pathmanager.js";
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
        
        // Load immediately
        updateFolders();
        // Listen for future changes
        window.addEventListener("folderChanged", updateFolders);
        return () => {
            window.removeEventListener("folderChanged", updateFolders);
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
            const dateList = data.value.filter((item) => item.folder).map((item) => item.name);
            setFolders(dateList);

            if (dateList.length > 0 && !defaultDate) {
                defaultDate = true;
                handleSelect(dateList[0]);   // Sets selectedDate and updates pathManager
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
        // Base path is the currently selected subfolder's children URL.
        // NOTE: do NOT dispatch "pathChanged" here — that's the jobsite-level
        // event. Firing it would reset SubfolderTabs to "home" and clobber
        // pathManager.datePath, breaking the next date selection.
        const MainUrl = `${pathManager.datePath}`;
        pathManager.imagePath = `${MainUrl.replace(':/children', '')}/${folder}:/children`;
        console.log("DateDropdown: Updated image path:", pathManager.imagePath);
        onFolderSelect?.(folder);
        window.dispatchEvent(new CustomEvent("imagesChanged", { isJobsitePlace: false}));
        window.dispatchEvent(new CustomEvent("showFiles", {}));
        window.dispatchEvent(new CustomEvent("showUpload", {}));
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
                    <Dropdown.Item href="#/action-1" className="text-primary" onClick={() => openCalendar()}>
                        Add New Date
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>
        </div>
    );
}