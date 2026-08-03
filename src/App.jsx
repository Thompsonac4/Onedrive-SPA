import React from 'react';
import { useState, useEffect } from "react";
import LoginButton from "@/auth/login-button.jsx";
import YearDropdown from "@/navigation/year-dropdown.jsx";
import JobsiteDropdown from "@/navigation/jobsite-dropdown.jsx";
import SubfolderTabs from "@/navigation/subfolder-tabs.jsx";
import DateDropdown from "@/navigation/date-dropdown.jsx";
import ImageContainer from "@/files/imagecontainer.jsx";
import Upload from "@/upload/upload.jsx";
import CalendarSelection from "@/navigation/calendar-selection.jsx";
import Modal from "react-bootstrap/Modal";
import {Button, Box} from "@mui/material";
import { createTheme, alpha, getContrastRatio, ThemeProvider } from '@mui/material/styles';
import pathManager from "@/services/pathmanager.js";



const theme = createTheme({
  palette: {
    reloadButton: {
      main: '#5b9efc',
      light: '#64b1ff',
      dark: '#64b1ff',
      contrastText: '#ffffff',
    },
  },
});

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
 *    Under is our Calendar Modal for creating new dates called when needed
 *
 * Components coordinate through the pathManager singleton and window events
 * ("yearChanged", "pathChanged", "folderChanged", "imagesChanged").
 */
export default function App() {
  //Calendar State Variable - Folder Path for tracing
  const [showingCalendar, setShowingCalendar] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showFolder, setShowFolder] = useState(false);
  const [folderName, setFolderName] = useState("Select Folder");
  const [pathName, setPathName] = useState("");

  const [showJobs, setShowJobs] = useState(true);
  const [showFiles, setShowFiles] = useState(false);
  const [showDates, setShowDates] = useState(false);
  
  
  const [calendarLocation, setCalendarLocation] = useState("");
  const [showDeletionSuccess, setShowDeletionSuccess] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState(false);
  const [deletionMessage, setDeletionMessage] = useState("");
  const [popupTitle, setPopupTitle] = useState("");



  //Event handler to open the Calendar Modal
  useEffect(() => {
      async function calendarEvent(event) {
          setCalendarLocation(event.detail);
          setShowingCalendar(true);
      }
      async function uploadEvent(event){
        setShowUpload(event.detail);
      }
      async function jobsEvent(){
        setShowJobs(true);
      }
      async function folderEvent(event){
        setShowJobs(false);
        setShowFolder(true);
      }
      async function datesEvent(){
        setShowDates(true);
      }
      async function filesEvent(){
        setShowFiles(true);
      }
      async function hideFilesEvent(){
        setShowFiles(false);
      }
      async function folderNameEvent(event){
        setFolderName(event.detail);
      }
      function folderBackEvent(){
        setPathName((currentPath) => {
          const parts = currentPath.split(" -> ");
          return parts.length > 1
            ? parts.slice(0, -1).join(" -> ")
            : currentPath;
        });
      }
      function pathNameEvent(event){
        setPathName((currentPath) => {
          const nextSegment = String(event.detail || "").trim();
          if (!nextSegment) return currentPath;

          // Keep only folder names in state. "Jobsite:" belongs to the UI,
          // not the path value, otherwise it gets prepended on every change.
          const cleanPath = currentPath.replace(/^(Jobsite:\s*)+/, "");
          const parts = cleanPath ? cleanPath.split(" -> ") : [];
          let pathText = "";

          // Ignore duplicate events for the folder already at the path end.
          if (parts.at(-1) === nextSegment) {
            pathText = parts.join(" -> ");
            pathManager.folderPathText = pathText;
            return pathText;
          }

          pathText = [...parts, nextSegment].join(" -> ")
          pathManager.folderPathText = pathText;
          return pathText;
        });
      }
      async function deletionStatusEvent(event){
        setDeletionMessage(event.detail.message);
        pathManager.deletedFileName = event.detail.fileName;
        setShowDeletionSuccess(true);
        setPopupTitle(event.detail.title);
      }
    
      // Listen for future changes
      window.addEventListener("showCalendar", calendarEvent);
      window.addEventListener("uploadPermissionChanged", uploadEvent);
      window.addEventListener("showFolder", folderEvent);
      window.addEventListener("showDates", datesEvent);
      window.addEventListener("showJobs", jobsEvent);
      window.addEventListener("setFolderName", folderNameEvent);
      window.addEventListener("folderBack", folderBackEvent);
      window.addEventListener("setPathName", pathNameEvent);
      window.addEventListener("showFiles", filesEvent);
      window.addEventListener("hideFiles", hideFilesEvent);
      window.addEventListener("deletionStatus", deletionStatusEvent);
      return () => {
          window.removeEventListener("showCalendar",calendarEvent);
          window.removeEventListener("uploadPermissionChanged", uploadEvent);
          window.removeEventListener("showFolder", folderEvent);
          window.removeEventListener("showJobs", jobsEvent);
          window.removeEventListener("setFolderName", folderNameEvent);
          window.removeEventListener("folderBack", folderBackEvent);
          window.removeEventListener("setPathName", pathNameEvent);
          window.removeEventListener("showDates", datesEvent);
          window.removeEventListener("showFiles", filesEvent);
          window.removeEventListener("hideFiles", hideFilesEvent);
          window.removeEventListener("deletionStatus", deletionStatusEvent);
      };
  }, []);

  function selectNewJobsite() {
    pathManager.Path = "";
    pathManager.folderId = "";
    pathManager.folderName = "";
    pathManager.filePath = "";
    pathManager.imagePath = "";
    pathManager.clearFolderHistory();

    setShowJobs(true);
    setShowFolder(false);
    setShowFiles(false);
    setShowUpload(false);
    setShowDates(false);
    setShowingCalendar(false);
    setFolderName("Select Folder");
    setPathName("");
  }

  const pathSegments = pathName
    ? pathName.replace(/^(Jobsite:\s*)+/, "").split(" -> ")
    : [];

  return (
    <div className="container">
      <div className="app-header">
        <h1>📁 Jobsite Files</h1>
        <LoginButton />
        
        {showJobs && <ThemeProvider theme={theme}>
              <Button size="small" variant="contained" color="reloadButton" onClick={() =>window.dispatchEvent(new CustomEvent("reloadJobsites", {}))} >
                Reload Jobsites
              </Button>
            </ThemeProvider>}
      </div>

      {showJobs && <section className="card jobsite-selection-card">
        <div className="jobsite-selection-header">
          <h2 className="jobsite-selection-title">Select Jobsite</h2>
          </div>
        <JobsiteDropdown />
      </section>}

      {showFolder && (
        <div className="jobsite-nav-bar">
          <Button
            variant="contained"
            color="primary"
            onClick={selectNewJobsite}
          >
            Select New Jobsite
          </Button>
        </div>
      )}

     {showFolder && <section className="card">
        <h2 className="path-heading">
          <span className="path-heading-label">Jobsite:</span>
          {pathSegments.map((segment, index) => (
            <React.Fragment key={`${segment}-${index}`}>
              {index > 0 && <span className="path-separator">→</span>}
              <span
                className={
                  index === pathSegments.length - 1
                    ? "path-segment path-segment-current"
                    : "path-segment"
                }
              >
                {segment}
              </span>
            </React.Fragment>
          ))}
        </h2>
        <SubfolderTabs />
      </section>}

      {/* <section className="card">
        <h2>3. Select Date</h2>
        <DateDropdown />
      </section> */}

      {showFiles && <section className="card">
        <h2 className="files-heading">
          <span>Files in</span>
          <span className="files-heading-folder">{folderName}</span>
        </h2>
        <ImageContainer />
      </section>}

      {showUpload && <section className="card upload">
        <h2>Upload Files:</h2>
        <Upload />
      </section> }

       {showingCalendar && <CalendarSelection location={calendarLocation} onClose={() => setShowingCalendar(false)}/>}
      <Modal show={showDeletionSuccess} onHide={() => setShowDeletionSuccess(false)} centered>
         <Modal.Header closeButton>
              {popupTitle}
          </Modal.Header>
            <Modal.Body className="text-center" style={{ whiteSpace: "pre-line" }} >
              {`${pathManager.deletedFileName} ${deletionMessage}`}
            </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeletionSuccess(false)}>
              Close
            </Button>
          </Modal.Footer> 
        </Modal>  
    </div>
  );
}
