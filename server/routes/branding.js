// File: server/routes/branding.js
import express from "express";
import {
    generateManifest,
    getBrandingByLocationId,
    getBrandingBySubdomain,
    validateSubdomain,
} from "../controller/brandingController.js";

const router = express.Router();

// Get branding info for a location ID
router.get("/location/:locationId", getBrandingByLocationId);

// Get branding info for a subdomain
router.get("/:subdomain", getBrandingBySubdomain);

// Generate dynamic PWA manifest for a subdomain
router.get("/manifest/:subdomain.webmanifest", generateManifest);

// Validate subdomain availability
router.post("/validate-subdomain", validateSubdomain);

export default router;
