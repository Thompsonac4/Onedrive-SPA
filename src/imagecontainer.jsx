import React, { useEffect, useRef, useState } from "react";

import { authService } from "./authService.js";
import { graphConfig } from "./msal-config.jsx";
import {fetchImageNames, fetchImagePreviews, fetchPreviewUrl,} from "./load-images.jsx";
import pathManager from "./pathmanager.js";
import FileThumbnail from "./filethumbnail.jsx";
import FileViewer from "./fileviewer.jsx";

import "./imagecontainer.css";

import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import { Flag } from "@mui/icons-material";

/** Maps a file extension to a coarse "type" used for how we render it. */
function classify(name) {
  const extension = name.split(".").pop().toLowerCase();

  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(extension)) {
    return "image";
  }
  if (extension === "pdf") return "pdf";
  if (["doc", "docx"].includes(extension)) return "word";
  if (["xls", "xlsx", "csv"].includes(extension)) return "excel";
  if (["ppt", "pptx"].includes(extension)) return "powerpoint";
  return "unknown";
}

/** Emoji icon for the placeholder tile when a file can't be shown inline. */
function iconFor(type) {
  switch (type) {
    case "word":
      return "📝";
    case "excel":
      return "📊";
    case "powerpoint":
      return "📽️";
    case "pdf":
      return "📕";
    default:
      return "📄";
  }
}

export default function ImageContainer() {
  const [files, setFiles] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  async function loadFiles() {
    if (!pathManager.imagePath) {
      setFiles([]);
      return;
    }

    const fileArray = await fetchImageNames(pathManager.imagePath);

    const loadedFiles = await Promise.all(
      fileArray.map(async (file) => {
        const type = classify(file.name);

        let item = {
          id: file.id,
          name: file.name,
          type,
          url: null,
        };

        try {
          if (type === "image") {
            const blob = await fetchImagePreviews(
              `https://graph.microsoft.com/v1.0/drives/${graphConfig.driveId}/items/${file.id}/content`
            );

            item.url = URL.createObjectURL(blob);
            item.isBlob = true;
          } 
          else if (
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

          return item;

        } catch (error) {
          console.error("Failed loading:", file.name, error);
          return item;
        }
      })
    );

    setFiles(loadedFiles);
  }


  useEffect(() => {

    if (authService.isAuthenticated()) {
      loadFiles();
    }


    function clearImages() {
      setFiles([]);
    }


    function reloadImages() {
      loadFiles();
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


  if (!authService.isAuthenticated()) {
    return null;
  }

  if (files.length === 0) {
    return (
      <div className="carousel-empty">
        No files to show yet.
      </div>
    );
  }


  return (
    <div className="ImageContainer">
      <div className="thumbnail-strip">
        {files.map((file,index)=>(
          <FileThumbnail
            key={file.id}
            file={file}
            onClick={()=>{
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
          close={()=>setViewerOpen(false)}
        />
      }
    </div>
  );
}
