import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { authService } from "./authService.js";
import { graphConfig } from "./msal-config.jsx";

export default function UploadButtons() {
  
  const fileInputRef = React.useRef(null);

  const [selectedFiles, setSelectedFiles] = React.useState([]);
  const [fileNames, setFileNames] = React.useState("");
  const [show, setShow] = React.useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const handleButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const files = event.target.files;
    if (files) {
      setSelectedFiles(files);
      console.log("Selected files:", selectedFiles);
      console.log(selectedFiles[0].name);
      setShow(true);
      printFileNames();
    }
  };

  function printFileNames() {
    let fileNameString = "";
    for (let i = 0; i < selectedFiles.length; i++) {
      fileNameString += selectedFiles[i].name + "\n";
    }
    setFileNames(fileNameString);
  }

  if(!authService.isAuthenticated()) return;

  return (
    <div>
      {/* Photo Camera Upload Button */}
      {/* <input
        accept="image/*"
        style={{ display: 'none' }}
        id="icon-button-file"
        type="file"
      />
      <label htmlFor="icon-button-file">
        <IconButton color="primary" aria-label="upload picture" component="span">
          <PhotoCamera />
        </IconButton>
      </label> */}

      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Upload files</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ whiteSpace: 'pre-line' }}>
          <b>Files selected:</b>
          {`\n${fileNames}`}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
          <Button variant="primary" onClick={handleClose}>
            Upload
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