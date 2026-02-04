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
