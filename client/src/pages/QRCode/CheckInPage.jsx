import { useBranding } from "@/context/BrandingContext";
import { resolveBrandingLogoUrl } from "@/lib/imageHelpers";
import { qrCodeService } from "@/services/qrCodeService";
import { motion } from "framer-motion";
import { AlertCircle, Check, Loader2, QrCode, ScanLine } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const CheckInPage = () => {
  const [searchParams] = useSearchParams();
  const qrId = searchParams.get("qrId");
  const navigate = useNavigate();
  const { currentUser } = useSelector((state) => state.user);
  const { branding, hasBranding } = useBranding();
  const brandColor = branding?.themeColor || "#ec4899";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const redirectToSignup = () => {
    const signupUrl = result?.data?.signupUrl;
    if (signupUrl) {
      window.location.assign(signupUrl);
      return;
    }
    navigate("/auth");
  };

  useEffect(() => {
    if (currentUser?.email) {
      setEmail(currentUser.email);
    }
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!qrId) {
      toast.error("Invalid QR Code");
      return;
    }
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      const response = await qrCodeService.scanQRCode(
        qrId,
        email.trim().toLowerCase(),
        "checkin"
      );

      if (response.status === "success" || response.status === "verified") {
        setResult({
          success: true,
          message: response.message,
          data: response.data,
        });
        toast.success("Check-in recorded!");
      } else if (response.status === "pending") {
        setResult({
          success: false,
          message: response.message,
          data: response.data,
          isPending: true,
        });
        toast.info(response.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to process check-in";
      setResult({
        success: false,
        message: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!qrId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
          <p className="text-gray-600 mb-6">This check-in QR link is invalid or has expired.</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full py-3 text-white rounded-xl font-bold shadow-lg"
            style={{ background: brandColor }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        <div
          className="p-8 text-white text-center"
          style={{
            background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}dd 100%)`,
          }}
        >
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm overflow-hidden p-2">
            {hasBranding && (branding.logo || branding.logoPublicId) ? (
              <img
                src={resolveBrandingLogoUrl(branding, { width: 80, height: 80 })}
                alt={branding.name}
                className="w-10 h-10 object-contain rounded-lg"
              />
            ) : (
              <QrCode className="w-8 h-8" />
            )}
          </div>
          <h2 className="text-2xl font-bold">{branding?.name || "Check In"}</h2>
          <p className="opacity-90">Enter your email to complete check-in.</p>
        </div>

        <div className="p-8">
          {!result ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-all"
                  disabled={loading}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 text-white rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: brandColor }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ScanLine className="w-5 h-5" />
                    Complete Check-In
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-6">
              {result.success ? (
                <>
                  <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Checked In!</h3>
                    <p className="text-gray-600">{result.message}</p>
                  </div>
                  {typeof result?.data?.user?.pointsEarned === "number" && (
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                          Check-In Reward
                        </span>
                        <span className="text-xl font-bold" style={{ color: brandColor }}>
                          +{result.data.user.pointsEarned}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                          New Balance
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {Number(result?.data?.user?.totalPoints || 0)} points
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div
                    className={`${result.isPending ? "bg-blue-100" : "bg-red-100"} w-16 h-16 rounded-full flex items-center justify-center mx-auto`}
                  >
                    {result.isPending ? (
                      <Check className="w-8 h-8 text-blue-600" />
                    ) : (
                      <AlertCircle className="w-8 h-8 text-red-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {result.isPending ? "Almost There!" : "Oops!"}
                    </h3>
                    <p className="text-gray-600">{result.message}</p>
                  </div>
                </>
              )}

              <button
                onClick={() => {
                  if (result.isPending) {
                    redirectToSignup();
                    return;
                  }
                  navigate(currentUser ? "/dashboard" : "/auth");
                }}
                className="w-full py-4 text-white rounded-xl font-bold shadow-lg"
                style={{ background: brandColor }}
              >
                {result.isPending
                  ? "Create Account"
                  : currentUser
                    ? "Go to Dashboard"
                    : "Sign In / Sign Up"}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CheckInPage;
