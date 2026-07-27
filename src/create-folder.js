import { authService } from "./authService";
import pathManager from "./pathmanager";


export async function CreateFolder(folderName) {

    //const accessToken = await authService.getAccessToken();
    //const folderName = pathManager.uploadFolderName;
    const driveItem = {
        name: folderName,
        folder: { },
        '@microsoft.graph.conflictBehavior': 'fail'
    };

    console.log(driveItem);

    const url = pathManager.datePath;

    try {
        const accessToken = await authService.getAccessToken();
        const response = await fetch(url, {
            method: "POST",
            body: JSON.stringify(driveItem),
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
        });
        const data = await response.json();
        console.log(data);
        if (!response.ok) {
            throw new Error(`Graph returned ${response.status}`);
        }
        return true;
    } catch (err) {
        console.error("Upload failed:", folderName, err);
        return false;
    }
}