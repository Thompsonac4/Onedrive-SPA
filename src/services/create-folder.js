import { authService } from "@/auth/authService.js";
import pathManager from "./pathmanager.js";


export async function CreateFolder(folderName) {
    if (!folderName?.trim()) {
        console.error("CreateFolder: folder name is empty");
        return false;
    }

    const driveID = import.meta.env.VITE_DRIVE_ID;

    const driveItem = {
        name: folderName.trim(),
        folder: { },
        '@microsoft.graph.conflictBehavior': 'fail'
    };

    const url = `https://graph.microsoft.com/v1.0/drives/${driveID}/items/${pathManager.folderId}/children`;

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
        if (!response.ok) {
            throw new Error(`Graph returned ${response.status}`);
        }
        return true;
    } catch (err) {
        console.error("Create folder failed:", folderName, err);
        return false;
    }
}
