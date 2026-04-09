// File: client/src/services/qrCodeService.js
import { axiosInstance } from "@/config";

export const qrCodeService = {
  // Scan a QR code
  scanQRCode: async (qrId, email, purpose) => {
    const response = await axiosInstance.post("/qr-codes/scan", {
      qrId,
      email,
      purpose,
    });
    return response.data;
  },

  // Resolve QR code to spa location/subdomain (public)
  resolveQRCodeLocation: async (qrId) => {
    const response = await axiosInstance.get(`/qr-codes/resolve/${qrId}`);
    return response.data;
  },

  // Get QR code details for a location
  getLocationQRCode: async (locationId, purpose = "claim") => {
    const response = await axiosInstance.get(`/qr-codes/${locationId}`, {
      params: { purpose },
    });
    return response.data;
  },

  // Get QR code details using business locationId
  getLocationQRCodeByBusinessId: async (locationId, purpose = "claim") => {
    const response = await axiosInstance.get(
      `/qr-codes/by-location-id/${locationId}`,
      {
        params: { purpose },
      }
    );
    return response.data;
  },

  // Get QR code statistics (admin only)
  getQRCodeStats: async (locationId, purpose = "claim") => {
    const response = await axiosInstance.get(`/qr-codes/${locationId}/stats`, {
      params: { purpose },
    });
    return response.data;
  },

  // Generate QR code for a location (admin only)
  generateQRCode: async (locationId, purpose = "claim") => {
    const response = await axiosInstance.post(
      `/qr-codes/${locationId}/generate`,
      { purpose }
    );
    return response.data;
  },

  // Toggle QR code status (admin only)
  toggleQRCodeStatus: async (locationId, purpose = "claim") => {
    const response = await axiosInstance.patch(
      `/qr-codes/${locationId}/toggle-status`,
      { purpose }
    );
    return response.data;
  },

  // Update QR ID (admin only)
  updateQRCodeId: async (locationId, qrId, purpose = "claim") => {
    const response = await axiosInstance.patch(`/qr-codes/${locationId}/qr-id`, {
      qrId,
      purpose,
    });
    return response.data;
  },

  // Get all QR codes (admin only)
  getAllQRCodes: async (page = 1, limit = 20) => {
    const response = await axiosInstance.get("/qr-codes", {
      params: { page, limit },
    });
    return response.data;
  },
};

export default qrCodeService;
