import JobsiteDropdown from "./jobsite-dropdown.jsx";
import SubfolderTabs from "./subfolder-tabs.jsx";
import DateDropdown from "./date-dropdown.jsx";
import ImageContainer from "./imagecontainer.jsx";
import Upload from "./upload.jsx";

/**
 * App
 * ---
 * Single card-based layout that composes every piece of the workflow:
 *   1. Select Jobsite   → JobsiteDropdown
 *   2. Select Folder    → SubfolderTabs
 *   3. Select Date      → DateDropdown
 *   4. Files            → ImageContainer (carousel)
 *   5. Upload New File  → Upload
 *
 * The components coordinate through the pathManager singleton and window
 * events ("pathChanged", "folderChanged", "imagesChanged"), so they can all
 * mount at once here and update as the user makes selections.
 */
export default function App() {
  return (
    <div className="container">
      <h1>📁 Jobsite Files</h1>

      <section className="card">
        <h2>1. Select Jobsite</h2>
        <JobsiteDropdown />
      </section>

      <section className="card">
        <h2>2. Select Folder</h2>
        <SubfolderTabs />
      </section>

      <section className="card">
        <h2>3. Select Date</h2>
        <DateDropdown />
      </section>

      <section className="card">
        <h2>4. Files</h2>
        <ImageContainer />
      </section>

      <section className="card upload">
        <h2>5. Upload New File</h2>
        <Upload />
      </section>
    </div>
  );
}
