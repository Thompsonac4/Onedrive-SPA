import React from 'react';
import { useState, useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { authService } from "@/auth/authService.js";
import { graphConfig } from "@/auth/msal-config.jsx";
import DateSelection from '@/navigation/date-selection.jsx';
import pathManager from '@/services/pathmanager.js';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { createUploadSession, uploadLargeFile } from './upload-session.jsx';
import CalendarSelection from '@/navigation/calendar-selection.jsx';

export default function UploadButtons() {
  //Filename and path Consts
  const fileInputRef = React.useRef(null);
  const [selectedFiles, setSelectedFiles] = React.useState([]);
  const [fileNames, setFileNames] = React.useState("");
  const [failedNames, setFailedNames] = React.useState([]);
  const [displayedPath, setDisplayedPath] = React.useState("");
  
  //Success and uploadhandling Consts
  
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [successState, setSuccessState] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState({ done: 0, total: 0 });
  
  //Upload Consts
  const [showUploading, setShowUploading] = React.useState(false);
  const [uploadFolderName, setUploadFolderName] = React.useState("");
  const [uploadTab, setUploadTab] = React.useState("existing");
  const [uploadNewDate, setUploadNewDate] = React.useState(new Date());

  //Show and Close Consts
  const [show, setShow] = React.useState(false);
  const handleClose = () => setShow(false);
  const handleSuccessClose = () => setShowSuccess(false);
  const handleShow = () => setShow(true);

  //Upload File Sizes Consts
  const MAX_FILES = 50;
  const LARGE_FILE_SIZE = 40 * 1024 * 320; // 4MB
  let fileArray;

  const handleButtonClick = () => {fileInputRef.current.click();};

  //Set selected Files
  const handleFileChange = async (event) => {
    const files = await event.target.files;
      //Set Max File Size
        if (files.length > MAX_FILES){
          alert(
            `You tried to upload more than the maximum files ${MAX_FILES}. \n`
            `You uploaded ${files.length}. Please select less than ${MAX_FILES} and try again`);
          event.target.value = "";
          return;
        }
        //Make Sure there are files if so set then to be handled later
        if (files.length > 0) {
          const fileArray = Array.from(files);
          //console.log(fileArray);
          setSelectedFiles(fileArray);
          setShow(true);
          printFileNames(files);
        }
        event.target.value = '';
  };  

  function openCalendar(){
        setShowCalendar(true);
    }

  
  // Upload a single file. Never throws — records failures instead so one bad
  // file can't stop the whole batch.
  const uploadOne = async (file, accessToken) => {
    
    try {
      if(file.size <= LARGE_FILE_SIZE)
      {
        // encodeURIComponent handles spaces / special characters in file names
        const url = `${pathManager.uploadPath}/${encodeURIComponent(file.name)}:/content`;
        const response = await fetch(url, {
          method: "PUT",
          body: file,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": file.type || "application/octet-stream",
          },
        });

        if (!response.ok) {
          throw new Error(`Graph returned ${response.status}`);
        }
      }
      else
      {
        const uploadUrl = await createUploadSession(
          pathManager.uploadPath,
          file.name,
          accessToken
        );
        console.log(pathManager.uploadPath);
        await uploadLargeFile(
          file,
          uploadUrl
        );

      }
      
      
      return { name: file.name, ok: true };

    } catch (err) {
      console.error("Upload failed:", file.name, err);
      return { name: file.name, ok: false };
    }
  };

  //Function for working with Handle Upload
  const handleUpload = async () => {
    //Check if there are files
    if (selectedFiles.length === 0 || uploading) return;

    //Access Token for API
    const accessToken = await authService.getAccessToken();

    //Takes our files and starts the upload process
    const files = [...selectedFiles];
    setUploading(true);
    setFailedNames([]);
    setProgress({ done: 0, total: files.length });

    // Swap the selection modal for the progress modal
    setUploadFolderName(pathManager.uploadFolderName || "the selected folder");
    setShow(false);
    setShowUploading(true);

    if (!accessToken) {
      // Redirect/login in progress — can't upload right now
      setUploading(false);
      setShowUploading(false);
      setSuccessState("Failed");
      setShowSuccess(true);
      return;
    }

    const failed = [];
    let done = 0;

    // Upload several files at once (limited) so it's fast but doesn't overwhelm
    // a mobile connection. A shared queue feeds a small pool of workers.
    const CONCURRENCY = 4;
    const queue = [...files];

    const worker = async () => {
      while (queue.length > 0) {
        const file = queue.shift();
        const result = await uploadOne(file, accessToken);
        if (!result.ok) failed.push(result.name);
        done += 1;
        setProgress({ done, total: files.length });
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker)
    );

    // Refresh the gallery ONCE, after everything finished
    window.dispatchEvent(new CustomEvent("imagesChanged"));
    window.dispatchEvent(new CustomEvent("reloadFolders"));

    setUploading(false);
    setSelectedFiles([]);
    setFileNames("");
    setFailedNames(failed);
    setShowUploading(false);
    setSuccessState(
      failed.length === 0
        ? "Success"
        : failed.length === files.length
        ? "Failed"
        : "Partial"
    );
    setShowSuccess(true);
  };

  // React.useEffect(() => {
  //   console.log("Selected Files:", selectedFiles);
  // }, [selectedFiles]);  

  function printFileNames(proccessFiles) {
    let fileNameString = Array.from(proccessFiles)
    .map(file => file.name)
    .join("\n") + "\n";
    console.log("FileNames: " + fileNameString);
    setFileNames(fileNameString);
  }
  
  /**
   * Event Handler For Calendar hiding the upload modal
   * Event Handler For After Date Has been added
   */
   useEffect(() =>{
    const handleEvent = (event) =>{
      if(event.detail === "calendar")
      {
        setShow(true);
        console.log("show upload");
      }
      
      
    };

    const calenderEvent = (event =>{
      setShow(false);
    })

    window.addEventListener("calendarOpened",calenderEvent);
    window.addEventListener("dateAdded",handleEvent);
        return () => {

            window.removeEventListener("dateAdded",handleEvent);
            window.removeEventListener("calendarOpened",handleEvent);
        };
  },[]);
  
  if(!authService.isAuthenticated()) return;

  return (
    <div>
      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Upload files</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ whiteSpace: 'pre-line' }}>
          <b>Files selected:</b>
          {`\n${fileNames}\n`}
          <b>Select upload folder:</b>
          <DateSelection setShow={setShow}/>
          
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={uploading}>
            Close
          </Button>
          <Button variant="primary" onClick={handleUpload} disabled={uploading}>
            Upload
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Progress modal: no close (x), can't be dismissed until upload finishes */}
      <Modal
        show={showUploading}
        backdrop="static"
        keyboard={false}
        centered
      >
        <Modal.Header>
          <Modal.Title>Uploading to {uploadFolderName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div>
            Uploading {progress.done} of {progress.total} file
            {progress.total === 1 ? "" : "s"}…
          </div>
          <div
            style={{
              marginTop: 12,
              height: 8,
              borderRadius: 4,
              background: "#e8ecf1",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${
                  progress.total
                    ? Math.round((progress.done / progress.total) * 100)
                    : 0
                }%`,
                background: "#1976d2",
                transition: "width 0.2s ease",
              }}
            />
          </div>
        </Modal.Body>
      </Modal>
        <Modal show={showSuccess} onHide={handleSuccessClose}>
          <Modal.Header>
                <Modal.Title>{
                      successState === "Success"
                          ? 'Upload Success'
                          :
                      successState === "Partial"
                          ? 'Some Files Failed'
                          :
                      successState === "Failed"
                          ? 'Failed to Upload'
                          :
                          "Upload Error"
                  }
              </Modal.Title>
          </Modal.Header>
              {failedNames.length > 0 && (
                <Modal.Body style={{ whiteSpace: 'pre-line' }}>
                  <b>These files didn’t upload:</b>
                  {`\n${failedNames.join("\n")}`}
                </Modal.Body>
              )}
              <Modal.Footer>
                <Button variant="secondary" onClick={handleSuccessClose}>
                  Close
                </Button>
              </Modal.Footer>
            </Modal>
        
      {/* Standard Upload Button */}
      <input
        accept="image/*"
        style={{ display: 'none' }}
        id="contained-button-file"
        multiple
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <label htmlFor="contained-button-file">
        <Button variant="contained" color="primary" component="span">
          Upload
        </Button>
      </label>
    </div>
  );
}