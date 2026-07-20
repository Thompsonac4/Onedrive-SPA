import { useEffect, useState } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { authService } from "./authService.js";
import { graphConfig } from "./msal-config.jsx";

export async function handleDriveId() {
    const accessToken = await authService.getAccessToken();

    const response = await fetch(
        "https://graph.microsoft.com/v1.0/me/drive",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );
    
    if (!response.ok) {
        const text = await response.text();
        throw new Error(
            `Failed to get Drive ID (${response.status})\n${text}`
        );
    }

    const drive = await response.json();

    console.log("Drive ID:", drive.id);

    return drive.id;
}