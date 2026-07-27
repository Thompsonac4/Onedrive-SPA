//Function for the Carousel to show the images in lightbox
export default function FileSlide({ file }) {
  switch (file.type) {
    case "image":
      return (
        <img
          className="viewer-image"
          src={file.url}
          alt={file.name}
        />
      );

    case "video":
      return (
        <div className="video-container">
          {file.url ? (
            <video
              src={file.url}
              controls
              playsInline
              preload="metadata"
              controlsList="nodownload"
            />
          ) : (
            <h2>Video URL missing</h2>
          )}
        </div>
      );

    case "pdf":
    case "word":
    case "excel":
    case "powerpoint":
      return (
        <iframe
          src={file.url}
          className="document-viewer"
          title={file.name}
        />
      );

    default:
      return <h2>Cannot Preview</h2>;
  }
}
