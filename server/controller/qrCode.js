// File: server/controller/qrCode.js
import crypto from "crypto";
import { createError } from "../error.js";
import Location from "../models/Location.js";
import { recordVerifiedMonthlyCheckIn } from "../utils/locationMonthlyCheckIns.js";
import PointTransaction from "../models/PointTransaction.js";
import QRCodeScan from "../models/QRCodeScan.js";
import User from "../models/User.js";
import { createSystemNotification } from "./notification.js";
import { mergePointsMethodsWithDefaults } from "../utils/pointsSettings.js";
import {
  AUTOMATION_KEYS,
  runLocationAutomationLink,
} from "../utils/ghlAutomationLinks.js";

const CLAIM_PURPOSE = "claim";
const CHECKIN_PURPOSE = "checkin";
const DAILY_CHECK_IN_METHOD_KEY = "daily_check_in";

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

const resolveQrPurpose = (req) => {
  const raw = `${req.query?.purpose || req.body?.purpose || ""}`
    .trim()
    .toLowerCase();

  if (["claim", "reward", "rewards", "claim-reward"].includes(raw)) {
    return CLAIM_PURPOSE;
  }

  if (["checkin", "check-in", "check_in", "checkins", "check-ins"].includes(raw)) {
    return CHECKIN_PURPOSE;
  }

  return CLAIM_PURPOSE;
};

const getQrFieldForPurpose = (purpose) =>
  purpose === CHECKIN_PURPOSE ? "checkInQrCode" : "qrCode";

const getQrLabelForPurpose = (purpose) =>
  purpose === CHECKIN_PURPOSE ? "check-in" : "claim reward";

const buildQrDataPayload = ({ qrId, location, purpose }) => ({
  qrId,
  purpose,
  locationId: location.locationId,
  locationName: location.name,
  timestamp: new Date().toISOString(),
});

const ensureQrIdIsUnique = async ({ qrId, ignoreLocationId = null }) => {
  const existingLocation = await Location.findOne({
    _id: ignoreLocationId ? { $ne: ignoreLocationId } : { $exists: true },
    $or: [{ "qrCode.qrId": qrId }, { "checkInQrCode.qrId": qrId }],
  })
    .select("_id locationId name")
    .lean();

  return !existingLocation;
};

const parseQrDataSafe = (qrData) => {
  if (!qrData) return null;
  try {
    return JSON.parse(qrData);
  } catch {
    return null;
  }
};

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

const getStartOfUtcDay = (dateInput = new Date()) => {
  const date = new Date(dateInput);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const resolveDailyCheckInPoints = (location) => {
  const methods = mergePointsMethodsWithDefaults(
    location?.pointsSettings?.methods || []
  );

  const dailyCheckInMethod = methods.find(
    (method) => method?.key === DAILY_CHECK_IN_METHOD_KEY
  );

  if (!dailyCheckInMethod?.isActive) return 0;

  const pointsValue = Number(dailyCheckInMethod?.pointsValue);
  if (!Number.isFinite(pointsValue)) return 0;
  return Math.max(0, pointsValue);
};

// Generate QR Code for a location
export const generateQRCodeForLocation = async (req, res, next) => {
  try {
    const { locationId } = req.params;
    const adminUser = req.user;
    const purpose = resolveQrPurpose(req);
    const qrField = getQrFieldForPurpose(purpose);

    const location = await Location.findById(locationId);
    if (!location) {
      return next(createError(404, "Location not found"));
    }

    const isAdminOrSuperAdmin = ["admin", "super-admin"].includes(adminUser.role);
    const isSpaForThisLocation =
      adminUser?.role === "spa" &&
      `${adminUser?.spaLocation?.locationId || ""}`.trim() ===
        `${location?.locationId || ""}`.trim();

    if (!isAdminOrSuperAdmin && !isSpaForThisLocation) {
      return next(
        createError(403, "You are not allowed to generate QR codes for this location")
      );
    }

    let qrId = generateQRId();
    while (!(await ensureQrIdIsUnique({ qrId, ignoreLocationId: location._id }))) {
      qrId = generateQRId();
    }

    const qrData = buildQrDataPayload({ qrId, location, purpose });

    if (purpose === CHECKIN_PURPOSE) {
      location.checkInQrCode = {
        qrId,
        qrData: JSON.stringify(qrData),
        isEnabled: true,
        createdAt: new Date(),
        scans: 0,
      };
    } else {
      location.qrCode = {
        qrId,
        qrData: JSON.stringify(qrData),
        pointsValue: location.qrCode?.pointsValue || 50,
        isEnabled: true,
        createdAt: new Date(),
        scans: 0,
      };
    }

    await location.save();

    const qrState = location[qrField] || {};

    res.status(200).json({
      status: "success",
      message: `${getQrLabelForPurpose(purpose)} QR code generated successfully`,
      data: {
        purpose,
        qrId,
        locationId: location.locationId,
        locationName: location.name,
        qrData,
        pointsValue: qrState.pointsValue,
        isEnabled: qrState.isEnabled,
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
    const purpose = resolveQrPurpose(req);
    const qrField = getQrFieldForPurpose(purpose);

    const location = await Location.findById(locationId);
    if (!location) {
      return next(createError(404, "Location not found"));
    }

    const qrState = location[qrField];

    if (!qrState?.qrId) {
      return next(
        createError(
          404,
          `${getQrLabelForPurpose(purpose)} QR code not found for this location`
        )
      );
    }

    const qrData = parseQrDataSafe(qrState.qrData);

    res.status(200).json({
      status: "success",
      data: {
        purpose,
        qrId: qrState.qrId,
        locationId: location.locationId,
        locationName: location.name,
        qrData,
        pointsValue: qrState.pointsValue,
        isEnabled: qrState.isEnabled,
        scans: qrState.scans,
        lastScannedAt: qrState.lastScannedAt,
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
    const purpose = resolveQrPurpose(req);
    const qrField = getQrFieldForPurpose(purpose);

    if (!locationId) {
      return next(createError(400, "Location ID is required"));
    }

    if (currentUser?.role === "spa") {
      const spaLocationId = currentUser?.spaLocation?.locationId;
      if (!spaLocationId || spaLocationId !== locationId) {
        return next(
          createError(403, "You can only access your assigned location QR code")
        );
      }
    }

    const location = await Location.findOne({ locationId });
    if (!location) {
      return next(createError(404, "Location not found"));
    }

    const qrState = location[qrField];

    if (!qrState?.qrId) {
      return next(
        createError(
          404,
          `${getQrLabelForPurpose(purpose)} QR code not found for this location`
        )
      );
    }

    const qrData = parseQrDataSafe(qrState.qrData);

    res.status(200).json({
      status: "success",
      data: {
        purpose,
        qrId: qrState.qrId,
        locationId: location.locationId,
        locationName: location.name,
        qrData,
        pointsValue: qrState.pointsValue,
        isEnabled: qrState.isEnabled,
        scans: qrState.scans,
        lastScannedAt: qrState.lastScannedAt,
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

    const location = await Location.findOne({
      $or: [{ "qrCode.qrId": qrId }, { "checkInQrCode.qrId": qrId }],
    }).select("locationId name subdomain isActive qrCode.qrId checkInQrCode.qrId");

    if (!location || !location.isActive) {
      return next(createError(404, "Invalid QR code"));
    }

    const purpose =
      location?.checkInQrCode?.qrId === qrId ? CHECKIN_PURPOSE : CLAIM_PURPOSE;

    return res.status(200).json({
      status: "success",
      data: {
        qrId,
        purpose,
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

// Scan QR code. Claim QR awards points, Check-in QR only creates check-in record.
export const scanQRCode = async (req, res, next) => {
  try {
    const { qrId, email } = req.body;
    const requestedPurpose = resolveQrPurpose(req);
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get("User-Agent");

    if (!qrId || !email) {
      return next(createError(400, "QR ID and email are required"));
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(createError(400, "Invalid email format"));
    }

    const normalizedEmail = email.toLowerCase();

    const location = await Location.findOne({
      $or: [{ "qrCode.qrId": qrId }, { "checkInQrCode.qrId": qrId }],
    }).populate("addedBy");

    if (!location) {
      return next(createError(404, "Invalid QR code"));
    }

    const isCheckInQr = location?.checkInQrCode?.qrId === qrId;
    const isClaimQr = location?.qrCode?.qrId === qrId;

    if (!isCheckInQr && !isClaimQr) {
      return next(createError(404, "Invalid QR code"));
    }

    const actualPurpose = isCheckInQr ? CHECKIN_PURPOSE : CLAIM_PURPOSE;
    const configuredCheckInPoints = resolveDailyCheckInPoints(location);

    if (requestedPurpose && requestedPurpose !== CLAIM_PURPOSE && requestedPurpose !== actualPurpose) {
      return next(createError(400, "QR code type does not match scan action"));
    }

    const qrState = isCheckInQr ? location.checkInQrCode : location.qrCode;

    if (!qrState?.isEnabled) {
      return next(
        createError(
          400,
          `This ${getQrLabelForPurpose(actualPurpose)} QR code is disabled`
        )
      );
    }

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

    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      const signupUrl = buildSpaSignupUrl(location);
      const duplicatePendingWindowMs = 5 * 60 * 1000;

      const recentPendingScan = await QRCodeScan.findOne({
        qrId,
        scanType: actualPurpose,
        scannedByEmail: normalizedEmail,
        scannedByUser: null,
        status: "pending",
        createdAt: { $gt: new Date(Date.now() - duplicatePendingWindowMs) },
      });

      if (recentPendingScan) {
        return res.status(202).json({
          status: "pending",
          message:
            actualPurpose === CHECKIN_PURPOSE
              ? "A pending check-in already exists for this email. Create an account to complete check-in."
              : "A pending claim already exists for this email. Create an account to claim your points.",
          data: {
            scanId: recentPendingScan._id,
            scanType: actualPurpose,
            email: normalizedEmail,
            pointsToEarn:
              actualPurpose === CLAIM_PURPOSE
                ? Number(location.qrCode?.pointsValue || 0)
                : configuredCheckInPoints,
            locationId: location.locationId,
            subdomain: location.subdomain || null,
            signupUrl,
          },
        });
      }

      const pendingScan = new QRCodeScan({
        qrId,
        scanType: actualPurpose,
        locationId: location.locationId,
        spaOwnerId: spaOwner._id,
        scannedByEmail: normalizedEmail,
        scannedByUser: null,
        pointsAwarded:
          actualPurpose === CLAIM_PURPOSE
            ? Number(location.qrCode?.pointsValue || 0)
            : configuredCheckInPoints,
        pointsAwardedToSpaOwner:
          actualPurpose === CLAIM_PURPOSE
            ? Number(location.qrCode?.pointsValue || 0)
            : 0,
        status: "pending",
        ipAddress,
        userAgent,
      });

      await pendingScan.save();

      return res.status(202).json({
        status: "pending",
        message:
          actualPurpose === CHECKIN_PURPOSE
            ? "No account found for this email. Create an account to complete check-in."
            : "No account found for this email. Create an account to claim your points.",
        data: {
          scanId: pendingScan._id,
          scanType: actualPurpose,
          email: normalizedEmail,
          pointsToEarn:
            actualPurpose === CLAIM_PURPOSE
              ? Number(location.qrCode?.pointsValue || 0)
              : configuredCheckInPoints,
          locationId: location.locationId,
          subdomain: location.subdomain || null,
          signupUrl,
        },
      });
    }

    const duplicateScanWindowMs = actualPurpose === CHECKIN_PURPOSE ? 2 * 60 * 1000 : 5 * 60 * 1000;

    const recentScan = await QRCodeScan.findOne({
      qrId,
      scanType: actualPurpose,
      scannedByUser: user._id,
      status: "verified",
      createdAt: { $gt: new Date(Date.now() - duplicateScanWindowMs) },
    });

    if (recentScan) {
      return next(
        createError(
          400,
          actualPurpose === CHECKIN_PURPOSE
            ? "You already checked in recently. Please try again shortly."
            : "You already scanned this QR code recently. Please try again later."
        )
      );
    }

    if (actualPurpose === CHECKIN_PURPOSE) {
      const dailyCheckInPoints = resolveDailyCheckInPoints(location);
      const startOfTodayUtc = getStartOfUtcDay();

      const alreadyRewardedToday = await QRCodeScan.exists({
        locationId: location.locationId,
        scanType: CHECKIN_PURPOSE,
        status: "verified",
        scannedByUser: user._id,
        pointsAwarded: { $gt: 0 },
        createdAt: { $gte: startOfTodayUtc },
      });

      const pointsToAward = alreadyRewardedToday ? 0 : dailyCheckInPoints;

      if (pointsToAward > 0) {
        user.points = (user.points || 0) + pointsToAward;
        await user.save();

        await PointTransaction.create({
          user: user._id,
          type: "checkin",
          points: pointsToAward,
          balance: user.points,
          description: `Daily check-in at ${location.name}`,
          locationId: location.locationId,
          metadata: {
            locationName: location.name,
            qrId,
          },
        });
      }

      const scan = await QRCodeScan.create({
        qrId,
        scanType: CHECKIN_PURPOSE,
        locationId: location.locationId,
        spaOwnerId: spaOwner._id,
        scannedByEmail: user.email,
        scannedByUser: user._id,
        pointsAwarded: pointsToAward,
        pointsAwardedToSpaOwner: 0,
        status: "verified",
        ipAddress,
        userAgent,
      });

      await recordVerifiedMonthlyCheckIn(location.locationId);

      location.checkInQrCode.scans = (location.checkInQrCode?.scans || 0) + 1;
      location.checkInQrCode.lastScannedAt = new Date();
      await location.save();

      try {
        const automationResult = await runLocationAutomationLink({
          location,
          key: AUTOMATION_KEYS.CHECKIN,
          user,
        });

        if (automationResult?.attempted) {
          console.info("[QRCode:CheckInAutomation] Linked automation result", {
            locationId: location.locationId,
            userId: `${user._id || ""}`,
            workflowId: automationResult.workflowId || "",
            contactId: automationResult.contactId || "",
            tagsAdded: automationResult.tagsAdded || [],
            success: Boolean(automationResult.success),
          });
        }
      } catch (automationError) {
        console.warn("[QRCode:CheckInAutomation] Linked automation failed", {
          locationId: location.locationId,
          userId: `${user._id || ""}`,
          email: user.email || "",
          error:
            automationError?.response?.data?.message ||
            automationError?.message ||
            "Unknown error",
        });
      }

      try {
        await createSystemNotification(
          spaOwner._id,
          "New Check-In Recorded ✅",
          `${user.email} checked in at ${location.name}.`,
          {
            category: "alert",
            priority: "normal",
            metadata: {
              visitorEmail: user.email,
              locationName: location.name,
            },
          }
        );
      } catch (notifError) {
        console.error("Error sending spa owner check-in notification:", notifError);
      }

      return res.status(200).json({
        status: "success",
        message:
          pointsToAward > 0
            ? `Check-in recorded! You earned ${pointsToAward} points.`
            : "Check-in recorded successfully!",
        data: {
          scanId: scan._id,
          scanType: CHECKIN_PURPOSE,
          user: {
            name: user.name,
            email: user.email,
            pointsEarned: pointsToAward,
            totalPoints: user.points,
          },
          location: {
            name: location.name,
            address: location.address,
          },
        },
      });
    }

    const pointsToAward = Number(location.qrCode?.pointsValue || 0);

    user.points = (user.points || 0) + pointsToAward;
    await user.save();

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

    spaOwner.points = (spaOwner.points || 0) + pointsToAward;
    await spaOwner.save();

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

    const scan = await QRCodeScan.create({
      qrId,
      scanType: CLAIM_PURPOSE,
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

    location.qrCode.scans = (location.qrCode?.scans || 0) + 1;
    location.qrCode.lastScannedAt = new Date();
    await location.save();

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
    }

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
    }

    res.status(200).json({
      status: "success",
      message: "Points awarded successfully!",
      data: {
        scanId: scan._id,
        scanType: CLAIM_PURPOSE,
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
    const purpose = resolveQrPurpose(req);
    const qrField = getQrFieldForPurpose(purpose);

    if (!["admin", "super-admin"].includes(adminUser.role)) {
      return next(createError(403, "Only admins can view QR code stats"));
    }

    const location = await Location.findById(locationId);
    if (!location) {
      return next(createError(404, "Location not found"));
    }

    const qrState = location[qrField] || {};
    const scanTypeFilter =
      purpose === CHECKIN_PURPOSE
        ? { scanType: CHECKIN_PURPOSE }
        : { scanType: { $ne: CHECKIN_PURPOSE } };

    const baseScanMatch = {
      locationId: location.locationId,
      ...scanTypeFilter,
    };

    const [recentScans, pendingScansCount, rejectedScansCount] = await Promise.all([
      QRCodeScan.find(baseScanMatch).sort({ createdAt: -1 }).limit(20),
      QRCodeScan.countDocuments({ ...baseScanMatch, status: "pending" }),
      QRCodeScan.countDocuments({ ...baseScanMatch, status: "rejected" }),
    ]);

    let allTimeVerifiedScans = Number(qrState?.scans || 0);
    let uniqueVisitors = 0;
    let totalPointsDistributed = 0;

    if (purpose === CHECKIN_PURPOSE) {
      const checkInUniqueUsers = await QRCodeScan.distinct("scannedByUser", {
        ...baseScanMatch,
        status: "verified",
        scannedByUser: { $ne: null },
      });
      uniqueVisitors = checkInUniqueUsers.length;
    } else {
      const [verifiedScansFromTransactions, uniqueVisitorsFromTransactions, pointsDistributionAgg] =
        await Promise.all([
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

      allTimeVerifiedScans = Math.max(allTimeVerifiedScans, verifiedScansFromTransactions || 0);
      uniqueVisitors = uniqueVisitorsFromTransactions.length;
      totalPointsDistributed =
        pointsDistributionAgg?.[0]?.totalPoints ||
        allTimeVerifiedScans * ((Number(location.qrCode?.pointsValue || 0)) * 2);
    }

    res.status(200).json({
      status: "success",
      data: {
        purpose,
        location: {
          name: location.name,
          locationId: location.locationId,
        },
        qrCode: {
          qrId: qrState?.qrId,
          isEnabled: qrState?.isEnabled,
          pointsValue: qrState?.pointsValue,
        },
        statistics: {
          totalScans: allTimeVerifiedScans,
          verifiedScans: allTimeVerifiedScans,
          pendingScans: pendingScansCount,
          rejectedScans: rejectedScansCount,
          totalPointsDistributed,
          uniqueVisitors,
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
    const purpose = resolveQrPurpose(req);
    const qrField = getQrFieldForPurpose(purpose);

    if (!["admin", "super-admin"].includes(adminUser.role)) {
      return next(createError(403, "Only admins can manage QR codes"));
    }

    const location = await Location.findById(locationId);
    if (!location) {
      return next(createError(404, "Location not found"));
    }

    if (!location[qrField]?.qrId) {
      return next(createError(404, "QR code not found. Generate one first."));
    }

    location[qrField].isEnabled = !location[qrField].isEnabled;
    await location.save();

    res.status(200).json({
      status: "success",
      message: `QR code ${location[qrField].isEnabled ? "enabled" : "disabled"} successfully`,
      data: {
        purpose,
        isEnabled: location[qrField].isEnabled,
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
    const purpose = resolveQrPurpose(req);
    const qrField = getQrFieldForPurpose(purpose);

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

    if (!location[qrField]?.qrId) {
      return next(createError(404, "QR code not found. Generate one first."));
    }

    const isUnique = await ensureQrIdIsUnique({
      qrId: normalizedQrId,
      ignoreLocationId: location._id,
    });

    if (!isUnique) {
      return next(createError(409, "This QR ID is already in use"));
    }

    const previousQrId = location[qrField].qrId;
    location[qrField].qrId = normalizedQrId;

    const parsed = parseQrDataSafe(location[qrField]?.qrData) || {};
    location[qrField].qrData = JSON.stringify({
      ...parsed,
      qrId: normalizedQrId,
      purpose,
      locationId: location.locationId,
      locationName: location.name,
      timestamp: new Date().toISOString(),
    });

    await location.save();

    res.status(200).json({
      status: "success",
      message: "QR ID updated successfully",
      data: {
        purpose,
        previousQrId,
        qrId: location[qrField].qrId,
        locationId: location.locationId,
      },
    });
  } catch (error) {
    console.error("Error updating QR ID:", error);
    next(createError(500, "Failed to update QR ID"));
  }
};

// Get all QR codes for admin (claim + check-in)
export const getAllQRCodes = async (req, res, next) => {
  try {
    const adminUser = req.user;
    const { page = 1, limit = 20 } = req.query;

    if (!["admin", "super-admin"].includes(adminUser.role)) {
      return next(createError(403, "Only admins can view all QR codes"));
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const locations = await Location.find({
      $or: [{ "qrCode.qrId": { $exists: true } }, { "checkInQrCode.qrId": { $exists: true } }],
    })
      .populate("addedBy", "name email")
      .sort({ "qrCode.createdAt": -1, "checkInQrCode.createdAt": -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    const total = await Location.countDocuments({
      $or: [{ "qrCode.qrId": { $exists: true } }, { "checkInQrCode.qrId": { $exists: true } }],
    });

    const qrCodes = locations.map((loc) => ({
      locationId: loc._id,
      location: {
        name: loc.name,
        locationId: loc.locationId,
        address: loc.address,
      },
      claimQrCode: {
        qrId: loc.qrCode?.qrId,
        isEnabled: loc.qrCode?.isEnabled,
        pointsValue: loc.qrCode?.pointsValue,
        scans: loc.qrCode?.scans,
        createdAt: loc.qrCode?.createdAt,
        lastScannedAt: loc.qrCode?.lastScannedAt,
      },
      checkInQrCode: {
        qrId: loc.checkInQrCode?.qrId,
        isEnabled: loc.checkInQrCode?.isEnabled,
        scans: loc.checkInQrCode?.scans,
        createdAt: loc.checkInQrCode?.createdAt,
        lastScannedAt: loc.checkInQrCode?.lastScannedAt,
      },
    }));

    res.status(200).json({
      status: "success",
      results: qrCodes.length,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      data: { qrCodes },
    });
  } catch (error) {
    console.error("Error fetching QR codes:", error);
    next(createError(500, "Failed to fetch QR codes"));
  }
};
