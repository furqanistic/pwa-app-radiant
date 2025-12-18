// File: client/src/components/QRCode/QRCodeManagement.jsx
import { qrCodeService } from "@/services/qrCodeService";
import { motion } from "framer-motion";
import {
  Copy,
  Download,
  Eye,
  EyeOff,
  Loader2,
  QrCode,
  RefreshCw,
  RotateCcw,
  Zap,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import QRCodeLib from "qrcode";

const QRCodeManagement = ({ locationId, locationName }) => {
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [qrImage, setQrImage] = useState(null);
  const [stats, setStats] = useState(null);

  // Fetch QR code details
  const fetchQRCode = async () => {
    setLoading(true);
    try {
      const response = await qrCodeService.getLocationQRCode(locationId);
      if (response.status === "success") {
        setQrCode(response.data);

        // Generate QR code image
        if (response.data.qrData) {
          const qrString = JSON.stringify(response.data.qrData);
          const image = await QRCodeLib.toDataURL(qrString, {
            width: 300,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
          });
          setQrImage(image);
        }
      }
    } catch (error) {
      if (error.response?.status === 404) {
        // QR code doesn't exist yet
        setQrCode(null);
      } else {
        toast.error("Failed to load QR code");
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await qrCodeService.getQRCodeStats(locationId);
      if (response.status === "success") {
        setStats(response.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // Generate new QR code
  const handleGenerateQR = async () => {
    setGeneratingQR(true);
    try {
      const response = await qrCodeService.generateQRCode(locationId);
      if (response.status === "success") {
        setQrCode(response.data);

        // Generate QR code image
        const qrString = JSON.stringify(response.data.qrData);
        const image = await QRCodeLib.toDataURL(qrString, {
          width: 300,
          margin: 2,
        });
        setQrImage(image);

        toast.success("QR code generated successfully!");
        fetchStats();
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to generate QR code"
      );
    } finally {
      setGeneratingQR(false);
    }
  };

  // Toggle QR code status
  const handleToggleStatus = async () => {
    try {
      const response = await qrCodeService.toggleQRCodeStatus(locationId);
      if (response.status === "success") {
        setQrCode({
          ...qrCode,
          isEnabled: response.data.isEnabled,
        });
        toast.success(
          `QR code ${response.data.isEnabled ? "enabled" : "disabled"}`
        );
      }
    } catch (error) {
      toast.error("Failed to update QR code status");
    }
  };

  // Download QR code
  const handleDownloadQR = () => {
    if (!qrImage) return;

    const link = document.createElement("a");
    link.href = qrImage;
    link.download = `${locationName}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("QR code downloaded!");
  };

  // Copy QR ID to clipboard
  const handleCopyQRId = () => {
    if (!qrCode?.qrId) return;

    navigator.clipboard.writeText(qrCode.qrId);
    toast.success("QR ID copied to clipboard!");
  };

  useEffect(() => {
    fetchQRCode();
    fetchStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [locationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* QR Code Display Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border-2 border-pink-100 p-6 lg:p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-3 rounded-xl">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">QR Code</h3>
            <p className="text-sm text-gray-600">for {locationName}</p>
          </div>
        </div>

        {qrCode && qrImage ? (
          <div className="space-y-6">
            {/* QR Code Image */}
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="bg-white p-4 rounded-xl border-2 border-gray-100 mb-4"
              >
                <img
                  src={qrImage}
                  alt="QR Code"
                  className="w-64 h-64 object-contain"
                />
              </motion.div>

              {/* QR Code Info */}
              <div className="w-full bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 mb-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      QR ID:
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-white px-2 py-1 rounded border border-gray-200 font-mono">
                        {qrCode.qrId}
                      </code>
                      <button
                        onClick={handleCopyQRId}
                        className="p-1.5 hover:bg-white rounded transition-colors"
                      >
                        <Copy className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Points per Scan:
                    </span>
                    <div className="flex items-center gap-1 px-3 py-1 bg-white rounded-lg">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span className="font-bold text-gray-900">
                        {qrCode.pointsValue} pts
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Status:
                    </span>
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                        qrCode.isEnabled
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {qrCode.isEnabled ? (
                        <>
                          <Eye className="w-4 h-4" />
                          Active
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-4 h-4" />
                          Disabled
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full flex gap-3">
                <button
                  onClick={handleDownloadQR}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-pink-200 text-pink-600 rounded-lg hover:bg-pink-50 transition-colors font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>

                <button
                  onClick={handleToggleStatus}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-white ${
                    qrCode.isEnabled
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-green-500 hover:bg-green-600"
                  }`}
                >
                  {qrCode.isEnabled ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      Disable
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Enable
                    </>
                  )}
                </button>

                <button
                  onClick={handleGenerateQR}
                  disabled={generatingQR}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  {generatingQR ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      Regenerate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <QrCode className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No QR code generated yet</p>
            <button
              onClick={handleGenerateQR}
              disabled={generatingQR}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50"
            >
              {generatingQR ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4" />
                  Generate QR Code
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>

      {/* Statistics Section */}
      {stats && qrCode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border-2 border-purple-100 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-3 rounded-xl">
              <RefreshCw className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Scan Statistics
              </h3>
              <p className="text-sm text-gray-600">QR code performance</p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-4 text-center">
              <p className="text-gray-600 text-sm mb-1">Total Scans</p>
              <p className="text-3xl font-bold text-pink-600">
                {stats.statistics.totalScans}
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 text-center">
              <p className="text-gray-600 text-sm mb-1">Verified</p>
              <p className="text-3xl font-bold text-green-600">
                {stats.statistics.verifiedScans}
              </p>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 text-center">
              <p className="text-gray-600 text-sm mb-1">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">
                {stats.statistics.pendingScans}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 text-center">
              <p className="text-gray-600 text-sm mb-1">Unique Visitors</p>
              <p className="text-3xl font-bold text-purple-600">
                {stats.statistics.uniqueVisitors}
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">
              <span className="font-bold">Total Points Distributed:</span>{" "}
              {stats.statistics.totalPointsDistributed}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default QRCodeManagement;
