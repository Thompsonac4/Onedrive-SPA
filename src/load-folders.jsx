import { useEffect, useState } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { authService } from "./authService.js";
import { graphConfig } from "./msal-config.jsx";
import { handleDriveId } from "./handleDriveId.jsx";
import pathManager from "./pathmanager.js";
import subfolderTabs from "./subfolder-tabs.jsx";


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