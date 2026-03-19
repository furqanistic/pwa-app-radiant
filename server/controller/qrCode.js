// File: server/controller/qrCode.js
import crypto from "crypto";
import { createError } from "../error.js";
import Location from "../models/Location.js";
import PointTransaction from "../models/PointTransaction.js";
import QRCodeScan from "../models/QRCodeScan.js";
import User from "../models/User.js";
import { createSystemNotification } from "./notification.js";

// Generate unique QR ID
const generateQRId = () => {
  return `QR_${Date.now()}_${crypto
    .randomBytes(8)
    .toString("hex")
    .toUpperCase()}`;
};

const normalizeCustomQRId = (value) =>
  `${value || ""}`
    .trim()
    .replace(/\s+/g, "_")
    .toUpperCase();

const buildSpaSignupUrl = (location) => {
  const normalizedLocationId = location?.locationId
    ? encodeURIComponent(location.locationId)
    : "";
  const pathWithSpa = normalizedLocationId
    ? `/auth?spa=${normalizedLocationId}`
    : "/auth";
  const subdomain = `${location?.subdomain || ""}`.trim().toLowerCase();

  if (subdomain) {
    return `https://${subdomain}.cxrsystems.com${pathWithSpa}`;
  }

  return `https://app.cxrsystems.com${pathWithSpa}`;
};

// Generate QR Code for a location
export const generateQRCodeForLocation = async (req, res, next) => {
  try {
    const { locationId } = req.params;
    const adminUser = req.user;

    // Check if admin
    if (!["admin", "super-admin"].includes(adminUser.role)) {
      return next(createError(403, "Only admins can generate QR codes"));
    }

    const location = await Location.findById(locationId);
    if (!location) {
      return next(createError(404, "Location not found"));
    }

    // Generate new QR ID
    const qrId = generateQRId();
    const qrData = {
      qrId,
      locationId: location.locationId,
      locationName: location.name,
      timestamp: new Date().toISOString(),
    };

    // Update location with QR code data
    location.qrCode = {
      qrId,
      qrData: JSON.stringify(qrData), // Store as JSON string
      pointsValue: 50,
      isEnabled: true,
      createdAt: new Date(),
      scans: 0,
    };

    await location.save();

    res.status(200).json({
      status: "success",
      message: "QR code generated successfully",
      data: {
        qrId,
        locationId: location.locationId,
        locationName: location.name,
        qrData,
        pointsValue: 50,
        isEnabled: true,
      },
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    next(createError(500, "Failed to generate QR code"));
  }
};

// Get QR code details for a location
export const getLocationQRCode = async (req, res, next) => {
  try {
    const { locationId } = req.params;

    const location = await Location.findById(locationId);
    if (!location) {
      return next(createError(404, "Location not found"));
    }

    if (!location.qrCode?.qrId) {
      return next(createError(404, "QR code not found for this location"));
    }

    const qrData = location.qrCode.qrData
      ? JSON.parse(location.qrCode.qrData)
      : null;

    res.status(200).json({
      status: "success",
      data: {
        qrId: location.qrCode.qrId,
        locationId: location.locationId,
        locationName: location.name,
        qrData,
        pointsValue: location.qrCode.pointsValue,
        isEnabled: location.qrCode.isEnabled,
        scans: location.qrCode.scans,
        lastScannedAt: location.qrCode.lastScannedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching QR code:", error);
    next(createError(500, "Failed to fetch QR code"));
  }
};

// Get QR code details using business locationId (for spa profile fallback)
export const getLocationQRCodeByLocationId = async (req, res, next) => {
  try {
    const { locationId } = req.params;
    const currentUser = req.user;

    if (!locationId) {
      return next(createError(400, "Location ID is required"));
    }

    if (currentUser?.role === "spa") {
      const spaLocationId = currentUser?.spaLocation?.locationId;
      if (!spaLocationId || spaLocationId !== locationId) {
        return next(createError(403, "You can only access your assigned location QR code"));
      }
    }

    const location = await Location.findOne({ locationId });
    if (!location) {
      return next(createError(404, "Location not found"));
    }

    if (!location.qrCode?.qrId) {
      return next(createError(404, "QR code not found for this location"));
    }

    const qrData = location.qrCode.qrData
      ? JSON.parse(location.qrCode.qrData)
      : null;

    res.status(200).json({
      status: "success",
      data: {
        qrId: location.qrCode.qrId,
        locationId: location.locationId,
        locationName: location.name,
        qrData,
        pointsValue: location.qrCode.pointsValue,
        isEnabled: location.qrCode.isEnabled,
        scans: location.qrCode.scans,
        lastScannedAt: location.qrCode.lastScannedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching QR code by locationId:", error);
    next(createError(500, "Failed to fetch QR code"));
  }
};

// Resolve QR code to location/subdomain for legacy URL redirects
export const resolveQRCodeLocation = async (req, res, next) => {
  try {
    const { qrId } = req.params;

    if (!qrId) {
      return next(createError(400, "QR ID is required"));
    }

    const location = await Location.findOne({ "qrCode.qrId": qrId }).select(
      "locationId name subdomain isActive"
    );

    if (!location || !location.isActive) {
      return next(createError(404, "Invalid QR code"));
    }

    return res.status(200).json({
      status: "success",
      data: {
        qrId,
        locationId: location.locationId,
        locationName: location.name,
        subdomain: location.subdomain || null,
      },
    });
  } catch (error) {
    console.error("Error resolving QR location:", error);
    next(createError(500, "Failed to resolve QR code"));
  }
};

// Scan QR Code and award points
export const scanQRCode = async (req, res, next) => {
  try {
    const { qrId, email } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get("User-Agent");

    // Validate input
    if (!qrId || !email) {
      return next(createError(400, "QR ID and email are required"));
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(createError(400, "Invalid email format"));
    }

    // Find location by QR ID
    const location = await Location.findOne({ "qrCode.qrId": qrId }).populate(
      "addedBy"
    );
    if (!location) {
      return next(createError(404, "Invalid QR code"));
    }

    // Check if QR code is enabled
    if (!location.qrCode.isEnabled) {
      return next(createError(400, "This QR code is disabled"));
    }

    // Find spa owner (user with spa role assigned to this location)
    const spaOwner = await User.findOne({
      role: "spa",
      "spaLocation.locationId": location.locationId,
    });

    if (!spaOwner) {
      return next(
        createError(
          500,
          "No spa owner assigned to this location. Please contact support."
        )
      );
    }

    // Find or create user by email
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      const signupUrl = buildSpaSignupUrl(location);

      // Prevent duplicate pending claims within 5 minutes for the same QR/email.
      const recentPendingScan = await QRCodeScan.findOne({
        qrId,
        scannedByEmail: email.toLowerCase(),
        scannedByUser: null,
        status: "pending",
        createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) },
      });
      if (recentPendingScan) {
        return res.status(202).json({
          status: "pending",
          message:
            "A pending claim already exists for this email. Create an account to claim your points.",
          data: {
            scanId: recentPendingScan._id,
            email: email.toLowerCase(),
            pointsToEarn: location.qrCode.pointsValue,
            locationId: location.locationId,
            subdomain: location.subdomain || null,
            signupUrl,
          },
        });
      }

      // User doesn't exist - create a pending scan record
      const pendingScan = new QRCodeScan({
        qrId,
        locationId: location.locationId,
        spaOwnerId: spaOwner._id,
        scannedByEmail: email.toLowerCase(),
        scannedByUser: null,
        pointsAwarded: location.qrCode.pointsValue,
        pointsAwardedToSpaOwner: location.qrCode.pointsValue,
        status: "pending",
        ipAddress,
        userAgent,
      });

      await pendingScan.save();

      return res.status(202).json({
        status: "pending",
        message:
          "No account found for this email. Create an account to claim your points.",
        data: {
          scanId: pendingScan._id,
          email: email.toLowerCase(),
          pointsToEarn: location.qrCode.pointsValue,
          locationId: location.locationId,
          subdomain: location.subdomain || null,
          signupUrl,
        },
      });
    }

    // Check for duplicate scans in the last 5 minutes (fraud prevention)
    const recentScan = await QRCodeScan.findOne({
      qrId,
      scannedByUser: user._id,
      status: "verified",
      createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) },
    });

    if (recentScan) {
      return next(
        createError(
          400,
          "You already scanned this QR code recently. Please try again later."
        )
      );
    }

    // Award points to user
    const pointsToAward = location.qrCode.pointsValue;
    user.points = (user.points || 0) + pointsToAward;
    await user.save();

    // Create transaction for user
    const userTransaction = await PointTransaction.create({
      user: user._id,
      type: "qr_scan",
      points: pointsToAward,
      balance: user.points,
      description: `QR Code scan at ${location.name}`,
      locationId: location.locationId,
      metadata: {
        locationName: location.name,
        qrId,
      },
    });

    // Award points to spa owner
    spaOwner.points = (spaOwner.points || 0) + pointsToAward;
    await spaOwner.save();

    // Create transaction for spa owner
    const spaOwnerTransaction = await PointTransaction.create({
      user: spaOwner._id,
      type: "qr_scan_reward",
      points: pointsToAward,
      balance: spaOwner.points,
      description: `Visitor scanned your QR code at ${location.name}`,
      locationId: location.locationId,
      metadata: {
        locationName: location.name,
        qrId,
        visitorEmail: user.email,
      },
    });

    // Create scan record
    const scan = await QRCodeScan.create({
      qrId,
      locationId: location.locationId,
      spaOwnerId: spaOwner._id,
      scannedByEmail: user.email,
      scannedByUser: user._id,
      pointsAwarded: pointsToAward,
      pointsAwardedToSpaOwner: pointsToAward,
      status: "verified",
      userTransactionId: userTransaction._id,
      spaOwnerTransactionId: spaOwnerTransaction._id,
      ipAddress,
      userAgent,
    });

    // Update location scan count
    location.qrCode.scans = (location.qrCode.scans || 0) + 1;
    location.qrCode.lastScannedAt = new Date();
    await location.save();

    // Send notification to user (non-blocking)
    try {
      await createSystemNotification(
        user._id,
        "Points Earned! 🎉",
        `You earned ${pointsToAward} points by scanning the QR code at ${location.name}`,
        {
          category: "points",
          priority: "high",
          metadata: {
            locationName: location.name,
            points: pointsToAward,
          },
        }
      );
    } catch (notifError) {
      console.error("Error sending user notification:", notifError);
      // Don't fail the scan if notification fails
    }

    // Send notification to spa owner (non-blocking)
    try {
      await createSystemNotification(
        spaOwner._id,
        "Visitor Scanned Your QR Code! 📱",
        `A visitor (${user.email}) scanned your location QR code and you earned ${pointsToAward} points!`,
        {
          category: "alert",
          priority: "normal",
          metadata: {
            visitorEmail: user.email,
            points: pointsToAward,
            locationName: location.name,
          },
        }
      );
    } catch (notifError) {
      console.error("Error sending spa owner notification:", notifError);
      // Don't fail the scan if notification fails
    }

    res.status(200).json({
      status: "success",
      message: "Points awarded successfully!",
      data: {
        scanId: scan._id,
        user: {
          name: user.name,
          email: user.email,
          pointsEarned: pointsToAward,
          totalPoints: user.points,
        },
        spaOwner: {
          name: spaOwner.name,
          pointsEarned: pointsToAward,
          totalPoints: spaOwner.points,
        },
        location: {
          name: location.name,
          address: location.address,
        },
      },
    });
  } catch (error) {
    console.error("Error scanning QR code:", error);
    next(createError(500, "Failed to process QR code scan"));
  }
};

// Get QR code scan statistics
export const getQRCodeStats = async (req, res, next) => {
  try {
    const { locationId } = req.params;
    const adminUser = req.user;

    // Check if admin
    if (!["admin", "super-admin"].includes(adminUser.role)) {
      return next(createError(403, "Only admins can view QR code stats"));
    }

    const location = await Location.findById(locationId);
    if (!location) {
      return next(createError(404, "Location not found"));
    }

    // NOTE:
    // QRCodeScan documents auto-expire after 3 days, so they are only reliable for
    // recent activity. For all-time analytics, use durable sources:
    // - PointTransaction (qr_scan / qr_scan_reward)
    // - location.qrCode.scans counter
    const [
      recentScans,
      pendingScansCount,
      rejectedScansCount,
      verifiedScansFromTransactions,
      uniqueVisitorsFromTransactions,
      pointsDistributionAgg,
    ] = await Promise.all([
      QRCodeScan.find({ locationId: location.locationId })
        .sort({ createdAt: -1 })
        .limit(20),
      QRCodeScan.countDocuments({
        locationId: location.locationId,
        status: "pending",
      }),
      QRCodeScan.countDocuments({
        locationId: location.locationId,
        status: "rejected",
      }),
      PointTransaction.countDocuments({
        locationId: location.locationId,
        type: "qr_scan",
      }),
      PointTransaction.distinct("user", {
        locationId: location.locationId,
        type: "qr_scan",
      }),
      PointTransaction.aggregate([
        {
          $match: {
            locationId: location.locationId,
            type: { $in: ["qr_scan", "qr_scan_reward"] },
          },
        },
        {
          $group: {
            _id: null,
            totalPoints: { $sum: "$points" },
          },
        },
      ]),
    ]);

    const allTimeVerifiedScans = Math.max(
      location.qrCode?.scans || 0,
      verifiedScansFromTransactions || 0
    );
    const totalPointsDistributed =
      pointsDistributionAgg?.[0]?.totalPoints ||
      allTimeVerifiedScans * ((location.qrCode?.pointsValue || 0) * 2);

    res.status(200).json({
      status: "success",
      data: {
        location: {
          name: location.name,
          locationId: location.locationId,
        },
        qrCode: {
          qrId: location.qrCode?.qrId,
          isEnabled: location.qrCode?.isEnabled,
          pointsValue: location.qrCode?.pointsValue,
        },
        statistics: {
          totalScans: allTimeVerifiedScans,
          verifiedScans: allTimeVerifiedScans,
          pendingScans: pendingScansCount,
          rejectedScans: rejectedScansCount,
          totalPointsDistributed,
          uniqueVisitors: uniqueVisitorsFromTransactions.length,
        },
        recentScans: recentScans.map((scan) => ({
          email: scan.scannedByEmail,
          status: scan.status,
          pointsAwarded: scan.pointsAwarded,
          scannedAt: scan.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching QR code stats:", error);
    next(createError(500, "Failed to fetch QR code stats"));
  }
};

// Toggle QR code status
export const toggleQRCodeStatus = async (req, res, next) => {
  try {
    const { locationId } = req.params;
    const adminUser = req.user;

    if (!["admin", "super-admin"].includes(adminUser.role)) {
      return next(createError(403, "Only admins can manage QR codes"));
    }

    const location = await Location.findById(locationId);
    if (!location) {
      return next(createError(404, "Location not found"));
    }

    if (!location.qrCode?.qrId) {
      return next(createError(404, "QR code not found. Generate one first."));
    }

    location.qrCode.isEnabled = !location.qrCode.isEnabled;
    await location.save();

    res.status(200).json({
      status: "success",
      message: `QR code ${
        location.qrCode.isEnabled ? "enabled" : "disabled"
      } successfully`,
      data: {
        isEnabled: location.qrCode.isEnabled,
      },
    });
  } catch (error) {
    console.error("Error toggling QR code status:", error);
    next(createError(500, "Failed to toggle QR code status"));
  }
};

// Update QR code ID for a location
export const updateQRCodeId = async (req, res, next) => {
  try {
    const { locationId } = req.params;
    const { qrId } = req.body;
    const adminUser = req.user;

    if (!["admin", "super-admin"].includes(adminUser.role)) {
      return next(createError(403, "Only admins can manage QR codes"));
    }

    const normalizedQrId = normalizeCustomQRId(qrId);

    if (!normalizedQrId) {
      return next(createError(400, "QR ID is required"));
    }

    if (!/^[A-Z0-9_-]{6,80}$/.test(normalizedQrId)) {
      return next(
        createError(
          400,
          "QR ID must be 6-80 characters and contain only letters, numbers, '_' or '-'"
        )
      );
    }

    const location = await Location.findById(locationId);
    if (!location) {
      return next(createError(404, "Location not found"));
    }

    if (!location.qrCode?.qrId) {
      return next(createError(404, "QR code not found. Generate one first."));
    }

    const existingLocationWithQrId = await Location.findOne({
      _id: { $ne: location._id },
      "qrCode.qrId": normalizedQrId,
    }).select("_id name locationId");

    if (existingLocationWithQrId) {
      return next(createError(409, "This QR ID is already in use"));
    }

    const previousQrId = location.qrCode.qrId;
    location.qrCode.qrId = normalizedQrId;

    // Keep qrData in sync with the updated QR ID.
    try {
      const parsed = location.qrCode?.qrData
        ? JSON.parse(location.qrCode.qrData)
        : {};
      location.qrCode.qrData = JSON.stringify({
        ...parsed,
        qrId: normalizedQrId,
        locationId: location.locationId,
        locationName: location.name,
        timestamp: new Date().toISOString(),
      });
    } catch {
      location.qrCode.qrData = JSON.stringify({
        qrId: normalizedQrId,
        locationId: location.locationId,
        locationName: location.name,
        timestamp: new Date().toISOString(),
      });
    }

    await location.save();

    res.status(200).json({
      status: "success",
      message: "QR ID updated successfully",
      data: {
        previousQrId,
        qrId: location.qrCode.qrId,
        locationId: location.locationId,
      },
    });
  } catch (error) {
    console.error("Error updating QR ID:", error);
    next(createError(500, "Failed to update QR ID"));
  }
};

// Get all QR codes for admin
export const getAllQRCodes = async (req, res, next) => {
  try {
    const adminUser = req.user;
    const { page = 1, limit = 20 } = req.query;

    if (!["admin", "super-admin"].includes(adminUser.role)) {
      return next(createError(403, "Only admins can view all QR codes"));
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const locations = await Location.find({ "qrCode.qrId": { $exists: true } })
      .populate("addedBy", "name email")
      .sort({ "qrCode.createdAt": -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Location.countDocuments({
      "qrCode.qrId": { $exists: true },
    });

    const qrCodes = locations.map((loc) => ({
      locationId: loc._id,
      location: {
        name: loc.name,
        locationId: loc.locationId,
        address: loc.address,
      },
      qrCode: {
        qrId: loc.qrCode.qrId,
        isEnabled: loc.qrCode.isEnabled,
        pointsValue: loc.qrCode.pointsValue,
        scans: loc.qrCode.scans,
        createdAt: loc.qrCode.createdAt,
        lastScannedAt: loc.qrCode.lastScannedAt,
      },
    }));

    res.status(200).json({
      status: "success",
      results: qrCodes.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: { qrCodes },
    });
  } catch (error) {
    console.error("Error fetching QR codes:", error);
    next(createError(500, "Failed to fetch QR codes"));
  }
};
