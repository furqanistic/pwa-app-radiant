// File: server/routes/upload.js
import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { deleteAudio, uploadAudio } from "../controller/uploadController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure Multer for audio storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/audio/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || ".webm";
    cb(null, "voicenote-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed!"), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// POST /api/upload/audio - Secure with token
router.post("/audio", verifyToken, upload.single("audio"), uploadAudio);
router.delete("/audio", verifyToken, deleteAudio);

export default router;
