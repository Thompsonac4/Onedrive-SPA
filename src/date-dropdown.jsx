import { useEffect, useState } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { authService } from "./authService.js";
import { graphConfig } from "./msal-config.jsx";
import { handleDriveId } from "./handleDriveId.jsx";
import pathManager from "./pathmanager.js";

let defaultDate = false;

export default function DateDropdown({ onFolderSelect }) {

    // Hooks MUST be inside the component
    const [folders, setFolders] = useState([]);
    const [selectedFolder, setSelectedFolder] = useState("Select Date");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [warning, setWarning] = useState(null);


    useEffect(() => {
        async function updateFolders() {
            if (authService.isAuthenticated()) {
                defaultDate = await false;
                await loadFolders();
                
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
            

        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }
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
                </Dropdown.Menu>
            </Dropdown>
        </div>
    );
}