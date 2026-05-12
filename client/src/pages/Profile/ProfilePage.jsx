import { FRONTEND_URL, axiosInstance } from "@/config";
import { locationService } from "@/services/locationService";
import { qrCodeService } from "@/services/qrCodeService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    AlertCircle,
    Calendar,
    Check,
    ChevronDown,
    ChevronUp,
    Crown,
    Download,
    Edit3,
    Loader2,
    Lock,
    Mail,
    Phone,
    MapPin,
    QrCode,
    Shield,
    Sparkles,
    User,
    Zap
} from "lucide-react";
import QRCodeLib from "qrcode";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { updateProfile } from "../../redux/userSlice";
import { Button } from "@/components/ui/button";
import Layout from "../Layout/Layout";
import { useBranding } from '@/context/BrandingContext';
import { useScopedLocationId } from '@/hooks/useScopedLocationId';
import { isValidProfilePhone } from '@/lib/phoneValidation';

const hexToRgb = (hex) => {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return '236, 72, 153';
  const num = parseInt(cleaned, 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

const cardClass = "bg-white border border-slate-200 rounded-xl p-5";

// API Functions
const profileAPI = {
  getCurrentUser: async () => {
    const { data } = await axiosInstance.get("/auth/me");
    return data.data.user;
  },
  updateUser: async ({ userId, userData }) => {
    try {
      const { data } = await axiosInstance.put(
        `/auth/update/${userId}`,
        userData
      );
      return data.data.user;
    } catch (error) {
      console.error(
        "API: Update failed:",
        error.response?.data || error.message
      );
      throw error;
    }
  },
  changePassword: async (passwordData) => {
    const { data } = await axiosInstance.put(
      "/auth/change-password",
      passwordData
    );
    return data;
  },
};

// Responsive Profile Input Component
const ProfileField = ({
  icon: Icon,
  label,
  type = "text",
  value,
  onChange,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  placeholder,
  disabled = false,
  error = null,
}) => {
  const { branding } = useBranding();
  const brandColor = branding?.themeColor || '#ec4899';

  return (
    <motion.div layout {...fadeUp} className="w-full">
      {!isEditing ? (
        <motion.div
          whileTap={{ scale: disabled ? 1 : 0.99 }}
          className={`group flex items-center justify-between ${cardClass} ${
            disabled
              ? "opacity-60 cursor-not-allowed"
              : "cursor-pointer hover:border-slate-300"
          }`}
          onClick={disabled ? undefined : onEdit}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="p-2.5 rounded-lg shrink-0 text-white"
              style={{ backgroundColor: brandColor }}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {label}
              </p>
              <p className="text-sm font-semibold text-slate-900 truncate">
                {value}
              </p>
            </div>
          </div>
          {!disabled && (
            <div className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
              <Edit3 className="w-3.5 h-3.5 text-slate-400" />
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cardClass}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="p-2 rounded-lg text-white"
              style={{ backgroundColor: brandColor }}
            >
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Edit {label}
            </p>
          </div>
          <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`w-full px-4 py-2.5 bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all text-sm font-medium placeholder:text-slate-400 ${
              error ? "border-red-300" : ""
            }`}
            autoFocus
          />
          {error && (
            <p className="text-red-500 text-xs mt-2 font-medium flex items-center gap-1">
              <AlertCircle size={12} /> {error}
            </p>
          )}
          <div className="flex gap-3 mt-4">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onSave}
              disabled={disabled}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 hover:brightness-90"
              style={{ backgroundColor: brandColor }}
            >
              {disabled ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {disabled ? "Saving..." : "Save Changes"}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onCancel}
              disabled={disabled}
              className="px-5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              Cancel
            </motion.button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

// Password Change Component
const PasswordChangeField = ({
  isEditing,
  onEdit,
  onCancel,
  onSave,
  isLoading,
}) => {
  const { branding } = useBranding();
  const brandColor = branding?.themeColor || '#ec4899';

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});

  const validatePasswords = () => {
    const newErrors = {};

    if (!passwords.currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }

    if (!passwords.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (passwords.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validatePasswords()) {
      onSave({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
    }
  };

  const handleCancel = () => {
    setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setErrors({});
    onCancel();
  };

  return (
    <motion.div layout {...fadeUp} className="w-full">
      {!isEditing ? (
        <motion.div
          whileTap={{ scale: 0.99 }}
          className={`group flex items-center justify-between ${cardClass} cursor-pointer hover:border-slate-300`}
          onClick={onEdit}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="p-2.5 rounded-lg shrink-0 text-white"
              style={{ backgroundColor: brandColor }}
            >
              <Lock className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Security
              </p>
              <p className="text-sm font-semibold text-slate-900 truncate">
                Change Password
              </p>
            </div>
          </div>
          <div className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cardClass}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="p-2 rounded-lg text-white"
              style={{ backgroundColor: brandColor }}
            >
              <Lock className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Change Password
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <input
                type="password"
                placeholder="Current password"
                value={passwords.currentPassword}
                onChange={(e) =>
                  setPasswords({
                    ...passwords,
                    currentPassword: e.target.value,
                  })
                }
                className={`w-full px-4 py-2.5 bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all text-sm font-medium placeholder:text-slate-400 ${
                  errors.currentPassword ? "border-red-300" : ""
                }`}
                autoFocus
              />
              {errors.currentPassword && (
                <p className="text-red-500 text-xs mt-1 font-medium">{errors.currentPassword}</p>
              )}
            </div>

            <div>
              <input
                type="password"
                placeholder="New password (min 8 characters)"
                value={passwords.newPassword}
                onChange={(e) =>
                  setPasswords({ ...passwords, newPassword: e.target.value })
                }
                className={`w-full px-4 py-2.5 bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all text-sm font-medium placeholder:text-slate-400 ${
                  errors.newPassword ? "border-red-300" : ""
                }`}
              />
              {errors.newPassword && (
                <p className="text-red-500 text-xs mt-1 font-medium">{errors.newPassword}</p>
              )}
            </div>

            <div>
              <input
                type="password"
                placeholder="Confirm new password"
                value={passwords.confirmPassword}
                onChange={(e) =>
                  setPasswords({
                    ...passwords,
                    confirmPassword: e.target.value,
                  })
                }
                className={`w-full px-4 py-2.5 bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all text-sm font-medium placeholder:text-slate-400 ${
                  errors.confirmPassword ? "border-red-300" : ""
                }`}
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1 font-medium">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 hover:brightness-90"
              style={{ backgroundColor: brandColor }}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {isLoading ? "Updating..." : "Update Password"}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleCancel}
              disabled={isLoading}
              className="px-5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              Cancel
            </motion.button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

// Loading Component
const LoadingState = () => {
  const { branding } = useBranding();
  const brandColor = branding?.themeColor || '#ec4899';
  const brandColorDark = (() => {
    const cleaned = brandColor.replace('#', '');
    if (cleaned.length !== 6) return '#b0164e';
    const num = parseInt(cleaned, 16);
    const r = Math.max(0, ((num >> 16) & 255) - 24);
    const g = Math.max(0, ((num >> 8) & 255) - 24);
    const b = Math.max(0, (num & 255) - 24);
    return `#${r.toString(16).padStart(2, '0')}${g
      .toString(16)
      .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  })();

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Loading profile...</span>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Error Component
const ErrorState = ({ error, retry }) => {
  const { branding } = useBranding();
  const brandColor = branding?.themeColor || '#ec4899';
  const brandColorDark = (() => {
    const cleaned = brandColor.replace('#', '');
    if (cleaned.length !== 6) return '#b0164e';
    const num = parseInt(cleaned, 16);
    const r = Math.max(0, ((num >> 16) & 255) - 24);
    const g = Math.max(0, ((num >> 8) & 255) - 24);
    const b = Math.max(0, (num & 255) - 24);
    return `#${r.toString(16).padStart(2, '0')}${g
      .toString(16)
      .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  })();

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50/50 grid place-items-center p-4">
        <div className="text-center max-w-sm w-full bg-white border border-slate-200 rounded-xl p-8">
          <AlertCircle className="w-10 h-10 mx-auto mb-4" style={{ color: brandColor }} />
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            Failed to load profile
          </h2>
          <p className="text-slate-500 mb-6 text-sm">
            {error?.message || "Something went wrong"}
          </p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={retry}
            className="w-full py-2.5 text-white rounded-lg text-sm font-semibold hover:brightness-90 transition-all"
            style={{ backgroundColor: brandColor }}
          >
            Try Again
          </motion.button>
        </div>
      </div>
    </Layout>
  );
};

// Main Profile Component
const ProfilePage = () => {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { currentUser } = useSelector((state) => state.user);
  const { branding } = useBranding();
  const scopedLocationId = useScopedLocationId();
  const currentUserQueryKey = useMemo(
    () => ["currentUser", scopedLocationId ?? "global"],
    [scopedLocationId]
  );
  const brandColor = branding?.themeColor || '#ec4899';
  const brandColorDark = (() => {
    const cleaned = brandColor.replace('#', '');
    if (cleaned.length !== 6) return '#b0164e';
    const num = parseInt(cleaned, 16);
    const r = Math.max(0, ((num >> 16) & 255) - 24);
    const g = Math.max(0, ((num >> 8) & 255) - 24);
    const b = Math.max(0, (num & 255) - 24);
    return `#${r.toString(16).padStart(2, '0')}${g
      .toString(16)
      .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  })();

  const brandRgb = hexToRgb(brandColor);

  const toastStyle = {
    style: {
      background: `linear-gradient(90deg, ${brandColor}, ${brandColorDark})`,
      color: '#fff',
      border: 'none',
    },
  };

  const toastSuccess = (message, options = {}) =>
    toast.success(message, { ...toastStyle, ...options });
  const toastError = (message, options = {}) =>
    toast.error(message, { ...toastStyle, ...options });

  // React Query hooks
  const {
    data: userData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: currentUserQueryKey,
    queryFn: profileAPI.getCurrentUser,
    initialData: currentUser,
    staleTime: 5 * 60 * 1000,
    onError: (error) => {
      console.error("Error fetching user:", error);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: profileAPI.updateUser,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(currentUserQueryKey, updatedUser);
      dispatch(updateProfile(updatedUser));
      toastSuccess("Profile updated successfully");
    },
    onError: (error) => {
        console.error("Update failed", error);
        toastError(error.response?.data?.message || "Failed to update profile");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: profileAPI.changePassword,
    onSuccess: () => {
        toastSuccess("Password changed successfully");
    },
    onError: (error) => {
        toastError(error.response?.data?.message || "Failed to change password");
    },
  });

  const [editingField, setEditingField] = useState(null);
  const [tempValues, setTempValues] = useState({});
  const [spaClaimQrImage, setSpaClaimQrImage] = useState(null);
  const [spaCheckInQrImage, setSpaCheckInQrImage] = useState(null);
  const [isQrDownloadPanelOpen, setIsQrDownloadPanelOpen] = useState(false);
  const [generatingSpaQrPurpose, setGeneratingSpaQrPurpose] = useState(null);

  // Format user data
  const user = userData
    ? {
        ...userData,
        memberSince: new Date(userData.createdAt).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        points: userData.points || 0,
      }
    : null;
  const isSpaUser = user?.role === "spa";

  const {
    data: myLocationData,
    isLoading: isLoadingMyLocation,
  } = useQuery({
    queryKey: ["profile-my-location", user?._id],
    queryFn: () => locationService.getMyLocation(),
    enabled: isSpaUser,
    retry: false,
  });

  const myLocation = myLocationData?.data?.location || null;
  const spaLocationDbId = myLocation?._id || null;
  const spaBusinessLocationId = user?.spaLocation?.locationId || null;

  const {
    data: spaClaimQrData,
    isLoading: isLoadingSpaClaimQr,
    error: spaClaimQrError,
  } = useQuery({
    queryKey: ["profile-location-qr", "claim", spaLocationDbId, spaBusinessLocationId],
    queryFn: () => {
      if (spaLocationDbId) {
        return qrCodeService.getLocationQRCode(spaLocationDbId, "claim");
      }
      return qrCodeService.getLocationQRCodeByBusinessId(spaBusinessLocationId, "claim");
    },
    enabled: isSpaUser && (!!spaLocationDbId || !!spaBusinessLocationId),
    retry: false,
  });

  const {
    data: spaCheckInQrData,
    isLoading: isLoadingSpaCheckInQr,
    error: spaCheckInQrError,
  } = useQuery({
    queryKey: ["profile-location-qr", "checkin", spaLocationDbId, spaBusinessLocationId],
    queryFn: () => {
      if (spaLocationDbId) {
        return qrCodeService.getLocationQRCode(spaLocationDbId, "checkin");
      }
      return qrCodeService.getLocationQRCodeByBusinessId(spaBusinessLocationId, "checkin");
    },
    enabled: isSpaUser && (!!spaLocationDbId || !!spaBusinessLocationId),
    retry: false,
  });

  const spaClaimQr = spaClaimQrData?.data || null;
  const spaCheckInQr = spaCheckInQrData?.data || null;

  const buildSpaQrUrl = (purpose, qrId) => {
    if (!qrId) return null;
    const path = purpose === "checkin" ? "/check-in" : "/claim-reward";
    const spaId = spaBusinessLocationId || myLocation?.locationId || null;
    const fallbackOrigin =
      typeof window !== "undefined" ? window.location.origin : FRONTEND_URL;

    try {
      const baseUrl =
        import.meta.env.DEV && typeof window !== "undefined"
          ? window.location.origin
          : FRONTEND_URL || fallbackOrigin;
      const url = new URL(path, baseUrl);
      url.searchParams.set("qrId", qrId);
      if (spaId) {
        url.searchParams.set("spa", spaId);
      }
      return url.toString();
    } catch {
      const encodedQrId = encodeURIComponent(qrId);
      const spaParam = spaId ? `&spa=${encodeURIComponent(spaId)}` : "";
      return `${fallbackOrigin}${path}?qrId=${encodedQrId}${spaParam}`;
    }
  };

  const generateSpaQrImageFromUrl = async (url, width = 300) => {
    if (!url) return null;
    return QRCodeLib.toDataURL(url, {
      width,
      margin: 1,
      errorCorrectionLevel: "H",
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
  };

  useEffect(() => {
    const generateSpaPreviewQrImages = async () => {
      try {
        const claimUrl = buildSpaQrUrl("claim", spaClaimQr?.qrId);
        const checkInUrl = buildSpaQrUrl("checkin", spaCheckInQr?.qrId);
        const [claimImage, checkInImage] = await Promise.all([
          generateSpaQrImageFromUrl(claimUrl, 320),
          generateSpaQrImageFromUrl(checkInUrl, 320),
        ]);
        setSpaClaimQrImage(claimImage);
        setSpaCheckInQrImage(checkInImage);
      } catch (qrGenerationError) {
        console.error("Failed to generate profile QR image:", qrGenerationError);
        setSpaClaimQrImage(null);
        setSpaCheckInQrImage(null);
      }
    };

    generateSpaPreviewQrImages();
  }, [spaClaimQr?.qrId, spaCheckInQr?.qrId]);

  const getMembershipDisplay = (user) => {
    const membershipStatus = String(
      user?.membership?.status ||
      user?.membershipStatus ||
      user?.activeMembership?.status ||
      ''
    ).toLowerCase();
    const isMembershipActive =
      user?.membership?.isActive ||
      user?.activeMembership?.isActive ||
      ['active', 'trialing', 'paid', 'current'].includes(membershipStatus);

    if (isMembershipActive) {
      const activePlanName =
        user?.membership?.planName ||
        user?.activeMembership?.planName ||
        'Active';
      return `${activePlanName} Plan`;
    }

    const tier = user?.referralStats?.currentTier || 'Bronze';
    return `${tier} Membership`;
  };
  const activeLocationName =
    myLocation?.name ||
    user?.spaLocation?.locationName ||
    user?.selectedLocation?.locationName ||
    "Not assigned";
  const membershipStatus = String(
    user?.membership?.status ||
      user?.membershipStatus ||
      user?.activeMembership?.status ||
      "inactive"
  ).toLowerCase();
  const isMembershipActive =
    user?.membership?.isActive ||
    user?.activeMembership?.isActive ||
    ["active", "trialing", "paid", "current"].includes(membershipStatus);
  const membershipPlanName =
    user?.membership?.planName ||
    user?.activeMembership?.planName ||
    "No active plan";
  const membershipStartDate =
    user?.membership?.startedAt || user?.activeMembership?.startedAt || null;
  const membershipEndDate =
    user?.membership?.expiresAt || user?.activeMembership?.expiresAt || null;
  const formatMembershipDate = (value) => {
    if (!value) return "Not set";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not set";
    return date.toLocaleDateString();
  };

  const handleEdit = (field) => {
    setEditingField(field);
    setTempValues({
      ...tempValues,
      [field]: user?.[field] || "",
    });
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSave = (field) => {
    const value = tempValues[field]?.trim();

    if (!value) {
      toast.error("Field cannot be empty");
      return;
    }

    if (field === "name") {
      if (value.length > 20) {
        toast.error("Name cannot exceed 20 characters");
        return;
      }
    }

    if (field === "email") {
      if (!validateEmail(value)) {
        toast.error("Please enter a valid email address");
        return;
      }

      if (value === user.email) {
        setEditingField(null);
        setTempValues({});
        return;
      }
    }

    if (field === "phone") {
      if (!isValidProfilePhone(value)) {
        toast.error("Please enter a valid phone number (at least 8 digits).");
        return;
      }
      if (value === `${user.phone || ""}`.trim()) {
        setEditingField(null);
        setTempValues({});
        return;
      }
    }

    updateProfileMutation.mutate(
      {
        userId: user._id,
        userData: { [field]: value },
      },
      {
        onSuccess: () => {
          setEditingField(null);
          setTempValues({});
        },
      }
    );
  };

  const handlePasswordChange = (passwordData) => {
    changePasswordMutation.mutate(passwordData, {
      onSuccess: () => {
        setEditingField(null);
      },
    });
  };

  const handleCancel = () => {
    setEditingField(null);
    setTempValues({});
  };

  const handleInputChange = (field, value) => {
    setTempValues({ ...tempValues, [field]: value });
  };

  const handleGenerateSpaQr = async (purpose) => {
    if (!spaLocationDbId) {
      toastError("Location not loaded yet. Please try again.");
      return;
    }

    try {
      setGeneratingSpaQrPurpose(purpose);
      await qrCodeService.generateQRCode(spaLocationDbId, purpose);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["profile-location-qr", "claim", spaLocationDbId, spaBusinessLocationId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["profile-location-qr", "checkin", spaLocationDbId, spaBusinessLocationId],
        }),
      ]);
      toastSuccess(
        purpose === "checkin"
          ? "Check-in QR generated successfully"
          : "Claim rewards QR generated successfully"
      );
    } catch (generationError) {
      toastError(
        generationError?.response?.data?.message || "Could not generate QR code."
      );
    } finally {
      setGeneratingSpaQrPurpose(null);
    }
  };

  const handleDownloadSpaQr = async (purpose) => {
    const qrId = purpose === "checkin" ? spaCheckInQr?.qrId : spaClaimQr?.qrId;
    if (!qrId) {
      toastError("QR code is not available yet.");
      return;
    }

    try {
      const locationName =
        myLocation?.name || user?.spaLocation?.locationName || "location";
      const safeLocationName = locationName.trim().replace(/\s+/g, "-").toLowerCase();
      const filenameSuffix = purpose === "checkin" ? "check-in" : "claim-rewards";
      const downloadUrl = buildSpaQrUrl(purpose, qrId);
      const highResImage = await generateSpaQrImageFromUrl(downloadUrl, 1400);

      const link = document.createElement("a");
      link.href = highResImage;
      link.download = `${safeLocationName}-${filenameSuffix}-qr-high-res.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toastSuccess("High-resolution QR code downloaded successfully");
    } catch (downloadError) {
      console.error("Failed to download high-res QR:", downloadError);
      toastError("Could not download QR code. Please try again.");
    }
  };

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} retry={refetch} />;
  if (!user)
    return (
      <ErrorState error={{ message: "User data not found" }} retry={refetch} />
    );

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50/50 pb-20 md:pb-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl text-white"
            style={{
              background: `linear-gradient(to right, ${brandColor}, ${brandColorDark})`,
            }}
          >
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/15" />
            <div className="pointer-events-none absolute -left-20 -bottom-24 h-64 w-64 rounded-full bg-black/8" />
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between p-6 md:p-8">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
                  <Sparkles size={12} className="text-yellow-200 fill-yellow-200" />
                  {isSpaUser ? "Spa Account" : getMembershipDisplay(user)}
                </div>
                <h1 className="text-2xl md:text-4xl font-bold tracking-tight leading-tight">
                  Hello, {user.name.split(" ")[0]}
                </h1>
                <p className="text-white/80 text-sm md:text-base font-normal">
                  Manage your account details and access your location tools.
                </p>
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-black/12 px-3 py-1.5 text-sm font-medium">
                  <MapPin className="h-3.5 w-3.5" />
                  {activeLocationName}
                </div>
              </div>
              <div className="flex gap-3 self-start lg:self-auto">
                <div className="rounded-xl border border-white/25 bg-white/10 px-4 py-3 min-w-[100px]">
                  <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">Points</p>
                  <p className="text-xl font-bold">{user.points}</p>
                </div>
                <div className="rounded-xl border border-white/25 bg-white/10 px-4 py-3 min-w-[100px]">
                  <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">Joined</p>
                  <p className="text-base font-bold leading-tight">{user.memberSince}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="mt-6 grid grid-cols-1 xl:grid-cols-12 gap-5">
            {!isSpaUser && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="xl:col-span-12"
              >
                <div className={cardClass}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="p-2.5 rounded-lg text-white"
                        style={{ backgroundColor: brandColor }}
                      >
                        <Crown className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          Membership Status
                        </h3>
                        <p className="text-sm text-slate-500">
                          Plan and billing period details
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                        isMembershipActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-50 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {isMembershipActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                        Plan
                      </p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        {membershipPlanName}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Start Date
                      </p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        {formatMembershipDate(membershipStartDate)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        End Date
                      </p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        {formatMembershipDate(membershipEndDate)}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`order-2 xl:order-1 ${isSpaUser ? "xl:col-span-7" : "xl:col-span-12"}`}
            >
              <div className={cardClass}>
                <div className="flex items-center gap-3 mb-6 pb-5 border-b border-slate-100">
                  <div
                    className="p-2.5 rounded-lg text-white"
                    style={{ backgroundColor: brandColor }}
                  >
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Personal Settings</h3>
                    <p className="text-xs text-slate-500">
                      Update your identity and login credentials
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <ProfileField
                    icon={User}
                    label="Full Name"
                    value={editingField === "name" ? tempValues.name : user.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    isEditing={editingField === "name"}
                    onEdit={() => handleEdit("name")}
                    onSave={() => handleSave("name")}
                    onCancel={handleCancel}
                    placeholder="Enter your full name"
                    disabled={updateProfileMutation.isLoading}
                  />

                  <ProfileField
                    icon={Mail}
                    label="Email Address"
                    type="email"
                    value={editingField === "email" ? tempValues.email : user.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    isEditing={editingField === "email"}
                    onEdit={() => handleEdit("email")}
                    onSave={() => handleSave("email")}
                    onCancel={handleCancel}
                    placeholder="Enter your email address"
                    disabled={updateProfileMutation.isLoading}
                  />

                  <ProfileField
                    icon={Phone}
                    label="Phone Number"
                    type="tel"
                    value={
                      editingField === "phone"
                        ? tempValues.phone
                        : `${user.phone || ""}`.trim() || "Not set"
                    }
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    isEditing={editingField === "phone"}
                    onEdit={() => handleEdit("phone")}
                    onSave={() => handleSave("phone")}
                    onCancel={handleCancel}
                    placeholder="+1 (555) 000-0000"
                    disabled={updateProfileMutation.isLoading}
                  />

                  <PasswordChangeField
                    isEditing={editingField === "password"}
                    onEdit={() => setEditingField("password")}
                    onSave={handlePasswordChange}
                    onCancel={handleCancel}
                    isLoading={changePasswordMutation.isLoading}
                  />
                </div>
              </div>
            </motion.div>

            {isSpaUser && (
              <div className="order-1 xl:order-2 xl:col-span-5 space-y-5">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cardClass}
                >
                  <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2.5 rounded-lg text-white"
                        style={{ backgroundColor: brandColor }}
                      >
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">QR Download Center</h3>
                        <p className="text-xs text-slate-500">Claim and check-in codes for your location</p>
                      </div>
                    </div>
                    <div className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                      <MapPin className="w-3 h-3" style={{ color: brandColor }} />
                      <span className="max-w-[140px] truncate">{activeLocationName}</span>
                    </div>
                  </div>

                  {!myLocation && !spaBusinessLocationId ? (
                    <p className="text-sm text-slate-500">
                      No assigned location found for your account.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <button
                        onClick={() => setIsQrDownloadPanelOpen((prev) => !prev)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 px-4 py-3 flex items-center justify-between text-left transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Location QRs
                          </p>
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            Download for {activeLocationName}
                          </p>
                        </div>
                        {isQrDownloadPanelOpen ? (
                          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </button>

                      {isQrDownloadPanelOpen && (
                        <div className="space-y-3">
                          {isLoadingMyLocation || isLoadingSpaClaimQr || isLoadingSpaCheckInQr ? (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Loading your QR codes...
                            </div>
                          ) : (
                            <>
                              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Claim Rewards
                                  </p>
                                  <span className="text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200">
                                    Points
                                  </span>
                                </div>
                                {spaClaimQr?.qrId && spaClaimQrImage ? (
                                  <>
                                    <div className="grid place-items-center">
                                      <img
                                        src={spaClaimQrImage}
                                        alt="Claim rewards QR"
                                        className="w-40 h-40 object-contain"
                                      />
                                    </div>
                                    <Button
                                      onClick={() => handleDownloadSpaQr("claim")}
                                      className="w-full rounded-lg text-sm font-semibold"
                                      style={{
                                        backgroundColor: brandColor,
                                        color: "#fff",
                                      }}
                                    >
                                      <Download className="w-4 h-4 mr-1.5" />
                                      Download Claim QR
                                    </Button>
                                  </>
                                ) : (
                                  <div className="space-y-3">
                                    <p className="text-sm text-slate-500">
                                      Claim QR not generated yet.
                                    </p>
                                    <Button
                                      onClick={() => handleGenerateSpaQr("claim")}
                                      disabled={generatingSpaQrPurpose === "claim" || !spaLocationDbId}
                                      className="w-full rounded-lg text-sm font-semibold"
                                      style={{
                                        backgroundColor: brandColor,
                                        color: "#fff",
                                      }}
                                    >
                                      {generatingSpaQrPurpose === "claim" ? (
                                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                      ) : (
                                        <QrCode className="w-4 h-4 mr-1.5" />
                                      )}
                                      {spaLocationDbId ? "Generate Claim QR" : "Loading Location..."}
                                    </Button>
                                  </div>
                                )}
                              </div>

                              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Check-In
                                  </p>
                                  <span className="text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200">
                                    Visit
                                  </span>
                                </div>
                                {spaCheckInQr?.qrId && spaCheckInQrImage ? (
                                  <>
                                    <div className="grid place-items-center">
                                      <img
                                        src={spaCheckInQrImage}
                                        alt="Check-in QR"
                                        className="w-40 h-40 object-contain"
                                      />
                                    </div>
                                    <Button
                                      onClick={() => handleDownloadSpaQr("checkin")}
                                      className="w-full rounded-lg text-sm font-semibold"
                                      style={{
                                        backgroundColor: brandColor,
                                        color: "#fff",
                                      }}
                                    >
                                      <Download className="w-4 h-4 mr-1.5" />
                                      Download Check-In QR
                                    </Button>
                                  </>
                                ) : (
                                  <div className="space-y-3">
                                    <p className="text-sm text-slate-500">
                                      Check-in QR not generated yet.
                                    </p>
                                    <Button
                                      onClick={() => handleGenerateSpaQr("checkin")}
                                      disabled={generatingSpaQrPurpose === "checkin" || !spaLocationDbId}
                                      className="w-full rounded-lg text-sm font-semibold"
                                      style={{
                                        backgroundColor: brandColor,
                                        color: "#fff",
                                      }}
                                    >
                                      {generatingSpaQrPurpose === "checkin" ? (
                                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                      ) : (
                                        <QrCode className="w-4 h-4 mr-1.5" />
                                      )}
                                      {spaLocationDbId ? "Generate Check-In QR" : "Loading Location..."}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProfilePage;
