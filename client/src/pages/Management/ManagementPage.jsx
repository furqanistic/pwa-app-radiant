// File: client/src/pages/Management/ManagementPage.jsx - UPDATED (CLEANUP)

import { authService } from "@/services/authService";
import { locationService } from "@/services/locationService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Building,
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Crown,
  Edit2,
  Gift,
  MapPin,
  QrCode,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserPlus,
  XIcon,
  Zap,
} from "lucide-react";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from 'sonner';
import { useBranding } from "@/context/BrandingContext";

// Import components
import AddUserForm from "@/components/Management/AddUserForm";
import AutomatedGiftSettings from "@/components/Management/AutomatedGiftSettings";
import AvailabilitySettings from "@/components/Management/AvailabilitySettings"; // Import
import BirthdayGiftSettings from "@/components/Management/BirthdayGiftSettings";
import LocationAssignmentForm from "@/components/Management/LocationAssignmentForm";
import LocationForm from "@/components/Management/LocationForm";
import PointsSettings from "@/components/Management/PointsSettings";
import QRCodeManagement from "@/components/QRCode/QRCodeManagement";
import StripeConnect from "@/components/Stripe/StripeConnect";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Layout from "@/pages/Layout/Layout";

const clampChannel = (value) => Math.max(0, Math.min(255, value));

const adjustHex = (hex, amount) => {
  if (!hex) return "#ec4899";
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return "#ec4899";
  const num = parseInt(cleaned, 16);
  const r = clampChannel(((num >> 16) & 255) + amount);
  const g = clampChannel(((num >> 8) & 255) + amount);
  const b = clampChannel((num & 255) + amount);
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};

const ManagementPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser } = useSelector((state) => state.user);
  const { branding } = useBranding();
  const brandColor = branding?.themeColor || "#ec4899";
  const brandColorDark = adjustHex(brandColor, -24);

  // State management
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isLocationFormOpen, setIsLocationFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [isLocationAssignmentOpen, setIsLocationAssignmentOpen] =
    useState(false);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false); // New State
  const [isBirthdayGiftOpen, setIsBirthdayGiftOpen] = useState(false);
  const [isAutomatedGiftOpen, setIsAutomatedGiftOpen] = useState(false);
  const [isPointsSettingsOpen, setIsPointsSettingsOpen] = useState(false);
  const [selectedQRLocation, setSelectedQRLocation] = useState(null);
  const [showAllQuickActionsMobile, setShowAllQuickActionsMobile] = useState(false);
  const [showAllToolsMobile, setShowAllToolsMobile] = useState(false);

  // Permission checks
  const isElevatedUser = [
    "admin",
    "spa",
    "enterprise",
    "super-admin",
  ].includes(currentUser?.role);
  const isAdminOrAbove = ["admin", "super-admin"].includes(currentUser?.role);
  const isSuperAdmin = currentUser?.role === "super-admin";
  const isTeamOrAbove = ["spa", "admin", "super-admin"].includes(currentUser?.role); // Spa check

  const currentUserLocationId =
    currentUser?.selectedLocation?.locationId ||
    currentUser?.spaLocation?.locationId;

  // Fetch locations (admin only)
  const {
    data: locationsData,
    isLoading: isLoadingLocations,
    refetch: refetchLocations,
  } = useQuery({
    queryKey: ["locations"],
    queryFn: () => locationService.getAllLocations(),
    enabled: isTeamOrAbove,
  });

  const handleOpenMembership = () => navigate("/management/membership");

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: authService.createSpaMember,
    onSuccess: () => {
      setIsAddUserOpen(false);
      toast.success("User created successfully!");
      // Invalidate queries to update lists in other pages (like ContactsPage)
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to create user");
    },
  });

  // Navigation cards
  const managementRoutes = [
    {
      title: isSuperAdmin ? "Services Database" : "Service Management",
      description: isSuperAdmin
        ? "Browse all platform services by location"
        : "Manage services, bookings, and pricing",
      icon: Settings,
      path: isSuperAdmin
        ? "/management/services-database"
        : "/management/services",
      color: "from-blue-500 to-blue-600",
      visible: isElevatedUser,
    },
    {
      title: isSuperAdmin ? "Bookings Database" : "Manage Bookings",
      description: isSuperAdmin
        ? "View all platform bookings in real time"
        : "View and manage all client bookings",
      icon: Calendar,
      path: isSuperAdmin
        ? "/management/bookings-database"
        : "/management/bookings",
      color: "from-yellow-500 to-yellow-600",
      visible: isAdminOrAbove,
    },
    {
      title: "Spin & Games",
      description: "Configure scratch cards and spin games",
      icon: Zap,
      path: "/management/spin",
      color: "from-purple-500 to-purple-600",
      visible: isElevatedUser,
    },
    {
      title: "Rewards System",
      description: "Manage rewards, points, and incentives",
      icon: Gift,
      path: "/management/rewards",
      color: "from-green-500 to-green-600",
      visible: isElevatedUser,
    },
    {
      title: "Referral Program",
      description: "Configure referral bonuses and tracking",
      icon: Award,
      path: "/management/referral",
      color: "from-pink-500 to-pink-600",
      visible: isElevatedUser,
    },
    {
      title: "Client Revenue",
      description: "Track earnings per client and total revenue",
      icon: TrendingUp,
      path: "/management/revenue",
      color: "from-rose-500 to-rose-600",
      visible: isTeamOrAbove, // Accessible to spa role (spa managers)
    },
  ];

  const locations = locationsData?.data?.locations || [];
  const activeLocationsCount = locations.filter((location) => location.isActive).length;
  const inactiveLocationsCount = locations.length - activeLocationsCount;
  const roleLabelByKey = {
    spa: "Spa Manager",
    admin: "Admin",
    enterprise: "Enterprise",
    "super-admin": "Super Admin",
  };
  const roleLabel = roleLabelByKey[currentUser?.role] || "Team Member";

  const toolActions = [
    ...(isSuperAdmin
      ? [
          {
            key: "add-user",
            title: "Add User",
            description: "Create a new teammate account with role access.",
            icon: UserPlus,
            onClick: () => setIsAddUserOpen(true),
            className:
              "border-blue-100 bg-blue-50/70 hover:bg-blue-100/70 text-blue-900",
          },
        ]
      : []),
    ...(isTeamOrAbove && !isSuperAdmin
      ? [
          {
            key: "availability",
            title:
              currentUser?.role === "spa"
                ? "Edit Location and Time"
                : "Availability Settings",
            description: "Adjust opening hours and team availability windows.",
            icon: Clock,
            onClick: () => setIsAvailabilityOpen(true),
            className:
              "border-orange-100 bg-orange-50/70 hover:bg-orange-100/70 text-orange-900",
          },
          {
            key: "gift-settings",
            title: "Gift Settings",
            description: "Set birthday and event-based gift behavior.",
            icon: Gift,
            onClick: () => setIsBirthdayGiftOpen(true),
            className:
              "border-fuchsia-100 bg-fuchsia-50/70 hover:bg-fuchsia-100/70 text-fuchsia-900",
          },
          {
            key: "automated-gifts",
            title: "Automated Gifts",
            description: "Schedule and control automated gift campaigns.",
            icon: Sparkles,
            onClick: () => setIsAutomatedGiftOpen(true),
            className:
              "border-rose-100 bg-rose-50/70 hover:bg-rose-100/70 text-rose-900",
          },
          {
            key: "points-rules",
            title: "Points Rules",
            description: "Control earning, redemption, and loyalty balance rules.",
            icon: Award,
            onClick: () => setIsPointsSettingsOpen(true),
            className:
              "border-transparent text-white hover:opacity-95",
            style: {
              backgroundImage: `linear-gradient(120deg, ${brandColor}, ${brandColorDark})`,
            },
          },
        ]
      : []),
    ...(isTeamOrAbove
      ? [
          {
            key: "membership",
            title: currentUser?.role === "spa" ? "View Membership" : "Manage Membership",
            description: "Review and configure membership plans and benefits.",
            icon: Crown,
            onClick: handleOpenMembership,
            className:
              "border-cyan-100 bg-cyan-50/70 hover:bg-cyan-100/70 text-cyan-900",
          },
        ]
      : []),
    ...(isSuperAdmin
      ? [
          {
            key: "add-location",
            title: "Add Location",
            description: "Create and configure a new spa location.",
            icon: MapPin,
            onClick: () => setIsLocationFormOpen(true),
            className:
              "border-emerald-100 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-900",
          },
        ]
      : []),
    ...(isAdminOrAbove
      ? [
          {
            key: "assign-location",
            title: "Assign Location",
            description: "Grant users access to the right location.",
            icon: UserCheck,
            onClick: () => setIsLocationAssignmentOpen(true),
            className:
              "border-violet-100 bg-violet-50/70 hover:bg-violet-100/70 text-violet-900",
          },
        ]
      : []),
  ];
  const visibleManagementRoutes = managementRoutes.filter((route) => route.visible);
  const quickActionsPrimaryMobile = visibleManagementRoutes.slice(0, 3);
  const quickActionsSecondaryMobile = visibleManagementRoutes.slice(3);
  const toolsPrimaryMobile = toolActions.slice(0, 3);
  const toolsSecondaryMobile = toolActions.slice(3);

  const handleCreateUser = async (userData) => {
    await createUserMutation.mutateAsync(userData);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {/* Header */}
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white/95 shadow-sm overflow-hidden">
            <div className="h-2 w-full bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-500" />
            <div className="px-5 py-5 md:px-8 md:py-7">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                    Management Dashboard
                  </h1>
                  <p className="mt-2 text-slate-600">
                    Run operations, configure core settings, and keep your team aligned.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {roleLabel}
                  </span>
                  {currentUserLocationId && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800">
                      <MapPin className="h-3.5 w-3.5" />
                      {currentUser?.selectedLocation?.locationName ||
                        currentUser?.spaLocation?.locationName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Cards */}
          {isElevatedUser && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Quick Actions
              </h2>
              <div className="sm:hidden space-y-3">
                {quickActionsPrimaryMobile.map((route) => (
                  <button
                    key={route.path}
                    onClick={() => navigate(route.path)}
                    className={`group w-full p-4 bg-gradient-to-br ${route.color} rounded-xl text-white hover:opacity-95 transition-all duration-300 text-left`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <route.icon className="w-5 h-5 shrink-0 opacity-95" />
                      <ChevronRight className="w-4 h-4 shrink-0 opacity-75" />
                    </div>
                    <h3 className="mt-3 font-semibold text-sm">{route.title}</h3>
                    <p className="mt-1 text-xs opacity-90 leading-relaxed">{route.description}</p>
                  </button>
                ))}

                {quickActionsSecondaryMobile.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setShowAllQuickActionsMobile((prev) => !prev)}
                      className="w-full justify-between"
                    >
                      <span>
                        {showAllQuickActionsMobile
                          ? "Show fewer quick actions"
                          : `Show ${quickActionsSecondaryMobile.length} more quick actions`}
                      </span>
                      {showAllQuickActionsMobile ? (
                        <ChevronUp className="w-4 h-4 ml-2" />
                      ) : (
                        <ChevronDown className="w-4 h-4 ml-2" />
                      )}
                    </Button>

                    {showAllQuickActionsMobile && (
                      <div className="space-y-3">
                        {quickActionsSecondaryMobile.map((route) => (
                          <button
                            key={route.path}
                            onClick={() => navigate(route.path)}
                            className={`group w-full p-4 bg-gradient-to-br ${route.color} rounded-xl text-white hover:opacity-95 transition-all duration-300 text-left`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <route.icon className="w-5 h-5 shrink-0 opacity-95" />
                              <ChevronRight className="w-4 h-4 shrink-0 opacity-75" />
                            </div>
                            <h3 className="mt-3 font-semibold text-sm">{route.title}</h3>
                            <p className="mt-1 text-xs opacity-90 leading-relaxed">{route.description}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {visibleManagementRoutes.map((route) => (
                  <button
                    key={route.path}
                    onClick={() => navigate(route.path)}
                    className={`group p-5 bg-gradient-to-br ${route.color} rounded-xl text-white hover:opacity-95 transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-0.5 text-left`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <route.icon className="w-6 h-6 shrink-0 opacity-95" />
                      <ChevronRight className="w-5 h-5 shrink-0 opacity-75 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <h3 className="mt-6 font-semibold text-base">{route.title}</h3>
                    <p className="mt-1.5 text-sm opacity-90 leading-relaxed">{route.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Management Tools */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Management Tools
            </h2>
            <div className="sm:hidden space-y-3">
              {toolsPrimaryMobile.map((action) => (
                <button
                  key={action.key}
                  onClick={action.onClick}
                  className={`w-full rounded-xl border p-4 text-left transition-all duration-200 ${action.className}`}
                  style={action.style}
                >
                  <div className="flex items-start justify-between gap-3">
                    <action.icon className="h-5 w-5 shrink-0" />
                    <ChevronRight className="h-4 w-4 opacity-70" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold">{action.title}</h3>
                  <p className="mt-1 text-xs opacity-85 leading-relaxed">
                    {action.description}
                  </p>
                </button>
              ))}

              {toolsSecondaryMobile.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowAllToolsMobile((prev) => !prev)}
                    className="w-full justify-between"
                  >
                    <span>
                      {showAllToolsMobile
                        ? "Show fewer tools"
                        : `Show ${toolsSecondaryMobile.length} more tools`}
                    </span>
                    {showAllToolsMobile ? (
                      <ChevronUp className="w-4 h-4 ml-2" />
                    ) : (
                      <ChevronDown className="w-4 h-4 ml-2" />
                    )}
                  </Button>

                  {showAllToolsMobile && (
                    <div className="space-y-3">
                      {toolsSecondaryMobile.map((action) => (
                        <button
                          key={action.key}
                          onClick={action.onClick}
                          className={`w-full rounded-xl border p-4 text-left transition-all duration-200 ${action.className}`}
                          style={action.style}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <action.icon className="h-5 w-5 shrink-0" />
                            <ChevronRight className="h-4 w-4 opacity-70" />
                          </div>
                          <h3 className="mt-3 text-sm font-semibold">{action.title}</h3>
                          <p className="mt-1 text-xs opacity-85 leading-relaxed">
                            {action.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {toolActions.map((action) => (
                <button
                  key={action.key}
                  onClick={action.onClick}
                  className={`rounded-xl border p-4 text-left transition-all duration-200 hover:shadow-sm ${action.className}`}
                  style={action.style}
                >
                  <div className="flex items-start justify-between gap-3">
                    <action.icon className="h-5 w-5 shrink-0" />
                    <ChevronRight className="h-4 w-4 opacity-70" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">{action.title}</h3>
                  <p className="mt-1 text-xs opacity-85 leading-relaxed">
                    {action.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Stripe Connect - spa Role Only */}
          {currentUser?.role === "spa" && (
            <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Payouts</h3>
              <p className="text-sm text-slate-600 mb-4">
                Connect and monitor Stripe to receive payouts without leaving this dashboard.
              </p>
              <StripeConnect />
            </div>
          )}

          {/* Location Management Section - Super Admin Only */}
          {isSuperAdmin && (
            <div className="mt-8 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-5 py-4 md:px-6 md:py-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Location Management
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Track all locations and manage edits, status, and QR access.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    Active: {activeLocationsCount}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                    Inactive: {inactiveLocationsCount}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    Total: {locations.length}
                  </span>
                </div>
              </div>

              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700">
                  Locations ({locations.length})
                </h4>
                <Button
                  size="sm"
                  onClick={() => refetchLocations()}
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>

              {isLoadingLocations ? (
                <div className="px-5 py-6 space-y-3">
                  {[...Array(4)].map((_, index) => (
                    <div
                      key={`location-skeleton-${index}`}
                      className="h-14 rounded-lg bg-slate-100 animate-pulse"
                    />
                  ))}
                </div>
              ) : locations.length === 0 ? (
                <div className="text-center py-12">
                  <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No locations found</p>
                </div>
              ) : (
                <>
                  <div className="md:hidden p-4 space-y-3">
                    {locations.map((location) => (
                      <div
                        key={location._id}
                        className="rounded-xl border border-slate-200 bg-slate-50/40 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h5 className="text-sm font-semibold text-slate-900">
                              {location.name || "Unnamed Location"}
                            </h5>
                            <p className="text-xs text-slate-500 mt-1">
                              ID: {location.locationId}
                            </p>
                          </div>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              location.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {location.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>

                        <p className="mt-3 text-sm text-slate-700">
                          {location.address || "No address"}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Created: {new Date(location.createdAt).toLocaleDateString()}
                        </p>

                        <div className="mt-3 flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingLocation(location);
                              setIsLocationFormOpen(true);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedQRLocation(location)}
                            className="flex-1 flex items-center justify-center gap-2 text-pink-600 border-pink-200 hover:bg-pink-50"
                          >
                            <QrCode className="w-4 h-4" />
                            QR Code
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Address
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {locations.map((location) => (
                        <tr key={location._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {location.name || "Unnamed Location"}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {location.locationId}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {location.address || "No address"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                location.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {location.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(location.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingLocation(location);
                                setIsLocationFormOpen(true);
                              }}
                              className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedQRLocation(location)}
                              className="flex items-center gap-2 text-pink-600 border-pink-200 hover:bg-pink-50"
                            >
                              <QrCode className="w-4 h-4" />
                              QR Code
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Modals */}
        <AddUserForm
          isOpen={isAddUserOpen}
          onClose={() => setIsAddUserOpen(false)}
          onSubmit={handleCreateUser}
        />
        
        {/* Availability Modal */}
        <AvailabilitySettings 
          isOpen={isAvailabilityOpen}
          onClose={() => setIsAvailabilityOpen(false)}
        />

        {/* Birthday Gift Modal */}
        <BirthdayGiftSettings
          isOpen={isBirthdayGiftOpen}
          onClose={() => setIsBirthdayGiftOpen(false)}
        />

        {/* Automated Gift Modal */}
        <AutomatedGiftSettings
          isOpen={isAutomatedGiftOpen}
          onClose={() => setIsAutomatedGiftOpen(false)}
        />

        {/* Points Settings Modal */}
        <PointsSettings
          isOpen={isPointsSettingsOpen}
          onClose={() => setIsPointsSettingsOpen(false)}
        />

        {/* QR Code Modal */}
        <Dialog 
            open={!!selectedQRLocation} 
            onOpenChange={(open) => !open && setSelectedQRLocation(null)}
        >
            <DialogContent 
                showCloseButton={false}
                className="max-w-[95vw] md:max-w-[1100px] w-full p-0 border-none bg-transparent shadow-none"
            >
                <div className="bg-white rounded-[2.5rem] md:rounded-[4rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]">
                    {/* Header Area */}
                    <div className="px-6 py-8 md:px-12 md:py-10 flex items-center justify-between border-b border-gray-50 shrink-0">
                        <DialogHeader>
                            <DialogTitle className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">
                                {selectedQRLocation?.name}
                            </DialogTitle>
                        </DialogHeader>
                        
                        <button 
                            onClick={() => setSelectedQRLocation(null)}
                            className="p-3 rounded-full bg-gray-100/80 text-gray-500 hover:bg-pink-500 hover:text-white transition-all duration-300 shadow-sm hover:rotate-90 group shrink-0"
                        >
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Scrollable Content with room for shadows */}
                    <div className="overflow-y-auto p-6 md:p-12 pt-4 md:pt-6">
                        <div className="pb-10"> {/* Extra bottom padding to avoid clipping shadow */}
                            {selectedQRLocation && (
                                <QRCodeManagement
                                    locationId={selectedQRLocation._id}
                                    locationName={selectedQRLocation.name}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        {isTeamOrAbove && (
          <>
            <LocationForm
              isOpen={isLocationFormOpen}
              initialData={editingLocation || (currentUser?.role === "spa" ? locations[0] : null)}
              onClose={() => {
                setIsLocationFormOpen(false);
                setEditingLocation(null);
              }}
              onSuccess={() => {
                setIsLocationFormOpen(false);
                setEditingLocation(null);
                toast.success(editingLocation ? "Location updated successfully!" : "Location created successfully!");
                queryClient.invalidateQueries({ queryKey: ["locations"] });
                refetchLocations();
              }}
            />

            {isAdminOrAbove && (
              <LocationAssignmentForm
                isOpen={isLocationAssignmentOpen}
                onClose={() => setIsLocationAssignmentOpen(false)}
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ["all-users"] });
                  queryClient.invalidateQueries({ queryKey: ["locations"] });
                  refetchLocations();
                }}
              />
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default ManagementPage;
