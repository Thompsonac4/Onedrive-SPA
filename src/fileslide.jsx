export default function FileSlide({
    file
}) {
    switch (file.type)
    {
        case "image":
            return(
                <div className = "swiper-zoom-container">
                    <img src = {file.url}/>
                </div>
            );
        case "pdf":
            return (
                <iframe src = { file.url } className = "document-viewer" />
            );
        case "word":
        case "excel":
        case "powerpoint":
            return (
                <iframe src = {file.url} className = "document-viewer"/>
            );
        default:
            return (
                <h2>
                    Cannot Preview
                </h2>
            )
    }
}