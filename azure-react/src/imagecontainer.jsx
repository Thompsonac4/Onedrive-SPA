import React, { useEffect, useRef, useState } from "react";

import { authService } from "./authService.js";
import { graphConfig } from "./msal-config.jsx";
import {
  fetchImageNames,
  fetchImagePreviews,
  fetchPreviewUrl,
} from "./load-images.jsx";
import pathManager from "./pathmanager.js";

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
  const trackRef = useRef(null);

  useEffect(() => {
    async function loadFiles() {
      console.log("Loading files from:", pathManager.imagePath);
      const fileArray = await fetchImageNames(pathManager.imagePath);
      console.log("Files returned:", fileArray);

      const loadedFiles = await Promise.all(
        fileArray.map(async (file) => {
          const type = classify(file.name);

          const base = {
            id: file.id,
            name: file.name,
            type,
            webUrl: file.webUrl,
            url: null,
            isBlob: false,
          };

          try {
            if (type === "image" || type === "pdf") {
              // Images and PDFs render fine from a blob URL
              const blob = await fetchImagePreviews(
                `https://graph.microsoft.com/v1.0/drives/${graphConfig.driveId}/items/${file.id}/content`
              );
              base.url = URL.createObjectURL(blob);
              base.isBlob = true;
            } else if (
              type === "word" ||
              type === "excel" ||
              type === "powerpoint"
            ) {
              // IMPORTANT: do NOT fetch /content for Office files — a blob in an
              // iframe forces the browser to download it. Use an embeddable
              // preview URL (Office Online viewer) instead.
              base.url = await fetchPreviewUrl(graphConfig.driveId, file.id);
            }
            return base;
          } catch (error) {
            console.error("Failed loading:", file.name, error);
            return { ...base, url: null };
          }
        })
      );

      console.log("Loaded previews:", loadedFiles);
      setFiles(loadedFiles);
    }

    if (authService.isAuthenticated()) {
      loadFiles();
    }
    window.addEventListener("imagesChanged", loadFiles);
    return () => {
      window.removeEventListener("imagesChanged", loadFiles);
    };
  }, []);

  // Release blob URLs when the file list changes / component unmounts
  useEffect(() => {
    return () => {
      files.forEach((file) => {
        if (file.isBlob && file.url) {
          URL.revokeObjectURL(file.url);
        }
      });
    };
  }, [files]);

  // Scroll the strip sideways by roughly one tile width
  function scrollByTiles(direction) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * 340, behavior: "smooth" });
  }

  function renderFile(file) {
    switch (file.type) {
      case "image":
        return <img src={file.url} alt={file.name} />;

      case "pdf":
        return <iframe src={file.url} title={file.name} />;

      case "word":
      case "excel":
      case "powerpoint":
        // Embed via preview URL when available; otherwise show a safe tile
        if (file.url) {
          return <iframe src={file.url} title={file.name} />;
        }
        return (
          <div className="file-placeholder">
            <div className="file-icon">{iconFor(file.type)}</div>
            <p>{file.name}</p>
            {file.webUrl && (
              <a href={file.webUrl} target="_blank" rel="noreferrer">
                Open in OneDrive
              </a>
            )}
          </div>
        );

      default:
        return (
          <div className="file-placeholder">
            <div className="file-icon">{iconFor(file.type)}</div>
            <p>{file.name}</p>
            {file.webUrl && (
              <a href={file.webUrl} target="_blank" rel="noreferrer">
                Open in OneDrive
              </a>
            )}
          </div>
        );
    }
  }

  if (!authService.isAuthenticated()) {
    return null;
  }

  if (files.length === 0) {
    return <div className="carousel-empty">No files to show yet.</div>;
  }

  return (
    <div className="ImageContainer">
      <div className="carousel">
        <button
          className="arrow"
          onClick={() => scrollByTiles(-1)}
          disabled={files.length < 2}
          aria-label="Scroll left"
        >
          ❮
        </button>

        {/* Horizontal strip: shows every file at once, scrolls sideways */}
        <div className="gallery-track" ref={trackRef}>
          {files.map((file) => (
            <div className="gallery-item" key={file.id}>
              <div className="gallery-media">{renderFile(file)}</div>
              <p className="gallery-name">{file.name}</p>
            </div>
          ))}
        </div>

        <button
          className="arrow"
          onClick={() => scrollByTiles(1)}
          disabled={files.length < 2}
          aria-label="Scroll right"
        >
          ❯
        </button>
      </div>
    </div>
  );
}
