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
  deleteAudio: async (fileUrl) => {
    if (!fileUrl || !fileUrl.includes("/uploads/audio/")) return;
    
    try {
      const urlObject = new URL(fileUrl);
      const filename = urlObject.pathname.split("/").pop();
      const response = await axios.delete(`${API_URL}/upload/audio`, {
        data: { filename },
        withCredentials: true,
      });

      return response.data;
    } catch (e) {
      console.error("Error parsing audio URL for deletion:", e);
      // Fallback to simple split if URL parsing fails
      const filename = fileUrl.split("/").pop();
      const response = await axios.delete(`${API_URL}/upload/audio`, {
        data: { filename },
        withCredentials: true,
      });
      return response.data;
    }
  },
  uploadImage: async (imageFile) => {
    const formData = new FormData();
    formData.append("image", imageFile);

    const response = await axios.post(`${API_URL}/upload/image`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      withCredentials: true,
    });

    return response.data;
  },
  deleteImage: async (fileUrl) => {
    if (!fileUrl || !fileUrl.includes("/uploads/images/")) return;
    
    try {
      const urlObject = new URL(fileUrl);
      const filename = urlObject.pathname.split("/").pop();
      const response = await axios.delete(`${API_URL}/upload/image`, {
        data: { filename },
        withCredentials: true,
      });

      return response.data;
    } catch (e) {
      console.error("Error parsing image URL for deletion:", e);
      // Fallback
      const filename = fileUrl.split("/").pop();
      const response = await axios.delete(`${API_URL}/upload/image`, {
        data: { filename },
        withCredentials: true,
      });
      return response.data;
    }
  },
};
