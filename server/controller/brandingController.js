// File: server/controller/brandingController.js
import Location from "../models/Location.js";

/**
 * Get branding information by subdomain
 * GET /api/branding/:subdomain
 */
export const getBrandingBySubdomain = async (req, res, next) => {
  try {
    const { subdomain } = req.params;

    if (!subdomain) {
      return res.status(400).json({
        success: false,
        message: "Subdomain is required",
      });
    }

    // Find location by subdomain
    const location = await Location.findOne({ 
      subdomain: subdomain.toLowerCase(),
      isActive: true 
    }).select('name logo favicon themeColor subdomain locationId address membership');

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found for this subdomain",
      });
    }

    // Return branding data
    res.status(200).json({
      success: true,
      data: {
        subdomain: location.subdomain,
        locationId: location.locationId,
        name: location.name,
        logo: location.logo,
        favicon: location.favicon || location.logo, // Fallback to logo if no favicon
        themeColor: location.themeColor || "#ec4899",
        address: location.address,
        membership: location.membership,
      },
    });
  } catch (error) {
    console.error("Get branding error:", error);
    next(error);
  }
};

/**
 * Get branding information by locationId
 * GET /api/branding/location/:locationId
 */
export const getBrandingByLocationId = async (req, res, next) => {
  try {
    const { locationId } = req.params;

    if (!locationId) {
      return res.status(400).json({
        success: false,
        message: "Location ID is required",
      });
    }

    const location = await Location.findOne({
      locationId,
      isActive: true,
    }).select('name logo favicon themeColor subdomain locationId address membership');

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found for this location ID",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        subdomain: location.subdomain,
        locationId: location.locationId,
        name: location.name,
        logo: location.logo,
        favicon: location.favicon || location.logo,
        themeColor: location.themeColor || "#ec4899",
        address: location.address,
        membership: location.membership,
      },
    });
  } catch (error) {
    console.error("Get branding by locationId error:", error);
    next(error);
  }
};

/**
 * Generate dynamic PWA manifest for a subdomain
 * GET /api/manifest/:subdomain.webmanifest
 */
export const generateManifest = async (req, res, next) => {
  try {
    const { subdomain } = req.params;

    if (!subdomain) {
      return res.status(400).json({
        success: false,
        message: "Subdomain is required",
      });
    }

    // Find location by subdomain
    const location = await Location.findOne({ 
      subdomain: subdomain.toLowerCase(),
      isActive: true 
    }).select('name logo favicon themeColor subdomain');

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found for this subdomain",
      });
    }

    // Generate manifest
    const manifest = {
      name: `${location.name} - RadiantAI`,
      short_name: location.name,
      description: `Beauty and wellness management for ${location.name}`,
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait-primary",
      theme_color: location.themeColor || "#ec4899",
      background_color: "#ffffff",
      icons: [
        {
          src: location.favicon || location.logo || "/favicon_io/android-chrome-192x192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: location.logo || "/favicon_io/android-chrome-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ],
      screenshots: [
        {
          src: location.logo || "/favicon_io/android-chrome-512x512.png",
          sizes: "512x512",
          type: "image/png",
          form_factor: "wide"
        },
        {
          src: location.favicon || location.logo || "/favicon_io/android-chrome-192x192.png",
          sizes: "192x192",
          type: "image/png",
          form_factor: "narrow"
        }
      ]
    };

    // Set content type and return manifest
    res.setHeader('Content-Type', 'application/manifest+json');
    res.status(200).json(manifest);
  } catch (error) {
    console.error("Generate manifest error:", error);
    next(error);
  }
};

/**
 * Validate subdomain availability and format
 * POST /api/branding/validate-subdomain
 */
export const validateSubdomain = async (req, res, next) => {
  try {
    const { subdomain, locationId } = req.body;

    if (!subdomain) {
      return res.status(400).json({
        success: false,
        message: "Subdomain is required",
      });
    }

    const cleanSubdomain = subdomain.toLowerCase().trim();

    // Validate format
    const subdomainRegex = /^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/;
    if (!subdomainRegex.test(cleanSubdomain)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subdomain format. Must be 3-20 characters, lowercase alphanumeric with hyphens, cannot start/end with hyphen.",
      });
    }

    // Reserved subdomains
    const reservedSubdomains = ['www', 'api', 'admin', 'app', 'mail', 'ftp', 'localhost', 'staging', 'dev', 'test'];
    if (reservedSubdomains.includes(cleanSubdomain)) {
      return res.status(400).json({
        success: false,
        message: "This subdomain is reserved and cannot be used.",
      });
    }

    // Check if subdomain already exists (excluding current location if editing)
    const query = { subdomain: cleanSubdomain };
    if (locationId) {
      query.locationId = { $ne: locationId };
    }

    const existingLocation = await Location.findOne(query);

    if (existingLocation) {
      return res.status(400).json({
        success: false,
        message: "This subdomain is already taken. Please choose another.",
      });
    }

    // Subdomain is available
    res.status(200).json({
      success: true,
      message: "Subdomain is available",
      data: {
        subdomain: cleanSubdomain,
        previewUrl: `https://${cleanSubdomain}.cxrsystems.com`,
      },
    });
  } catch (error) {
    console.error("Validate subdomain error:", error);
    next(error);
  }
};
