import React, { useEffect, useState } from "react";

import { authService } from "./authService.js";
import { graphConfig } from "./msal-config.jsx";
import { fetchImageNames, fetchImagePreviews, fetchPreviewUrl, fetchVideoUrl } from "./load-images.jsx";
import pathManager from "./pathmanager.js";
import FileThumbnail from "./filethumbnail.jsx";
import FileViewer from "./fileviewer.jsx";

import "./imagecontainer.css";

/** Maps a file extension to a coarse "type" used for how we render it. */
function classify(name) {
  const extension = name.split(".").pop().toLowerCase();

  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(extension))
    return "image";

  if (["mp4", "webm", "mov", "m4v", "ogg"].includes(extension))
    return "video";

  if (extension === "pdf")
    return "pdf";

  if (["doc", "docx"].includes(extension))
    return "word";

  if (["xls", "xlsx", "csv"].includes(extension))
    return "excel";

  if (["ppt", "pptx"].includes(extension))
    return "powerpoint";

  return "unknown";
}

//Image Container Function
export default function ImageContainer() {
  const [files, setFiles] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function loadFiles() {
    if (!pathManager.imagePath) {
      setFiles([]);
      return;
    }

    setFiles([]);
    setLoading(true);

    const fileArray = await fetchImageNames(pathManager.imagePath);

    const imageFiles = [];
    const documentFiles = [];
    const videoFiles = [];

    for (const file of fileArray) {
      const type = classify(file.name);

      if (type === "image") {
        imageFiles.push(file);
      }
      else if (type === "video") {
        videoFiles.push(file);

      } else {
        documentFiles.push(file);
      }
    }
    imageFiles.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true })
    );

    documentFiles.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true })
    );

    videoFiles.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true })
    );

    async function loadSingleFile(file) {
      const type = classify(file.name);

      let item = {
        id: file.id,
        name: file.name,
        type,
        url: null,
      };

      //Get Blobs from our path for the data of the file we are loading
      try {
        if (type === "image") {
          const blob = await fetchImagePreviews(
            `https://graph.microsoft.com/v1.0/drives/${graphConfig.driveId}/items/${file.id}/content`
          );

          item.url = URL.createObjectURL(blob);
          item.isBlob = true;
        } else if (type === "video") {
          // Streamable URL — do NOT download the whole video as a blob
          item.url = await fetchVideoUrl(graphConfig.driveId, file.id);
          item.isBlob = false;
        } else if (
          type === "pdf" ||
          type === "word" ||
          type === "excel" ||
          type === "powerpoint"
        ) {
          item.url = await fetchPreviewUrl(
            graphConfig.driveId,
            file.id
          );
        }
      }
      catch (error) {
        console.error("Failed loading: ", file.name, error);
      }


      return item;
    }
    const loadedImages = await Promise.all(
      imageFiles.map(loadSingleFile)
    );

    const loadedDocuments = await Promise.all(
      documentFiles.map(loadSingleFile)
    );

    const loadedVideos = await Promise.all(
      videoFiles.map(loadSingleFile)
    );

    setFiles([
      ...loadedImages,
      ...loadedDocuments,
      ...loadedVideos
    ]);

    setLoading(false);
  }
  //Event Handler to reload the images depending on what the Jobsite and Folder Selection has been changed
  useEffect(() => {

    if (authService.isAuthenticated()) {
      loadFiles();
    }

    function clearImages() {
      setFiles([]);
    }

    async function reloadImages() {
      await clearImages();
      await loadFiles();
    }

    window.addEventListener(
      "jobsiteImagesChanged",
      clearImages
    );

    window.addEventListener(
      "imagesChanged",
      reloadImages
    );

    return () => {
      window.removeEventListener(
        "jobsiteImagesChanged",
        clearImages
      );

      window.removeEventListener(
        "imagesChanged",
        reloadImages
      );
    };

  }, []);

  // Check if we are authorized
  if (!authService.isAuthenticated()) {
    return null;
  }

  //Waiting Screeen / Empty Display
  if (files.length === 0) {
    if (loading) {
      return (
        <div className="carousel-empty">
          Waiting to load files.
        </div>
      );
    }
    else {
      return (
        <div className="carousel-empty">
          No files found.
        </div>
      );
    }
  }


  return (
    <div className="ImageContainer">
      <div className="thumbnail-strip">
        {files.map((file, index) => (
          <FileThumbnail
            key={file.id}
            file={file}
            onClick={() => {
              setActiveIndex(index);
              setViewerOpen(true);
            }}
          />
        ))}
      </div>

      {viewerOpen &&
        <FileViewer
          files={files}
          startIndex={activeIndex}
          close={() => setViewerOpen(false)}
        />
      }
    </div>
  );
}
