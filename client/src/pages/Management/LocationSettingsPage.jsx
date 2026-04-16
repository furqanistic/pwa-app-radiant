import { useBranding } from "@/context/BrandingContext";
import { locationService } from "@/services/locationService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building,
  Edit2,
  Plus,
  QrCode,
  RefreshCw,
  UserCheck,
  X,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import LocationAssignmentForm from "@/components/Management/LocationAssignmentForm";
import LocationForm from "@/components/Management/LocationForm";
import QRCodeManagement from "@/components/QRCode/QRCodeManagement";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Layout from "@/pages/Layout/Layout";

const EMPTY_LOCATIONS = [];

const clampChannel = (value) => Math.max(0, Math.min(255, value));

const adjustHex = (hex, amount) => {
  if (!hex) return "#0f766e";
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return "#0f766e";
  const num = parseInt(cleaned, 16);
  const r = clampChannel(((num >> 16) & 255) + amount);
  const g = clampChannel(((num >> 8) & 255) + amount);
  const b = clampChannel((num & 255) + amount);
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};

const LocationSettingsPage = () => {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const queryClient = useQueryClient();
  const { currentUser } = useSelector((state) => state.user);
  const { branding } = useBranding();
  const brandColor = branding?.themeColor || "#0f766e";
  const brandColorDark = adjustHex(brandColor, -24);

  const [isLocationFormOpen, setIsLocationFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [isLocationAssignmentOpen, setIsLocationAssignmentOpen] =
    useState(false);
  const [selectedQRLocation, setSelectedQRLocation] = useState(null);

  const isAdminOrAbove = ["admin", "super-admin"].includes(currentUser?.role);
  const isSuperAdmin = currentUser?.role === "super-admin";
  const isTeamOrAbove = ["spa", "admin", "super-admin"].includes(
    currentUser?.role
  );

  const currentUserLocationId =
    currentUser?.selectedLocation?.locationId ||
    currentUser?.spaLocation?.locationId ||
    "";

  const {
    data: locationsData,
    isLoading: isLoadingLocations,
    refetch: refetchLocations,
  } = useQuery({
    queryKey: ["locations"],
    queryFn: () => locationService.getAllLocations(),
    enabled: isTeamOrAbove,
  });

  const locations = locationsData?.data?.locations || EMPTY_LOCATIONS;

  const visibleLocations = useMemo(() => {
    if (isSuperAdmin || isAdminOrAbove) return locations;

    const scopedLocation = locations.find(
      (location) => location?.locationId === currentUserLocationId
    );

    if (scopedLocation) return [scopedLocation];
    return locations.slice(0, 1);
  }, [currentUserLocationId, isAdminOrAbove, isSuperAdmin, locations]);

  const activeLocationsCount = locations.filter(
    (location) => location.isActive
  ).length;
  const inactiveLocationsCount = locations.length - activeLocationsCount;

  const handleBack = () => {
    navigate({
      pathname: "/management",
      search: routerLocation.search,
    });
  };

  const openCreateLocation = () => {
    setEditingLocation(null);
    setIsLocationFormOpen(true);
  };

  const openEditLocation = (location) => {
    setEditingLocation(location);
    setIsLocationFormOpen(true);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-8">
          <div
            className="overflow-hidden rounded-[1.75rem] text-white shadow-sm md:rounded-3xl"
            style={{
              background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColorDark} 100%)`,
            }}
          >
            <div className="px-4 py-4 md:px-8 md:py-8">
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 transition hover:bg-white/20 hover:text-white md:text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Management
              </button>

              <div className="mt-4 flex flex-col gap-4 lg:mt-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight md:text-4xl">
                    Location Settings
                  </h1>
                  <p className="mt-1.5 max-w-2xl text-xs leading-5 text-white/85 md:mt-2 md:text-base">
                    Manage location profiles, QR access, and assignment flows
                    from one dedicated place.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                  {isSuperAdmin && (
                    <Button
                      onClick={openCreateLocation}
                      className="h-10 justify-center border-0 bg-white text-sm text-slate-900 hover:bg-slate-100"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Location
                    </Button>
                  )}
                  {isAdminOrAbove && (
                    <Button
                      onClick={() => setIsLocationAssignmentOpen(true)}
                      className="h-10 justify-center border border-white/20 bg-white/10 text-sm text-white hover:bg-white/20"
                    >
                      <UserCheck className="mr-2 h-4 w-4" />
                      Assign Location
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 md:hidden">
            <div className="min-w-0 rounded-2xl border border-emerald-100 bg-emerald-50 px-2.5 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                Active
              </p>
              <p className="mt-1 text-lg font-bold leading-none text-emerald-950">
                {isSuperAdmin
                  ? activeLocationsCount
                  : visibleLocations.filter((location) => location.isActive)
                      .length}
              </p>
            </div>
            <div className="min-w-0 rounded-2xl border border-rose-100 bg-rose-50 px-2.5 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-rose-700">
                Inactive
              </p>
              <p className="mt-1 text-lg font-bold leading-none text-rose-950">
                {isSuperAdmin
                  ? inactiveLocationsCount
                  : visibleLocations.filter((location) => !location.isActive)
                      .length}
              </p>
            </div>
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-2.5 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Visible
              </p>
              <p className="mt-1 text-lg font-bold leading-none text-slate-900">
                {visibleLocations.length}
              </p>
            </div>
          </div>

          <div className="mt-6 hidden grid-cols-1 gap-4 md:grid md:grid-cols-3">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Active
              </p>
              <p className="mt-3 text-3xl font-bold text-emerald-950">
                {isSuperAdmin ? activeLocationsCount : visibleLocations.filter((location) => location.isActive).length}
              </p>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
                Inactive
              </p>
              <p className="mt-3 text-3xl font-bold text-rose-950">
                {isSuperAdmin ? inactiveLocationsCount : visibleLocations.filter((location) => !location.isActive).length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Visible Locations
              </p>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {visibleLocations.length}
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm md:mt-6 md:rounded-2xl">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
              <div>
                <h2 className="text-base font-semibold text-slate-900 md:text-lg">
                  {isSuperAdmin ? "All Locations" : "Your Location"}
                </h2>
                <p className="mt-1 text-xs text-slate-600 md:text-sm">
                  {isSuperAdmin
                    ? "Track every spa location and open the tools you need."
                    : "Review and update your assigned location details."}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetchLocations()}
                className="h-9 w-full text-sm md:w-auto"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>

            {isLoadingLocations ? (
              <div className="px-4 py-5 space-y-3 md:px-5 md:py-6">
                {[...Array(4)].map((_, index) => (
                  <div
                    key={`location-settings-skeleton-${index}`}
                    className="h-16 rounded-xl bg-slate-100 animate-pulse md:h-20"
                  />
                ))}
              </div>
            ) : visibleLocations.length === 0 ? (
              <div className="px-4 py-10 text-center md:px-5 md:py-12">
                <Building className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                <p className="text-base font-medium text-slate-900">
                  No locations available
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {isSuperAdmin
                    ? "Create your first location to start configuring the workspace."
                    : "No location is assigned to this account yet."}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 p-2.5 md:space-y-4 md:p-5">
                {visibleLocations.map((location) => (
                  <div
                    key={location._id}
                    className="min-w-0 rounded-[1.2rem] border border-slate-200 bg-white p-3.5 shadow-[0_1px_0_rgba(15,23,42,0.03)] transition-all duration-200 hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)] md:rounded-2xl md:p-5"
                  >
                    <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-[15px] font-semibold tracking-[-0.02em] text-slate-900 md:text-lg">
                              {location.name || "Unnamed Location"}
                            </h3>
                          </div>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              location.isActive
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {location.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 md:text-sm">
                          <span className="truncate">ID: {location.locationId}</span>
                          <span className="hidden h-1 w-1 rounded-full bg-slate-300 md:inline-block" />
                          <span>
                            Created:{" "}
                            {location.createdAt
                              ? new Date(location.createdAt).toLocaleDateString()
                              : "N/A"}
                          </span>
                        </div>

                        <p className="mt-2 line-clamp-2 text-[12px] font-medium text-slate-700 md:text-sm">
                          {location.address || "No address added yet"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 md:flex md:w-[220px] md:grid-cols-1 md:content-start">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditLocation(location)}
                          className="h-10 min-w-0 rounded-2xl border-blue-200 bg-white px-3 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 md:h-11 md:justify-start md:text-sm"
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedQRLocation(location)}
                          className="h-10 min-w-0 rounded-2xl border-fuchsia-200 bg-white px-3 text-[11px] font-semibold text-fuchsia-700 hover:bg-fuchsia-50 md:h-11 md:justify-start md:text-sm"
                        >
                          <QrCode className="mr-2 h-4 w-4" />
                          QR Code
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Dialog
          open={!!selectedQRLocation}
          onOpenChange={(open) => !open && setSelectedQRLocation(null)}
        >
          <DialogContent
            showCloseButton={false}
            className="max-w-[95vw] md:max-w-[1100px] w-full p-0 border-none bg-transparent shadow-none"
          >
            <div className="relative flex max-h-[95vh] flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl md:max-h-[90vh] md:rounded-[4rem]">
              <div className="flex items-center justify-between border-b border-gray-50 px-6 py-8 md:px-12 md:py-10">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tight text-gray-900 md:text-3xl lg:text-4xl">
                    {selectedQRLocation?.name}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Manage QR code settings for the selected location.
                  </DialogDescription>
                </DialogHeader>

                <button
                  onClick={() => setSelectedQRLocation(null)}
                  className="rounded-full bg-gray-100/80 p-3 text-gray-500 shadow-sm transition-all duration-300 hover:rotate-90 hover:bg-pink-500 hover:text-white"
                >
                  <span className="sr-only">Close QR dialog</span>
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>

              <div className="overflow-y-auto p-6 pt-4 md:p-12 md:pt-6">
                <div className="pb-10">
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
              initialData={
                editingLocation ||
                (currentUser?.role === "spa" ? visibleLocations[0] || null : null)
              }
              onClose={() => {
                setIsLocationFormOpen(false);
                setEditingLocation(null);
              }}
              onSuccess={() => {
                setIsLocationFormOpen(false);
                setEditingLocation(null);
                toast.success(
                  editingLocation
                    ? "Location updated successfully!"
                    : "Location created successfully!"
                );
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

export default LocationSettingsPage;
