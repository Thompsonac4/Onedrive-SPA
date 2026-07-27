import { authService } from "./authService";

export async function DeleteItem(url) {
    try {
        const accessToken = await authService.getAccessToken();
        const response = await fetch(url, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        if (!response.ok) {
            throw new Error(`Graph returned ${response.status}`);
        }
        return true;
    } catch (err) {
        console.error("Delete failed:", url, err);
        return false;
    }
}