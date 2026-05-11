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
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">

          {/* ── Header card ─────────────────────────────── */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="h-0.5 w-full" style={{ background: brandColor }} />

            <div className="px-6 py-5 md:px-8 md:py-6">
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors mb-3"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Management
              </button>

              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h1 className="text-xl md:text-2xl font-semibold text-slate-900 tracking-tight">
                    Location Settings
                  </h1>
                  <p className="mt-1 text-sm text-slate-500 max-w-xl">
                    Manage location profiles, QR access, and assignment flows from one place.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  {isSuperAdmin && (
                    <Button
                      onClick={openCreateLocation}
                      className="h-9 rounded-xl text-sm font-medium px-4 text-white transition-all hover:opacity-90 active:scale-[0.98]"
                      style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColorDark})` }}
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Add Location
                    </Button>
                  )}
                  {isAdminOrAbove && (
                    <Button
                      onClick={() => setIsLocationAssignmentOpen(true)}
                      variant="outline"
                      className="h-9 rounded-xl text-sm font-medium px-4 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                    >
                      <UserCheck className="mr-1.5 h-4 w-4" />
                      Assign Location
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Stats row ──────────────────────────────── */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              {
                label: 'Active',
                value: isSuperAdmin
                  ? activeLocationsCount
                  : visibleLocations.filter((l) => l.isActive).length,
                accent: true,
              },
              {
                label: 'Inactive',
                value: isSuperAdmin
                  ? inactiveLocationsCount
                  : visibleLocations.filter((l) => !l.isActive).length,
                accent: false,
              },
              {
                label: 'Visible',
                value: visibleLocations.length,
                accent: false,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {stat.label}
                </p>
                <p
                  className="mt-1.5 text-2xl font-bold tracking-tight"
                  style={stat.accent ? { color: brandColor } : { color: '#0f172a' }}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* ── Location list ──────────────────────────── */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {isSuperAdmin ? 'All Locations' : 'Your Location'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isSuperAdmin
                    ? 'Track and manage every spa location.'
                    : 'Review and update your assigned location.'}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetchLocations()}
                className="h-8 rounded-lg text-xs px-3 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>

            {isLoadingLocations ? (
              <div className="p-5 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={`skeleton-${i}`}
                    className="h-16 rounded-xl bg-slate-100 animate-pulse"
                  />
                ))}
              </div>
            ) : visibleLocations.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Building className="mx-auto mb-4 h-10 w-10 text-slate-200" />
                <p className="text-sm font-medium text-slate-700">No locations available</p>
                <p className="mt-1 text-xs text-slate-400">
                  {isSuperAdmin
                    ? 'Create your first location to get started.'
                    : 'No location is assigned to this account yet.'}
                </p>
              </div>
            ) : (
              <div className="p-3 md:p-4 space-y-2">
                {visibleLocations.map((location) => (
                  <div
                    key={location._id}
                    className="group rounded-xl border border-slate-200 bg-white px-4 py-3.5 md:px-5 md:py-4 transition-all hover:border-slate-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-sm font-semibold text-slate-900 truncate">
                            {location.name || 'Unnamed Location'}
                          </h3>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                              location.isActive
                                ? 'text-slate-500 bg-slate-100'
                                : 'text-slate-400 bg-slate-50'
                            }`}
                          >
                            {location.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                          <span className="font-mono text-[10px]">{location.locationId}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-200" />
                          <span>
                            {location.createdAt
                              ? new Date(location.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : '—'}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs text-slate-500 line-clamp-1">
                          {location.address || 'No address added'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditLocation(location)}
                          className="h-8 rounded-lg text-xs px-3 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                        >
                          <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedQRLocation(location)}
                          className="h-8 rounded-lg text-xs px-3 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                        >
                          <QrCode className="mr-1.5 h-3.5 w-3.5" />
                          QR
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── QR Dialog ─────────────────────────────────── */}
        <Dialog
          open={!!selectedQRLocation}
          onOpenChange={(open) => !open && setSelectedQRLocation(null)}
        >
          <DialogContent
            showCloseButton={false}
            className="max-w-[95vw] md:max-w-[900px] w-full p-0 border-0 rounded-2xl shadow-xl overflow-hidden bg-white"
          >
            <div className="flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <DialogTitle className="text-sm font-semibold text-slate-900">
                  {selectedQRLocation?.name || 'Location'} — QR Code
                </DialogTitle>
                <button
                  onClick={() => setSelectedQRLocation(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <div className="overflow-y-auto p-5">
                {selectedQRLocation && (
                  <QRCodeManagement
                    locationId={selectedQRLocation._id}
                    locationName={selectedQRLocation.name}
                  />
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Forms ─────────────────────────────────────── */}
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
