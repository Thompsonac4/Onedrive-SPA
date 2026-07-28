import { useEffect, useState } from "react";
import FileSlide from "./fileslide.jsx";
import Dropdown from "react-bootstrap/Dropdown";
import Modal from "react-bootstrap/Modal";
import {Button} from "@mui/material";
import pathManager from "./pathmanager.js";
import { DeleteItem } from "./delete-item.js";
import { ChangeFileName } from "./change-file-name.js";
import { ModalTitle, Form } from "react-bootstrap";

/**
 * Lightbox viewer — one file at a time, React-controlled.
 * Swiper was jumping off video slides when the player (or neighbor
 * iframes) finished loading and triggered a size/update cycle.
 */
export default function FileViewer({ files, startIndex, close }) {
  const [currentId, setCurrentId] = useState(
    () => files[startIndex]?.id ?? null
  );
  const driveId = import.meta.env.VITE_DRIVE_ID;
  const [showEditName, setShowEditName] = useState(false);
  const [showDeleteFile, setShowDeleteFile] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [showDeleteResult, setShowDeleteResult] = useState(false);
  const [newName, setNewName] = useState("");
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalButtonDelete, setModalButtonDelete] = useState(false);
  const [modalButtonChange, setModalButtonChange] = useState(false);


  const index = Math.max(
    0,
    files.findIndex((f) => f.id === currentId)
  );
  const file = files[index] ?? files[startIndex] ?? null;
  const hasPrev = index > 0;
  const hasNext = index >= 0 && index < files.length - 1;

  function goPrev() {
    if (index > 0) {
      setCurrentId(files[index - 1].id);
    }
  }

  function goNext() {
    if (index < files.length - 1) {
      setCurrentId(files[index + 1].id);
    }
  }
  
  async function deletionSetup(){
    setModalTitle("Delete File");
    setModalMessage(`Do you want to delete file ${files[index].name}?`);
    setModalButtonChange(false);
    setModalButtonDelete(true);
    setShowDeleteFile(true);
  }

  async function deleteFile(){
    const urlDeletion = await `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${files[index].id}`;
    const fileDeleted = await files[index].name;
    try{
        await DeleteItem(urlDeletion);
        pathManager.deletedFileName = fileDeleted;
        window.dispatchEvent(new CustomEvent("imagesChanged", {}));
        window.dispatchEvent(new CustomEvent("deletionStatus", {detail: {fileName: fileDeleted, message: " Was Deleted Successfully."}}));
        close();
    }
    catch (error)
    {
      console.error("Delete failed:", error);

        window.dispatchEvent(new CustomEvent("deletionStatus", {detail: {fileName: fileDeleted, message: `Deletion Failed. Error: ${error.message}`}}));
    }
    
  }

  async function changeSetup()
  {
    setModalTitle("Change Name");
    setModalMessage(`Change File Name ${files[index].name}?`);
    setModalButtonDelete(false);
    setModalButtonChange(true);
    setShowDeleteFile(true);
  }
  async function changeName() {
    const url = await `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${files[index].id}`;
    const ext = files[index].name.substring(files[index].name.lastIndexOf('.') + 1);
    const name = newName+'.'+ext;
    console.log(name);
    try {
      await ChangeFileName(url, name);
      window.dispatchEvent(new CustomEvent("imagesChanged", {}));
      window.dispatchEvent(new CustomEvent("deletionStatus", {detail: {fileName: name, message: " Was Changed Successfully"}}));
    }
    catch (error) {
      console.error("Change name failed: ", error)
    }
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        close();
      } else if (e.key === "ArrowLeft") {
        if (index > 0) {
          setCurrentId(files[index - 1].id);
        }
      } else if (e.key === "ArrowRight") {
        if (index < files.length - 1) {
          setCurrentId(files[index + 1].id);
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, files, index]);

  if (!file) {
    return null;
  }

  return (
    <div className="viewer">
      <button className="close" onClick={close} type="button" aria-label="Close">
        ✕
      </button>

      {hasPrev && (
        <button
          className="viewer-nav viewer-nav-prev"
          onClick={goPrev}
          type="button"
          aria-label="Previous file"
        >
          ‹
        </button>
      )}

      {/* key forces a clean mount per file — no leftover video/iframe */}
      <div className="viewer-stage" key={file.id}>
        <FileSlide file={file} />
      </div>

      {hasNext && (
        <button
          className="viewer-nav viewer-nav-next"
          onClick={goNext}
          type="button"
          aria-label="Next file"
        >
          ›
        </button>
      )}
      <div className = "viewer-menu">
        <Dropdown>
          <Dropdown.Toggle variant="primary" size="lg">
            EDIT
          </Dropdown.Toggle>
          <Dropdown.Menu drop="up">
            <Dropdown.Item onClick={() => changeSetup()}>
              Edit Name
            </Dropdown.Item>
            <Dropdown.Item href="#/action-2" className="text-danger" onClick={() => deletionSetup()}>
              Delete File
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>


        <Modal container={document.body} show={showDeleteFile} onHide={() => setShowDeleteFile(false)} centered>
         <Modal.Header closeButton>
            <Modal.Title className="text-danger">
              {`${modalTitle}`}
            </Modal.Title>
          </Modal.Header>
            <Modal.Body className="text-center" style={{ whiteSpace: "pre-line" }}>
              {`${modalMessage}`}
              {modalButtonChange && <Form.Group className="mb-3" controlId="modalFormInput">
              <Form.Label>New File Name</Form.Label>
              {/* Textbox Input Element */}
              <Form.Control
                type="text"
                placeholder="New Name Here"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </Form.Group>}
            </Modal.Body>
            
          <Modal.Footer>
            <Button variant="secondary" onClick = {() => setShowDeleteFile(false)}>
              Close
            </Button>
            {modalButtonDelete && <Button className="text-danger" onClick={() => deleteFile()}>
              Delete
            </Button>}
            {modalButtonChange && <Button className="text-danger" onClick={() => changeName()}>
              Change Name
            </Button>}
          </Modal.Footer> 
        </Modal>
    </div>
    
  );
}
