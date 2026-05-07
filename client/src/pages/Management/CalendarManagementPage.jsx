import { useBranding } from "@/context/BrandingContext";
import ghlService from "@/services/ghlService";
import { locationService } from "@/services/locationService";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/pages/Layout/Layout";

const EMPTY_LOCATIONS = [];
const EMPTY_CALENDAR_SERVICES = [];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const isOffsetTimeZone = (value = "") => /^[+-]\d{2}:\d{2}$/.test(`${value}`);

const getDatePartsInTimeZone = (value, timeZone = "") => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  if (!timeZone || isOffsetTimeZone(timeZone)) {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      weekday: date.getDay(),
    };
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);

  const values = {};
  parts.forEach(({ type, value: partValue }) => {
    if (type !== "literal") values[type] = partValue;
  });

  const weekdayMap = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    weekday: weekdayMap[values.weekday] ?? date.getDay(),
  };
};

const getDateKeyInTimeZone = (value, timeZone = "") => {
  const parts = getDatePartsInTimeZone(value, timeZone);
  if (!parts) return "";
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day
  ).padStart(2, "0")}`;
};

const clampChannel = (value) => Math.max(0, Math.min(255, value));
const adjustHex = (hex, amount) => {
  if (!hex) return "#2563eb";
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return "#2563eb";
  const num = parseInt(cleaned, 16);
  const r = clampChannel(((num >> 16) & 255) + amount);
  const g = clampChannel(((num >> 8) & 255) + amount);
  const b = clampChannel((num & 255) + amount);
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};

const getTodayLocalString = (timeZone = "") =>
  getDateKeyInTimeZone(new Date(), timeZone) || getDateKeyInTimeZone(new Date(), "");

const parseDateString = (dateString) => {
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const formatDateTime = (value, timeZone = "") =>
  value
    ? new Date(value).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
        ...(timeZone && !isOffsetTimeZone(timeZone) ? { timeZone } : {}),
      })
    : "N/A";

const formatTimeOnly = (value, timeZone = "") =>
  value
    ? new Date(value).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        ...(timeZone && !isOffsetTimeZone(timeZone) ? { timeZone } : {}),
      })
    : "N/A";

const formatDateOnly = (value, timeZone = "") =>
  value
    ? new Date(value).toLocaleDateString([], {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        ...(timeZone && !isOffsetTimeZone(timeZone) ? { timeZone } : {}),
      })
    : "N/A";

const getRawDatePrefix = (value = "") => {
  const match = `${value || ""}`.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
};

const formatRawTimeOnly = (value = "") => {
  const match = `${value || ""}`.match(/T(\d{2}):(\d{2})/);
  if (!match) return "";

  const hour24 = Number(match[1]);
  const minute = Number(match[2]);
  const suffix = hour24 >= 12 ? "pm" : "am";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
};

const isSameDay = (a, b, timeZone = "") =>
  getDateKeyInTimeZone(a, timeZone) === getDateKeyInTimeZone(b, timeZone);

const formatAppointmentWindow = (
  startTime,
  endTime,
  timeZone = "",
  startTimeRaw = "",
  endTimeRaw = ""
) => {
  const rawStartTime = formatRawTimeOnly(startTimeRaw);
  const rawEndTime = formatRawTimeOnly(endTimeRaw);
  if (rawStartTime && rawEndTime) {
    return `${rawStartTime} - ${rawEndTime}`;
  }
  if (rawStartTime) {
    return rawStartTime;
  }

  if (!startTime) return "Time not available";
  if (!endTime) return formatTimeOnly(startTime, timeZone);

  const start = new Date(startTime);
  const end = new Date(endTime);
  const sameDay = isSameDay(start, end, timeZone);

  if (sameDay) {
    return `${formatTimeOnly(startTime, timeZone)} - ${formatTimeOnly(
      endTime,
      timeZone
    )}`;
  }

  return `${formatDateTime(startTime, timeZone)} - ${formatDateTime(
    endTime,
    timeZone
  )}`;
};

const formatAppointmentDate = (startTime, timeZone = "", startTimeRaw = "") => {
  const rawDatePrefix = getRawDatePrefix(startTimeRaw);
  if (rawDatePrefix) {
    return formatDateOnly(rawDatePrefix, timeZone);
  }

  return formatDateOnly(startTime, timeZone);
};

const toTitle = (value) => {
  const text = `${value || "booked"}`.trim().toLowerCase();
  if (!text) return "Booked";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const getMonthMatrix = (monthStart, timeZone = "") => {
  const parts = getDatePartsInTimeZone(monthStart, timeZone);
  const year = parts?.year ?? monthStart.getFullYear();
  const month = (parts?.month ?? monthStart.getMonth() + 1) - 1;
  const firstDayOfMonth = new Date(year, month, 1);
  const startOffset = getDatePartsInTimeZone(firstDayOfMonth, timeZone)?.weekday ?? firstDayOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);

  const matrix = [];
  for (let week = 0; week < 6; week += 1) {
    const row = [];
    for (let day = 0; day < 7; day += 1) {
      const current = new Date(gridStart);
      current.setDate(gridStart.getDate() + week * 7 + day);
      row.push(current);
    }
    matrix.push(row);
  }
  return matrix;
};

const CalendarManagementPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useSelector((state) => state.user);
  const { branding, locationId: brandedLocationId } = useBranding();
  const brandColor = branding?.themeColor || "#2563eb";
  const brandColorDark = adjustHex(brandColor, -22);
  const [calendarDisplayTimeZone, setCalendarDisplayTimeZone] = useState("");
  const isGhlDebugEnabled = useMemo(() => {
    if (typeof window === "undefined") return true;
    const fromStorage = window.localStorage.getItem("ghl-debug");
    if (fromStorage === "1" || fromStorage === "true") return true;
    return Boolean(import.meta.env.DEV);
  }, []);
  const logGhlDebug = useCallback(
    (...args) => {
      if (!isGhlDebugEnabled) return;
      console.log("[CalendarManagement][GHL]", ...args);
    },
    [isGhlDebugEnabled]
  );

  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedCalendarServiceId, setSelectedCalendarServiceId] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => getTodayLocalString(""));
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = parseDateString(getTodayLocalString(""));
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const spaParamLocationId = useMemo(
    () => `${new URLSearchParams(location.search).get("spa") || ""}`.trim(),
    [location.search]
  );

  useEffect(() => {
    const today = getTodayLocalString(calendarDisplayTimeZone);
    const todayDate = parseDateString(today);
    setSelectedDate(today);
    setVisibleMonth(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));
  }, [calendarDisplayTimeZone]);

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
  const currentUserLocationId =
    spaParamLocationId || brandedLocationId || userProfileLocationId || "";
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
    : spaParamLocationId ||
      selectedLocationId ||
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
      spaParamLocationId || (isSpaUser ? brandedLocationId || userProfileLocationId : "");
    if (forcedLocationForContext) {
      if (selectedLocationId !== forcedLocationForContext) {
        setSelectedLocationId(forcedLocationForContext);
      }
      return;
    }

    if (selectedLocationId) return;
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
    data: calendarServicesData,
    isLoading: isLoadingCalendarServices,
    refetch: refetchCalendarServices,
  } = useQuery({
    queryKey: ["ghl-calendar-services", effectiveLocationId],
    queryFn: () => ghlService.getCalendarServices(effectiveLocationId),
    enabled: !!effectiveLocationId,
    retry: false,
  });

  const calendarServices =
    calendarServicesData?.data?.services || EMPTY_CALENDAR_SERVICES;
  useEffect(() => {
    logGhlDebug("Calendar services query result", {
      isLoadingCalendarServices,
      responseSuccess: calendarServicesData?.success,
      responseMessage: calendarServicesData?.message,
      source: calendarServicesData?.data?.source,
      unavailable: calendarServicesData?.data?.unavailable,
      error: calendarServicesData?.data?.error || null,
      total: calendarServicesData?.data?.total ?? 0,
      mappedCount: calendarServices.length,
      servicesPreview: calendarServices.slice(0, 10).map((service) => ({
        id: service?.id || service?._id || "",
        name: service?.name || service?.title || "",
        calendarId: service?.calendarId || "",
        durationMinutes: service?.durationMinutes || "",
      })),
    });
  }, [
    calendarServicesData,
    calendarServices,
    isLoadingCalendarServices,
    logGhlDebug,
  ]);
  const selectedCalendarService = useMemo(
    () =>
      calendarServices.find(
        (service) => (service.id || service._id) === selectedCalendarServiceId
      ) || null,
    [calendarServices, selectedCalendarServiceId]
  );
  const selectedBookingCalendarId = `${selectedCalendarService?.calendarId || ""}`.trim();
  const selectedCalendarTimeZone =
    selectedCalendarService?.timeZone ||
    selectedCalendarService?.timezone ||
    selectedCalendarService?.calendarTimeZone ||
    "";
  useEffect(() => {
    logGhlDebug("Selected service + booking calendar", {
      selectedCalendarServiceId,
      selectedServiceName:
        selectedCalendarService?.name || selectedCalendarService?.title || "",
      selectedBookingCalendarId,
      selectedCalendarTimeZone,
    });
  }, [
    selectedCalendarServiceId,
    selectedCalendarService,
    selectedBookingCalendarId,
    selectedCalendarTimeZone,
    logGhlDebug,
  ]);

  useEffect(() => {
    setCalendarDisplayTimeZone(selectedCalendarTimeZone || "");
  }, [selectedCalendarTimeZone]);

  useEffect(() => {
    if (!calendarServices.length) {
      if (selectedCalendarServiceId) setSelectedCalendarServiceId("");
      return;
    }
    const exists = calendarServices.some(
      (service) => (service.id || service._id) === selectedCalendarServiceId
    );
    if (!exists) {
      setSelectedCalendarServiceId(
        calendarServices[0]?.id || calendarServices[0]?._id || ""
      );
    }
  }, [calendarServices, selectedCalendarServiceId]);

  const {
    data: bookingsData,
    isLoading: isLoadingBookings,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: [
      "ghl-bookings-management-page",
      effectiveLocationId,
      selectedDate,
      selectedBookingCalendarId,
      selectedCalendarTimeZone,
    ],
    queryFn: () =>
      ghlService.getLocationBookingsByDate(
        effectiveLocationId,
        selectedDate,
        selectedBookingCalendarId,
        selectedCalendarTimeZone
      ),
    enabled: !!effectiveLocationId && !!selectedDate && !!selectedBookingCalendarId,
    retry: false,
  });

  const appointments = useMemo(() => bookingsData?.data?.events || [], [bookingsData]);
  const rawCount = bookingsData?.data?.rawCount ?? 0;
  const isUnavailable = Boolean(bookingsData?.data?.unavailable);
  useEffect(() => {
    logGhlDebug("Bookings query result", {
      selectedDate,
      selectedBookingCalendarId,
      selectedCalendarTimeZone,
      source: bookingsData?.data?.source || "",
      unavailable: bookingsData?.data?.unavailable || false,
      error: bookingsData?.data?.error || null,
      rawCount: bookingsData?.data?.rawCount ?? 0,
      eventsCount: appointments.length,
      eventsPreview: appointments.slice(0, 8).map((event) => ({
        id: event?.id || "",
        title: event?.title || "",
        status: event?.status || "",
        startTime: event?.startTime || "",
        calendarId: event?.calendarId || "",
      })),
    });
  }, [
    bookingsData,
    selectedDate,
    selectedBookingCalendarId,
    selectedCalendarTimeZone,
    appointments,
    logGhlDebug,
  ]);
  const effectiveTimeZone =
    bookingsData?.data?.effectiveTimeZone ||
    bookingsData?.data?.timeZone ||
    selectedCalendarTimeZone ||
    calendarDisplayTimeZone ||
    "";

  const selectedDateObject = useMemo(
    () => parseDateString(selectedDate),
    [selectedDate]
  );
  const monthMatrix = useMemo(
    () => getMonthMatrix(visibleMonth, effectiveTimeZone),
    [visibleMonth, effectiveTimeZone]
  );
  const visibleMonthParts = useMemo(
    () => getDatePartsInTimeZone(visibleMonth, effectiveTimeZone),
    [visibleMonth, effectiveTimeZone]
  );
  const monthTitle = `${MONTH_LABELS[(visibleMonthParts?.month ?? visibleMonth.getMonth() + 1) - 1]} ${visibleMonthParts?.year ?? visibleMonth.getFullYear()}`;

  const handlePickDate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };

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
                  onClick={() => navigate("/management")}
                  className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900 sm:mb-2 sm:text-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to Management
                </button>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                  Calendar Management
                </h1>
              <p className="mt-1 text-xs text-slate-600 sm:text-base">
                  View calendars and booked appointments in a focused, full-page layout.
                </p>
                {effectiveTimeZone && (
                  <p className="mt-1 text-[11px] font-medium text-slate-500 sm:text-xs">
                    Display timezone: {effectiveTimeZone}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  logGhlDebug("Manual refresh triggered", {
                    effectiveLocationId,
                    selectedDate,
                    selectedCalendarServiceId,
                    selectedBookingCalendarId,
                  });
                  refetchCalendarServices();
                  refetchBookings();
                }}
                className="h-9 rounded-lg border-slate-200 bg-white px-3 text-xs text-slate-700 hover:bg-slate-50 sm:h-10 sm:rounded-xl sm:px-4 sm:text-sm"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          <div
            className={`mt-4 grid gap-3 md:mt-6 md:gap-4 ${
              canSelectLocation ? "md:grid-cols-2" : "md:grid-cols-1"
            }`}
          >
            {canSelectLocation && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Location
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-transparent focus:ring-2 sm:h-11 sm:rounded-xl"
                  style={{ "--tw-ring-color": `${brandColor}33` }}
                >
                  {isLoadingLocations ? (
                    <option value="">Loading locations...</option>
                  ) : locations.length === 0 ? (
                    <option value={effectiveLocationId || ""}>
                      {effectiveLocationId || "No locations found"}
                    </option>
                  ) : (
                    locations.map((location) => (
                      <option
                        key={location._id || location.locationId}
                        value={location.locationId}
                      >
                        {location.name || "Unnamed Location"} ({location.locationId})
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Calendar Service
              </label>
              <select
                value={selectedCalendarServiceId}
                onChange={(e) => setSelectedCalendarServiceId(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-transparent focus:ring-2 sm:h-11 sm:rounded-xl"
                style={{ "--tw-ring-color": `${brandColor}33` }}
              >
                {isLoadingCalendarServices ? (
                  <option value="">Loading calendar services...</option>
                ) : calendarServices.length === 0 ? (
                  <option value="">No calendar services available</option>
                ) : (
                  calendarServices.map((service) => {
                    const id = service.id || service._id || "";
                    const baseName =
                      service.name || service.title || "Untitled Service";
                    const hasDurationInName = /\(\s*\d+\s*min\s*\)/i.test(
                      `${baseName}`
                    );
                    const durationLabel =
                      service.durationMinutes && !hasDurationInName
                        ? ` (${service.durationMinutes} min)`
                        : "";
                    return (
                      <option key={id} value={id}>
                        {baseName + durationLabel}
                      </option>
                    );
                  })
                )}
              </select>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4 sm:gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3 sm:rounded-2xl sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Services
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900 sm:mt-2 sm:text-3xl">
                {calendarServices.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 sm:rounded-2xl sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Booked
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900 sm:mt-2 sm:text-3xl">{appointments.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 sm:rounded-2xl sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Raw Returned
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900 sm:mt-2 sm:text-3xl">{rawCount}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:mt-6 lg:gap-5 lg:grid-cols-[1.15fr_1fr]">
            <section className="rounded-xl border border-slate-200 bg-white p-3 sm:rounded-2xl sm:p-5">
              <div className="mb-3 flex items-center justify-between sm:mb-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-slate-500 sm:h-5 sm:w-5" />
                  <h2 className="text-base font-bold text-slate-900 sm:text-lg">{monthTitle}</h2>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-md border-slate-200 sm:h-9 sm:w-9 sm:rounded-lg"
                    onClick={() =>
                      setVisibleMonth(
                        new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1)
                      )
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-md border-slate-200 sm:h-9 sm:w-9 sm:rounded-lg"
                    onClick={() =>
                      setVisibleMonth(
                        new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1)
                      )
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {WEEKDAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {isLoadingBookings
                  ? Array.from({ length: 42 }).map((_, idx) => (
                      <div
                        key={`calendar-skeleton-${idx}`}
                        className="h-9 rounded-md border border-slate-200 bg-slate-100 animate-pulse sm:h-11 sm:rounded-xl"
                      />
                    ))
                  : monthMatrix.flat().map((dateCell) => {
                  const cellParts = getDatePartsInTimeZone(dateCell, effectiveTimeZone);
                  const inCurrentMonth =
                    cellParts?.month === visibleMonthParts?.month &&
                    cellParts?.year === visibleMonthParts?.year;
                  const selected = isSameDay(
                    dateCell,
                    selectedDateObject,
                    effectiveTimeZone
                  );

                    return (
                      <button
                        key={dateCell.toISOString()}
                        type="button"
                        onClick={() => handlePickDate(dateCell)}
                        className={`h-9 rounded-md border text-xs font-semibold transition sm:h-11 sm:rounded-xl sm:text-sm ${
                          selected
                            ? "text-white"
                            : inCurrentMonth
                            ? "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                            : "border-slate-100 bg-slate-50 text-slate-400 hover:bg-slate-100"
                        }`}
                        style={
                          selected
                            ? {
                                background: `linear-gradient(135deg, ${brandColor}, ${brandColorDark})`,
                                borderColor: brandColorDark,
                              }
                            : undefined
                        }
                      >
                        {dateCell.getDate()}
                      </button>
                    );
                  })}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-3 sm:rounded-2xl sm:p-5">
              <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                Booked Appointments for {selectedDate}
              </h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                {selectedCalendarServiceId
                  ? `Filtered by selected service calendar`
                  : "No service selected"}
              </p>

              <div className="mt-3 sm:mt-4">
                {isLoadingBookings ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map((idx) => (
                      <div
                        key={`appt-skeleton-${idx}`}
                        className="rounded-lg border border-slate-200 bg-white p-3 sm:rounded-xl sm:p-4"
                      >
                        <div className="h-4 w-40 rounded bg-slate-100 animate-pulse sm:h-5" />
                        <div className="mt-2 h-3 w-52 rounded bg-slate-100 animate-pulse sm:h-4" />
                        <div className="mt-2 h-3 w-28 rounded bg-slate-100 animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : appointments.length === 0 ? (
                  isUnavailable ? (
                    <p className="text-sm text-slate-500">
                      Appointments are currently unavailable for this selection.
                    </p>
                  ) : null
                ) : (
                  <div className="space-y-3">
                    {appointments.map((appointment, index) => (
                      <article
                        key={appointment.id || `${appointment.startTime || "start"}-${index}`}
                        className="rounded-lg border border-slate-200 bg-white p-3 sm:rounded-xl sm:p-4"
                      >
                        <p className="text-sm font-semibold text-slate-900 sm:text-base">
                          {appointment.title || "Booked Appointment"}
                        </p>
                        <p className="mt-1 text-xs text-slate-700 sm:text-sm">
                          {formatAppointmentWindow(
                            appointment.startTime,
                            appointment.endTime,
                            effectiveTimeZone,
                            appointment.startTimeRaw,
                            appointment.endTimeRaw
                          )}
                        </p>
                        {appointment.startTime && (
                          <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
                            {formatAppointmentDate(
                              appointment.startTime,
                              effectiveTimeZone,
                              appointment.startTimeRaw
                            )}
                          </p>
                        )}
                        <div className="mt-2">
                          <span className="inline-flex items-center rounded-full border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {toTitle(appointment.status)}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CalendarManagementPage;
