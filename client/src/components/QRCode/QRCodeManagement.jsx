import { FRONTEND_URL, axiosInstance } from "@/config";
import { qrCodeService } from "@/services/qrCodeService";
import { motion } from "framer-motion";
import {
    Check,
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
import QRCodeLib from "qrcode";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

const QRCodeManagement = ({ locationId, locationName }) => {
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [togglingQR, setTogglingQR] = useState(false);
  const [qrImage, setQrImage] = useState(null);
  const [stats, setStats] = useState(null);
  const [copiedQRId, setCopiedQRId] = useState(false);

  // Fetch QR code details
  const fetchQRCode = async () => {
    setLoading(true);
    try {
      const response = await qrCodeService.getLocationQRCode(locationId);
      if (response.status === "success") {
        setQrCode(response.data);

        // Generate QR code image
        if (response.data.qrData) {
          const claimUrl = `${FRONTEND_URL}/claim-reward?qrId=${response.data.qrId}`;
          const image = await QRCodeLib.toDataURL(claimUrl, {
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
        const claimUrl = `${FRONTEND_URL}/claim-reward?qrId=${response.data.qrId}`;
        const image = await QRCodeLib.toDataURL(claimUrl, {
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
    setTogglingQR(true);
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
    } finally {
      setTogglingQR(false);
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
    setCopiedQRId(true);
    toast.success("QR ID copied to clipboard!");

    // Reset the copied state after 2 seconds
    setTimeout(() => {
      setCopiedQRId(false);
    }, 2000);
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

  // Stat Card Component for consistency
  const StatCard = ({ label, value, colorClass, bgClass }) => (
    <div className={`flex flex-col items-center justify-center p-3 md:p-4 rounded-2xl ${bgClass} h-full min-h-[90px] md:min-h-[120px] min-w-[120px] md:min-w-[160px] text-center transition-all hover:shadow-md border border-opacity-50`}>
      <p className="text-gray-500 text-[10px] md:text-sm font-bold uppercase tracking-wider mb-1 md:mb-2">{label}</p>
      <p className={`text-2xl md:text-4xl font-black ${colorClass} tabular-nums`}>
        {value}
      </p>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 w-full max-w-full p-1 overflow-x-hidden">
      {/* QR Code Display Section */}
      {qrCode && qrImage ? (
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start bg-white md:bg-gray-50/30 md:p-6 md:rounded-3xl md:border md:border-gray-100">
          {/* QR Image Container */}
          <div className="flex flex-col items-center space-y-4 w-full md:w-auto shrink-0">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-4 rounded-[2rem] border-2 border-dashed border-pink-200 shadow-xl shadow-pink-100/20 relative"
            >
              <div className="absolute -top-3 -right-3 bg-pink-500 text-white p-2 rounded-xl shadow-lg">
                  <QrCode className="w-4 h-4" />
              </div>
              <img
                src={qrImage}
                alt="QR Code"
                className="w-44 h-44 md:w-56 md:h-56 object-contain"
              />
            </motion.div>
            
            <div
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest shadow-sm ${
                qrCode.isEnabled
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : "bg-red-100 text-red-700 border border-red-200"
              }`}
            >
              {qrCode.isEnabled ? <Check className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {qrCode.isEnabled ? "Active" : "Disabled"}
            </div>
          </div>

          {/* Info & Actions */}
          <div className="flex-1 w-full space-y-6">
            <div className="grid gap-4">
              <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">QR Unique ID</label>
                  <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl border border-gray-100 shadow-sm transition-all hover:border-pink-200">
                    <code className="text-xs md:text-sm font-mono flex-1 text-gray-600 truncate">
                      {qrCode.qrId}
                    </code>
                    <button
                      onClick={handleCopyQRId}
                      className={`p-2 rounded-xl transition-all ${
                        copiedQRId
                          ? "bg-green-100 text-green-600"
                          : "bg-gray-50 text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      {copiedQRId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
              </div>

              <div className="flex items-center justify-between bg-yellow-50/50 px-4 py-3 rounded-2xl border border-yellow-100/50">
                  <span className="text-[10px] font-black text-yellow-700 uppercase tracking-widest">Scan Reward</span>
                  <div className="flex items-center gap-1.5 font-black text-yellow-700">
                    <Zap className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    <span className="text-base md:text-lg">{qrCode.pointsValue} pts</span>
                  </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleDownloadQR}
                className="flex items-center justify-center gap-2 px-4 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 hover:border-pink-300 transition-all font-bold text-xs md:text-sm shadow-sm active:scale-95"
              >
                <Download className="w-4 h-4" />
                Save Image
              </button>

              <button
                onClick={handleToggleStatus}
                className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl transition-all font-bold text-xs md:text-sm text-white shadow-lg active:scale-95 ${
                  qrCode.isEnabled
                    ? "bg-gradient-to-br from-red-500 to-rose-600 shadow-rose-200"
                    : "bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-200"
                }`}
              >
                {togglingQR ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : qrCode.isEnabled ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                {qrCode.isEnabled ? "Disable" : "Enable"}
              </button>
            </div>

            <button
              onClick={handleGenerateQR}
              className="w-full py-2 text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest hover:text-pink-600 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3 h-3" />
              Regenerate New Code
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 md:py-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <div className="bg-white p-4 rounded-full shadow-sm inline-block mb-4">
               <QrCode className="w-12 h-12 text-gray-300" />
          </div>
          <p className="text-gray-900 font-bold mb-2">No QR Code Yet</p>
          <p className="text-gray-500 mb-8 text-sm max-w-[200px] mx-auto">Generate a code to start rewarding your customers.</p>
          <button
            onClick={handleGenerateQR}
            disabled={generatingQR}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-2xl hover:shadow-xl hover:scale-[1.02] transition-all font-bold disabled:opacity-50"
          >
            {generatingQR ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <QrCode className="w-5 h-5" />
            )}
            {generatingQR ? "Creating..." : "Create QR Code"}
          </button>
        </div>
      )}

      {/* Analytics Section */}
      {stats && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 p-6 md:p-8 shadow-2xl shadow-gray-200/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
               <div className="w-1.5 h-6 bg-pink-500 rounded-full" />
               <h3 className="text-base md:text-xl font-black text-gray-900 leading-none">
                  Analytics
               </h3>
            </div>
            <div className="text-[10px] md:text-xs font-black text-pink-500 bg-pink-50 px-3 py-1 rounded-full uppercase tracking-tighter">
                Live Data
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <StatCard label="Total Scans" value={stats.statistics.totalScans} colorClass="text-pink-600" bgClass="bg-pink-50/50" />
            <StatCard label="Verified" value={stats.statistics.verifiedScans} colorClass="text-emerald-600" bgClass="bg-emerald-50/50" />
            <StatCard label="Pending" value={stats.statistics.pendingScans} colorClass="text-amber-600" bgClass="bg-amber-50/50" />
            <StatCard label="Unique" value={stats.statistics.uniqueVisitors} colorClass="text-indigo-600" bgClass="bg-indigo-50/50" />
          </div>

          <div className="mt-6 flex flex-col md:flex-row items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 gap-4">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                   <Zap className="w-4 h-4 fill-current" />
                </div>
                <span className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-widest">Points Distributed</span>
             </div>
             <span className="text-2xl font-black text-blue-600 tabular-nums">
                {stats.statistics.totalPointsDistributed} <span className="text-xs font-bold text-blue-400">PTS</span>
             </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRCodeManagement;
