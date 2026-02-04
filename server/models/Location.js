// File: server/models/Location.js - UPDATED WITH QR CODE SUPPORT
import mongoose from "mongoose";

const LocationSchema = new mongoose.Schema(
  {
    locationId: {
      type: String,
      required: [true, "Location ID is required"],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    hours: [
      {
        day: {
          type: String,
          enum: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ],
          required: true,
        },
        open: {
          type: String, // e.g., "09:00"
          default: "09:00",
        },
        close: {
          type: String, // e.g., "17:00"
          default: "17:00",
        },
        isClosed: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // ==================== BIRTHDAY GIFT SETTINGS ====================
    birthdayGift: {
      isActive: {
        type: Boolean,
        default: false,
      },
      giftType: {
        type: String,
        enum: ["free", "percentage", "fixed"],
        default: "free",
      },
      value: {
        type: Number,
        default: 0,
      },
      serviceId: {
        type: mongoose.Schema.Types.Mixed, // Allows ObjectId or "any"
        ref: "Service",
        default: null,
      },
      message: {
        type: String,
        default: "Happy Birthday! Here is a special gift for you.",
        trim: true,
      },
      voiceNoteUrl: {
        type: String,
        default: "",
      },
    },

    // ==================== QR CODE FIELDS ====================
    // NEW: QR Code data for this location
    qrCode: {
      // Unique QR code identifier
      qrId: {
        type: String,
        unique: true,
        sparse: true,
        default: null,
      },
      // Encoded QR code data (JSON string)
      qrData: {
        type: String,
        default: null,
      },
      // Points awarded per scan
      pointsValue: {
        type: Number,
        default: 50,
      },
      // Whether this QR code is active/scannable
      isEnabled: {
        type: Boolean,
        default: false,
      },
      // When the QR code was created
      createdAt: {
        type: Date,
        default: null,
      },
      // Total number of successful scans
      scans: {
        type: Number,
        default: 0,
      },
      // Last time this QR code was scanned
      lastScannedAt: {
        type: Date,
        default: null,
      },
    },
    // ==================== END QR CODE FIELDS ====================

    // NEW: Coordinates for map precision
    coordinates: {
      latitude: {
        type: Number,
        default: null,
      },
      longitude: {
        type: Number,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Existing indexes
LocationSchema.index({ isActive: 1 });
LocationSchema.index({ isActive: 1, locationId: 1 });

// NEW: Indexes for QR code queries

LocationSchema.index({ "qrCode.isEnabled": 1 });
LocationSchema.index({ "qrCode.isEnabled": 1, "qrCode.qrId": 1 });

export default mongoose.model("Location", LocationSchema);
