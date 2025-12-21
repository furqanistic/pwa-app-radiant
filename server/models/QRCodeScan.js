// File: server/models/QRCodeScan.js
import mongoose from "mongoose";

const QRCodeScanSchema = new mongoose.Schema(
  {
    qrId: {
      type: String,
      required: true,
      index: true,
    },
    locationId: {
      type: String,
      required: true,
      index: true,
    },
    spaOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    scannedByEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    scannedByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    pointsAwarded: {
      type: Number,
      default: 50,
    },
    pointsAwardedToSpaOwner: {
      type: Number,
      default: 50,
    },
    // Status of the scan
    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    // Track the transactions created
    userTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PointTransaction",
      default: null,
    },
    spaOwnerTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PointTransaction",
      default: null,
    },
    // Rejection reason if applicable
    rejectionReason: {
      type: String,
      default: null,
    },
    // IP and device info for fraud detection
    ipAddress: String,
    userAgent: String,
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
QRCodeScanSchema.index({ locationId: 1, createdAt: -1 });
QRCodeScanSchema.index({ spaOwnerId: 1, createdAt: -1 });
QRCodeScanSchema.index({ scannedByUser: 1, createdAt: -1 });
QRCodeScanSchema.index({ qrId: 1, createdAt: -1 });
QRCodeScanSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("QRCodeScan", QRCodeScanSchema);
