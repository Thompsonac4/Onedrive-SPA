import React from 'react';
import { useState, useEffect } from "react";
import LoginButton from "./login-button.jsx";
import YearDropdown from "./year-dropdown.jsx";
import JobsiteDropdown from "./jobsite-dropdown.jsx";
import SubfolderTabs from "./subfolder-tabs.jsx";
import DateDropdown from "./date-dropdown.jsx";
import ImageContainer from "./imagecontainer.jsx";
import Upload from "./upload.jsx";
import CalendarSelection from "./calendar-selection.jsx";
import Modal from "react-bootstrap/Modal";
import {Button} from "@mui/material";
import pathManager from "./pathmanager.js";



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
  const [showDates, setShowDates] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [calendarLocation, setCalendarLocation] = useState("");
  const [showDeletionSuccess, setShowDeletionSuccess] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState(false);
  const [deletionMessage, setDeletionMessage] = useState("");

  //Event handler to open the Calendar Modal
  useEffect(() => {
      async function calendarEvent(event) {
          setCalendarLocation(event.detail);
          setShowingCalendar(true);
      }
      async function uploadEvent(){
        setShowUpload(true);
      }
      async function folderEvent(){
        setShowFolder(true);
      }
      async function datesEvent(){
        setShowDates(true);
      }
      async function filesEvent(){
        setShowFiles(true);
      }
      async function deletionStatusEvent(event){
        setDeletionMessage(event.detail.message);
        pathManager.deletedFileName = event.detail.fileName;
        setShowDeletionSuccess(true);
      }
    
      // Listen for future changes
      window.addEventListener("showCalendar", calendarEvent);
      window.addEventListener("showUpload", uploadEvent);
      window.addEventListener("showFolder", folderEvent);
      window.addEventListener("showDates", datesEvent);
      window.addEventListener("showFiles", filesEvent);
      window.addEventListener("deletionStatus", deletionStatusEvent);
      return () => {
          window.removeEventListener("showCalendar",calendarEvent);
          window.removeEventListener("showUpload", uploadEvent);
          window.removeEventListener("showFolder", folderEvent);
          window.removeEventListener("showDates", datesEvent);
          window.removeEventListener("showFiles", filesEvent);
          window.removeEventListener("deletionStatus", deletionStatusEvent);
      };
  }, []);

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

      {showFolder && <section className="card">
        <h2>2. Select Folder</h2>
        <SubfolderTabs />
      </section>}

      {showDates && <section className="card">
        <h2>3. Select Date</h2>
        <DateDropdown />
      </section>}

      {showFiles && <section className="card">
        <h2>4. Files</h2>
        <ImageContainer />
      </section>}

      {showUpload && <section className="card upload">
        <h2>5. Upload New File</h2>
        <Upload />
      </section>}

      {showingCalendar && <CalendarSelection location={calendarLocation} onClose={() => setShowingCalendar(false)}/>}
      <Modal show={showDeletionSuccess} onHide={() => setShowDeletionSuccess(false)} centered>
         <Modal.Header closeButton>
              Deletion Confirmation
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
