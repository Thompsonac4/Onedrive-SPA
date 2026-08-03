class PathManager {

    constructor() {
        if (!this.instance) {
            console.log("PathManager created");
            // Internal storage variables
            this.path = "";
            this._imagePath = "";
            this._folderId = "";
            this._filePath = "";
            this._parentId = "";
            this._IdArray = [];
            this._folderName = "";
            this._folderPathText = "";
            this._jobsList = [];
            
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
    set filePath(newPath) {
        //  console.log(
        //     "PathManager: Setting image path to",
        //      newPath
        //  );

        this._filePath = newPath;
    }

    get filePath() {
        // console.log(
        //     "PathManager: Getting image path:",
        //     this._imagePath
        // );
        return this._filePath;
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
   

    set folderId(newId) {
        this._folderId = newId;
    }

    get folderId() {
        return this._folderId;
    }
    set folderName(newId) {
        this._folderName = newId;
    }

    get folderName() {
        return this._folderName;
    }

    set folderPathText(text) {
        this._folderPathText = text;
    }

    get folderPathText() {
        return this._folderPathText;
    }
    set jobsList(array) {
        this._jobsList = array;
    }

    get jobsList() {
        return this._jobsList;
    }

    addId(id, name = "") {
        if (!id) return;
        this._IdArray.push({ id, name });
        console.log("Id Array: ", this._IdArray);
    }

    getLastId() {
        const previous = this._IdArray.pop();
        console.log("Id Array", this._IdArray);
        return previous?.id || "";
    }

    getLastFolder() {
        const previous = this._IdArray.pop();
        console.log("Id Array", this._IdArray);
        return previous || null;
    }

    canGoBack() {
        return this._IdArray.length > 0;
    }

    clearFolderHistory() {
        this._IdArray = [];
    }
}

const pathManager = new PathManager();
export default pathManager;