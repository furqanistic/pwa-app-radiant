// File: server/controller/uploadController.js
import { createError } from "../error.js";

export const uploadAudio = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(createError(400, "No file uploaded"));
    }

    // The file URL to be stored in DB and used by frontend
    // Assuming backend runs on port 8800 and serves 'public' statically
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/audio/${req.file.filename}`;

    res.status(200).json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      message: "Audio uploaded successfully"
    });
  } catch (error) {
    next(error);
  }
};

export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(createError(400, "No image uploaded"));
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/images/${req.file.filename}`;

    res.status(200).json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      message: "Image uploaded successfully"
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAudio = async (req, res, next) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return next(createError(400, "Filename is required"));
    }

    // Safety check: ensure filename doesn't contain path traversal characters
    if (filename.includes("..") || filename.includes("/")) {
      return next(createError(400, "Invalid filename"));
    }

    const fs = await import("fs/promises");
    const path = await import("path");
    const { fileURLToPath } = await import("url");
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // The public folder is at the root of the server
    const filePath = path.join(__dirname, "..", "public", "uploads", "audio", filename);

    try {
      await fs.unlink(filePath);
      res.status(200).json({
        success: true,
        message: "Audio deleted successfully"
      });
    } catch (err) {
      if (err.code === 'ENOENT') {
        // File already gone, consider success
        return res.status(200).json({
          success: true,
          message: "Audio file not found, but considered deleted"
        });
      }
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

export const deleteImage = async (req, res, next) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return next(createError(400, "Filename is required"));
    }

    if (filename.includes("..") || filename.includes("/")) {
      return next(createError(400, "Invalid filename"));
    }

    const fs = await import("fs/promises");
    const path = await import("path");
    const { fileURLToPath } = await import("url");
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const filePath = path.join(__dirname, "..", "public", "uploads", "images", filename);

    try {
      await fs.unlink(filePath);
      res.status(200).json({
        success: true,
        message: "Image deleted successfully"
      });
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(200).json({
          success: true,
          message: "Image file not found, but considered deleted"
        });
      }
      throw err;
    }
  } catch (error) {
    next(error);
  }
};
