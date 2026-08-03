import React from "react";
import { useState } from "react";
import Modal from "react-bootstrap/Modal";
import DatePicker from "react-datepicker";
import { Button } from "@mui/material";
import { CreateFolder } from "@/services/create-folder.js";
import pathManager from "@/services/pathmanager.js";

function formatFolderDate(date) {
  if (!date) return "";
  return date
    .toLocaleDateString("en-us", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    })
    .replaceAll("/", "-");
}

export default function CalendarSelection({ location, onClose }) {
  const [uploadNewDate, setUploadNewDate] = useState(new Date());
  const [dateString, setDateString] = useState(() => formatFolderDate(new Date()));
  const [creating, setCreating] = useState(false);

  const handleClose = () => {
    if (location === "SubfolderTabs") {
      window.dispatchEvent(new CustomEvent("folderChanged", {}));
    } else if (location === "UploadModal") {
      window.dispatchEvent(new CustomEvent("dateAdded", { detail: "calendar" }));
    }
    onClose?.();
  };

  function handleSelect(date) {
    // Use `date` from the picker — uploadNewDate is still the previous
    // value until the next render after setUploadNewDate.
    setUploadNewDate(date);
    setDateString(formatFolderDate(date));
  }

  const handleCreateFolder = async () => {
    // Compute from the selected Date object — do not trust dateString alone.
    // Calling handleSelect() then reading dateString still sees the old value
    // because setState is async.
    const name = dateString || formatFolderDate(uploadNewDate);
    if (!name) return;

    setCreating(true);
    const success = await CreateFolder(name);
    setCreating(false);

    if (!success) return;

    if (location === "SubfolderTabs") {
      window.dispatchEvent(new CustomEvent("folderChanged", { detail: name }));
      window.dispatchEvent(new CustomEvent("dateAdded", {}));
    } else if (location === "UploadModal") {
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
          <Button variant="primary" onClick={handleCreateFolder} disabled={creating}>
            {creating ? "Creating…" : "Create Folder"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
