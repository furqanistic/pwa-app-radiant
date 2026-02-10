// File: pwa-app-radiant/client/src/pages/Bookings/BookingsPage.jsx
// FIXED VERSION - Premium PWA Design with Unified Tabs

import CancelBookingModal from "@/components/Bookings/CancelBookingModal";
import RescheduleModal from "@/components/Bookings/RescheduleModal";
import BNPLBanner from "@/components/Common/BNPLBanner";
import { useBranding } from '@/context/BrandingContext';
import { useBookingStats, usePastBookings, useUpcomingBookings, useRateBooking } from "@/hooks/useBookings";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import Layout from "@/pages/Layout/Layout";
import { clearCart, removeFromCart } from "@/redux/cartSlice";
import { notificationService } from "@/services/notificationService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  BellRing,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Edit2,
  Gift,
  MapPin,
  ShoppingBag,
  Star,
  Trash2,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from 'sonner';

// ============================================
// SKELETON COMPONENT
// ============================================
const BookingCardSkeleton = () => (
  <div className="bg-white rounded-2xl p-5 border border-gray-200/70 shadow-sm animate-pulse">
    <div className="flex gap-4">
      <div className="w-20 h-20 bg-gray-200 rounded-xl flex-shrink-0"></div>
      <div className="flex-1 space-y-2">
        <div className="h-5 bg-gray-200 rounded-lg w-3/4"></div>
        <div className="h-4 bg-gray-100 rounded-lg w-1/2"></div>
         <div className="h-4 bg-gray-100 rounded-lg w-1/3 mt-2"></div>
      </div>
    </div>
    <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between">
       <div className="h-8 bg-gray-100 rounded-lg w-24"></div>
       <div className="h-8 bg-gray-100 rounded-lg w-24"></div>
    </div>
  </div>
);

// ============================================
// BOOKING CARD COMPONENT
// ============================================
const BookingCard = ({
  booking,
  isPending = false,
  onCancel,
  onReschedule,
  onRemoveFromCart,
  onReview,
}) => {
  const bookingDate = new Date(booking.date);
  const today = new Date();
  const canCancel = (bookingDate - today) / (1000 * 60 * 60) > 24;
  const isPast = bookingDate < today;
  const canReview = isPast && booking.status === "completed" && !booking.rating;

    // Derived Status for Label
    let statusLabel = booking.status || "Confirmed";
    if (isPending) statusLabel = "Pending";
    else if (booking.status === "cancelled") statusLabel = "Cancelled";
    else if (isPast) statusLabel = "Completed";


  const getStatusStyles = () => {
    if (isPending) return "bg-yellow-50 text-yellow-700 border-yellow-100";
    if (booking.status === "cancelled") return "bg-red-50 text-red-700 border-red-100";
    if (isPast) return "bg-gray-50 text-gray-600 border-gray-200/70";
    return "bg-green-50 text-green-700 border-green-100";
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };
    
  const formatTime = (time) => {
     // Simple check if it needs formatting or is already 12h
     return time.toLowerCase();
  }

  const getTotalPrice = () => {
    return booking.finalPrice || booking.totalPrice || booking.price || 0;
  };

  return (
    <div className="bg-white rounded-3xl p-5 shadow-[0_2px_20px_-8px_rgba(0,0,0,0.06)] border border-gray-200/70 relative group overflow-hidden hover:border-gray-200/70 transition-all duration-300">
      
      {/* Pending Banner */}
      {isPending && (
         <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 to-orange-400" />
      )}

      {/* Main Content Row */}
      <div className="flex gap-4 mb-4">
        {/* Date Block */}
        <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex flex-col items-center justify-center border border-gray-200/70">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{new Date(booking.date).toLocaleDateString('en-US', { month: 'short' })}</span>
            <span className="text-xl font-bold text-gray-900 leading-none mt-0.5">{new Date(booking.date).getDate()}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
                <h3 className="text-base font-bold text-gray-900 truncate pr-2">
                    {booking.serviceName}
                </h3>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${getStatusStyles()}`}>
                    {statusLabel}
                </span>
            </div>
             
             {booking.treatmentName && (
                <p className="text-xs text-gray-500 mb-1 line-clamp-1">{booking.treatmentName}</p>
             )}

             <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {booking.time} ({booking.duration}m)
                </div>
                 {(booking.providerName && booking.providerName !== 'To be assigned') || (booking.practitioner && booking.practitioner !== 'TBA') ? (
                     <div className="flex items-center gap-1">
                        <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px] bg-gray-100 rounded-full">👤</span>
                        <span className="truncate max-w-[80px]">{booking.providerName || booking.practitioner}</span>
                     </div>
                 ) : null}
             </div>
        </div>
      </div>
        
      {/* Price & Location - Subtle footer */}
      <div className="flex items-center justify-between py-3 border-t border-gray-50 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
             <MapPin className="w-3.5 h-3.5 text-gray-400" />
             <span className="truncate max-w-[150px]">{booking.locationName || booking.location}</span>
          </div>
          <div className="flex flex-col items-end">
             <div className="font-bold text-gray-900 text-sm">
                ${getTotalPrice().toFixed(2)}
             </div>
             {(booking.status === 'completed' || booking.paymentStatus === 'paid') && (
                <div className="text-[10px] font-bold text-[color:var(--brand-primary)]">
                   +{booking.pointsEarned || Math.floor(getTotalPrice())} pts
                </div>
             )}
          </div>
      </div>


      {/* Potential Points for Upcoming & Pending */}
      {!isPast && booking.status !== 'cancelled' && (
        <div className="mt-3 mb-4 bg-gray-50/80 border-l-4 border-gray-200/70 rounded-r-xl p-3 flex items-start gap-3">
             <AlertTriangle className="w-4 h-4 text-[color:var(--brand-primary)] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-800 font-medium leading-tight">
                Hurry up! Complete this booking and claim your <span className="font-bold">{Math.floor(getTotalPrice())} points</span> reward
            </p>
        </div>
      )}

      {/* Action Buttons */}
      {isPending ? (
        <div className="grid grid-cols-2 gap-3">
           <button
            onClick={() => onRemoveFromCart(booking.id || booking._id)}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
          >
           Remove
          </button>
          <button
            onClick={() => (window.location.href = "/cart")}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-colors"
          >
            Checkout <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      ) : !isPast && booking.status !== 'cancelled' ? (
        <div className="grid grid-cols-2 gap-3">
          {canCancel ? (
            <>
               <button
                onClick={() => onReschedule(booking)}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200/70 hover:bg-gray-100 transition-colors"
              >
                Reschedule
              </button>
              <button
                onClick={() => onCancel(booking)}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-[color:var(--brand-primary)] bg-[color:var(--brand-primary)/0.08] border border-gray-200/70 hover:bg-[color:var(--brand-primary)/0.12] transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <div className="col-span-2 py-2 text-center bg-gray-50 rounded-xl">
                 <p className="text-[10px] text-gray-500 font-medium">Cancellation unavailable (within 24h)</p>
            </div>
          )}
        </div>
      ) : (
         // Completed/Cancelled Actions (Book Again?)
         canReview ? (
           <div className="grid grid-cols-2 gap-3">
             <button
               onClick={() => onReview?.(booking)}
               className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-colors"
             >
               Leave Review
             </button>
             <button 
               onClick={() => window.location.href = `/services`}
               className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-[color:var(--brand-primary)] bg-[color:var(--brand-primary)/0.08] hover:bg-[color:var(--brand-primary)/0.12] transition-colors"
             >
               Book Again
             </button>
           </div>
         ) : (
           <button 
             onClick={() => window.location.href = `/services`}
             className="w-full py-2.5 rounded-xl text-xs font-semibold text-[color:var(--brand-primary)] bg-[color:var(--brand-primary)/0.08] hover:bg-[color:var(--brand-primary)/0.12] transition-colors"
           >
              Book Again
           </button>
         )
      )}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
const BookingsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const { currentUser } = useSelector((state) => state.user);
  const cartItems = useSelector((state) => state.cart?.items || []);
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

  const { 
    isSupported, 
    isSubscribed, 
    permission, 
    requestPermissionAndSubscribe, 
    isSubscribing 
  } = usePushNotifications();

  // ✅ State management
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [activeTab, setActiveTab] = useState("upcoming"); // 'upcoming' | 'history'
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const sessionId = searchParams.get("session_id");
  const tabParam = searchParams.get("tab");

  // ✅ Fetch upcoming bookings
  const {
    data: upcomingData,
    isLoading: upcomingLoading,
    refetch: refetchUpcoming,
  } = useUpcomingBookings(currentUser?._id);

  // ✅ Fetch past bookings
  const { 
    data: pastData, 
    isLoading: pastLoading 
  } = usePastBookings(currentUser?._id);

  // ✅ Fetch notifications to check for birthday gift
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', 'birthday-check'],
    queryFn: () => notificationService.getUserNotifications({ unreadOnly: true }),
    enabled: !!currentUser,
  });

  const birthdayNotification = notificationsData?.data?.notifications?.find(
    (n) => n.metadata?.isBirthdayGift && !n.read
  );

  const upcomingBookings = upcomingData?.data?.appointments || [];
  const pastBookings = pastData?.data?.visits || [];
  
  const isInitialLoading = upcomingLoading && !upcomingData;

  // ✅ Payment success redirection
  useEffect(() => {
    if (sessionId) {
      // Clear cart first
      dispatch(clearCart());
      // Redirect to success page
      navigate(`/booking-success?session_id=${sessionId}`, { replace: true });
    }
  }, [sessionId, dispatch, navigate]);

  useEffect(() => {
    if (tabParam === "upcoming" || tabParam === "history") {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // ✅ Modal handlers
  const handleCancel = (booking) => {
    setSelectedBooking(booking);
    setShowCancel(true);
  };

  const handleReschedule = (booking) => {
    setSelectedBooking(booking);
    setShowReschedule(true);
  };

  const handleOpenReview = (booking) => {
    setReviewTarget(booking);
    setReviewRating(0);
    setReviewText("");
    setShowReview(true);
  };

  const handleRemoveFromCart = (itemId) => {
    dispatch(removeFromCart(itemId));
    toastSuccess("Item removed from cart");
  };

  // ✅ Normalization
  const normalizeCartItem = (item) => ({
    id: item.id,
    _id: item.id,
    serviceId: item.serviceId,
    serviceName: item.serviceName || item.service?.name || "Unknown Service",
    treatmentName: item.treatmentName || item.treatment?.name,
    image: item.image || item.service?.image,
    date: item.date || new Date().toISOString(),
    time: item.time || "00:00",
    duration: item.duration || item.service?.duration || 0,
    price: item.price || 0,
    totalPrice: item.totalPrice || item.finalPrice || item.price || 0,
    finalPrice: item.finalPrice || item.totalPrice || item.price || 0,
    locationName: item.locationName || item.location?.name || "To be confirmed",
    location: item.location?.name || item.locationName || "TBA",
    providerName: item.providerName || item.provider?.name || null,
    practitioner: item.practitioner || item.provider?.name || null,
    status: "pending",
    isPending: true,
  });

  const allBookings = React.useMemo(() => [
    ...cartItems.map(normalizeCartItem),
    ...upcomingBookings,
    ...pastBookings,
  ], [cartItems, upcomingBookings, pastBookings]);

  // ✅ Filter Logic (2-Tab System)
  const filteredBookings = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return allBookings.filter((booking) => {
      const bookingDate = new Date(booking.date);
      bookingDate.setHours(0, 0, 0, 0);

      const isUpcoming = booking.isPending || (bookingDate >= today && booking.status !== "cancelled");
      
      if (activeTab === "upcoming") {
        return isUpcoming;
      } else {
        // history = past OR cancelled
        return !isUpcoming; 
      }
    });
  }, [allBookings, activeTab]);


  // Counts for tabs (optional, maybe nice for UI)
  const upcomingCount = React.useMemo(() => 
    allBookings.filter(b => {
         const d = new Date(b.date); d.setHours(0,0,0,0);
         const now = new Date(); now.setHours(0,0,0,0);
         return b.isPending || (d >= now && b.status !== 'cancelled');
    }).length
  , [allBookings]);


  const isListLoading = (activeTab === 'history' && pastLoading) || (activeTab === 'upcoming' && upcomingLoading);

  // ✅ Fetch booking stats for total points
  const { data: statsData } = useBookingStats(currentUser?._id);
  const totalPointsEarned = statsData?.data?.stats?.totalPointsEarned || 0;

  const rateBookingMutation = useRateBooking({
    onSuccess: () => {
      toastSuccess("Thanks for your review! Points added.");
      setShowReview(false);
      setReviewTarget(null);
    },
    onError: () => {
      toast.error("Failed to submit review");
    },
  });

  const handleSubmitReview = async () => {
    if (!reviewTarget?._id) return;
    if (reviewRating < 1) {
      toast.error("Please select a rating");
      return;
    }
    await rateBookingMutation.mutateAsync({
      bookingId: reviewTarget._id,
      rating: reviewRating,
      review: reviewText,
    });
  };

  return (
    <Layout>
      <div className="px-4 py-6 max-w-md mx-auto md:max-w-4xl min-h-[80vh]">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">My Bookings</h1>

          {/* Points Summary Card */}
          <div className="bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] rounded-2xl p-5 mb-6 text-white flex items-center justify-between shadow-lg shadow-gray-200">
             <div>
                <p className="text-xs font-medium text-white uppercase tracking-wider mb-1">Total Points Claimed From Bookings</p>
                <div className="text-3xl font-bold flex items-baseline gap-1">
                   {totalPointsEarned}
                   <span className="text-sm font-medium text-[color:var(--brand-primary)/0.6]">pts</span>
                </div>
             </div>
             <div className="h-12 w-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Gift className="w-6 h-6 text-[color:var(--brand-primary)/0.6]" />
             </div>
          </div>

            {/* Premium Segmented Control Tabs */}
            <div className="bg-gray-100 p-1 rounded-2xl flex relative">
                {/* Active Indicator Background */}
                <div 
                    className={`absolute inset-y-1 w-[calc(50%-4px)] bg-white rounded-xl shadow-sm transition-all duration-300 ease-out ${activeTab === 'upcoming' ? 'left-1' : 'left-[calc(50%+2px)]'}`}
                ></div>

                <button
                    onClick={() => setActiveTab('upcoming')}
                    className={`flex-1 relative z-10 py-2.5 text-sm font-semibold transition-colors text-center ${activeTab === 'upcoming' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Upcoming
                    {upcomingCount > 0 && <span className="ml-1.5 text-[10px] bg-[color:var(--brand-primary)/0.12] text-[color:var(--brand-primary)] px-1.5 py-0.5 rounded-full align-middle inline-block">{upcomingCount}</span>}
                </button>
                 <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 relative z-10 py-2.5 text-sm font-semibold transition-colors text-center ${activeTab === 'history' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    History
                </button>
            </div>
        </div>

        <BNPLBanner className="mb-6" />


        {/* Birthday Gift Banner */}
        {birthdayNotification && (
          <div className="mb-6 bg-gradient-to-br from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] rounded-3xl p-6 text-white shadow-xl shadow-[color:var(--brand-primary)/0.25] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:scale-110 transition-transform duration-500" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/20 rounded-2xl backdrop-blur-md">
                   <Gift className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-black tracking-tight">{birthdayNotification.title}</h3>
              </div>
              <p className="text-sm text-white/90 font-medium mb-5 opacity-90 leading-relaxed">
                {birthdayNotification.message}
              </p>
              <button 
                onClick={() => navigate(`/services/${birthdayNotification.metadata?.serviceId}`, { 
                  state: { 
                    isBirthdayGift: true,
                    notificationId: birthdayNotification._id,
                    giftType: birthdayNotification.metadata?.giftType,
                    giftValue: birthdayNotification.metadata?.giftValue
                  } 
                })}
                className="w-full sm:w-auto bg-white text-[color:var(--brand-primary)] font-black px-8 py-3.5 rounded-2xl active:scale-95 transition-all shadow-lg hover:shadow-xl hover:bg-gray-50/80 flex items-center justify-center gap-2"
              >
                Claim My Gift <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Push Notification Banner - nicely integrated if needed */}
        {isSupported && !isSubscribed && permission === 'default' && (
           <div className="mb-6 bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] rounded-2xl p-4 text-white shadow-lg shadow-[color:var(--brand-primary)/0.25]">
               <div className="flex items-start gap-3">
                   <div className="p-2 bg-white/20 rounded-xl">
                       <BellRing className="w-5 h-5 text-white" />
                   </div>
                   <div className="flex-1">
                       <h3 className="font-bold text-sm mb-1">Stay Updated</h3>
                       <p className="text-xs text-white/90 opacity-90 mb-3">Enable notifications for appointment reminders.</p>
                       <button 
                         onClick={requestPermissionAndSubscribe}
                         className="text-xs bg-white text-[color:var(--brand-primary)] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
                        >
                            {isSubscribing ? 'Enabling...' : 'Turn On'}
                       </button>
                   </div>
               </div>
           </div>
        )}

        {/* Content Area */}
        {isListLoading && filteredBookings.length === 0 ? (
           <div className="grid gap-4">
              {[...Array(3)].map((_, i) => <BookingCardSkeleton key={i} />)}
           </div>
        ) : filteredBookings.length > 0 ? (
            <div className="grid gap-4">
              {filteredBookings.map((booking) => (
                <BookingCard
                  key={booking._id || booking.id}
                  booking={booking}
                  isPending={booking.isPending}
                  onCancel={handleCancel}
                  onReschedule={handleReschedule}
                  onRemoveFromCart={handleRemoveFromCart}
                  onReview={handleOpenReview}
                />
              ))}
            </div>
        ) : (
            // Empty State
             <div className="text-center py-16 px-4">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Calendar className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {activeTab === 'upcoming' ? 'No Upcoming Plans' : 'No History Yet'}
                </h3>
                <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
                    {activeTab === 'upcoming' 
                        ? "You don't have any appointments scheduled. Time for some self-care?" 
                        : "Your completed appointments will appear here."}
                </p>
                {activeTab === 'upcoming' && (
                    <button
                    onClick={() => navigate("/services")}
                    className=" inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200"
                    >
                    <ShoppingBag className="w-4 h-4" />
                    Book Now
                    </button>
                )}
            </div>
        )}
      </div>

      {/* ✅ Modals */}
      {selectedBooking && (
        <>
          <RescheduleModal
            isOpen={showReschedule}
            onClose={() => {
              setShowReschedule(false);
              setSelectedBooking(null);
              refetchUpcoming();
            }}
            booking={selectedBooking}
          />
          <CancelBookingModal
            isOpen={showCancel}
            onClose={() => {
              setShowCancel(false);
              setSelectedBooking(null);
              refetchUpcoming();
            }}
            booking={selectedBooking}
          />
        </>
      )}

      {showReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Leave a Review</h3>
              <button
                onClick={() => setShowReview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              How was your experience with {reviewTarget?.serviceName}?
            </p>

            <div className="flex items-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setReviewRating(star)}
                  className={`p-2 rounded-full transition ${
                    reviewRating >= star
                      ? "text-yellow-500 bg-yellow-50"
                      : "text-gray-300 bg-gray-50"
                  }`}
                >
                  <Star className="w-5 h-5" />
                </button>
              ))}
            </div>

            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share more details (optional)"
              rows={4}
              className="w-full rounded-2xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)]"
            />

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowReview(false)}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={rateBookingMutation.isLoading}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-60"
              >
                {rateBookingMutation.isLoading ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default BookingsPage;
