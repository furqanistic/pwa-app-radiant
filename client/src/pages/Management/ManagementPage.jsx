// File: client/src/pages/Management/ManagementPage.jsx - UPDATED (CLEANUP)

import { useBranding } from "@/context/BrandingContext";
import { authService } from "@/services/authService";
import { locationService } from "@/services/locationService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Award,
    Calendar,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Clock,
    Crown,
    Gift,
    MapPin,
    Settings,
    ShieldCheck,
    Sparkles,
    TrendingUp,
    UserPlus,
    Zap,
} from "lucide-react";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from 'sonner';

// Import components
import AddUserForm from "@/components/Management/AddUserForm";
import AutomatedGiftSettings from "@/components/Management/AutomatedGiftSettings";
import AvailabilitySettings from "@/components/Management/AvailabilitySettings"; // Import
import BirthdayGiftSettings from "@/components/Management/BirthdayGiftSettings";
import PointsSettings from "@/components/Management/PointsSettings";
import StripeConnect from "@/components/Stripe/StripeConnect";
import { Button } from "@/components/ui/button";
import Layout from "@/pages/Layout/Layout";

const clampChannel = (value) => Math.max(0, Math.min(255, value));
const EMPTY_LOCATIONS = [];

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
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser } = useSelector((state) => state.user);
  const { branding } = useBranding();
  const brandColor = branding?.themeColor || "#ec4899";
  const brandColorDark = adjustHex(brandColor, -24);

  // State management
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false); // New State
  const [isBirthdayGiftOpen, setIsBirthdayGiftOpen] = useState(false);
  const [isAutomatedGiftOpen, setIsAutomatedGiftOpen] = useState(false);
  const [isPointsSettingsOpen, setIsPointsSettingsOpen] = useState(false);
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
  const spaParamLocationId = `${new URLSearchParams(location.search).get("spa") || ""}`.trim();
  const activeSpaLocationId = spaParamLocationId || currentUserLocationId || "";

  const navigateWithSpa = (path) => {
    if (!activeSpaLocationId) {
      navigate(path);
      return;
    }
    navigate(`${path}?spa=${encodeURIComponent(activeSpaLocationId)}`);
  };

  // Fetch locations (admin only)
  const { data: locationsData } = useQuery({
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

  const locations = locationsData?.data?.locations || EMPTY_LOCATIONS;
  const currentLocation = locations.find(
    (location) => location?.locationId === currentUserLocationId
  );
  const sharedLocationStripeLinked = Boolean(
    currentLocation?.membershipStripeConnected
  );
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
    ...(isTeamOrAbove && isSuperAdmin
      ? [
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
    ...(["admin", "spa"].includes(currentUser?.role)
      ? [
          {
            key: "manage-calendar",
            title: "Manage Calendar",
            description: "View location calendars and booked appointments.",
            icon: Calendar,
            onClick: () => navigateWithSpa("/management/calendar"),
            className:
              "border-sky-100 bg-sky-50/70 hover:bg-sky-100/70 text-sky-900",
          },
        ]
      : []),
    ...(isSuperAdmin
      ? [
          {
            key: "view-automations",
            title: "View Automations",
            description: "See all available GoHighLevel automations.",
            icon: Zap,
            onClick: () => navigateWithSpa("/management/automations"),
            className:
              "border-indigo-100 bg-indigo-50/70 hover:bg-indigo-100/70 text-indigo-900",
          },
        ]
      : []),
    ...(["super-admin", "spa"].includes(currentUser?.role)
      ? [
          {
            key: "membership",
            title: currentUser?.role === "super-admin" ? "Manage Membership" : "View Membership",
            description:
              currentUser?.role === "super-admin"
                ? "Create and manage membership plans for each location."
                : "Review your location membership plans and status.",
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
            key: "location-settings",
            title: "Location Settings",
            description: "Create, edit, and review settings for each location.",
            icon: MapPin,
            onClick: () => navigateWithSpa("/management/locations"),
            className:
              "border-emerald-100 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-900",
          },
        ]
      : []),
    ...(!isSuperAdmin && isTeamOrAbove
      ? [
          {
            key: "location-settings",
            title: "Location Settings",
            description: "Review and update your location details in a dedicated page.",
            icon: MapPin,
            onClick: () => navigateWithSpa("/management/locations"),
            className:
              "border-emerald-100 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-900",
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
              <StripeConnect sharedLocationStripeLinked={sharedLocationStripeLinked} />
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
          locations={locations}
          currentUser={currentUser}
        />
      </div>
    </Layout>
  );
};

export default ManagementPage;
