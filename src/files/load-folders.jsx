import { useEffect, useState } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { authService } from "@/auth/authService.js";
import { graphConfig } from "@/auth/msal-config.jsx";
import { handleDriveId } from "@/services/handleDriveId.jsx";
import pathManager from "@/services/pathmanager.js";
import subfolderTabs from "@/navigation/subfolder-tabs.jsx";


export async function fetchFolderNames(url) {
    const accessToken = await authService.getAccessToken();

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    const data = await response.json();
    console.log(data.value);
    return data.value
        .filter(item => item.folder)
        .map(item => item.name);
}