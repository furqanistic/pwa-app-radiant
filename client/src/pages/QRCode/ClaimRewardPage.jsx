import { setPoints } from "@/redux/userSlice";
import { qrCodeService } from "@/services/qrCodeService";
import { motion } from "framer-motion";
import { AlertCircle, Check, Loader2, QrCode } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const ClaimRewardPage = () => {
    const [searchParams] = useSearchParams();
    const qrId = searchParams.get("qrId");
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { currentUser } = useSelector((state) => state.user);

    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

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
                email.trim().toLowerCase()
            );

            if (response.status === "success" || response.status === "verified") {
                if (response.data?.user?.totalPoints) {
                    dispatch(setPoints(response.data.user.totalPoints));
                }
                setResult({
                    success: true,
                    message: response.message,
                    data: response.data,
                });
                toast.success("Points awarded!");
            } else if (response.status === "pending") {
                setResult({
                    success: false,
                    message: response.message,
                    data: response.data,
                    isPending: true
                });
                toast.info(response.message);
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Failed to process QR code";
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
                    <p className="text-gray-600 mb-6">This QR code link is invalid or has expired.</p>
                    <button
                        onClick={() => navigate("/dashboard")}
                        className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold shadow-lg"
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
                {/* Header */}
                <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-8 text-white text-center">
                    <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <QrCode className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold">Claim Your Reward</h2>
                    <p className="opacity-90">Enter your email to get 50 points!</p>
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
                                <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                                    Points will be added to your account. If you don't have an account, we'll send you a verification link.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold shadow-lg hover:shadow-pink-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-5 h-5" />
                                        Claim My Points
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
                                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Success!</h3>
                                        <p className="text-gray-600">{result.message}</p>
                                    </div>
                                    <div className="bg-pink-50 rounded-xl p-4">
                                        <p className="text-sm text-gray-600 mb-1">Total Points</p>
                                        <p className="text-3xl font-bold text-pink-600">{result.data?.user?.totalPoints || "50"}</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className={`${result.isPending ? 'bg-blue-100' : 'bg-red-100'} w-16 h-16 rounded-full flex items-center justify-center mx-auto`}>
                                        {result.isPending ? <Check className="w-8 h-8 text-blue-600" /> : <AlertCircle className="w-8 h-8 text-red-600" />}
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
                                onClick={() => navigate(currentUser ? "/dashboard" : "/auth")}
                                className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold shadow-lg"
                            >
                                {currentUser ? "Go to Dashboard" : "Sign In / Sign Up"}
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default ClaimRewardPage;
