class PathManager {

    constructor() {
        if (!this.instance) {
            console.log("PathManager created");
            // Internal storage variables
            this.path = "";
            this._imagePath = "";
            this._datePath = "";
            this._yearPath = "";
            this._uploadPath = "";
            this._uploadFolderName = "";
            this._deletedName = "";
            this._datePathName = "";
            this._folderPermission = false;
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
        //  console.log(
        //     "PathManager: Setting image path to",
        //      newPath
        //  );

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
     set uploadPath(newPath) {
        // console.log(
        //     "PathManager: Setting path to",
        //     newPath
        // );
        this._uploadPath = newPath;
    }

    get uploadPath() {
        // console.log(
        //     "PathManager: Getting path:",
        //     this.path
        // );

        return this._uploadPath;
    }
    set uploadFolderName(newPath) {
        // console.log(
        //     "PathManager: Setting path to",
        //     newPath
        // );
        this._uploadFolderName = newPath;
    }

    get uploadFolderName() {
        // console.log(
        //     "PathManager: Getting path:",
        //     this.path
        // );

        return this._uploadFolderName;
    }
    set deletedFileName(newPath) {
        // console.log(
        //     "PathManager: Setting path to",
        //     newPath
        // );
        this._deletedName = newPath;
    }

    get deletedFileName() {
        // console.log(
        //     "PathManager: Getting path:",
        //     this.path
        // );

        return this._deletedName;
    }
    set datePathName(newPath) {
        // console.log(
        //     "PathManager: Setting path to",
        //     newPath
        // );
        this._datePathName = newPath;
    }

    get datePathName() {
        // console.log(
        //     "PathManager: Getting path:",
        //     this.path
        // );

        return this._datePathName;
    }
    set folderPermission(newPath) {
        // console.log(
        //     "PathManager: Setting path to",
        //     newPath
        // );
        this._folderPermission = newPath;
    }

    get folderPermission() {
        // console.log(
        //     "PathManager: Getting path:",
        //     this.path
        // );

        return this._folderPermission;
    }
}

const pathManager = new PathManager();
export default pathManager;