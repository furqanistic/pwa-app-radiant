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

    // Find spa owner (user with team role assigned to this location)
    const spaOwner = await User.findOne({
      role: "team",
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
          "We sent a verification link to your email. Please create an account or verify your email to claim your points.",
        data: {
          scanId: pendingScan._id,
          email: email.toLowerCase(),
          pointsToEarn: location.qrCode.pointsValue,
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

    // Get scan statistics
    const scans = await QRCodeScan.find({
      locationId: location.locationId,
    })
      .sort({ createdAt: -1 })
      .limit(100);

    const verifiedScans = scans.filter((s) => s.status === "verified");
    const pendingScans = scans.filter((s) => s.status === "pending");
    const rejectedScans = scans.filter((s) => s.status === "rejected");

    const totalPointsDistributed = verifiedScans.reduce(
      (sum, scan) => sum + (scan.pointsAwarded + scan.pointsAwardedToSpaOwner),
      0
    );

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
          totalScans: scans.length,
          verifiedScans: verifiedScans.length,
          pendingScans: pendingScans.length,
          rejectedScans: rejectedScans.length,
          totalPointsDistributed,
          uniqueVisitors: new Set(verifiedScans.map((s) => s.scannedByEmail))
            .size,
        },
        recentScans: scans.slice(0, 20).map((scan) => ({
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
