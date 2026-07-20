import { authService } from "./authService.js";
import pathManager from "./pathmanager.js";
import Date from "react-datepicker";

export async function getDateList() {
    try {
        if (!pathManager.datePath) {
            //console.log("No date path yet");
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

        //console.log("Response:", response.url);

        if (!response.ok) {
            throw new Error(`Graph returned ${response.status}`);
        }

        const data = await response.json();
        const dateList = data.value.filter((item) => item.folder).map((item) => item.name);

        console.log(dateList);

        return dateList;
    }
    catch (err) {
        console.error(err);
    }
}

export async function getCalendarDates() {
    const dateList = await getDateList();

    if (!dateList) return;

    const calendarDates = [];

    dateList.forEach(element => {
        
    });

}

class DatesManager {
    constructor() {
        if (!this.instance) {
            this.year = "";
            this.instance = this;
        }
        return this.instance;
    }

    set Year(newYear) {
        this.year = newYear;
    }

    get Year() {
        return this.year;
    }
}

const datesManager = new DatesManager();
export default datesManager;