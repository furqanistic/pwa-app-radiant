// File: client/src/pages/Bookings/ServiceDetailPage.jsx
// ✅ FIXED: Booked times + Cart duplicate prevention

import BNPLBanner from "@/components/Common/BNPLBanner";
import { useBranding } from '@/context/BrandingContext';
import { useAvailability } from "@/hooks/useAvailability";
import { useService } from "@/hooks/useServices";
import Layout from "@/pages/Layout/Layout";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  Crown,
  DollarSign,
  Info,
  Lock,
  MapPin,
  Percent,
  Plus,
  Star,
  User,
  X,
  Zap,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from 'sonner';
import { addToCart } from "../../redux/cartSlice";
import ghlService from "../../services/ghlService";
import stripeService from "../../services/stripeService";

const ServiceDetailSkeleton = () => (
  <Layout>
    <div className="pb-32 md:pb-12 bg-gray-50/50 min-h-screen animate-pulse">
      <div className="relative h-[35vh] min-h-[300px] w-full overflow-hidden bg-gray-200">
        <div className="absolute inset-0 bg-gradient-to-t from-gray-300 via-gray-200 to-gray-100" />
        <div className="absolute top-6 left-4 md:left-8 h-10 w-10 rounded-full bg-white/70" />
        <div className="absolute inset-x-4 bottom-8 mx-auto max-w-6xl md:px-4">
          <div className="mb-3 h-6 w-28 rounded-full bg-white/70" />
          <div className="mb-3 h-10 w-3/4 max-w-xl rounded-xl bg-white/70" />
          <div className="h-5 w-64 rounded-lg bg-white/70" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-6 relative z-10">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200/70">
              <div className="h-6 w-40 rounded bg-gray-100 mb-4" />
              <div className="space-y-2 mb-6">
                <div className="h-4 w-full rounded bg-gray-100" />
                <div className="h-4 w-11/12 rounded bg-gray-100" />
                <div className="h-4 w-2/3 rounded bg-gray-100" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[...Array(4)].map((_, idx) => (
                  <div key={idx} className="rounded-xl bg-gray-100 h-24" />
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200/70">
              <div className="h-7 w-44 rounded bg-gray-100 mb-6" />
              <div className="space-y-4">
                {[...Array(3)].map((_, idx) => (
                  <div key={idx} className="rounded-2xl border border-gray-200/70 p-5">
                    <div className="h-5 w-48 rounded bg-gray-100 mb-3" />
                    <div className="h-4 w-full rounded bg-gray-100 mb-2" />
                    <div className="h-4 w-2/3 rounded bg-gray-100" />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200/70">
              <div className="h-7 w-48 rounded bg-gray-100 mb-6" />
              <div className="h-12 w-full rounded-xl bg-gray-100 mb-6" />
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {[...Array(10)].map((_, idx) => (
                  <div key={idx} className="h-10 rounded-lg bg-gray-100" />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/70">
              <div className="h-6 w-32 rounded bg-gray-100 mb-4" />
              <div className="space-y-3">
                <div className="h-4 w-full rounded bg-gray-100" />
                <div className="h-4 w-5/6 rounded bg-gray-100" />
                <div className="h-4 w-2/3 rounded bg-gray-100" />
              </div>
              <div className="h-12 w-full rounded-xl bg-gray-100 mt-6" />
              <div className="h-12 w-full rounded-xl bg-gray-100 mt-3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
);

const extractGhlEmbedSrc = (value = "") => {
  const raw = decodeHtmlEntities(`${value || ""}`).trim();
  if (!raw) return "";

  const iframeMatch = raw.match(/src=(['"])(.*?)\1/i);
  if (iframeMatch?.[2]) return iframeMatch[2];
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^\/\//.test(raw)) return `https:${raw}`;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(raw)) return `https://${raw}`;
  return "";
};

function decodeHtmlEntities(value) {
  let output = `${value || ""}`;
  const replacements = [
    [/&amp;/gi, "&"],
    [/&lt;/gi, "<"],
    [/&gt;/gi, ">"],
    [/&quot;/gi, '"'],
    [/&#34;/gi, '"'],
    [/&apos;/gi, "'"],
    [/&#39;/gi, "'"],
  ];

  for (let i = 0; i < 3; i += 1) {
    const previous = output;
    replacements.forEach(([pattern, replacement]) => {
      output = output.replace(pattern, replacement);
    });
    if (output === previous) break;
  }

  return output;
}

const normalizeUrlLikeValue = (value) => {
  const raw = decodeHtmlEntities(`${value || ""}`).trim();
  if (!raw) return "";
  if (/<iframe/i.test(raw) || /<script/i.test(raw) || /form_embed\.js/i.test(raw)) {
    return raw;
  }
  return extractGhlEmbedSrc(raw);
};

const normalizeHttpUrl = (value) => {
  const normalized = normalizeUrlLikeValue(value);
  if (!normalized || /<iframe/i.test(normalized) || /<script/i.test(normalized)) {
    return "";
  }
  return normalized;
};

const extractGhlBookingFromPayload = (payload = {}) => {
  const candidatesForScheduling = [
    payload?.schedulingLink,
    payload?.schedulingURL,
    payload?.schedulingUrl,
    payload?.bookingLink,
    payload?.bookingUrl,
    payload?.bookingURL,
    payload?.shareBookingLink,
    payload?.shareLink,
    payload?.url,
    payload?.shareBooking?.schedulingLink,
    payload?.shareBooking?.schedulingURL,
    payload?.shareBooking?.schedulingUrl,
    payload?.shareBooking?.bookingLink,
    payload?.shareBooking?.shareLink,
    payload?.shareBooking?.url,
    payload?.booking?.schedulingLink,
    payload?.booking?.schedulingURL,
    payload?.booking?.schedulingUrl,
    payload?.booking?.bookingLink,
    payload?.booking?.shareLink,
    payload?.booking?.url,
    payload?.links?.scheduling,
    payload?.links?.schedulingLink,
    payload?.links?.booking,
    payload?.links?.bookingLink,
    payload?.links?.public,
    payload?.links?.publicLink,
  ];

  const candidatesForPermanent = [
    payload?.permanentLink,
    payload?.permaLink,
    payload?.permalink,
    payload?.publicLink,
    payload?.publicUrl,
    payload?.shareBooking?.permanentLink,
    payload?.shareBooking?.permaLink,
    payload?.shareBooking?.permalink,
    payload?.shareBooking?.publicLink,
    payload?.shareBooking?.publicUrl,
    payload?.booking?.permanentLink,
    payload?.booking?.permaLink,
    payload?.booking?.permalink,
    payload?.booking?.publicLink,
    payload?.booking?.publicUrl,
    payload?.links?.permanent,
    payload?.links?.permanentLink,
    payload?.links?.public,
    payload?.links?.publicLink,
  ];

  const candidatesForEmbed = [
    payload?.embedCode,
    payload?.embed,
    payload?.embedHtml,
    payload?.mCode,
    payload?.mcode,
    payload?.shareBookingCode,
    payload?.shareBookingMCode,
    payload?.widgetCode,
    payload?.widgetMCode,
    payload?.iframeCode,
    payload?.shareBooking?.embedCode,
    payload?.shareBooking?.mCode,
    payload?.shareBooking?.mcode,
    payload?.shareBooking?.code,
    payload?.booking?.embedCode,
    payload?.booking?.mCode,
    payload?.booking?.mcode,
    payload?.booking?.code,
    payload?.widget?.embedCode,
    payload?.widget?.mCode,
    payload?.widget?.mcode,
    payload?.widget?.code,
    payload?.links?.embedCode,
    payload?.links?.mCode,
    payload?.links?.mcode,
  ];

  const embedCode = candidatesForEmbed.map(normalizeUrlLikeValue).find(Boolean) || "";
  const schedulingLink =
    candidatesForScheduling.map(normalizeHttpUrl).find(Boolean) ||
    extractGhlEmbedSrc(embedCode) ||
    "";
  const permanentLink =
    candidatesForPermanent.map(normalizeHttpUrl).find(Boolean) ||
    schedulingLink ||
    "";

  return {
    schedulingLink,
    permanentLink,
    embedCode,
  };
};

const buildSpaSchedulerBookingFallback = ({ subdomain = "", serviceId = "" } = {}) => {
  const normalizedSubdomain = `${subdomain || ""}`.trim().toLowerCase();
  const normalizedServiceId = `${serviceId || ""}`.trim();
  if (!normalizedSubdomain || !normalizedServiceId || !normalizedSubdomain.includes("-")) {
    return { schedulingLink: "", permanentLink: "", embedCode: "" };
  }

  const baseUrl = `https://app.spascheduler.online/booking/${normalizedSubdomain}/sv/${normalizedServiceId}`;
  const iframeSrc = `${baseUrl}?heightMode=fixed&showHeader=true`;
  return {
    schedulingLink: baseUrl,
    permanentLink: baseUrl,
    embedCode: `<iframe src="${iframeSrc}" style="width: 100%;border:none;overflow: hidden;" scrolling="no" id="${normalizedServiceId}_auto"></iframe><br><script src="https://app.spascheduler.online/js/form_embed.js" type="text/javascript"></script>`,
  };
};

const getGhlBookingConfig = (service = null, liveGhlService = null, fallback = {}) => {
  const bookingFromService = extractGhlBookingFromPayload(service?.ghlBooking || {});
  const bookingFromServiceRoot = extractGhlBookingFromPayload(service || {});
  const bookingFromGhlApi = extractGhlBookingFromPayload(liveGhlService || {});
  const bookingFallback = buildSpaSchedulerBookingFallback(fallback);
  const schedulingLink =
    bookingFromGhlApi.schedulingLink ||
    bookingFromService.schedulingLink ||
    bookingFromServiceRoot.schedulingLink ||
    bookingFallback.schedulingLink ||
    "";
  const permanentLink =
    bookingFromGhlApi.permanentLink ||
    bookingFromService.permanentLink ||
    bookingFromServiceRoot.permanentLink ||
    bookingFallback.permanentLink ||
    "";
  const embedCode =
    bookingFromGhlApi.embedCode ||
    bookingFromService.embedCode ||
    bookingFromServiceRoot.embedCode ||
    bookingFallback.embedCode ||
    "";
  const embedSrc = extractGhlEmbedSrc(embedCode);
  const bookingUrl = embedSrc || schedulingLink || permanentLink;

  return {
    schedulingLink,
    permanentLink,
    embedCode,
    embedSrc,
    bookingUrl,
    isEnabled: Boolean(bookingUrl),
  };
};

const isFrameLikelyBlocked = (url = "") => {
  try {
    const normalized = extractGhlEmbedSrc(url);
    if (!normalized) return false;
    const hostname = new URL(normalized).hostname.toLowerCase();
    // This provider currently blocks cross-site iframe embedding in Firefox.
    return hostname === "app.spascheduler.online";
  } catch {
    return false;
  }
};

const ServiceDetailPage = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const spaParamLocationId = new URLSearchParams(location.search).get("spa");
  const isBirthdayGift = location.state?.isBirthdayGift;
  const birthdayNotificationId = location.state?.notificationId;
  const giftType = location.state?.giftType || 'free';
  const giftValue = location.state?.giftValue || 0;
  const autoApplyRewardId = location.state?.autoApplyRewardId
    ? String(location.state.autoApplyRewardId)
    : null;
  const autoApplyRewardName = location.state?.autoApplyRewardName || "Reward";
  const dispatch = useDispatch();
  const { currentUser } = useSelector((state) => state.user);
  const { branding, locationId: brandedLocationId, subdomain: brandingSubdomain } = useBranding();
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
  const appliedReward = autoApplyRewardId
    ? { id: autoApplyRewardId, name: autoApplyRewardName }
    : null;
  // ✅ GET CART FROM REDUX
  const { items: cartItems } = useSelector((state) => state.cart);

  const [selectedTreatments, setSelectedTreatments] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    data: service,
    isLoading,
    error,
    isError,
  } = useService(serviceId, {
    enabled: !!serviceId,
    includeRewards: "false",
  });

  const activeLocationId =
    spaParamLocationId ||
    currentUser?.selectedLocation?.locationId ||
    currentUser?.spaLocation?.locationId ||
    brandedLocationId ||
    service?.locationId ||
    "";

  const linkedGhlServiceId = `${service?.ghlService?.serviceId || service?.ghlCalendar?.calendarId || ""}`.trim();
  const bookingSubdomain = `${branding?.subdomain || brandingSubdomain || ""}`.trim().toLowerCase();
  const { data: liveGhlServiceData } = useQuery({
    queryKey: ["ghl-calendar-service", "service-detail-page", activeLocationId, linkedGhlServiceId],
    queryFn: () => ghlService.getCalendarServiceById(activeLocationId, linkedGhlServiceId),
    enabled: Boolean(activeLocationId && linkedGhlServiceId),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const liveGhlService = liveGhlServiceData?.data?.service || null;

  const ghlBookingConfig = getGhlBookingConfig(service, liveGhlService, {
    subdomain: bookingSubdomain,
    serviceId: linkedGhlServiceId,
  });
  const hasGhlBooking = ghlBookingConfig.isEnabled;
  const hasEmbeddedGhlBooking = Boolean(ghlBookingConfig.embedSrc);
  const shouldRenderEmbeddedBooking =
    hasEmbeddedGhlBooking && !isFrameLikelyBlocked(ghlBookingConfig.embedSrc);

  // ✅ DYNAMIC AVAILABILITY
  const { 
    data: availabilityData, 
    isLoading: loadingAvailability 
  } = useAvailability(
    activeLocationId,
    selectedDate,
    serviceId
  );

  const availableSlots = availabilityData?.slots || [];
  const availabilityMeta = availabilityData?.metadata || {};
  const externalBookingsCount = availabilityMeta.externalBookingsCount || 0;
  const externalSourceUnavailable = Boolean(
    availabilityMeta.externalSourceUnavailable
  );
  const ghlCalendarName = availabilityMeta?.ghlCalendar?.name || "";

  const handleOpenGhlBooking = () => {
    if (shouldRenderEmbeddedBooking) {
      const section = document.getElementById("ghl-booking-section");
      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    const directUrl =
      ghlBookingConfig.schedulingLink ||
      ghlBookingConfig.permanentLink ||
      ghlBookingConfig.bookingUrl;

    if (directUrl) {
      window.open(directUrl, "_blank", "noopener,noreferrer");
    }
  };

  // ✅ GET CART TIMES FOR THIS SERVICE ON THIS DATE
  const getCartTimesForService = () => {
    return cartItems
      .filter(
        (item) => item.serviceId === serviceId && item.date === selectedDate
      )
      .map((item) => item.time);
  };

  const cartTimesForService = getCartTimesForService();

  // ✅ FILTER OUT CART TIMES FROM BACKEND SLOTS
  const getFinalAvailableTimes = () => {
    return availableSlots.filter(
      (time) => !cartTimesForService.includes(time)
    );
  };

  const availableTimes = getFinalAvailableTimes();

  useEffect(() => {
    if (!selectedTime) return;
    if (loadingAvailability) return;

    if (!availableTimes.includes(selectedTime)) {
      setSelectedTime("");
      toastError("That slot was just taken. Please pick another time.");
    }
  }, [selectedTime, availableTimes, loadingAvailability]);

  // Auto-select ALL treatments by default
  useEffect(() => {
    if (service?.subTreatments?.length > 0 && selectedTreatments.length === 0) {
       setSelectedTreatments(service.subTreatments);
    }
  }, [service]);

  // Auto-select single treatment if strict match


  if (isLoading) {
    return <ServiceDetailSkeleton />;
  }

  if (isError || !service) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh] px-4">
          <div className="text-center max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-200/70">
            <div className="text-red-500 text-3xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Service not found
            </h3>
            <p className="text-gray-600 mb-6">
              {error?.message ||
                "The service you are looking for does not exist or has been removed."}
            </p>
            <button
              onClick={() => navigate("/bookings")}
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
            >
              Back to Services
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const isDiscountActive =
    service.discount?.active &&
    new Date() >= new Date(service.discount.startDate) &&
    new Date() <= new Date(service.discount.endDate);

  const formatPrice = (value) => {
    if (!Number.isFinite(Number(value))) return '$0'
    const amount = Number(value)
    return `$${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`
  }

  const getBestMemberDealPrice = (svc) => {
    if (!Array.isArray(svc?.membershipPricing)) return null
    const activePrices = svc.membershipPricing
      .filter((entry) => entry?.isActive !== false)
      .map((entry) => Number(entry.price))
      .filter((price) => Number.isFinite(price) && price >= 0)

    if (activePrices.length === 0) return null
    return Math.min(...activePrices)
  }

  const getMemberPriceForUserPlan = (svc, user) => {
    if (!Array.isArray(svc?.membershipPricing) || !user) return null

    const userPlanId =
      user?.membership?.planId ||
      user?.membership?.plan?._id ||
      user?.activeMembership?.planId ||
      user?.activeMembership?.plan?._id ||
      null
    const userPlanName =
      user?.membership?.planName || user?.activeMembership?.planName || ''

    const normalize = (value) => String(value || '').trim().toLowerCase()
    const matchingEntry = svc.membershipPricing.find((entry) => {
      if (entry?.isActive === false) return false
      const entryPlanId = entry?.membershipPlanId || null
      const entryPlanName = entry?.membershipPlanName || ''

      const planIdMatch =
        userPlanId && entryPlanId && String(userPlanId) === String(entryPlanId)
      const planNameMatch =
        normalize(userPlanName) &&
        normalize(entryPlanName) &&
        normalize(userPlanName) === normalize(entryPlanName)

      return planIdMatch || planNameMatch
    })

    const numericPrice = Number(matchingEntry?.price)
    if (!Number.isFinite(numericPrice) || numericPrice < 0) return null
    return numericPrice
  }

  const isMembershipEligible = (user) => {
    if (!user) return false
    if (['super-admin', 'admin', 'spa', 'enterprise'].includes(user.role)) {
      return true
    }

    const candidateStatuses = [
      user?.membership?.status,
      user?.membershipStatus,
      user?.activeMembership?.status,
      user?.subscription?.status,
    ]
      .filter(Boolean)
      .map((status) => String(status).toLowerCase())

    if (user?.membership?.isActive || user?.activeMembership?.isActive) {
      return true
    }

    return candidateStatuses.some((status) =>
      ['active', 'trialing', 'paid', 'current'].includes(status)
    )
  }

  const calculateDiscountedPrice = (price) => {
    if (isBirthdayGift) {
      if (giftType === 'free') return 0;
      if (giftType === 'percentage') return price - (price * giftValue) / 100;
      if (giftType === 'fixed') return Math.max(0, price - giftValue);
      return 0;
    }
    if (isDiscountActive) {
      return price - (price * service.discount.percentage) / 100;
    }
    return price;
  };

  const handleTreatmentSelect = (treatment) => {
    setSelectedTreatments((prev) => {
      const exists = prev.find((t) => (t._id || t.id) === (treatment._id || treatment.id));
      if (exists) {
        // Prevent deselecting if it's the last one
        if (prev.length <= 1) {
            toastError("At least one treatment must be selected");
            return prev;
        }
        return prev.filter((t) => (t._id || t.id) !== (treatment._id || treatment.id));
      } else {
        return [...prev, treatment];
      }
    });
  };

  const handleAddOnToggle = (addOn) => {
    setSelectedAddOns((prev) => {
      const isSelected = prev.some(
        (item) => item.serviceId === addOn.serviceId
      );
      if (isSelected) {
        return prev.filter((item) => item.serviceId !== addOn.serviceId);
      } else {
        return [...prev, addOn];
      }
    });
  };

  const calculateTotalPrice = () => {
    const treatmentsPrice = selectedTreatments.reduce((sum, t) => sum + (t.price || 0), 0);
    const planBasedMemberPrice = getMemberPriceForUserPlan(service, currentUser);
    const shouldUseMemberPrice =
      isMembershipEligible(currentUser) &&
      Number.isFinite(planBasedMemberPrice) &&
      planBasedMemberPrice >= 0;
    const basePrice =
      treatmentsPrice > 0
        ? treatmentsPrice
        : shouldUseMemberPrice
        ? planBasedMemberPrice
        : service.basePrice;
    const discountedBasePrice = calculateDiscountedPrice(basePrice);

    const addOnsTotal = selectedAddOns.reduce((total, addOn) => {
      return total + (addOn.finalPrice || addOn.customPrice || addOn.basePrice);
    }, 0);

    return discountedBasePrice + addOnsTotal;
  };

  const calculateTotalDuration = () => {
    const treatmentsDuration = selectedTreatments.reduce((sum, t) => sum + (t.duration || 0), 0);
    const baseDuration = treatmentsDuration > 0 ? treatmentsDuration : service.duration;

    const addOnsDuration = selectedAddOns.reduce((total, addOn) => {
      return (
        total + (addOn.finalDuration || addOn.customDuration || addOn.duration)
      );
    }, 0);

    return baseDuration + addOnsDuration;
  };

  const handleAddToCart = () => {
    // Validation
    if ((service.subTreatments?.length > 0) && selectedTreatments.length === 0) {
      toastError("Please select at least one treatment option");
      const element = document.getElementById('treatments-section');
      if (element) element.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (!selectedDate || !selectedTime) {
      toastError("Please select date and time");
      const element = document.getElementById('datetime-section');
      if (element) element.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // ✅ CHECK IF ALREADY IN CART
    const isAlreadyInCart = cartItems.some(
      (item) =>
        item.serviceId === serviceId &&
        item.date === selectedDate &&
        item.time === selectedTime
    );

    if (isAlreadyInCart) {
      toastError("❌ This time slot is already in your cart!");
      return;
    }

    const totalPrice = calculateTotalPrice();
    const totalDuration = calculateTotalDuration();

    const cartItem = {
      serviceId: service._id,
      serviceName: service.name,
      image: service.image || service.images?.[0],
      date: selectedDate,
      time: selectedTime,
      duration: totalDuration,
      totalPrice: totalPrice,
      treatments: selectedTreatments.map(t => ({
        id: t._id || t.id,
        name: t.name,
        price: t.price,
        duration: t.duration
      })),
      treatment: selectedTreatments.length > 0 // Legacy support
        ? {
            id: selectedTreatments[0]._id || selectedTreatments[0].id,
            name: selectedTreatments.map(t => t.name).join(' + '),
            price: selectedTreatments.reduce((sum, t) => sum + t.price, 0),
            duration: selectedTreatments.reduce((sum, t) => sum + t.duration, 0),
          }
        : null,
      addOns: selectedAddOns.map((addon) => ({
        serviceId: addon.serviceId,
        name: addon.name,
        price: addon.finalPrice || addon.customPrice || addon.basePrice,
        duration: addon.finalDuration || addon.customDuration || addon.duration,
      })),
      rewardUsed: appliedReward?.id || null,
      rewardName: appliedReward?.name || null,
      pointsUsed: 0,
      isBirthdayGift: isBirthdayGift,
      notificationId: birthdayNotificationId,
    };

    dispatch(addToCart(cartItem));
    toastSuccess("Added to cart!", {
      icon: "🛒",
    });

    // Optional: Reset selection or navigate
    setSelectedDate("");
    setSelectedTime("");
    // Don't reset treatment if it's the main choice user made
  };

  const handleBooking = async () => {
    if ((service.subTreatments?.length > 0) && selectedTreatments.length === 0) {
      toastError("Please select at least one treatment option");

       const element = document.getElementById('treatments-section');
       if (element) element.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (!selectedDate || !selectedTime) {
      toastError("Please select date and time");
       const element = document.getElementById('datetime-section');
       if (element) element.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (!activeLocationId) {
      toastError("Please select a spa location first");
      return;
    }

    setIsProcessing(true);

    try {
      const totalDuration = calculateTotalDuration();

      const bookingData = {
        serviceId: service._id,
        serviceName: service.name,
        date: selectedDate,
        time: selectedTime,
        duration: totalDuration,
        locationId: activeLocationId,
        notes: "",
        rewardUsed: appliedReward?.id || null,
        userRewardId: appliedReward?.id || null,
        pointsUsed: 0,
        treatments: selectedTreatments.map(t => ({
            id: t._id || t.id,
            name: t.name,
            price: t.price,
            duration: t.duration
        })),
        treatment: selectedTreatments.length > 0 // Legacy/Display support
          ? {
              id: selectedTreatments[0]._id || selectedTreatments[0].id,
              name: selectedTreatments.map(t => t.name).join(' + '),
              price: selectedTreatments.reduce((sum, t) => sum + t.price, 0),
              duration: selectedTreatments.reduce((sum, t) => sum + t.duration, 0),
            }
          : null,
        addOns: selectedAddOns.map((addon) => ({
          serviceId: addon.serviceId,
          name: addon.name,
          price: addon.finalPrice || addon.customPrice || addon.basePrice,
          duration:
            addon.finalDuration || addon.customDuration || addon.duration,
        })),
        totalPrice: calculateTotalPrice(),
        isBirthdayGift: isBirthdayGift,
        notificationId: birthdayNotificationId
      };

      const response = await stripeService.createCheckoutSession(bookingData);

      if (response.success && response.sessionUrl) {
        window.location.href = response.sessionUrl;
      } else {
        toastError("Failed to create payment session");
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toastError(
        error.response?.data?.message ||
          "Failed to process booking. Please try again."
      );
      setIsProcessing(false);
    }
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  const totalPrice = calculateTotalPrice();
  const totalDuration = calculateTotalDuration();
  const regularServicePrice = Number(service?.basePrice) || 0
  const currentPlanMemberPrice = getMemberPriceForUserPlan(service, currentUser)
  const lowestMemberDealPrice = getBestMemberDealPrice(service)
  const memberDealPrice = Number.isFinite(currentPlanMemberPrice)
    ? currentPlanMemberPrice
    : lowestMemberDealPrice
  const hasMemberDeal =
    Number.isFinite(memberDealPrice) &&
    memberDealPrice >= 0 &&
    memberDealPrice < regularServicePrice
  const isEligibleForMemberDeal = isMembershipEligible(currentUser)
  const memberSavePercent =
    hasMemberDeal && regularServicePrice > 0
      ? Math.round(((regularServicePrice - memberDealPrice) / regularServicePrice) * 100)
      : 0
  const currentMembershipPlanName =
    currentUser?.membership?.planName || currentUser?.activeMembership?.planName || ''
  const currentMembershipPlanId =
    currentUser?.membership?.planId ||
    currentUser?.membership?.plan?._id ||
    currentUser?.activeMembership?.planId ||
    currentUser?.activeMembership?.plan?._id ||
    null
  const membershipPlans = Array.isArray(branding?.membership?.plans)
    ? branding.membership.plans
    : []
  const highestMembershipPlan = membershipPlans
    .map((plan) => ({
      ...plan,
      numericPrice: Number(plan?.price ?? plan?.monthlyPrice ?? 0),
    }))
    .filter((plan) => Number.isFinite(plan.numericPrice))
    .sort((a, b) => b.numericPrice - a.numericPrice)[0]
  const normalizePlanValue = (value) => String(value || '').trim().toLowerCase()
  const isOnHighestMembershipPlan = Boolean(
    highestMembershipPlan &&
      ((currentMembershipPlanId &&
        String(currentMembershipPlanId) ===
          String(highestMembershipPlan?._id || highestMembershipPlan?.id)) ||
        (normalizePlanValue(currentMembershipPlanName) &&
          normalizePlanValue(currentMembershipPlanName) ===
            normalizePlanValue(highestMembershipPlan?.name)))
  )
  const shouldShowMembershipUpsell =
    hasMemberDeal && !isEligibleForMemberDeal && !isOnHighestMembershipPlan
  const membershipJoinPrice = Number(branding?.membership?.plans?.[0]?.price ?? branding?.membership?.price)
  const membershipPath = activeLocationId
    ? `/membership?spa=${encodeURIComponent(activeLocationId)}`
    : '/membership'

  return (
    <Layout>
      <div className="pb-32 md:pb-12 bg-gray-50/50 min-h-screen">
        {/* HERO SECTION */}
        <div className="relative h-[35vh] min-h-[300px] w-full bg-gray-900 overflow-hidden">
             
             {/* Background Image */}
             <div className="absolute inset-0">
               <img
                 src={service.image || "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&q=80"}
                 alt={service.name}
                 className="w-full h-full object-cover opacity-60"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
             </div>

             {/* Header Content */}
             <div className="absolute inset-0 flex flex-col justify-end px-4 py-6 md:px-8 max-w-6xl mx-auto">
                <button
                onClick={handleBackClick}
                className="absolute top-6 left-4 md:left-8 bg-white/20 backdrop-blur-md text-white p-2.5 rounded-full hover:bg-white/30 transition-all z-20"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

               <div className="space-y-3 mb-2 animate-in slide-in-from-bottom-5 fade-in duration-500 relative z-10">
                  <div className="flex gap-2 items-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white text-xs font-bold shadow-lg shadow-[color:var(--brand-primary)/0.2]">
                      {service.categoryId?.name || service.categoryName || "Premium Service"}
                    </span>
                    {service.popular && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-400/90 text-yellow-900 text-xs font-bold backdrop-blur-sm">
                        <Star className="w-3 h-3 fill-current" /> Popular
                      </span>
                    )}
                  </div>
                  
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight text-shadow-lg leading-tight">
                    {service.name}
                  </h1>

                  <div className="flex flex-wrap items-center gap-4 text-white/90 text-sm md:text-base font-medium">
                    {isBirthdayGift && (
                        <div className="bg-white text-[color:var(--brand-primary)] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm animate-pulse">
                            🎉 Birthday Gift Applied
                        </div>
                    )}
                    {appliedReward && (
                        <div className="bg-white text-[color:var(--brand-primary)] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
                            Reward Applied: {appliedReward.name}
                        </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[color:var(--brand-primary)]" />
                      <span>{service.duration} mins</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-white/40" />
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span>{service.rating?.toFixed(1) || "5.0"} ({service.totalReviews || 12} reviews)</span>
                    </div>
                  </div>
               </div>
             </div>
        </div>

        {/* MAIN CONTENT GRID */}
        <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-6 relative z-10">
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Description Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200/70">
                 <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Info className="w-5 h-5 text-gray-400" /> About this service
                 </h2>
                 <p className="text-gray-600 leading-relaxed">
                   {service.description}
                 </p>
                 
                 {/* Quick Stats Grid */}
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200/70">
                    <div className="text-center p-3 rounded-xl bg-blue-50/50">
                       <User className="w-5 h-5 mx-auto text-blue-600 mb-1.5" />
                       <div className="text-xs text-gray-500">Practitioner</div>
                       <div className="font-semibold text-gray-900 text-sm">{service.practitioner || "Staff"}</div>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-green-50/50">
                       <DollarSign className="w-5 h-5 mx-auto text-green-600 mb-1.5" />
                       <div className="text-xs text-gray-500">Starts at</div>
                       <div className="font-semibold text-gray-900 text-sm">${service.basePrice}</div>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-orange-50/50">
                       <Calendar className="w-5 h-5 mx-auto text-orange-600 mb-1.5" />
                       <div className="text-xs text-gray-500">Availability</div>
                       <div className="font-semibold text-gray-900 text-sm">Mon-Sun</div>
                    </div>
                     <div className="text-center p-3 rounded-xl bg-[color:var(--brand-primary)/0.08]">
                       <Zap className="w-5 h-5 mx-auto text-[color:var(--brand-primary)] mb-1.5" />
                       <div className="text-xs text-gray-500">Instant</div>
                       <div className="font-semibold text-gray-900 text-sm">Booking</div>
                    </div>
                 </div>
              </div>

              {hasGhlBooking ? (
                <div
                  id="ghl-booking-section"
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200/70"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Book This Service</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        This service uses its linked GoHighLevel Share Booking page for live booking.
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-[color:var(--brand-primary)/0.12] px-3 py-1 text-xs font-bold text-[color:var(--brand-primary)]">
                      GHL Booking
                    </span>
                  </div>

                  {shouldRenderEmbeddedBooking ? (
                    <>
                      <div className="overflow-hidden rounded-2xl border border-gray-200/70 bg-white">
                        <iframe
                          src={ghlBookingConfig.embedSrc}
                          title={`${service.name} booking widget`}
                          className="w-full min-h-[980px] bg-white"
                          loading="lazy"
                          allow="payment *; fullscreen *"
                        />
                      </div>
                      {(ghlBookingConfig.schedulingLink || ghlBookingConfig.permanentLink) && (
                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              window.open(
                                ghlBookingConfig.schedulingLink ||
                                  ghlBookingConfig.permanentLink,
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                            className="px-4 py-2 rounded-xl border border-gray-200/70 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            Open in new tab
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-200/70 bg-gray-50 p-6 text-center">
                      <p className="text-sm text-gray-600 mb-4">
                        {hasEmbeddedGhlBooking
                          ? "Your browser is blocking this provider inside an iframe. Open the booking page in a new tab to continue."
                          : "This service is configured to book through an external GoHighLevel page."}
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenGhlBooking}
                        className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[color:var(--brand-primary)/0.25]"
                      >
                        Open booking page
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Treatment Options */}
                  <div id="treatments-section" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200/70">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Select Treatment</h2>
                    
                    {service.subTreatments && service.subTreatments.length > 0 ? (
                      <div className="grid gap-4">
                        {service.subTreatments.map((treatment) => {
                          const isSelected = selectedTreatments.some(t => 
                            (t._id && treatment._id && t._id === treatment._id) || 
                            (t.id && treatment.id && t.id === treatment.id) ||
                            (t._id === treatment.id) || 
                            (t.id === treatment._id)
                          );

                          return (
                            <div
                              key={treatment._id || treatment.id}
                              onClick={() => handleTreatmentSelect(treatment)}
                              className={`relative cursor-pointer rounded-2xl p-5 transition-all duration-200 border ${
                                isSelected
                                  ? "border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)/0.08] ring-2 ring-[color:var(--brand-primary)/0.25] ring-offset-1"
                                  : "border-gray-200/70 hover:border-gray-200/70 hover:bg-gray-50"
                              }`}
                            >
                               <div className="flex justify-between items-start">
                                  <div className="flex gap-4">
                                     <div className={`mt-0.5 h-6 w-6 min-w-[1.5rem] rounded-full border flex items-center justify-center transition-all ${
                                        isSelected ? "border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)/0.08]" : "border-gray-200/70"
                                     }`}>
                                        {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                                     </div>
                                     
                                     <div>
                                        <h3 className={`font-bold text-lg mb-1 leading-snug ${isSelected ? "text-[color:var(--brand-primary)]" : "text-gray-900"}`}>
                                          {treatment.name}
                                        </h3>
                                        <p className="text-gray-600 text-sm mb-3">
                                          {treatment.description}
                                        </p>
                                        <div className="flex items-center gap-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                           <span className="flex items-center gap-1">
                                              <Clock className="w-3.5 h-3.5" /> {treatment.duration} min
                                           </span>
                                        </div>
                                     </div>
                                  </div>
                                  
                                  <div className="text-right pl-4">
                                     <div className={`text-xl font-bold ${isSelected ? "text-[color:var(--brand-primary)]" : "text-gray-900"}`}>
                                        ${treatment.price}
                                     </div>
                                  </div>
                               </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-xl p-6 text-center border border-dashed border-gray-200/70">
                         <p className="text-gray-500">Standard service booking. No variants available.</p>
                      </div>
                    )}
                  </div>

                   {service.linkedServices && service.linkedServices.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200/70">
                       <div className="flex items-center justify-between mb-4">
                          <h2 className="text-xl font-bold text-gray-900">Recommended Add-ons</h2>
                          <span className="bg-[color:var(--brand-primary)/0.12] text-[color:var(--brand-primary)] text-xs font-bold px-2 py-1 rounded-full">Optional</span>
                       </div>
                       
                       <div className="grid gap-3">
                          {service.linkedServices.map((addOn) => {
                             const isSelected = selectedAddOns.some(item => item.serviceId === addOn.serviceId);
                             const price = addOn.finalPrice || addOn.customPrice || addOn.basePrice;
                             
                             return (
                                <div
                                   key={addOn.serviceId}
                                   onClick={() => handleAddOnToggle(addOn)}
                                   className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                                      isSelected 
                                        ? "border-green-500 bg-green-50/50 ring-1 ring-green-200" 
                                        : "border-gray-200/70 hover:border-gray-200/70"
                                   }`}
                                >
                                   <div className="flex items-center gap-3">
                                      <div className={`flex items-center justify-center h-5 w-5 min-w-[1.25rem] rounded-md border transition-colors ${
                                         isSelected ? "bg-green-500 border-green-500" : "border-gray-200/70"
                                      }`}>
                                         {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                      </div>
                                      <div>
                                         <div className="font-semibold text-gray-900">{addOn.name}</div>
                                         <div className="text-xs text-gray-500">+{addOn.duration} min</div>
                                      </div>
                                   </div>
                                   <div className="font-bold text-gray-900">
                                      +${price}
                                   </div>
                                </div>
                             );
                          })}
                       </div>
                    </div>
                   )}

                  <div id="datetime-section" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200/70">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Select Date & Time</h2>
                    
                    <div className="space-y-6">
                       <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Pick a Date</label>
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => {
                               setSelectedDate(e.target.value);
                               setSelectedTime(""); 
                            }}
                            min={new Date().toISOString().split("T")[0]}
                            className="w-full h-12 px-4 bg-gray-50 border border-gray-200/70 rounded-xl focus:ring-2 focus:ring-[color:var(--brand-primary)] focus:border-[color:var(--brand-primary)] outline-none transition-all appearance-none text-base"
                            style={{ WebkitAppearance: 'none' }} 
                          />
                       </div>

                       <div>
                          <div className="flex items-center justify-between mb-3">
                             <label className="block text-sm font-medium text-gray-700">Available Slots</label>
                             <div className="flex items-center gap-3">
                               {selectedDate && !loadingAvailability && (
                                 <span className="text-xs text-gray-500">
                                   {externalSourceUnavailable
                                     ? "GHL unavailable"
                                     : ghlCalendarName
                                     ? `${ghlCalendarName}: ${externalBookingsCount} booked`
                                     : `GHL booked: ${externalBookingsCount}`}
                                 </span>
                               )}
                               {loadingAvailability && <span className="text-xs text-[color:var(--brand-primary)] animate-pulse">Checking availability...</span>}
                             </div>
                          </div>
                          
                          {selectedDate ? (
                             availableTimes.length > 0 ? (
                               <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                 {availableTimes.map((time) => (
                                   <button
                                     key={time}
                                     onClick={() => setSelectedTime(time)}
                                     className={`py-2 px-1 text-sm font-medium rounded-lg border transition-all ${
                                       selectedTime === time
                                         ? "bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white border-transparent shadow-lg"
                                         : "bg-white text-gray-700 border-gray-200/70 hover:border-gray-200/70 hover:bg-gray-50"
                                     }`}
                                   >
                                     {time}
                                   </button>
                                 ))}
                               </div>
                             ) : (
                               <div className="p-6 bg-gray-50 rounded-xl text-center border border-gray-200/70">
                                  <p className="text-gray-500">No time slots available for this date.</p>
                               </div>
                             )
                          ) : (
                             <div className="p-6 bg-gray-50 rounded-xl text-center border border-gray-200/70">
                                <p className="text-gray-500">Please select a date to view times.</p>
                             </div>
                          )}
                       </div>
                    </div>
                  </div>
                </>
              )}

            </div>

             {/* RIGHT COLUMN - DESKTOP SUMMARY */}
             <div className="hidden lg:block lg:col-span-1">
                <div className="sticky top-24 bg-white rounded-2xl p-6 shadow-xl shadow-gray-200/50 border border-gray-200/70">
                   <h3 className="font-bold text-gray-900 mb-4 text-lg">Booking Summary</h3>
                   
                   <div className="space-y-4 mb-6">
                      <div className="flex justify-between text-sm">
                         <span className="text-gray-500">Service</span>
                         <div className="flex flex-col items-end">
                             <span className="font-medium text-gray-900 text-right">{service.name}</span>
                             {selectedTreatments.length > 0 && (
                                <span className="text-xs text-gray-500 text-right max-w-[200px] truncate">
                                    {selectedTreatments.map(t => t.name).join(" + ")}
                                </span>
                             )}
                         </div>
                      </div>
                      {selectedAddOns.length > 0 && (
                          <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Add-ons ({selectedAddOns.length})</span>
                              <span className="font-medium text-gray-900">+${selectedAddOns.reduce((acc, curr) => acc + (curr.finalPrice || curr.basePrice), 0)}</span>
                          </div>
                      )}
                      {appliedReward && (
                          <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Reward</span>
                              <span className="font-medium text-[color:var(--brand-primary)] text-right">
                                {appliedReward.name}
                              </span>
                          </div>
                      )}

                      {hasMemberDeal && (
                        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-white p-3">
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                                Member Price
                              </div>
                              <div className="text-2xl font-black leading-none text-emerald-700">
                                {formatPrice(memberDealPrice)}
                              </div>
                            </div>
                            <div className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                              <Crown className="w-3 h-3" />
                              Save {memberSavePercent}%
                            </div>
                          </div>
                          <div className="rounded-lg bg-white/85 px-2 py-1 text-xs font-semibold text-gray-600">
                            Regular price <span className="font-black text-gray-800">{formatPrice(regularServicePrice)}</span>
                          </div>
                          {shouldShowMembershipUpsell && (
                            <div className="mt-2 rounded-lg bg-emerald-900 p-2">
                              <p className="text-[11px] font-medium leading-snug text-white/90">
                                <Lock className="mr-1 inline-block w-3 h-3" />
                                {Number.isFinite(membershipJoinPrice)
                                  ? `Join from ${formatPrice(membershipJoinPrice)}/month to unlock this deal.`
                                  : 'Join membership to unlock this deal.'}
                              </p>
                              <button
                                type="button"
                                onClick={() => navigate(membershipPath)}
                                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-extrabold text-emerald-800 hover:bg-emerald-100 transition-colors"
                              >
                                <Crown className="w-3.5 h-3.5" />
                                Save Now
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="h-px bg-gray-100 my-2" />
                      
                      <div className="flex justify-between items-center">
                         <span className="text-gray-900 font-bold">Total</span>
                         <div className="text-right">
                            <div className="text-2xl font-bold bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] bg-clip-text text-transparent">
                               ${totalPrice.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500 font-medium">{totalDuration} mins</div>
                         </div>
                      </div>
                   </div>

                   {!hasGhlBooking && <BNPLBanner variant="minimal" className="my-3" />}

                   <div className="space-y-3">
                      {hasGhlBooking ? (
                        <button
                          onClick={handleOpenGhlBooking}
                          className="w-full py-3.5 bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white rounded-xl font-bold shadow-lg shadow-[color:var(--brand-primary)/0.25] hover:shadow-[color:var(--brand-primary)/0.4] transform hover:-translate-y-0.5 transition-all"
                        >
                          {hasEmbeddedGhlBooking ? "Open Booking Widget" : "Book in GHL"}
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={handleBooking}
                            disabled={isProcessing}
                            className="w-full py-3.5 bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white rounded-xl font-bold shadow-lg shadow-[color:var(--brand-primary)/0.25] hover:shadow-[color:var(--brand-primary)/0.4] transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isProcessing ? "Processing..." : "Book Now"}
                          </button>
                          <button
                            onClick={handleAddToCart}
                            className="w-full py-3.5 bg-white border border-gray-200/70 text-gray-900 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-200/70 transition-all flex items-center justify-center gap-2"
                          >
                             <Plus className="w-4 h-4" /> Add to Cart
                          </button>
                        </>
                      )}
                   </div>
                   
                   <div className="mt-4 text-center">
                      <p className="text-xs text-gray-400">
                         Free cancellation up to 24h before appointment
                      </p>
                   </div>
                </div>
             </div>

          </div>
        </div>
      </div>

      {/* MOBILE STICKY BOTTOM BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200/70 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-[60] pb-[calc(1rem+env(safe-area-inset-bottom))]">
         <div className="flex items-center gap-4 max-w-lg mx-auto">
            <div className="flex-1">
               {hasMemberDeal && (
                 <div className="mb-1.5 rounded-lg bg-emerald-50 px-2 py-1.5">
                   <div className="flex items-center justify-between">
                     <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Member Price</span>
                     <span className="text-sm font-black text-emerald-700">{formatPrice(memberDealPrice)}</span>
                   </div>
                 </div>
               )}
               <div className="text-xs text-gray-500 font-medium mb-0.5">Total for {totalDuration} min</div>
               <div className="text-2xl font-bold text-gray-900 leading-none">
                  ${totalPrice.toFixed(2)}
               </div>
            </div>
            <div className="flex gap-2">
               {hasGhlBooking ? (
                 <button
                    onClick={handleOpenGhlBooking}
                    className="px-6 py-3.5 bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white rounded-xl font-bold shadow-lg shadow-[color:var(--brand-primary)/0.25]"
                 >
                    {hasEmbeddedGhlBooking ? "Book in GHL" : "Open Booking"}
                 </button>
               ) : (
                 <>
                   <button
                      onClick={handleAddToCart}
                       className="p-3.5 rounded-xl border border-gray-200/70 text-gray-600 hover:bg-gray-50 transition-colors"
                   >
                      <Plus className="w-6 h-6" />
                   </button>
                   <button
                      onClick={handleBooking}
                      disabled={isProcessing}
                      className="px-6 py-3.5 bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] text-white rounded-xl font-bold shadow-lg shadow-[color:var(--brand-primary)/0.25] disabled:opacity-50"
                   >
                      {isProcessing ? (
                         <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                         </span>
                      ) : (
                         "Book"
                      )}
                   </button>
                 </>
               )}
            </div>
         </div>
         {/* Safe area is handled by padding-bottom now, removed separate spacer div to avoid double spacing if any */}
      </div>
    </Layout>
  );
};

export default ServiceDetailPage;
