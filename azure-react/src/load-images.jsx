import { useEffect, useState } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { authService } from "./authService.js";
import { graphConfig } from "./msal-config.jsx";
import { handleDriveId } from "./handleDriveId.jsx";
import pathManager from "./pathmanager.js";
import subfolderTabs from "./subfolder-tabs.jsx";


export async function fetchImageNames(url) {
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
    return data.value;
}
export async function fetchImagePreviews(url) {
    const accessToken = await authService.getAccessToken();

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const blob = await response.blob();
        return blob;
}

/**
 * Returns a short-lived, embeddable preview URL for a drive item.
 *
 * This uses the Graph "preview" action instead of downloading the file's
 * /content. It's what lets Word/Excel/PowerPoint render inside an <iframe>
 * (via the Office Online viewer) WITHOUT triggering a browser download.
 *
 * @param {string} driveId  Target drive id
 * @param {string} itemId   Drive item id
 * @returns {Promise<string>} An embeddable URL (getUrl) for an <iframe>
 */
export async function fetchPreviewUrl(driveId, itemId) {
    const accessToken = await authService.getAccessToken();

    const response = await fetch(
        `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/preview`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({})
        }
    );

    if (!response.ok) {
        throw new Error(await response.text());
    }

    const data = await response.json();
    // getUrl is the embeddable viewer link; nb=true hides the OneDrive chrome
    return data.getUrl;
}
