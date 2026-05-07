// File: client/src/services/uploadService.js
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8800/api";
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "";
const CLOUDINARY_FOLDER = import.meta.env.VITE_CLOUDINARY_FOLDER || "";

const hasCloudinaryConfig =
  Boolean(CLOUDINARY_CLOUD_NAME) && Boolean(CLOUDINARY_UPLOAD_PRESET);

const isCloudinaryUrl = (url) =>
  typeof url === "string" && url.includes("res.cloudinary.com/");

const extractCloudinaryPublicId = (url) => {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1) return "";
    const afterUpload = parts.slice(uploadIndex + 1);
    if (afterUpload[0] && afterUpload[0].startsWith("v")) {
      afterUpload.shift();
    }
    const publicIdWithExt = afterUpload.join("/");
    return publicIdWithExt.replace(/\.[^/.]+$/, "");
  } catch {
    return "";
  }
};

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
    if (hasCloudinaryConfig) {
      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      if (CLOUDINARY_FOLDER) formData.append("folder", CLOUDINARY_FOLDER);

      const response = await axios.post(cloudinaryUrl, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return {
        success: true,
        url: response.data.secure_url || response.data.url,
        publicId: response.data.public_id,
        provider: "cloudinary",
      };
    }

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
  deleteImage: async (fileUrlOrPayload) => {
    const payload =
      typeof fileUrlOrPayload === "string"
        ? { url: fileUrlOrPayload, publicId: "" }
        : fileUrlOrPayload || { url: "", publicId: "" };

    if (payload.publicId || isCloudinaryUrl(payload.url)) {
      const publicId =
        payload.publicId || extractCloudinaryPublicId(payload.url || "");
      if (!publicId) {
        console.warn("Cloudinary image delete requires publicId. Skipping delete.");
        return;
      }
      const response = await axios.delete(`${API_URL}/upload/cloudinary`, {
        data: { publicId },
        withCredentials: true,
      });
      return response.data;
    }

    if (!payload.url || !payload.url.includes("/uploads/images/")) return;
    
    try {
      const urlObject = new URL(payload.url);
      const filename = urlObject.pathname.split("/").pop();
      const response = await axios.delete(`${API_URL}/upload/image`, {
        data: { filename },
        withCredentials: true,
      });

      return response.data;
    } catch (e) {
      console.error("Error parsing image URL for deletion:", e);
      // Fallback
      const filename = payload.url.split("/").pop();
      const response = await axios.delete(`${API_URL}/upload/image`, {
        data: { filename },
        withCredentials: true,
      });
      return response.data;
    }
  },
};
