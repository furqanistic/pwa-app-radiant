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
    reviewLink: {
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

    // ==================== AUTOMATED GIFTS SETTINGS ====================
    automatedGifts: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        content: {
          type: String,
          required: true,
          trim: true,
        },
        image: {
          type: String,
          default: "",
        },
        isActive: {
          type: Boolean,
          default: false,
        },
        type: {
          type: String,
          enum: ["fixed-date", "birthday", "anniversary", "custom"],
          default: "fixed-date",
        },
        month: {
          type: Number,
          min: 1,
          max: 12,
        },
        day: {
          type: Number,
          min: 1,
          max: 31,
        },
      },
    ],

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

    // ==================== MEMBERSHIP FIELDS ====================
    // Membership configuration for this location
    membership: {
      isActive: {
        type: Boolean,
        default: false,
      },
      price: {
        type: Number,
        default: 99,
        min: 0,
      },
      benefits: {
        type: [String],
        default: [
          'Priority Booking',
          'Free Premium Facial',
          '15% Product Discount'
        ],
        validate: {
          validator: function(v) {
            return v.length === 3;
          },
          message: 'Membership must have exactly 3 benefits'
        }
      },
      name: {
        type: String,
        default: 'Gold Glow Membership',
        trim: true,
      },
      description: {
        type: String,
        default: 'Unlock exclusive perks and premium benefits',
        trim: true,
      },
      stripeProductId: {
        type: String,
        default: null,
        sparse: true,
      },
      stripePriceId: {
        type: String,
        default: null,
        sparse: true,
      },
      currency: {
        type: String,
        default: 'usd',
        trim: true,
      },
      syncedAt: {
        type: Date,
        default: null,
      },
    },
    // ==================== END MEMBERSHIP FIELDS ====================
    
    logo: {
      type: String,
      default: "",
    },

    // ==================== BRANDING FIELDS ====================
    // Subdomain for multi-tenant access (e.g., "spark" for spark.cxrsystems.com)
    subdomain: {
      type: String,
      unique: true,
      sparse: true, // Allow null values, but enforce uniqueness when set
      lowercase: true,
      trim: true,
      validate: {
        validator: function(v) {
          if (!v) return true; // Allow empty/null
          // Must be 3-20 characters, lowercase alphanumeric with hyphens, cannot start/end with hyphen
          return /^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/.test(v);
        },
        message: props => `${props.value} is not a valid subdomain! Must be 3-20 characters, lowercase alphanumeric with hyphens, cannot start/end with hyphen.`
      }
    },

    // Custom favicon URL (optional, falls back to logo)
    favicon: {
      type: String,
      default: "",
    },

    // Custom theme color for PWA manifest
    themeColor: {
      type: String,
      default: "#ec4899", // Default pink color
      validate: {
        validator: function(v) {
          if (!v) return true;
          // Must be a valid hex color
          return /^#[0-9A-Fa-f]{6}$/.test(v);
        },
        message: props => `${props.value} is not a valid hex color!`
      }
    },
    // ==================== END BRANDING FIELDS ====================

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

// NEW: Index for subdomain queries
LocationSchema.index({ subdomain: 1 });

export default mongoose.model("Location", LocationSchema);
