class PathManager {

    constructor() {
        if (!this.instance) {
            console.log("PathManager created");
            // Internal storage variables
            this.path = "";
            this._imagePath = "";
            this._datePath = "";
            this._yearPath = "";
            // Singleton instance
            this.instance = this;
        }
        return this.instance;
    }

    // Main folder/jobsite path
    set Path(newPath) {
        // console.log(
        //     "PathManager: Setting path to",
        //     newPath
        // );
        this.path = newPath;
    }

    get Path() {
        // console.log(
        //     "PathManager: Getting path:",
        //     this.path
        // );

        return this.path;
    }

    // Image folder path
    set datePath(newPath) {
        // console.log(
        //      "PathManager: Setting date  path to",
        //      newPath
        //  );

        this._datePath = newPath;
    }

    get datePath() {
        // console.log(
        //     "PathManager: Getting date path:",
        //     this._datePath
        // );
        return this._datePath;
    }

    // Image folder path
    set imagePath(newPath) {
         console.log(
            "PathManager: Setting image path to",
             newPath
         );

        this._imagePath = newPath;
    }

    get imagePath() {
        // console.log(
        //     "PathManager: Getting image path:",
        //     this._imagePath
        // );
        return this._imagePath;
    }
    set yearPath(newPath) {
        // console.log(
        //     "PathManager: Setting path to",
        //     newPath
        // );
        this._yearPath = newPath;
    }

    get yearPath() {
        // console.log(
        //     "PathManager: Getting path:",
        //     this.path
        // );

        return this._yearPath;
    }

}

const pathManager = new PathManager();
export default pathManager;