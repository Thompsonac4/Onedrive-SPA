import {authService} from "./authService.js";
const GRAPH = "https://graph.microsoft.com/v1.0";

async function graphFetch(path, options = {}) {
    const token = await authService.getAccessToken();
    const res = await fetch(`${GRAPH}${path}`,{
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(options.headers || {}),   
        },
    });
    if (!res.ok) throw new Error(`Graph ${res.status}: ${await res.text()}`);
    return res; 
}

export async function listFolderChildren(folderPath) {
    const res = await graphFetch(`/me/drive/root:/${folderPath}:/children`);
    return(await res.json()).value;
}

export async function getImageBlobUrl(itemId) {
    const res = await graphFetch(`/me/drive/items/${itemId}/content`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
}

export async function uploadFile(folderPath, file) {
    const res = await graphFetch(
        `/me/drive/root:/${folderPath}/${file.name}:/content`,
        { method: "PUT", body: file, headers: {"Content-Type": file.type} }
    );
    return res.json();
}