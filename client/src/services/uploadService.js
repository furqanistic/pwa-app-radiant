// File: client/src/services/uploadService.js
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8800/api";

export const uploadService = {
  uploadAudio: async (audioBlob) => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "voicenote.webm");

    const response = await axios.post(`${API_URL}/upload/audio`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      withCredentials: true,
    });

    return response.data;
  },
};
