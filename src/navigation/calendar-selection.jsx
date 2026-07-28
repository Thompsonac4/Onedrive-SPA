import React from "react";
import { useState } from "react";
import Modal from "react-bootstrap/Modal";
import DatePicker from "react-datepicker";
import { Button } from "@mui/material";
import { CreateFolder } from "@/services/create-folder.js";
import pathManager from "@/services/pathmanager.js";

export default function CalendarSelection({ location, onClose }) {
  const [uploadNewDate, setUploadNewDate] = useState(new Date());
  const [dateString, setDateString] = useState("");

  const handleClose = () => {
    if (location === "DateDropdown") {
      window.dispatchEvent(new CustomEvent("folderChanged", {}));
    } else if (location === "UploadModal") {
      window.dispatchEvent(new CustomEvent("dateAdded", { detail: "calendar" }));
    }
    onClose?.();
  };

  function handleSelect(date) {
    // Use `date` from the picker — uploadNewDate is still the previous
    // value until the next render after setUploadNewDate.
    console.log(date);
    setUploadNewDate(date);
    const options = { 
      month: '2-digit', 
      day: '2-digit',
      year: '2-digit'
    };
    const newDateString = date?.toLocaleDateString?.('en-us', options).replaceAll("/", "-");
    console.log("Date selected:", newDateString);
    setDateString(newDateString);
  }

  const handleCreateFolder = async () => {
    if (dateString === "") {
      handleSelect(uploadNewDate);
    }
    const name = dateString;
    const success = await CreateFolder(name);
    if (location === "DateDropdown") {
      console.log("Going to DropDown")
      window.dispatchEvent(new CustomEvent("folderChanged", { detail: name }));
    } else if (location === "UploadModal") {
      console.log("Going to Upload")
      pathManager.datePathName = name;
      window.dispatchEvent(new CustomEvent("dateAdded", { detail: "calendar" }));
      window.dispatchEvent(new CustomEvent("folderChanged", { detail: name }));
    }
    onClose?.();
  };

  return (
    <div>
      <Modal show={true} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Choose New Date</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ whiteSpace: "pre-line" }}>
          <DatePicker
            selected={uploadNewDate}
            onSelect={handleSelect}
            inline
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
          <Button variant="primary" onClick={handleCreateFolder}>
            Create Folder
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
