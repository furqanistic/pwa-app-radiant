import Location from "../models/Location.js";
import PointTransaction from "../models/PointTransaction.js";
import QRCodeScan from "../models/QRCodeScan.js";
import User from "../models/User.js";
import { createSystemNotification } from "../controller/notification.js";
import {
  AUTOMATION_KEYS,
  runLocationAutomationLink,
} from "./ghlAutomationLinks.js";

const CHECKIN_SCAN_TYPE = "checkin";
const getStartOfUtcDay = (dateInput = new Date()) => {
  const date = new Date(dateInput);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

export const processPendingQrClaimsForUser = async (user) => {
  if (!user?._id || !user?.email) {
    return { processedScans: 0, userPointsAwarded: 0, spaPointsAwarded: 0 };
  }

  const normalizedEmail = `${user.email}`.trim().toLowerCase();
  const pendingScans = await QRCodeScan.find({
    scannedByEmail: normalizedEmail,
    scannedByUser: null,
    status: "pending",
  }).sort({ createdAt: 1 });

  if (!pendingScans.length) {
    return { processedScans: 0, userPointsAwarded: 0, spaPointsAwarded: 0 };
  }

  let processedScans = 0;
  let userPointsAwarded = 0;
  let spaPointsAwarded = 0;

  for (const scan of pendingScans) {
    const scanType = scan?.scanType || "claim";

    const locationDoc = await Location.findOne({ locationId: scan.locationId });
    const location = locationDoc
      ? {
          name: locationDoc?.name || "Unknown location",
          locationId: locationDoc?.locationId || scan.locationId,
        }
      : {
          name: "Unknown location",
          locationId: scan.locationId,
        };

    if (scanType === CHECKIN_SCAN_TYPE) {
      const scanPoints = Math.max(0, Number(scan.pointsAwarded || 0));
      const startOfScanUtcDay = getStartOfUtcDay(scan.createdAt || new Date());

      const alreadyRewardedOnScanDay =
        scanPoints > 0
          ? await QRCodeScan.exists({
              _id: { $ne: scan._id },
              locationId: scan.locationId,
              scanType: CHECKIN_SCAN_TYPE,
              status: "verified",
              scannedByUser: user._id,
              pointsAwarded: { $gt: 0 },
              createdAt: { $gte: startOfScanUtcDay },
            })
          : null;

      let userTransactionId = null;
      const pointsToAward = alreadyRewardedOnScanDay ? 0 : scanPoints;

      if (pointsToAward > 0) {
        user.points = (user.points || 0) + pointsToAward;
        userPointsAwarded += pointsToAward;

        const userTransaction = await PointTransaction.create({
          user: user._id,
          type: "checkin",
          points: pointsToAward,
          balance: user.points,
          description: `Daily check-in at ${location.name}`,
          locationId: scan.locationId,
          metadata: {
            locationName: location.name,
            qrId: scan.qrId,
            source: "pending_checkin_after_signup",
            scanId: scan._id.toString(),
          },
        });
        userTransactionId = userTransaction._id;
      }

      scan.status = "verified";
      scan.scannedByUser = user._id;
      scan.scannedByEmail = normalizedEmail;
      scan.userTransactionId = userTransactionId;
      scan.spaOwnerTransactionId = null;
      scan.pointsAwarded = pointsToAward;
      scan.pointsAwardedToSpaOwner = 0;
      await scan.save();

      if (locationDoc?.checkInQrCode) {
        locationDoc.checkInQrCode.scans = (locationDoc.checkInQrCode.scans || 0) + 1;
        locationDoc.checkInQrCode.lastScannedAt = new Date();
        await locationDoc.save();
      }

      if (locationDoc) {
        try {
          const automationResult = await runLocationAutomationLink({
            location: locationDoc,
            key: AUTOMATION_KEYS.CHECKIN,
            user,
          });

          if (automationResult?.attempted) {
            console.info("[PendingQR:CheckInAutomation] Linked automation result", {
              locationId: location.locationId,
              userId: `${user._id || ""}`,
              workflowId: automationResult.workflowId || "",
              contactId: automationResult.contactId || "",
              tagsAdded: automationResult.tagsAdded || [],
              success: Boolean(automationResult.success),
            });
          }
        } catch (automationError) {
          console.warn("[PendingQR:CheckInAutomation] Linked automation failed", {
            locationId: location.locationId,
            userId: `${user._id || ""}`,
            email: user.email || "",
            error:
              automationError?.response?.data?.message ||
              automationError?.message ||
              "Unknown error",
          });
        }
      }

      processedScans += 1;
      continue;
    }

    const scanPoints = Number(scan.pointsAwarded || 0);
    const spaOwnerPoints = Number(scan.pointsAwardedToSpaOwner || scanPoints);

    let userTransactionId = null;
    let spaOwnerTransactionId = null;

    if (scanPoints > 0) {
      user.points = (user.points || 0) + scanPoints;
      userPointsAwarded += scanPoints;

      const userTransaction = await PointTransaction.create({
        user: user._id,
        type: "qr_scan",
        points: scanPoints,
        balance: user.points,
        description: `QR Code scan at ${location.name}`,
        locationId: scan.locationId,
        metadata: {
          locationName: location.name,
          qrId: scan.qrId,
          source: "pending_claim_after_signup",
          scanId: scan._id.toString(),
        },
      });
      userTransactionId = userTransaction._id;
    }

    const spaOwner =
      (scan.spaOwnerId
        ? await User.findById(scan.spaOwnerId).select("name points")
        : null) ||
      (await User.findOne({
        role: "spa",
        "spaLocation.locationId": scan.locationId,
      }).select("name points"));

    if (spaOwner && spaOwnerPoints > 0) {
      spaOwner.points = (spaOwner.points || 0) + spaOwnerPoints;
      await spaOwner.save();
      spaPointsAwarded += spaOwnerPoints;

      const spaTransaction = await PointTransaction.create({
        user: spaOwner._id,
        type: "qr_scan_reward",
        points: spaOwnerPoints,
        balance: spaOwner.points,
        description: `Visitor scanned your QR code at ${location.name}`,
        locationId: scan.locationId,
        metadata: {
          locationName: location.name,
          qrId: scan.qrId,
          visitorEmail: normalizedEmail,
          source: "pending_claim_after_signup",
          scanId: scan._id.toString(),
        },
      });
      spaOwnerTransactionId = spaTransaction._id;

      try {
        await createSystemNotification(
          spaOwner._id,
          "Visitor Completed Sign Up! 🎉",
          `${normalizedEmail} completed sign up and your pending QR reward was applied.`,
          {
            category: "alert",
            priority: "normal",
            metadata: {
              visitorEmail: normalizedEmail,
              points: spaOwnerPoints,
              locationName: location.name,
            },
          }
        );
      } catch (notifError) {
        console.error(
          "Error sending spa owner pending-claim notification:",
          notifError
        );
      }
    }

    scan.status = "verified";
    scan.scannedByUser = user._id;
    scan.scannedByEmail = normalizedEmail;
    scan.userTransactionId = userTransactionId;
    scan.spaOwnerTransactionId = spaOwnerTransactionId;
    await scan.save();

    processedScans += 1;
  }

  if (userPointsAwarded > 0) {
    await user.save();
    try {
      await createSystemNotification(
        user._id,
        "Pending QR Rewards Claimed! 🎉",
        `You received ${userPointsAwarded} points from your earlier QR scan${
          processedScans > 1 ? "s" : ""
        }.`,
        {
          category: "points",
          priority: "high",
          metadata: {
            processedScans,
            points: userPointsAwarded,
            source: "pending_claim_after_signup",
          },
        }
      );
    } catch (notifError) {
      console.error("Error sending user pending-claim notification:", notifError);
    }
  }

  return {
    processedScans,
    userPointsAwarded,
    spaPointsAwarded,
  };
};
