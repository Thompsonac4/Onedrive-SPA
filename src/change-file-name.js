import { authService } from "./authService";

export async function ChangeFileName(url, newName) {

    const driveItem = {
        name: newName
    };

    try {
        const accessToken = await authService.getAccessToken();
        const response = await fetch(url, {
            method: "PATCH",
            body: JSON.stringify(driveItem),
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
        });
        if (!response.ok) {
            throw new Error(`Graph returned ${response.status}`);
        }
        return true;
    } catch (err) {
        console.error("Change name failed:", newName, err);
        return false;
    }
}