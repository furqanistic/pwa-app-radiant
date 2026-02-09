import { axiosInstance } from "@/config";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    AlertCircle,
    Check,
    Edit3,
    Loader2,
    Lock,
    Mail,
    Shield,
    Sparkles,
    User,
    Zap
} from "lucide-react";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { updateProfile } from "../../redux/userSlice";
import Layout from "../Layout/Layout";
import { useBranding } from '@/context/BrandingContext';


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
          className={`flex items-center justify-between p-4 md:p-5 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/70 hover:border-gray-200/70 transition-all ${
            disabled
              ? "opacity-60 cursor-not-allowed"
              : "active:bg-[color:var(--brand-primary)/0.08] cursor-pointer shadow-sm hover:shadow-md"
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
          className="p-4 md:p-5 bg-gradient-to-br from-white to-[color:var(--brand-primary)/0.08] rounded-2xl border border-gray-200/70 shadow-lg"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-gradient-to-br from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] rounded-xl shadow-lg shadow-[color:var(--brand-primary)/0.3]">
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
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-[color:var(--brand-primary)/0.25] transition-all disabled:opacity-70"
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
          className="flex items-center justify-between p-4 md:p-5 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/70 hover:border-gray-200/70 transition-all active:bg-[color:var(--brand-primary)/0.08] cursor-pointer shadow-sm hover:shadow-md"
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
           className="p-4 md:p-5 bg-gradient-to-br from-white to-[color:var(--brand-primary)/0.08] rounded-2xl border border-gray-200/70 shadow-lg"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-gradient-to-br from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] rounded-xl shadow-lg shadow-[color:var(--brand-primary)/0.3]">
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
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-[color:var(--brand-primary)/0.25] transition-all disabled:opacity-70"
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
        <div className="text-center p-8 bg-white rounded-3xl shadow-xl max-w-sm w-full border border-gray-200/70">
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
    queryKey: ["currentUser"],
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
      queryClient.setQueryData(["currentUser"], updatedUser);
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
    onSuccess: (data) => {
        toastSuccess("Password changed successfully");
    },
    onError: (error) => {
        toastError(error.response?.data?.message || "Failed to change password");
    },
  });

  const [editingField, setEditingField] = useState(null);
  const [tempValues, setTempValues] = useState({});

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
    
  const getMembershipDisplay = (user) => {
    const tier = user?.referralStats?.currentTier || 'Bronze';
    return `${tier} Membership`;
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

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} retry={refetch} />;
  if (!user)
    return (
      <ErrorState error={{ message: "User data not found" }} retry={refetch} />
    );

  return (
    <Layout>
      <div
        className="min-h-screen bg-gradient-to-br from-[color:var(--brand-primary)/0.08] to-white pb-20 md:pb-12"
        style={{
          ['--brand-primary']: brandColor,
          ['--brand-primary-dark']: brandColorDark,
        }}
      >
        <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
            
            {/* Expanded Header Section */}
            <div className="relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-gradient-to-r from-[color:var(--brand-primary)] via-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white p-6 md:p-12 mb-8 shadow-xl shadow-[color:var(--brand-primary)/0.25]">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
                
                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
                    <div className="text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[10px] md:text-xs font-bold tracking-wider uppercase mb-3 text-white shadow-sm capitalize">
                            <Sparkles size={12} className="text-yellow-300 fill-yellow-300" />
                            {getMembershipDisplay(user)}
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight mb-2">
                           Hello, <span className="text-white/90">{user.name.split(' ')[0]}</span>
                        </h1>
                         <p className="text-white/80 font-medium text-sm md:text-base">
                            Welcome to your personal dashboard.
                        </p>
                    </div>

                    <div className="flex gap-3">
                         <div className="p-3 md:px-5 md:py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-center min-w-[90px]">
                            <div className="text-lg md:text-xl font-bold">{user.points}</div>
                            <div className="text-[10px] md:text-xs text-white/80 font-medium uppercase tracking-wider">Points</div>
                        </div>
                         <div className="p-3 md:px-5 md:py-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl text-center min-w-[90px]">
                            <div className="text-lg md:text-xl font-bold">{user.memberSince}</div>
                            <div className="text-[10px] md:text-xs text-white/80 font-medium uppercase tracking-wider">Joined</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content - Personal Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-lg shadow-gray-100 border border-gray-200/70">
                <div className="flex items-center gap-4 mb-8 border-b border-gray-50 pb-6">
                  <div className="p-3 bg-[color:var(--brand-primary)/0.08] rounded-2xl text-[color:var(--brand-primary)]">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900">
                      Personal Settings
                    </h3>
                    <p className="text-sm text-gray-500 font-medium">
                      Update your identity and login credentials
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <ProfileField
                    icon={User}
                    label="Full Name"
                    value={
                      editingField === "name" ? tempValues.name : user.name
                    }
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
                    value={
                      editingField === "email" ? tempValues.email : user.email
                    }
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
        
        </div>
      </div>
    </Layout>
  );
};

export default ProfilePage;
