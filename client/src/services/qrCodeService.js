// File: client/src/services/qrCodeService.js
import { axiosInstance } from "@/config";

export const qrCodeService = {
  // Scan a QR code
  scanQRCode: async (qrId, email) => {
    const response = await axiosInstance.post("/qr-codes/scan", {
      qrId,
      email,
    });
    return response.data;
  },

  // Get QR code details for a location
  getLocationQRCode: async (locationId) => {
    const response = await axiosInstance.get(`/qr-codes/${locationId}`);
    return response.data;
  },

  // Get QR code statistics (admin only)
  getQRCodeStats: async (locationId) => {
    const response = await axiosInstance.get(`/qr-codes/${locationId}/stats`);
    return response.data;
  },

  // Generate QR code for a location (admin only)
  generateQRCode: async (locationId) => {
    const response = await axiosInstance.post(
      `/qr-codes/${locationId}/generate`
    );
    return response.data;
  },

  // Toggle QR code status (admin only)
  toggleQRCodeStatus: async (locationId) => {
    const response = await axiosInstance.patch(
      `/qr-codes/${locationId}/toggle-status`
    );
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
