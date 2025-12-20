// File: pwa-app-radiant/client/src/pages/Bookings/BookingSuccessPage.jsx
// FIXED VERSION - Complete with price mapping, modals, and API integration

import CancelBookingModal from "@/components/Bookings/CancelBookingModal";
import RescheduleModal from "@/components/Bookings/RescheduleModal";
import Layout from "@/pages/Layout/Layout";
import { clearCart, removeFromCart } from "@/redux/cartSlice";
import { bookingService } from "@/services/bookingService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    Calendar,
    CheckCircle,
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
  <div className="bg-gray-300 rounded-lg shadow-sm p-6 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      <div className="h-4 bg-gray-200 rounded w-4/6"></div>
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

  const getStatusColor = () => {
    if (isPending) return "bg-yellow-100 text-yellow-800";
    if (isPast) return "bg-gray-100 text-gray-800";
    if (booking.status === "confirmed") return "bg-green-100 text-green-800";
    if (booking.status === "cancelled") return "bg-red-100 text-red-800";
    return "bg-blue-100 text-blue-800";
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // ✅ FIX: Proper price field mapping
  const getTotalPrice = () => {
    // Check multiple price field options
    return booking.finalPrice || booking.totalPrice || booking.price || 0;
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow ${
        isPending ? "border-l-4 border-yellow-500" : ""
      }`}
    >
      {isPending && (
        <div className="mb-3 p-3 bg-yellow-50 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">
            <strong>Pending Payment:</strong> Complete checkout to confirm this
            booking.
          </p>
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-bold text-gray-900">
              {booking.serviceName}
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor()}`}
            >
              {isPending
                ? "Pending Payment"
                : isPast
                ? "Completed"
                : booking.status || "Confirmed"}
            </span>
          </div>
          {booking.treatmentName && (
            <p className="text-sm text-gray-600 mb-1">
              Treatment: {booking.treatmentName}
            </p>
          )}
        </div>
      </div>

      {booking.image && (
        <img
          src={booking.image}
          alt={booking.serviceName}
          className="w-full h-32 object-cover rounded-lg mb-4"
        />
      )}

      <div className="space-y-3 mb-6 text-sm text-gray-700">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-pink-500 flex-shrink-0" />
          <div>
            <p className="font-semibold">{formatDate(booking.date)}</p>
            <p className="text-gray-600">{booking.time}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-purple-500 flex-shrink-0" />
          <span>{booking.duration} minutes</span>
        </div>

        {/* ✅ FIX: Check multiple location field names */}
        {(booking.locationName || booking.location) && (
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <span>{booking.locationName || booking.location}</span>
          </div>
        )}

        {/* ✅ FIX: Check multiple provider field names */}
        {(booking.providerName || booking.practitioner || booking.provider) && (
          <div className="flex items-center gap-3">
            <span className="w-5 h-5 text-indigo-500 flex-shrink-0">👤</span>
            <span>
              {booking.providerName || booking.practitioner || booking.provider}
            </span>
          </div>
        )}
      </div>

      {booking.addOns && booking.addOns.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs font-semibold text-blue-900 mb-2">Add-ons:</p>
          <ul className="text-xs text-blue-800 space-y-1">
            {booking.addOns.map((addon, idx) => (
              <li key={idx}>• {addon.name}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t pt-4 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Total Amount</span>
          {/* ✅ FIX: Proper price display */}
          <span className="text-xl font-bold text-green-600">
            ${getTotalPrice().toFixed(2)}
          </span>
        </div>
      </div>

      {isPending ? (
        <div className="flex gap-2">
          <button
            onClick={() => onRemoveFromCart(booking.id || booking._id)}
            className="flex-1 flex items-center justify-center gap-2 px-4 h-10 border border-red-300 text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Remove from Cart
          </button>
          <button
            onClick={() => (window.location.href = "/cart")}
            className="flex-1 flex items-center justify-center gap-2 px-4 h-10 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            Go to Cart
          </button>
        </div>
      ) : !isPast ? (
        <div className="flex gap-2">
          {canCancel && (
            <>
              <button
                onClick={() => onReschedule(booking)}
                className="flex-1 flex items-center justify-center gap-2 px-4 h-10 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Reschedule
              </button>
              <button
                onClick={() => onCancel(booking)}
                className="flex-1 flex items-center justify-center gap-2 px-4 h-10 border border-red-300 text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Cancel
              </button>
            </>
          )}
          {!canCancel && (
            <div className="w-full p-3 bg-orange-50 rounded-lg text-center">
              <p className="text-xs text-orange-700">
                Cancellation available until 24 hours before appointment
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
const BookingSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const { currentUser } = useSelector((state) => state.user);
  const cartItems = useSelector((state) => state.cart?.items || []);

  // ✅ State management for modals
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [filterStatus, setFilterStatus] = useState("upcoming");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  const sessionId = searchParams.get("session_id");

  // ✅ Fetch upcoming bookings with proper API
  const {
    data: upcomingData,
    isLoading: upcomingLoading,
    refetch: refetchUpcoming,
  } = useQuery({
    queryKey: ["bookings", "upcoming", currentUser?._id],
    queryFn: () => bookingService.getClientBookings(),
    enabled: !!currentUser,
  });

  // ✅ Fetch past bookings with proper API
  const { data: pastData, isLoading: pastLoading } = useQuery({
    queryKey: ["bookings", "past", currentUser?._id],
    queryFn: () => bookingService.getPastBookings(1, 20),
    enabled: !!currentUser,
  });

  const upcomingBookings = upcomingData?.data?.appointments || [];
  const pastBookings = pastData?.data?.visits || [];
  const isLoading = upcomingLoading || pastLoading;

  // ✅ Payment success overlay
  useEffect(() => {
    if (sessionId) {
      setShowSuccessOverlay(true);
      dispatch(clearCart());

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Booking Confirmed! 🎉", {
          body: "Your payment was successful and your booking is confirmed.",
          icon: "/icon-192x192.png",
        });
      }

      const timer = setTimeout(() => {
        setShowSuccessOverlay(false);
      }, 3000);

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

  // ✅ FIX: Proper cart item structure mapping
  const normalizeCartItem = (item) => ({
    // IDs
    id: item.id,
    _id: item.id,
    serviceId: item.serviceId,

    // Service Info
    serviceName: item.serviceName || item.service?.name || "Unknown Service",
    treatmentName: item.treatmentName || item.treatment?.name,
    image: item.image || item.service?.image,

    // Booking Details
    date: item.date || new Date().toISOString(),
    time: item.time || "00:00",
    duration: item.duration || item.service?.duration || 0,

    // ✅ FIX: Critical - Price mapping from multiple fields
    price: item.price || 0,
    totalPrice: item.totalPrice || item.finalPrice || item.price || 0,
    finalPrice: item.finalPrice || item.totalPrice || item.price || 0,

    // Location Info (with fallbacks)
    locationName:
      item.locationName ||
      item.location?.name ||
      item.selectedLocation?.locationName ||
      "To be confirmed",
    location: item.location?.name || item.locationName || "TBA",

    // Provider Info (with fallbacks)
    providerName:
      item.providerName ||
      item.provider?.name ||
      item.practitioner ||
      "To be assigned",
    practitioner: item.practitioner || item.provider?.name || "TBA",

    // Add-ons
    addOns: item.addOns || [],

    // Status
    status: "pending",
    isPending: true,
  });

  // ✅ Combine all bookings - properly normalized
  const allBookings = [
    // Pending cart items
    ...cartItems.map((item) => normalizeCartItem(item)),
    // Confirmed bookings from API
    ...upcomingBookings,
    ...pastBookings,
  ];

  // ✅ Filter bookings based on status
  const getFilteredBookings = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return allBookings.filter((booking) => {
      const bookingDate = new Date(booking.date);
      bookingDate.setHours(0, 0, 0, 0);

      if (filterStatus === "upcoming") {
        return (
          booking.isPending ||
          (bookingDate >= today && booking.status !== "cancelled")
        );
      } else if (filterStatus === "completed") {
        return bookingDate < today || booking.status === "cancelled";
      }
      return true;
    });
  };

  const filteredBookings = getFilteredBookings();
  const upcomingCount = allBookings.filter((b) => {
    const bookingDate = new Date(b.date);
    const today = new Date();
    return b.isPending || (bookingDate >= today && b.status !== "cancelled");
  }).length;
  const pendingCount = cartItems.length;

  // ✅ Loading state
  if (isLoading && !showSuccessOverlay) {
    return (
      <Layout>
        <div className="px-4 py-8 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">My Bookings</h1>
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <BookingCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Success Overlay */}
      {showSuccessOverlay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full animate-bounce">
            <div className="text-center">
              <CheckCircle className="w-20 h-20 mx-auto mb-4 text-green-500" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Successful!
              </h2>
              <p className="text-gray-600 mb-4">
                Your booking has been confirmed. Check your email for details.
              </p>
              <button
                onClick={() => setShowSuccessOverlay(false)}
                className="bg-gradient-to-r from-pink-500 to-rose-600 text-white px-6 h-10 rounded-lg font-semibold"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/services")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Services
          </button>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
              <p className="text-gray-600 mt-1">
                {upcomingCount} upcoming appointment
                {upcomingCount !== 1 ? "s" : ""}
                {pendingCount > 0 && ` (${pendingCount} pending payment)`}
              </p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            {["upcoming", "completed", "all"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-3 font-semibold transition-colors capitalize ${
                  filterStatus === status
                    ? "text-pink-600 border-b-2 border-pink-600"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                {status === "all" ? "All Bookings" : status}
              </button>
            ))}
          </div>
        </div>

        {/* Pending Payment Alert */}
        {pendingCount > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900">
                Pending Bookings
              </h3>
              <p className="text-sm text-yellow-800">
                You have {pendingCount} booking{pendingCount !== 1 ? "s" : ""}{" "}
                waiting for payment.{" "}
                <button
                  onClick={() => navigate("/cart")}
                  className="font-semibold underline hover:text-yellow-700"
                >
                  Complete checkout now
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredBookings.length === 0 && !isLoading && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No {filterStatus === "all" ? "" : filterStatus} bookings
            </h3>
            <p className="text-gray-600 mb-6">
              {filterStatus === "upcoming"
                ? "You don't have any upcoming appointments yet"
                : filterStatus === "completed"
                ? "You have no completed appointments"
                : "Start booking your favorite services today!"}
            </p>
            <button
              onClick={() => navigate("/services")}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white px-6 h-10 rounded-lg font-semibold hover:from-pink-600 hover:to-rose-700"
            >
              <ShoppingBag className="w-5 h-5" />
              Browse Services
            </button>
          </div>
        )}

        {/* Bookings Grid */}
        {filteredBookings.length > 0 && (
          <div className="grid gap-4 md:gap-6">
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
        )}
      </div>

      {/* ✅ Modals with proper state management */}
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

export default BookingSuccessPage;
