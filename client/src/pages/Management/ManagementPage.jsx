import { useBranding } from "@/context/BrandingContext";
import { authService } from "@/services/authService";
import { locationService } from "@/services/locationService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Award,
    Calendar,
    ChevronRight,
    Clock,
    Crown,
    DollarSign,
    Gift,
    HardDrive,
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

import AddUserForm from "@/components/Management/AddUserForm";
import AutomatedGiftSettings from "@/components/Management/AutomatedGiftSettings";
import AvailabilitySettings from "@/components/Management/AvailabilitySettings";
import BirthdayGiftSettings from "@/components/Management/BirthdayGiftSettings";
import SquareConnect from "@/components/Square/SquareConnect";
import StripeConnect from "@/components/Stripe/StripeConnect";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

const accentStyles = {
  blue: {
    border: "border-blue-100",
    bg: "bg-blue-50/70",
    hover: "hover:bg-blue-100/70",
    text: "text-blue-900",
    icon: "text-blue-600",
  },
  orange: {
    border: "border-orange-100",
    bg: "bg-orange-50/70",
    hover: "hover:bg-orange-100/70",
    text: "text-orange-900",
    icon: "text-orange-600",
  },
  fuchsia: {
    border: "border-fuchsia-100",
    bg: "bg-fuchsia-50/70",
    hover: "hover:bg-fuchsia-100/70",
    text: "text-fuchsia-900",
    icon: "text-fuchsia-600",
  },
  rose: {
    border: "border-rose-100",
    bg: "bg-rose-50/70",
    hover: "hover:bg-rose-100/70",
    text: "text-rose-900",
    icon: "text-rose-600",
  },
  sky: {
    border: "border-sky-100",
    bg: "bg-sky-50/70",
    hover: "hover:bg-sky-100/70",
    text: "text-sky-900",
    icon: "text-sky-600",
  },
  indigo: {
    border: "border-indigo-100",
    bg: "bg-indigo-50/70",
    hover: "hover:bg-indigo-100/70",
    text: "text-indigo-900",
    icon: "text-indigo-600",
  },
  cyan: {
    border: "border-cyan-100",
    bg: "bg-cyan-50/70",
    hover: "hover:bg-cyan-100/70",
    text: "text-cyan-900",
    icon: "text-cyan-600",
  },
  emerald: {
    border: "border-emerald-100",
    bg: "bg-emerald-50/70",
    hover: "hover:bg-emerald-100/70",
    text: "text-emerald-900",
    icon: "text-emerald-600",
  },
};

const ManagementPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser } = useSelector((state) => state.user);
  const { branding } = useBranding();
  const brandColor = branding?.themeColor || "#ec4899";
  const brandColorDark = adjustHex(brandColor, -24);

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);
  const [isBirthdayGiftOpen, setIsBirthdayGiftOpen] = useState(false);
  const [isAutomatedGiftOpen, setIsAutomatedGiftOpen] = useState(false);
  const [isPayoutsOpen, setIsPayoutsOpen] = useState(false);

  const isElevatedUser = [
    "admin",
    "spa",
    "enterprise",
    "super-admin",
  ].includes(currentUser?.role);
  const isAdminOrAbove = ["admin", "super-admin"].includes(currentUser?.role);
  const isSuperAdmin = currentUser?.role === "super-admin";
  const isTeamOrAbove = ["spa", "admin", "super-admin"].includes(currentUser?.role);

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

  const { data: locationsData } = useQuery({
    queryKey: ["locations"],
    queryFn: () => locationService.getAllLocations(),
    enabled: isTeamOrAbove,
  });

  const handleOpenMembership = () => navigateWithSpa("/management/membership");

  const createUserMutation = useMutation({
    mutationFn: authService.createSpaMember,
    onSuccess: () => {
      setIsAddUserOpen(false);
      toast.success("User created successfully!");
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to create user");
    },
  });

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
      title: "Database backups",
      description: "Create and download full MongoDB snapshots",
      icon: HardDrive,
      path: "/management/database-backups",
      color: "from-slate-600 to-slate-800",
      visible: isSuperAdmin,
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
      title: isSuperAdmin ? "Rewards Database" : "Rewards System",
      description: isSuperAdmin
        ? "Browse all rewards across all locations"
        : "Manage rewards, points, and incentives",
      icon: Gift,
      path: isSuperAdmin
        ? "/management/rewards-database"
        : "/management/rewards",
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
      description: "Card and online charges for your location",
      icon: TrendingUp,
      path: "/management/revenue",
      color: "from-rose-500 to-rose-600",
      visible: isTeamOrAbove,
    },
  ];

  const locations = locationsData?.data?.locations || EMPTY_LOCATIONS;
  const currentLocation = locations.find(
    (location) => location?.locationId === activeSpaLocationId
  );
  const sharedLocationStripeLinked = Boolean(
    currentLocation?.membershipStripeConnected
  );
  const sharedLocationSquareLinked = Boolean(
    currentLocation?.membershipSquareConnected
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
            accent: "blue",
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
            accent: "orange",
          },
          {
            key: "gift-settings",
            title: "Gift Settings",
            description: "Set birthday and event-based gift behavior.",
            icon: Gift,
            onClick: () => setIsBirthdayGiftOpen(true),
            accent: "fuchsia",
          },
          {
            key: "automated-gifts",
            title: "Automated Gifts",
            description: "Schedule and control automated gift campaigns.",
            icon: Sparkles,
            onClick: () => setIsAutomatedGiftOpen(true),
            accent: "rose",
          },
          {
            key: "points-settings",
            title: "Points Settings",
            description: "Control earning, redemption, and loyalty balance rules.",
            icon: Award,
            onClick: () => navigate("/management/points"),
            accent: "brand",
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
            accent: "sky",
          },
        ]
      : []),
    ...(isSuperAdmin
      ? [
          {
            key: "points-settings",
            title: "Points Settings",
            description: "Control earning, redemption, and loyalty balance rules.",
            icon: Award,
            onClick: () => navigate("/management/points"),
            accent: "brand",
          },
          {
            key: "view-automations",
            title: "Automations",
            description: "View GHL automations and link them to app events.",
            icon: Zap,
            onClick: () => navigateWithSpa("/management/automations"),
            accent: "indigo",
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
            accent: "cyan",
          },
        ]
      : []),
    ...(["admin", "super-admin"].includes(currentUser?.role)
      ? [
          {
            key: "payouts",
            title: "Payouts",
            description: "Connect Stripe or Square to receive payments.",
            icon: DollarSign,
            onClick: () => setIsPayoutsOpen(true),
            accent: "emerald",
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
            accent: "emerald",
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
            accent: "emerald",
          },
        ]
      : []),
  ];

  const visibleManagementRoutes = managementRoutes.filter((route) => route.visible);

  const handleCreateUser = async (userData) => {
    await createUserMutation.mutateAsync(userData);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {/* ── Header ── */}
          <div className="mb-10 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div
              className="h-2 w-full"
              style={{
                background: `linear-gradient(90deg, ${brandColor}, ${brandColorDark}, ${adjustHex(brandColor, -40)})`,
              }}
            />
            <div className="px-5 py-5 md:px-8 md:py-7">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                    Management Dashboard
                  </h1>
                  <p className="mt-1.5 text-slate-500 text-sm md:text-base">
                    Run operations, configure core settings, and keep your team aligned.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {roleLabel}
                  </span>
                  {activeSpaLocationId && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800">
                      <MapPin className="h-3.5 w-3.5" />
                      {currentLocation?.name ||
                        currentUser?.selectedLocation?.locationName ||
                        currentUser?.spaLocation?.locationName ||
                        activeSpaLocationId}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Quick Actions ── */}
          {isElevatedUser && (
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-1 h-7 rounded-full shrink-0"
                  style={{ background: `linear-gradient(to bottom, ${brandColor}, ${brandColorDark})` }}
                />
                <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {visibleManagementRoutes.map((route) => (
                  <button
                    key={route.path}
                    onClick={() => navigateWithSpa(route.path)}
                    className={`group p-4 sm:p-5 bg-gradient-to-br ${route.color} rounded-xl text-white hover:opacity-95 transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-0.5 text-left`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <route.icon className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 opacity-95" />
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 opacity-75 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <h3 className="mt-4 sm:mt-6 font-semibold text-sm sm:text-base">{route.title}</h3>
                    <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm opacity-90 leading-relaxed">{route.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Settings & Tools ── */}
          {toolActions.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-1 h-7 rounded-full shrink-0"
                  style={{ background: `linear-gradient(to bottom, ${brandColor}, ${brandColorDark})` }}
                />
                <h2 className="text-lg font-semibold text-slate-900">Settings &amp; Tools</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {toolActions.map((action) => {
                  const isBrandAccent = action.accent === "brand";
                  const s = isBrandAccent
                    ? {}
                    : accentStyles[action.accent] || accentStyles.blue;

                  return (
                    <button
                      key={action.key}
                      onClick={action.onClick}
                      className={`group rounded-xl border p-4 text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                        isBrandAccent
                          ? "border-transparent text-white hover:opacity-95"
                          : `${s.border} ${s.bg} ${s.hover} ${s.text}`
                      }`}
                      style={
                        isBrandAccent
                          ? { background: `linear-gradient(120deg, ${brandColor}, ${brandColorDark})` }
                          : undefined
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <action.icon
                          className={`h-5 w-5 shrink-0 ${isBrandAccent ? "text-white/90" : s.icon}`}
                        />
                        <ChevronRight className={`h-4 w-4 shrink-0 opacity-60 group-hover:translate-x-0.5 transition-transform ${isBrandAccent ? "text-white/70" : ""}`} />
                      </div>
                      <h3 className={`mt-3.5 text-sm font-semibold ${isBrandAccent ? "text-white" : ""}`}>
                        {action.title}
                      </h3>
                      <p className={`mt-1 text-xs leading-relaxed ${isBrandAccent ? "text-white/80" : "opacity-85"}`}>
                        {action.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Payouts ── */}
          {currentUser?.role === "spa" && (
            <div className="mb-8 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div
                className="h-2 w-full"
                style={{ background: `linear-gradient(90deg, ${brandColor}, ${brandColorDark}, ${adjustHex(brandColor, -40)})` }}
              />

              <div className="px-5 pt-5 pb-1 md:px-8 md:pt-7">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className="hidden sm:flex w-12 h-12 rounded-xl items-center justify-center shadow-sm shrink-0"
                      style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColorDark})` }}
                    >
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold text-slate-900">Payouts</h2>
                      <p className="text-sm text-slate-500 mt-1 max-w-lg">
                        Connect Stripe or Square to receive payments from memberships, services, and bookings.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                        sharedLocationStripeLinked
                          ? "border-opacity-30"
                          : "bg-slate-50 text-slate-400 border-slate-200"
                      }`}
                      style={
                        sharedLocationStripeLinked
                          ? {
                              backgroundColor: `${brandColor}12`,
                              color: brandColorDark,
                              borderColor: `${brandColor}30`,
                            }
                          : undefined
                      }
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: sharedLocationStripeLinked ? brandColor : undefined,
                          opacity: sharedLocationStripeLinked ? 1 : 0.3,
                        }}
                      />
                      Stripe
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                        sharedLocationSquareLinked
                          ? "border-opacity-30"
                          : "bg-slate-50 text-slate-400 border-slate-200"
                      }`}
                      style={
                        sharedLocationSquareLinked
                          ? {
                              backgroundColor: `${brandColor}12`,
                              color: brandColorDark,
                              borderColor: `${brandColor}30`,
                            }
                          : undefined
                      }
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: sharedLocationSquareLinked ? brandColor : undefined,
                          opacity: sharedLocationSquareLinked ? 1 : 0.3,
                        }}
                      />
                      Square
                    </span>
                  </div>
                </div>
              </div>

              <div className="mx-5 md:mx-8 mt-5 border-t border-slate-100" />

              <div className="px-5 pb-5 pt-5 md:px-8 md:pb-7">
                <div className="grid gap-5 lg:grid-cols-2">
                  <StripeConnect
                    locationId={activeSpaLocationId}
                    sharedLocationStripeLinked={sharedLocationStripeLinked}
                    sharedLocationSquareLinked={sharedLocationSquareLinked}
                  />
                  <SquareConnect
                    locationId={activeSpaLocationId}
                    sharedLocationSquareLinked={sharedLocationSquareLinked}
                    sharedLocationStripeLinked={sharedLocationStripeLinked}
                  />
                </div>

                <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                  Payouts are processed automatically once connected. Funds typically arrive within 2–5 business days.
                </div>
              </div>
            </div>
          )}
        </div>

        <AddUserForm
          isOpen={isAddUserOpen}
          onClose={() => setIsAddUserOpen(false)}
          onSubmit={handleCreateUser}
        />
        <AvailabilitySettings
          isOpen={isAvailabilityOpen}
          onClose={() => setIsAvailabilityOpen(false)}
        />
        <BirthdayGiftSettings
          isOpen={isBirthdayGiftOpen}
          onClose={() => setIsBirthdayGiftOpen(false)}
        />
        <AutomatedGiftSettings
          isOpen={isAutomatedGiftOpen}
          onClose={() => setIsAutomatedGiftOpen(false)}
        />

        <Dialog open={isPayoutsOpen} onOpenChange={setIsPayoutsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payouts
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <p className="text-sm text-slate-500 mb-6">
                Connect Stripe or Square to receive payments from memberships, services, and bookings.
              </p>
              <div className="flex items-center gap-2 mb-6">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                    sharedLocationStripeLinked
                      ? "border-opacity-30"
                      : "bg-slate-50 text-slate-400 border-slate-200"
                  }`}
                  style={
                    sharedLocationStripeLinked
                      ? {
                          backgroundColor: `${brandColor}12`,
                          color: brandColorDark,
                          borderColor: `${brandColor}30`,
                        }
                      : undefined
                  }
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: sharedLocationStripeLinked ? brandColor : undefined,
                      opacity: sharedLocationStripeLinked ? 1 : 0.3,
                    }}
                  />
                  Stripe
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                    sharedLocationSquareLinked
                      ? "border-opacity-30"
                      : "bg-slate-50 text-slate-400 border-slate-200"
                  }`}
                  style={
                    sharedLocationSquareLinked
                      ? {
                          backgroundColor: `${brandColor}12`,
                          color: brandColorDark,
                          borderColor: `${brandColor}30`,
                        }
                      : undefined
                  }
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: sharedLocationSquareLinked ? brandColor : undefined,
                      opacity: sharedLocationSquareLinked ? 1 : 0.3,
                    }}
                  />
                  Square
                </span>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <StripeConnect
                  locationId={activeSpaLocationId}
                  sharedLocationStripeLinked={sharedLocationStripeLinked}
                  sharedLocationSquareLinked={sharedLocationSquareLinked}
                />
                <SquareConnect
                  locationId={activeSpaLocationId}
                  sharedLocationSquareLinked={sharedLocationSquareLinked}
                  sharedLocationStripeLinked={sharedLocationStripeLinked}
                />
              </div>
              <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
                <div className="w-1 h-1 rounded-full bg-slate-300" />
                Payouts are processed automatically once connected. Funds typically arrive within 2–5 business days.
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ManagementPage;
