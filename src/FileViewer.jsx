import {Swiper, SwiperSlide}
from "swiper/react";

import {
    Navigation,
    Keyboard,
    Zoom
}
from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/zoom";

import FileSlide from "./fileslide.jsx";

export default function FileViewer({files, startIndex, close}){
    return (
        <div className = "viewer">
            <button className = "close" onClick = {close}>
                ✕
            </button>
            <Swiper

            initialSlide = {startIndex}

            modules ={[
                Navigation,
                Keyboard,
                Zoom
            ]}
            navigation

            keyboard

            zoom

            >
                {files.map(file=> ( 
                <SwiperSlide key = {file.id}>
                    <FileSlide file={file}/>
                </SwiperSlide>))
                }
            </Swiper>
        </div>
    )
}