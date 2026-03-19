import Location from "../models/Location.js";
import PointTransaction from "../models/PointTransaction.js";
import QRCodeScan from "../models/QRCodeScan.js";
import User from "../models/User.js";
import { createSystemNotification } from "../controller/notification.js";

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
    const location = await Location.findOne({ locationId: scan.locationId })
      .select("name locationId")
      .lean();

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
        description: `QR Code scan at ${location?.name || "Unknown location"}`,
        locationId: scan.locationId,
        metadata: {
          locationName: location?.name || null,
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
        description: `Visitor scanned your QR code at ${location?.name || "Unknown location"}`,
        locationId: scan.locationId,
        metadata: {
          locationName: location?.name || null,
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
              locationName: location?.name || null,
            },
          }
        );
      } catch (notifError) {
        console.error("Error sending spa owner pending-claim notification:", notifError);
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
