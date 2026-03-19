// File: server/routes/qrCode.js
import express from "express";
import {
  generateQRCodeForLocation,
  getAllQRCodes,
  getLocationQRCode,
  getLocationQRCodeByLocationId,
  getQRCodeStats,
  resolveQRCodeLocation,
  scanQRCode,
  toggleQRCodeStatus,
  updateQRCodeId,
} from "../controller/qrCode.js";
import {
  requireAdminOrAbove,
  verifyToken,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// PUBLIC: Scan QR code (no authentication required for initial scan)
router.post("/scan", scanQRCode);
router.get("/resolve/:qrId", resolveQRCodeLocation);

// AUTHENTICATED: Get QR code details for a specific location
router.get("/by-location-id/:locationId", verifyToken, getLocationQRCodeByLocationId);
router.get("/:locationId", verifyToken, getLocationQRCode);

// ADMIN ONLY: Generate QR code for a location
router.post(
  "/:locationId/generate",
  verifyToken,
  requireAdminOrAbove,
  generateQRCodeForLocation
);

// ADMIN ONLY: Get QR code statistics
router.get(
  "/:locationId/stats",
  verifyToken,
  requireAdminOrAbove,
  getQRCodeStats
);

// ADMIN ONLY: Toggle QR code status
router.patch(
  "/:locationId/toggle-status",
  verifyToken,
  requireAdminOrAbove,
  toggleQRCodeStatus
);

// ADMIN ONLY: Update QR ID
router.patch(
  "/:locationId/qr-id",
  verifyToken,
  requireAdminOrAbove,
  updateQRCodeId
);

// ADMIN ONLY: Get all QR codes
router.get("/", verifyToken, requireAdminOrAbove, getAllQRCodes);

export default router;
