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
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      {!isEditing ? (
        <motion.div
          whileTap={{ scale: disabled ? 1 : 0.98 }}
          className={`group flex items-center justify-between p-4 md:p-5 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/70 hover:border-gray-200/70 transition-all ${
            disabled
              ? "opacity-60 cursor-not-allowed"
              : "active:bg-[color:var(--brand-primary)/0.08] cursor-pointer"
          }`}
          onClick={disabled ? undefined : onEdit}
        >
          <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
            <div className="p-2.5 bg-gradient-to-br from-[color:var(--brand-primary)/0.12] to-[color:var(--brand-primary)/0.08] rounded-xl shrink-0 text-[color:var(--brand-primary)]">
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                {label}
              </p>
              <p className="text-base font-semibold text-gray-900 truncate">
                {value}
              </p>
            </div>
          </div>
          {!disabled && (
            <div className="p-2 bg-gray-50 rounded-full group-hover:bg-[color:var(--brand-primary)/0.08] transition-colors">
                 <Edit3 className="w-4 h-4 text-gray-400 group-hover:text-[color:var(--brand-primary)] transition-colors" />
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-4 md:p-5 bg-gradient-to-br from-white to-[color:var(--brand-primary)/0.08] rounded-2xl border border-gray-200/70"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-gradient-to-br from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] rounded-xl">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Editing {label}
            </p>
          </div>
          <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`w-full px-4 py-3 bg-white rounded-xl border ${
              error
                ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                : "border-gray-100 focus:border-[color:var(--brand-primary)]"
            } focus:outline-none focus:ring-4 focus:ring-[color:var(--brand-primary)/0.12] transition-all text-base font-medium placeholder:text-gray-300`}
            autoFocus
          />
          {error && <p className="text-red-500 text-xs mt-2 font-medium flex items-center gap-1"><AlertCircle size={12}/> {error}</p>}
          <div className="flex gap-3 mt-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onSave}
              disabled={disabled}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white rounded-xl text-sm font-bold transition-all disabled:opacity-70"
            >
              {disabled ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {disabled ? "Saving..." : "Save Changes"}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onCancel}
              disabled={disabled}
              className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
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
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      {!isEditing ? (
        <motion.div
          whileTap={{ scale: 0.98 }}
          className="group flex items-center justify-between p-4 md:p-5 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/70 hover:border-gray-200/70 transition-all active:bg-[color:var(--brand-primary)/0.08] cursor-pointer"
          onClick={onEdit}
        >
          <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
            <div className="p-2.5 bg-gradient-to-br from-[color:var(--brand-primary)/0.12] to-[color:var(--brand-primary)/0.08] rounded-xl shrink-0 text-[color:var(--brand-primary)]">
              <Lock className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                Security
              </p>
              <p className="text-base font-semibold text-gray-900 truncate">
                Change Password
              </p>
            </div>
          </div>
           <div className="p-2 bg-gray-50 rounded-full group-hover:bg-[color:var(--brand-primary)/0.08] transition-colors">
                <Shield className="w-4 h-4 text-gray-400 group-hover:text-[color:var(--brand-primary)] transition-colors" />
           </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
           className="p-4 md:p-5 bg-gradient-to-br from-white to-[color:var(--brand-primary)/0.08] rounded-2xl border border-gray-200/70"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-gradient-to-br from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] rounded-xl">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Change Password
            </p>
          </div>

          <div className="space-y-4">
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
                className={`w-full px-4 py-3 bg-white rounded-xl border ${
                  errors.currentPassword ? "border-red-300" : "border-gray-100"
                } focus:border-[color:var(--brand-primary)] focus:outline-none focus:ring-4 focus:ring-[color:var(--brand-primary)/0.12] transition-all text-base font-medium`}
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
                className={`w-full px-4 py-3 bg-white rounded-xl border ${
                  errors.newPassword ? "border-red-300" : "border-gray-100"
                } focus:border-[color:var(--brand-primary)] focus:outline-none focus:ring-4 focus:ring-[color:var(--brand-primary)/0.12] transition-all text-base font-medium`}
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
                className={`w-full px-4 py-3 bg-white rounded-xl border ${
                  errors.confirmPassword ? "border-red-300" : "border-gray-100"
                } focus:border-[color:var(--brand-primary)] focus:outline-none focus:ring-4 focus:ring-[color:var(--brand-primary)/0.12] transition-all text-base font-medium`}
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1 font-medium">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white rounded-xl text-sm font-bold transition-all disabled:opacity-70"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {isLoading ? "Updating..." : "Update Password"}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCancel}
              disabled={isLoading}
               className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
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
      <div
        className="min-h-screen bg-gradient-to-br from-[color:var(--brand-primary)/0.08] to-white p-4 md:p-8 space-y-8 max-w-7xl mx-auto flex items-center justify-center"
        style={{
          ['--brand-primary']: brandColor,
          ['--brand-primary-dark']: brandColorDark,
        }}
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-white/50 rounded-2xl animate-pulse mx-auto mb-4" />
          <div className="h-4 bg-white/50 rounded w-32 mx-auto animate-pulse" />
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
      <div
        className="min-h-screen grid place-items-center bg-gradient-to-br from-[color:var(--brand-primary)/0.08] to-white p-4"
        style={{
          ['--brand-primary']: brandColor,
          ['--brand-primary-dark']: brandColorDark,
        }}
      >
        <div className="text-center p-8 bg-white rounded-3xl max-w-sm w-full border border-gray-200/70">
          <AlertCircle className="w-12 h-12 text-[color:var(--brand-primary)] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Failed to load profile
          </h2>
          <p className="text-gray-500 mb-6 text-sm">
            {error?.message || "Something went wrong"}
          </p>
          <button
            onClick={retry}
            className="w-full py-3 text-white rounded-xl font-bold hover:brightness-95 transition-all"
            style={{
              background: `linear-gradient(90deg, ${brandColor}, ${brandColorDark})`,
            }}
          >
            Try Again
          </button>
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
      dispatch(updateProfile(updatedUser)); // Update Redux state
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
      const baseUrl = FRONTEND_URL || fallbackOrigin;
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
      <div
        className="min-h-screen bg-gradient-to-br from-[color:var(--brand-primary)/0.08] via-[color:var(--brand-primary)/0.03] to-white pb-20 md:pb-12"
        style={{
          ['--brand-primary']: brandColor,
          ['--brand-primary-dark']: brandColorDark,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl border border-[color:var(--brand-primary)/0.25] bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white p-6 md:p-10"
          >
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/20" />
            <div className="pointer-events-none absolute -left-20 -bottom-24 h-64 w-64 rounded-full bg-black/10" />
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
                  <Sparkles size={12} className="text-yellow-200 fill-yellow-200" />
                  {isSpaUser ? "Spa Account" : getMembershipDisplay(user)}
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                  Hello, {user.name.split(" ")[0]}
                </h1>
                <p className="text-white/85 font-medium text-sm md:text-base">
                  Manage your account details and access your location tools.
                </p>
                <div className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-black/15 px-3 py-2 text-sm font-semibold">
                  <MapPin className="h-4 w-4" />
                  {activeLocationName}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 self-start lg:self-auto">
                <div className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3 min-w-[112px]">
                  <p className="text-[10px] uppercase tracking-wider text-white/75 font-bold">Points</p>
                  <p className="text-2xl font-black">{user.points}</p>
                </div>
                <div className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3 min-w-[112px]">
                  <p className="text-[10px] uppercase tracking-wider text-white/75 font-bold">Joined</p>
                  <p className="text-lg font-black leading-tight">{user.memberSince}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="mt-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
            {!isSpaUser && (
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 }}
                className="xl:col-span-12"
              >
                <div className="bg-white rounded-2xl border-2 border-gray-200/70 p-6 lg:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-[color:var(--brand-primary)/0.12] rounded-xl text-[color:var(--brand-primary)]">
                        <Crown className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-gray-900">
                          Membership Status
                        </h3>
                        <p className="text-sm text-gray-500 font-medium">
                          Plan and billing period details
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                        isMembershipActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {isMembershipActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold">
                        Plan
                      </p>
                      <p className="text-sm font-extrabold text-gray-900 mt-1">
                        {membershipPlanName}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Start Date
                      </p>
                      <p className="text-sm font-extrabold text-gray-900 mt-1">
                        {formatMembershipDate(membershipStartDate)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        End Date
                      </p>
                      <p className="text-sm font-extrabold text-gray-900 mt-1">
                        {formatMembershipDate(membershipEndDate)}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className={`order-2 xl:order-1 ${isSpaUser ? "xl:col-span-7" : "xl:col-span-12"}`}
            >
              <div className="bg-white rounded-2xl border-2 border-gray-200/70 p-6 lg:p-8">
                <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-6">
                  <div className="p-3 bg-[color:var(--brand-primary)/0.12] rounded-xl text-[color:var(--brand-primary)]">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900">Personal Settings</h3>
                    <p className="text-sm text-gray-500 font-medium">
                      Update your identity and login credentials
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
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
              <div className="order-1 xl:order-2 xl:col-span-5 space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.09 }}
                  className="bg-white rounded-2xl border-2 border-gray-200/70 p-6"
                >
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-[color:var(--brand-primary)/0.12] rounded-xl text-[color:var(--brand-primary)]">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-gray-900">QR Download Center</h3>
                        <p className="text-sm text-gray-500 font-medium">Claim and check-in codes for your location</p>
                      </div>
                    </div>
                    <div className="hidden md:inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700">
                      <MapPin className="w-3.5 h-3.5 text-[color:var(--brand-primary)]" />
                      <span className="max-w-[160px] truncate">{activeLocationName}</span>
                    </div>
                  </div>

                  {!myLocation && !spaBusinessLocationId ? (
                    <p className="text-sm text-gray-500">
                      No assigned location found for your account.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <button
                        onClick={() => setIsQrDownloadPanelOpen((prev) => !prev)}
                        className="w-full rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white hover:from-gray-100 hover:to-white px-4 py-3.5 flex items-center justify-between text-left transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">
                            Location QRs
                          </p>
                          <p className="text-sm font-extrabold text-gray-900 truncate">
                            Download for {activeLocationName}
                          </p>
                        </div>
                        {isQrDownloadPanelOpen ? (
                          <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                        )}
                      </button>

                      {isQrDownloadPanelOpen && (
                        <div className="space-y-4">
                          {isLoadingMyLocation || isLoadingSpaClaimQr || isLoadingSpaCheckInQr ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Loading your QR codes...
                            </div>
                          ) : (
                            <>
                              <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs font-black uppercase tracking-widest text-gray-500">
                                    Claim Rewards
                                  </p>
                                  <span className="text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-1 bg-pink-100 text-pink-700">
                                    Points
                                  </span>
                                </div>
                                {spaClaimQr?.qrId && spaClaimQrImage ? (
                                  <>
                                    <div className="grid place-items-center">
                                      <img
                                        src={spaClaimQrImage}
                                        alt="Claim rewards QR"
                                        className="w-44 h-44 object-contain"
                                      />
                                    </div>
                                    <Button
                                      onClick={() => handleDownloadSpaQr("claim")}
                                      className="w-full rounded-xl py-3 text-sm font-bold"
                                      style={{
                                        background: `linear-gradient(90deg, ${brandColor}, ${brandColorDark})`,
                                        color: "#fff",
                                      }}
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      Download Claim QR
                                    </Button>
                                  </>
                                ) : (
                                  <div className="space-y-3">
                                    <p className="text-sm text-gray-500">
                                      Claim QR not generated yet.
                                    </p>
                                    <Button
                                      onClick={() => handleGenerateSpaQr("claim")}
                                      disabled={generatingSpaQrPurpose === "claim" || !spaLocationDbId}
                                      className="w-full rounded-xl py-3 text-sm font-bold"
                                      style={{
                                        background: `linear-gradient(90deg, ${brandColor}, ${brandColorDark})`,
                                        color: "#fff",
                                      }}
                                    >
                                      {generatingSpaQrPurpose === "claim" ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      ) : (
                                        <QrCode className="w-4 h-4 mr-2" />
                                      )}
                                      {spaLocationDbId ? "Generate Claim QR" : "Loading Location..."}
                                    </Button>
                                  </div>
                                )}
                              </div>

                              <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs font-black uppercase tracking-widest text-gray-500">
                                    Check-In
                                  </p>
                                  <span className="text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-1 bg-indigo-100 text-indigo-700">
                                    Visit
                                  </span>
                                </div>
                                {spaCheckInQr?.qrId && spaCheckInQrImage ? (
                                  <>
                                    <div className="grid place-items-center">
                                      <img
                                        src={spaCheckInQrImage}
                                        alt="Check-in QR"
                                        className="w-44 h-44 object-contain"
                                      />
                                    </div>
                                    <Button
                                      onClick={() => handleDownloadSpaQr("checkin")}
                                      className="w-full rounded-xl py-3 text-sm font-bold"
                                      style={{
                                        background: `linear-gradient(90deg, ${brandColor}, ${brandColorDark})`,
                                        color: "#fff",
                                      }}
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      Download Check-In QR
                                    </Button>
                                  </>
                                ) : (
                                  <div className="space-y-3">
                                    <p className="text-sm text-gray-500">
                                      Check-in QR not generated yet.
                                    </p>
                                    <Button
                                      onClick={() => handleGenerateSpaQr("checkin")}
                                      disabled={generatingSpaQrPurpose === "checkin" || !spaLocationDbId}
                                      className="w-full rounded-xl py-3 text-sm font-bold"
                                      style={{
                                        background: `linear-gradient(90deg, ${brandColor}, ${brandColorDark})`,
                                        color: "#fff",
                                      }}
                                    >
                                      {generatingSpaQrPurpose === "checkin" ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      ) : (
                                        <QrCode className="w-4 h-4 mr-2" />
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
