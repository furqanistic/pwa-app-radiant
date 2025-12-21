// File: pwa-app-radiant/client/src/pages/Bookings/BookingsPage.jsx
// FIXED VERSION - Premium PWA Design with Unified Tabs

import CancelBookingModal from "@/components/Bookings/CancelBookingModal";
import RescheduleModal from "@/components/Bookings/RescheduleModal";
import { usePastBookings, useUpcomingBookings } from "@/hooks/useBookings";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import Layout from "@/pages/Layout/Layout";
import { clearCart, removeFromCart } from "@/redux/cartSlice";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  BellRing,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Edit2,
  MapPin,
  ShoppingBag,
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
  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-pulse">
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
}) => {
  const bookingDate = new Date(booking.date);
  const today = new Date();
  const canCancel = (bookingDate - today) / (1000 * 60 * 60) > 24;
  const isPast = bookingDate < today;

    // Derived Status for Label
    let statusLabel = booking.status || "Confirmed";
    if (isPending) statusLabel = "Pending Payment";
    else if (booking.status === "cancelled") statusLabel = "Cancelled";
    else if (isPast) statusLabel = "Completed";


  const getStatusStyles = () => {
    if (isPending) return "bg-yellow-50 text-yellow-700 border-yellow-100";
    if (booking.status === "cancelled") return "bg-red-50 text-red-700 border-red-100";
    if (isPast) return "bg-gray-50 text-gray-600 border-gray-100";
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
    <div className="bg-white rounded-3xl p-5 shadow-[0_2px_20px_-8px_rgba(0,0,0,0.06)] border border-gray-100 relative group overflow-hidden hover:border-pink-200 transition-all duration-300">
      
      {/* Pending Banner */}
      {isPending && (
         <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 to-orange-400" />
      )}

      {/* Main Content Row */}
      <div className="flex gap-4 mb-4">
        {/* Date Block */}
        <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex flex-col items-center justify-center border border-gray-200/50">
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
                 {(booking.providerName || booking.practitioner) && (
                     <div className="flex items-center gap-1">
                        <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px] bg-gray-100 rounded-full">👤</span>
                        <span className="truncate max-w-[80px]">{booking.providerName || booking.practitioner}</span>
                     </div>
                 )}
             </div>
        </div>
      </div>
        
      {/* Price & Location - Subtle footer */}
      <div className="flex items-center justify-between py-3 border-t border-gray-50 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
             <MapPin className="w-3.5 h-3.5 text-gray-400" />
             <span className="truncate max-w-[150px]">{booking.locationName || booking.location}</span>
          </div>
          <div className="font-bold text-gray-900 text-sm">
             ${getTotalPrice().toFixed(2)}
          </div>
      </div>


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
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                Reschedule
              </button>
              <button
                onClick={() => onCancel(booking)}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-colors"
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
         <button 
           onClick={() => window.location.href = `/services`}
           className="w-full py-2.5 rounded-xl text-xs font-semibold text-pink-600 bg-pink-50 hover:bg-pink-100 transition-colors"
         >
            Book Again
         </button>
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

  const sessionId = searchParams.get("session_id");

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

  const upcomingBookings = upcomingData?.data?.appointments || [];
  const pastBookings = pastData?.data?.visits || [];
  
  const isInitialLoading = upcomingLoading && !upcomingData;

  // ✅ Payment success overlay
  useEffect(() => {
    if (sessionId) {
      setShowSuccessOverlay(true);
      dispatch(clearCart());
      const timer = setTimeout(() => setShowSuccessOverlay(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [sessionId, dispatch]);

  // ✅ Modal handlers
  const handleCancel = (booking) => {
    setSelectedBooking(booking);
    setShowCancel(true);
  };

  const handleReschedule = (booking) => {
    setSelectedBooking(booking);
    setShowReschedule(true);
  };

  const handleRemoveFromCart = (itemId) => {
    dispatch(removeFromCart(itemId));
    toast.success("Item removed from cart");
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
    providerName: item.providerName || item.provider?.name || "To be assigned",
    practitioner: item.practitioner || item.provider?.name || "TBA",
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


  if (isInitialLoading && !showSuccessOverlay) {
    return (
      <Layout>
        <div className="px-5 py-6 max-w-lg mx-auto">
          <div className="h-8 bg-gray-200 rounded-lg w-1/3 mb-6 animate-pulse"></div>
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => <BookingCardSkeleton key={i} />)}
          </div>
        </div>
      </Layout>
    );
  }

  const isListLoading = (activeTab === 'history' && pastLoading) || (activeTab === 'upcoming' && upcomingLoading);

  return (
    <Layout>
      {/* Success Overlay */}
      {showSuccessOverlay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                   <CheckCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Confirmed!</h2>
              <p className="text-gray-500 mb-6 text-sm">Your appointment is booked successfully.</p>
              <button
                onClick={() => setShowSuccessOverlay(false)}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold"
              >
                Okay, great
              </button>
          </div>
        </div>
      )}

      <div className="px-4 py-6 max-w-md mx-auto md:max-w-4xl min-h-[80vh]">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">My Bookings</h1>

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
                    {upcomingCount > 0 && <span className="ml-1.5 text-[10px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded-full align-middle inline-block">{upcomingCount}</span>}
                </button>
                 <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 relative z-10 py-2.5 text-sm font-semibold transition-colors text-center ${activeTab === 'history' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    History
                </button>
            </div>
        </div>


        {/* Push Notification Banner - nicely integrated if needed */}
        {isSupported && !isSubscribed && permission === 'default' && (
           <div className="mb-6 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl p-4 text-white shadow-lg shadow-pink-200">
               <div className="flex items-start gap-3">
                   <div className="p-2 bg-white/20 rounded-xl">
                       <BellRing className="w-5 h-5 text-white" />
                   </div>
                   <div className="flex-1">
                       <h3 className="font-bold text-sm mb-1">Stay Updated</h3>
                       <p className="text-xs text-pink-50 opacity-90 mb-3">Enable notifications for appointment reminders.</p>
                       <button 
                         onClick={requestPermissionAndSubscribe}
                         className="text-xs bg-white text-pink-600 font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
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
    </Layout>
  );
};

export default BookingsPage;