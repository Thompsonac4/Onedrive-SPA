export default function FileThumbnail({file, onClick}){

    return (
            <div className="thumbnail" onClick={onClick}>
                {
                    file.type === "image" ?
                    <img className="thumbnail-image" src={file.url} alt={file.name}/> :
                    <div className="file-icon">

                        {
                            file.type === "pdf"
                                ? "📕"
                                :
                            file.type === "excel"
                                ? "📊"
                                :
                            file.type === "word"
                                ? "📝"
                                :
                            file.type === "powerpoint"
                                ? "📽️"
                                :
                                "📄"
                        }
                    </div>
                }
                <p>
                    {file.name}
                </p>
            </div>
        );
}