import { useBranding } from "@/context/BrandingContext";
import ghlService from "@/services/ghlService";
import { locationService } from "@/services/locationService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BatteryCharging,
  Check,
  ChevronLeft,
  Copy,
  Link2,
  Loader2,
  MapPin,
  RefreshCw,
  Unlink,
  Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Layout from "@/pages/Layout/Layout";

const EMPTY_LOCATIONS = [];
const EMPTY_WORKFLOWS = [];
const AUTOMATION_TYPES = [
  {
    key: "signup",
    label: "Signup Page",
    description: "Runs after a client creates an account from this location's signup page.",
  },
  {
    key: "checkin",
    label: "Check-In",
    description: "Runs after a verified client check-in is recorded for this location.",
  },
];

const clampChannel = (value) => Math.max(0, Math.min(255, value));
const adjustHex = (hex, amount) => {
  if (!hex) return "#0ea5e9";
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return "#0ea5e9";
  const num = parseInt(cleaned, 16);
  const r = clampChannel(((num >> 16) & 255) + amount);
  const g = clampChannel(((num >> 8) & 255) + amount);
  const b = clampChannel((num & 255) + amount);
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
};

const toTitle = (value = "") => {
  const normalized = `${value || ""}`.trim().toLowerCase();
  if (!normalized) return "Inactive";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const AutomationsManagementPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser } = useSelector((state) => state.user);
  const { branding, locationId: brandedLocationId } = useBranding();
  const brandColor = branding?.themeColor || "#0ea5e9";
  const brandColorDark = adjustHex(brandColor, -24);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedAutomationKey, setSelectedAutomationKey] = useState("signup");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");
  const [checkinTriggerTagsDraft, setCheckinTriggerTagsDraft] = useState("");
  const [copiedKey, setCopiedKey] = useState("");
  const isGhlDebugEnabled = useMemo(() => {
    if (typeof window === "undefined") return true;
    const fromStorage = window.localStorage.getItem("ghl-debug");
    if (fromStorage === "1" || fromStorage === "true") return true;
    return Boolean(import.meta.env.DEV);
  }, []);
  const logGhlDebug = useCallback(
    (...args) => {
      if (!isGhlDebugEnabled) return;
      console.log("[AutomationsManagement][GHL]", ...args);
    },
    [isGhlDebugEnabled]
  );

  const spaParamLocationId = useMemo(
    () => `${new URLSearchParams(location.search).get("spa") || ""}`.trim(),
    [location.search]
  );
  const isTeamOrAbove = ["spa", "admin", "enterprise", "super-admin"].includes(
    currentUser?.role
  );
  const isSpaUser = currentUser?.role === "spa";
  const canSelectLocation = ["admin", "enterprise", "super-admin"].includes(
    currentUser?.role
  );
  const userProfileLocationId =
    currentUser?.selectedLocation?.locationId ||
    currentUser?.spaLocation?.locationId ||
    "";
  const currentUserLocationId = brandedLocationId || userProfileLocationId || "";
  useEffect(() => {
    logGhlDebug("Role and location context", {
      role: currentUser?.role || "",
      spaParamLocationId,
      selectedLocationId,
      currentUserLocationId,
      userProfileLocationId,
      brandedLocationId,
      effectiveLocationId: undefined,
    });
  }, [
    currentUser?.role,
    spaParamLocationId,
    selectedLocationId,
    currentUserLocationId,
    userProfileLocationId,
    brandedLocationId,
    logGhlDebug,
  ]);

  const { data: locationsData, isLoading: isLoadingLocations } = useQuery({
    queryKey: ["locations"],
    queryFn: () => locationService.getAllLocations(),
    enabled: isTeamOrAbove && canSelectLocation,
  });

  const locations = locationsData?.data?.locations || EMPTY_LOCATIONS;
  const effectiveLocationId = isSpaUser
    ? spaParamLocationId ||
      brandedLocationId ||
      selectedLocationId ||
      userProfileLocationId ||
      ""
    : selectedLocationId ||
      spaParamLocationId ||
      currentUserLocationId ||
      locations[0]?.locationId ||
      brandedLocationId ||
      "";
  useEffect(() => {
    logGhlDebug("Resolved effectiveLocationId", {
      effectiveLocationId,
      spaParamLocationId,
      selectedLocationId,
      currentUserLocationId,
      userProfileLocationId,
      firstLocationId: locations[0]?.locationId || "",
      locationsCount: locations.length,
    });
  }, [
    effectiveLocationId,
    spaParamLocationId,
    selectedLocationId,
    currentUserLocationId,
    userProfileLocationId,
    locations,
    logGhlDebug,
  ]);

  useEffect(() => {
    const forcedLocationForContext =
      isSpaUser
        ? spaParamLocationId || brandedLocationId || userProfileLocationId
        : "";
    if (forcedLocationForContext) {
      if (selectedLocationId !== forcedLocationForContext) {
        setSelectedLocationId(forcedLocationForContext);
      }
      return;
    }

    if (selectedLocationId) return;
    if (spaParamLocationId) {
      setSelectedLocationId(spaParamLocationId);
      return;
    }
    if (currentUserLocationId) {
      setSelectedLocationId(currentUserLocationId);
      return;
    }
    if (brandedLocationId) {
      setSelectedLocationId(brandedLocationId);
      return;
    }
    if (locations[0]?.locationId) {
      setSelectedLocationId(locations[0].locationId);
    }
  }, [
    spaParamLocationId,
    isSpaUser,
    selectedLocationId,
    currentUserLocationId,
    userProfileLocationId,
    brandedLocationId,
    locations,
  ]);

  const {
    data: workflowsData,
    isLoading: isLoadingWorkflows,
    refetch: refetchWorkflows,
  } = useQuery({
    queryKey: ["ghl-workflows", effectiveLocationId],
    queryFn: () => ghlService.getWorkflows(effectiveLocationId),
    enabled: Boolean(effectiveLocationId && currentUser?.role === "super-admin"),
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  const workflows = workflowsData?.data?.workflows || EMPTY_WORKFLOWS;
  const selectedLocation = useMemo(
    () =>
      locations.find((entry) => entry?.locationId === effectiveLocationId) ||
      null,
    [locations, effectiveLocationId]
  );
  const automationLinks = useMemo(() => {
    const normalizedLinks = Array.isArray(selectedLocation?.ghlAutomationLinks)
      ? selectedLocation.ghlAutomationLinks
          .map((link) => ({
            key: `${link?.key || ""}`.trim(),
            label: `${link?.label || ""}`.trim(),
            workflowId: `${link?.workflowId || ""}`.trim(),
            workflowName: `${link?.workflowName || ""}`.trim(),
            linkedAt: link?.linkedAt || null,
            triggerTags: Array.isArray(link?.triggerTags)
              ? link.triggerTags
                  .map((tag) => `${tag || ""}`.trim())
                  .filter(Boolean)
              : [],
          }))
          .filter((link) => link.key && link.workflowId)
      : [];
    const hasSignupLink = normalizedLinks.some((link) => link.key === "signup");
    const legacySignupWorkflowId = `${selectedLocation?.ghlSignupWorkflowId || ""}`.trim();

    if (!hasSignupLink && legacySignupWorkflowId) {
      normalizedLinks.push({
        key: "signup",
        label: "Signup Page",
        workflowId: legacySignupWorkflowId,
        workflowName: `${selectedLocation?.ghlSignupWorkflowName || ""}`.trim(),
        linkedAt: selectedLocation?.ghlSignupWorkflowLinkedAt || null,
      });
    }

    return normalizedLinks;
  }, [selectedLocation]);
  const selectedAutomationType =
    AUTOMATION_TYPES.find((type) => type.key === selectedAutomationKey) ||
    AUTOMATION_TYPES[0];
  const selectedAutomationLink = automationLinks.find(
    (link) => link.key === selectedAutomationType.key
  );
  const selectedWorkflow = workflows.find(
    (workflow) => `${workflow?.id || ""}`.trim() === selectedWorkflowId
  );
  const selectedLocationName =
    selectedLocation?.name || effectiveLocationId || "No location selected";
  const source = workflowsData?.data?.source || "ghl";
  const isUnavailable = Boolean(workflowsData?.data?.unavailable);
  const setupChecks = [
    {
      key: "api-key",
      label: "API key",
      isReady: Boolean(`${selectedLocation?.ghlApiKey || ""}`.trim()),
    },
    {
      key: "workflows",
      label: "Workflows",
      isReady: workflows.length > 0 && !isUnavailable,
    },
    {
      key: "automation-links",
      label: "Links",
      isReady: automationLinks.length > 0,
    },
  ];
  const setupScore = setupChecks.filter((check) => check.isReady).length;
  const activeAutomationsCount = workflows.filter((workflow) => workflow?.isActive).length;
  const inactiveAutomationsCount = Math.max(
    workflows.length - activeAutomationsCount,
    0
  );

  useEffect(() => {
    setSelectedWorkflowId(`${selectedAutomationLink?.workflowId || ""}`.trim());
  }, [
    effectiveLocationId,
    selectedAutomationKey,
    selectedAutomationLink?.workflowId,
  ]);

  useEffect(() => {
    if (selectedAutomationKey !== "checkin") {
      return;
    }
    const tags = selectedAutomationLink?.triggerTags;
    setCheckinTriggerTagsDraft(
      Array.isArray(tags) && tags.length ? tags.join(", ") : ""
    );
  }, [
    effectiveLocationId,
    selectedAutomationKey,
    selectedAutomationLink?.workflowId,
    selectedAutomationLink?.triggerTags,
  ]);

  useEffect(() => {
    logGhlDebug("Workflows query result", {
      isLoadingWorkflows,
      responseSuccess: workflowsData?.success,
      responseMessage: workflowsData?.message,
      source,
      unavailable: isUnavailable,
      error: workflowsData?.data?.error || null,
      total: workflowsData?.data?.total ?? 0,
      mappedCount: workflows.length,
      workflowsPreview: workflows.slice(0, 10).map((workflow) => ({
        id: workflow?.id || "",
        name: workflow?.name || "",
        status: workflow?.status || "",
        isActive: Boolean(workflow?.isActive),
      })),
    });
  }, [
    isLoadingWorkflows,
    workflowsData,
    source,
    isUnavailable,
    workflows,
    logGhlDebug,
  ]);

  const handleBackToManagement = () => {
    if (effectiveLocationId) {
      navigate(`/management?spa=${encodeURIComponent(effectiveLocationId)}`);
      return;
    }
    navigate("/management");
  };

  const handleLocationChange = (nextLocationId) => {
    setSelectedLocationId(nextLocationId);
    if (!nextLocationId || isSpaUser) return;
    navigate(`/management/automations?spa=${encodeURIComponent(nextLocationId)}`, {
      replace: true,
    });
  };

  const updateAutomationLinkMutation = useMutation({
    mutationFn: ({
      automationKey = "",
      workflowId = "",
      workflowName = "",
      triggerTags,
    }) => {
      if (!selectedLocation?._id) {
        throw new Error("Selected location could not be resolved");
      }

      const automationType =
        AUTOMATION_TYPES.find((type) => type.key === automationKey) ||
        selectedAutomationType;
      const normalizedWorkflowId = `${workflowId || ""}`.trim();
      const normalizedWorkflowName = `${workflowName || ""}`.trim();
      const nextLinks = automationLinks.filter(
        (link) => link.key !== automationType.key
      );

      const normalizedCheckInTags =
        automationType.key === "checkin" && Array.isArray(triggerTags)
          ? triggerTags.map((tag) => `${tag || ""}`.trim()).filter(Boolean)
          : [];

      if (normalizedWorkflowId) {
        nextLinks.push({
          key: automationType.key,
          label: automationType.label,
          workflowId: normalizedWorkflowId,
          workflowName: normalizedWorkflowName,
          linkedAt: new Date().toISOString(),
          ...(automationType.key === "checkin"
            ? { triggerTags: normalizedCheckInTags }
            : {}),
        });
      }

      return locationService.updateLocation(selectedLocation._id, {
        ghlAutomationLinks: nextLinks,
        ...(automationType.key === "signup"
          ? {
              ghlSignupWorkflowId: normalizedWorkflowId,
              ghlSignupWorkflowName: normalizedWorkflowName,
            }
          : {}),
      });
    },
    onSuccess: (_data, variables) => {
      const automationType =
        AUTOMATION_TYPES.find((type) => type.key === variables?.automationKey) ||
        selectedAutomationType;
      const normalizedWorkflowId = `${variables?.workflowId || ""}`.trim();
      const normalizedWorkflowName = `${variables?.workflowName || ""}`.trim();
      const persistedCheckInTags =
        automationType.key === "checkin" && Array.isArray(variables?.triggerTags)
          ? variables.triggerTags.map((tag) => `${tag || ""}`.trim()).filter(Boolean)
          : [];

      queryClient.setQueryData(["locations"], (previous) => {
        const existing = previous?.data?.locations || [];
        return {
          ...(previous || {}),
          data: {
            ...(previous?.data || {}),
            locations: existing.map((entry) =>
              entry?.locationId === effectiveLocationId
                ? {
                    ...entry,
                    ...(automationType.key === "signup"
                      ? {
                          ghlSignupWorkflowId: normalizedWorkflowId,
                          ghlSignupWorkflowName: normalizedWorkflowName,
                          ghlSignupWorkflowLinkedAt: normalizedWorkflowId
                            ? new Date().toISOString()
                            : null,
                        }
                      : {}),
                    ghlAutomationLinks: normalizedWorkflowId
                      ? [
                          ...(
                            Array.isArray(entry?.ghlAutomationLinks)
                              ? entry.ghlAutomationLinks
                              : []
                          ).filter((link) => link?.key !== automationType.key),
                          {
                            key: automationType.key,
                            label: automationType.label,
                            workflowId: normalizedWorkflowId,
                            workflowName: normalizedWorkflowName,
                            linkedAt: new Date().toISOString(),
                            ...(automationType.key === "checkin"
                              ? { triggerTags: persistedCheckInTags }
                              : {}),
                          },
                        ]
                      : (
                          Array.isArray(entry?.ghlAutomationLinks)
                            ? entry.ghlAutomationLinks
                            : []
                        ).filter((link) => link?.key !== automationType.key),
                  }
                : entry
            ),
          },
        };
      });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success(
        normalizedWorkflowId
          ? `${automationType.label} automation linked`
          : `${automationType.label} automation cleared`
      );
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || error?.message || "Failed to update automation link");
    },
  });

  const saveAutomationLink = () => {
    if (!selectedWorkflowId) {
      toast.error("Choose a workflow first");
      return;
    }

    const parsedCheckInTags =
      selectedAutomationType.key === "checkin"
        ? `${checkinTriggerTagsDraft || ""}`
            .split(/[,|;]/g)
            .map((entry) => entry.trim())
            .filter(Boolean)
        : [];

    updateAutomationLinkMutation.mutate({
      automationKey: selectedAutomationType.key,
      workflowId: selectedWorkflowId,
      workflowName: selectedWorkflow?.name || "",
      ...(selectedAutomationType.key === "checkin"
        ? { triggerTags: parsedCheckInTags }
        : {}),
    });
  };

  const clearAutomationLink = () => {
    updateAutomationLinkMutation.mutate({
      automationKey: selectedAutomationType.key,
      workflowId: "",
      workflowName: "",
      ...(selectedAutomationKey === "checkin" ? { triggerTags: [] } : {}),
    });
  };

  const copyText = useCallback(
    async (text, key, label) => {
      const value = `${text || ""}`.trim();
      if (!value) return;
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(value);
        } else {
          const textArea = document.createElement("textarea");
          textArea.value = value;
          textArea.setAttribute("readonly", "");
          textArea.style.position = "absolute";
          textArea.style.left = "-9999px";
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
        }

        setCopiedKey(key);
        window.setTimeout(() => {
          setCopiedKey((current) => (current === key ? "" : current));
        }, 1500);
        toast.success(`${label} copied`);
      } catch {
        toast.error(`Failed to copy ${label.toLowerCase()}`);
      }
    },
    []
  );

  return (
    <Layout>
      <div
        className="min-h-screen bg-white"
        style={{
          fontFamily:
            '"Geist", "Inter", "SF Pro Text", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div
              className="h-1.5 w-full rounded-t-2xl"
              style={{
                background: `linear-gradient(90deg, ${brandColor}, ${brandColorDark})`,
              }}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-8 sm:py-6">
              <div>
                <button
                  onClick={handleBackToManagement}
                  className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900 sm:mb-2 sm:text-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to Management
                </button>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                  Automations
                </h1>
                <p className="mt-1 text-xs text-slate-600 sm:text-base">
                  View all available GoHighLevel automations for the selected location.
                </p>
                {effectiveLocationId && (
                  <p className="mt-1 text-[11px] font-medium text-slate-500 sm:text-xs">
                    Location ID: {effectiveLocationId}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  logGhlDebug("Manual refresh triggered", {
                    effectiveLocationId,
                  });
                  refetchWorkflows();
                }}
                className="h-9 rounded-lg border-slate-200 bg-white px-3 text-xs text-slate-700 hover:bg-slate-50 sm:h-10 sm:rounded-xl sm:px-4 sm:text-sm"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          {canSelectLocation && (
            <div className="mt-4 grid gap-3 md:mt-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Active Location
                </label>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{
                      background: `linear-gradient(120deg, ${brandColor}, ${brandColorDark})`,
                    }}
                  >
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <select
                      value={selectedLocationId || effectiveLocationId}
                      onChange={(e) => handleLocationChange(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-transparent focus:ring-2 sm:h-11 sm:rounded-xl"
                      style={{ "--tw-ring-color": `${brandColor}33` }}
                    >
                      {isLoadingLocations ? (
                        <option value="">Loading locations...</option>
                      ) : locations.length === 0 ? (
                        <option value={effectiveLocationId || ""}>
                          {effectiveLocationId || "No locations found"}
                        </option>
                      ) : (
                        locations.map((entry) => (
                          <option key={entry.locationId} value={entry.locationId}>
                            {entry.name || entry.locationId}
                          </option>
                        ))
                      )}
                    </select>
                    <p className="mt-2 truncate text-xs text-slate-500">
                      {selectedLocationName}
                      {effectiveLocationId ? ` · ${effectiveLocationId}` : ""}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Setup Battery
                    </p>
                    <p className="mt-1 text-lg font-black">{setupScore}/3 ready</p>
                  </div>
                  <BatteryCharging className="h-6 w-6 text-emerald-300" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-1.5">
                  {setupChecks.map((check) => (
                    <div
                      key={check.key}
                      className={`h-3 rounded-full ${
                        check.isReady ? "bg-emerald-400" : "bg-slate-700"
                      }`}
                    />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {setupChecks.map((check) => (
                    <span
                      key={check.key}
                      className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                        check.isReady
                          ? "bg-emerald-400/15 text-emerald-200"
                          : "bg-white/10 text-slate-300"
                      }`}
                    >
                      {check.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentUser?.role === "super-admin" && effectiveLocationId && (
            <div className="mt-4 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:mt-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] sm:p-5">
              <div className="min-w-0">
                <div>
                  <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Link2 className="h-4 w-4 text-sky-600" />
                    Automation Links
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Pick what the automation is for, then assign one workflow from this location.
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Automation Type
                    </label>
                    <select
                      value={selectedAutomationKey}
                      onChange={(event) => setSelectedAutomationKey(event.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-transparent focus:ring-2"
                      style={{ "--tw-ring-color": `${brandColor}33` }}
                    >
                      {AUTOMATION_TYPES.map((type) => (
                        <option key={type.key} value={type.key}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedAutomationType.description}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Workflow
                    </label>
                    <select
                      value={selectedWorkflowId}
                      onChange={(event) => setSelectedWorkflowId(event.target.value)}
                      disabled={isLoadingWorkflows || workflows.length === 0}
                      className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-transparent focus:ring-2 disabled:bg-slate-100 disabled:text-slate-400"
                      style={{ "--tw-ring-color": `${brandColor}33` }}
                    >
                      <option value="">
                        {isLoadingWorkflows
                          ? "Loading workflows..."
                          : workflows.length
                          ? "Choose workflow"
                          : "No workflows available"}
                      </option>
                      {workflows.map((workflow) => (
                        <option key={workflow.id} value={workflow.id}>
                          {workflow.name || workflow.id}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedAutomationKey === "checkin" && (
                  <div className="mt-4">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      GHL workflow trigger tags
                    </label>
                    <textarea
                      value={checkinTriggerTagsDraft}
                      onChange={(e) => setCheckinTriggerTagsDraft(e.target.value)}
                      placeholder="e.g. app_checkin_on_time (comma-separated for multiple)"
                      rows={3}
                      className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-transparent focus:ring-2"
                      style={{ "--tw-ring-color": `${brandColor}33` }}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      If your automation starts on <strong>Contact Tag Added</strong>, enter the exact
                      tag name(s) GHL listens for — the app enrolls the contact in the workflow and
                      applies these tags on each verified check-in.
                    </p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={saveAutomationLink}
                    disabled={
                      updateAutomationLinkMutation.isPending ||
                      !selectedWorkflowId ||
                      !selectedLocation?._id
                    }
                    className="h-10 rounded-lg px-4 text-sm font-semibold text-white"
                    style={{
                      background: `linear-gradient(120deg, ${brandColor}, ${brandColorDark})`,
                    }}
                  >
                    {updateAutomationLinkMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="mr-2 h-4 w-4" />
                    )}
                    Save Link
                  </Button>
                  {selectedAutomationLink?.workflowId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={clearAutomationLink}
                      disabled={updateAutomationLinkMutation.isPending}
                      className="h-10 rounded-lg border-slate-200 bg-white px-4 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {updateAutomationLinkMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Unlink className="mr-2 h-4 w-4" />
                      )}
                      Clear Selected Type
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Linked For This Location
                </p>
                {automationLinks.length ? (
                  <div className="mt-3 space-y-2">
                    {automationLinks.map((link) => (
                      <div
                        key={link.key}
                        className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900">
                              {link.label || link.key}
                            </p>
                            <p className="mt-0.5 truncate text-xs font-medium text-slate-600">
                              {link.workflowName || "Linked workflow"}
                            </p>
                            {link.key === "checkin" && link.triggerTags?.length ? (
                              <p className="mt-1 text-[11px] text-slate-500">
                                Tags: {link.triggerTags.join(", ")}
                              </p>
                            ) : null}
                            <p className="mt-1 break-all text-[11px] text-slate-500">
                              ID: {link.workflowId}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              copyText(
                                link.workflowId,
                                `automation-link-${link.key}`,
                                `${link.label || link.key} workflow ID`
                              )
                            }
                            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-100"
                          >
                            {copiedKey === `automation-link-${link.key}` ? (
                              <>
                                <Check className="h-3 w-3" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">
                    No automation links saved yet.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-3 md:mt-6">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total Automations
              </p>
              <p className="mt-2 text-2xl font-black text-slate-900">{workflows.length}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Active
              </p>
              <p className="mt-2 text-2xl font-black text-emerald-800">
                {activeAutomationsCount}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Inactive
              </p>
              <p className="mt-2 text-2xl font-black text-slate-800">
                {inactiveAutomationsCount}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white md:mt-6">
            <div className="border-b border-slate-100 px-4 py-3 sm:px-6">
              <h2 className="text-sm font-semibold text-slate-900 sm:text-base">
                Available Automations
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Source: {source}
                {isUnavailable ? " (fallback mode)" : ""}
              </p>
            </div>

            {!effectiveLocationId ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500 sm:px-6">
                Select a location to load automations.
              </div>
            ) : isLoadingWorkflows ? (
              <div className="space-y-3 px-4 py-4 sm:px-6">
                {[...Array(4)].map((_, idx) => (
                  <div
                    key={`workflow-skeleton-${idx}`}
                    className="h-24 animate-pulse rounded-xl bg-slate-100"
                  />
                ))}
              </div>
            ) : workflows.length === 0 ? (
              <div className="px-4 py-10 text-center sm:px-6">
                <p className="text-sm font-medium text-slate-700">
                  {isUnavailable
                    ? "GoHighLevel automations are currently unavailable for this location."
                    : "No automations found for this location."}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Check your location API key permissions if this looks unexpected.
                </p>
              </div>
            ) : (
              <div className="space-y-3 p-3 sm:space-y-4 sm:p-5">
                {workflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 sm:text-base">
                          <Zap className="h-4 w-4 shrink-0 text-sky-600" />
                          <span className="truncate">{workflow.name}</span>
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <p className="text-xs text-slate-500">ID: {workflow.id}</p>
                          <button
                            onClick={() =>
                              copyText(
                                workflow.id,
                                `workflow-id-${workflow.id}`,
                                "Workflow ID"
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-100"
                          >
                            {copiedKey === `workflow-id-${workflow.id}` ? (
                              <>
                                <Check className="h-3 w-3" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                Copy ID
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          workflow.isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {toTitle(workflow.status)}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
                      <p>
                        <span className="font-semibold text-slate-700">Trigger:</span>{" "}
                        {workflow.triggerName || "N/A"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-700">Updated:</span>{" "}
                        {formatDateTime(workflow.updatedAt)}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-700">Created:</span>{" "}
                        {formatDateTime(workflow.createdAt)}
                      </p>
                    </div>

                    {workflow.description && (
                      <p className="mt-3 text-xs leading-relaxed text-slate-600 sm:text-sm">
                        {workflow.description}
                      </p>
                    )}

                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        Signup Integration Helper
                      </p>
                      <div className="mt-2 space-y-2 text-xs text-slate-600">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-slate-700">
                            Enrollment Path
                          </span>
                          <button
                            onClick={() =>
                              copyText(
                                `/contacts/:contactId/workflow/${workflow.id}`,
                                `workflow-path-${workflow.id}`,
                                "Enrollment path"
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-100"
                          >
                            {copiedKey === `workflow-path-${workflow.id}` ? (
                              <>
                                <Check className="h-3 w-3" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                Copy Path
                              </>
                            )}
                          </button>
                        </div>
                        <code className="block overflow-x-auto rounded bg-slate-900 px-2 py-1 text-[11px] text-slate-100">
                          {`/contacts/:contactId/workflow/${workflow.id}`}
                        </code>

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-slate-700">
                            cURL Template
                          </span>
                          <button
                            onClick={() =>
                              copyText(
                                `curl --request POST "https://services.leadconnectorhq.com/contacts/<CONTACT_ID>/workflow/${workflow.id}" --header "Authorization: Bearer <LOCATION_TOKEN>" --header "Version: 2021-07-28" --header "Content-Type: application/json"`,
                                `workflow-curl-${workflow.id}`,
                                "cURL template"
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-100"
                          >
                            {copiedKey === `workflow-curl-${workflow.id}` ? (
                              <>
                                <Check className="h-3 w-3" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                Copy cURL
                              </>
                            )}
                          </button>
                        </div>

                        <p>
                          <span className="font-semibold text-slate-700">Needs:</span>{" "}
                          published workflow, valid contact ID, and
                          <code className="mx-1 rounded bg-slate-200 px-1 py-0.5 text-[11px] text-slate-800">
                            contacts.write
                          </code>
                          scope.
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AutomationsManagementPage;
