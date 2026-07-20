import LoginButton from "./login-button.jsx";
import YearDropdown from "./year-dropdown.jsx";
import JobsiteDropdown from "./jobsite-dropdown.jsx";
import SubfolderTabs from "./subfolder-tabs.jsx";
import DateDropdown from "./date-dropdown.jsx";
import ImageContainer from "./imagecontainer.jsx";
import Upload from "./upload.jsx";


/**
 * App
 * ---
 * Single card-based layout. Selection flow:
 *   Login (top-right)  → LoginButton
 *   1. Select Jobsite  → YearDropdown (year first) → JobsiteDropdown
 *   2. Select Folder   → SubfolderTabs
 *   3. Select Date     → DateDropdown
 *   4. Files           → ImageContainer
 *   5. Upload New File → Upload
 *
 * Components coordinate through the pathManager singleton and window events
 * ("yearChanged", "pathChanged", "folderChanged", "imagesChanged").
 */
export default function App() {
  return (
    <div className="container">
      <div className="app-header">
        <h1>📁 Jobsite Files</h1>
        <LoginButton />
      </div>

      <section className="card">
        <h2>1. Select Jobsite</h2>
        <YearDropdown />
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
