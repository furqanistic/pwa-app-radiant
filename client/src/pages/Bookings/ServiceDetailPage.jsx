// File: client/src/pages/Bookings/ServiceDetailPage.jsx
// ✅ FIXED: Booked times + Cart duplicate prevention

import { useService, useBookedTimes } from "@/hooks/useServices";
import Layout from "@/pages/Layout/Layout";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Percent,
  Plus,
  Star,
  User,
  X,
  Zap,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import stripeService from "../../services/stripeService";
import { addToCart } from "../../redux/cartSlice";

const ServiceDetailPage = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentUser } = useSelector((state) => state.user);
  // ✅ GET CART FROM REDUX
  const { items: cartItems } = useSelector((state) => state.cart);

  const [selectedTreatment, setSelectedTreatment] = useState(null);
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

  const { data: bookedTimes = [], isLoading: loadingTimes } = useBookedTimes(
    serviceId,
    selectedDate
  );

  const allTimeSlots = [
    "9:00 AM",
    "10:30 AM",
    "12:00 PM",
    "2:00 PM",
    "3:30 PM",
    "5:00 PM",
  ];

  // Convert 24h to 12h
  const convertTo12HourFormat = (time24) => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":").map(Number);
    let period = "AM";
    let hours12 = hours;
    if (hours >= 12) {
      period = "PM";
      if (hours > 12) {
        hours12 = hours - 12;
      }
    }
    if (hours === 0) {
      hours12 = 12;
    }
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const bookedTimesFormatted = bookedTimes.map((time) =>
    convertTo12HourFormat(time)
  );

  // ✅ GET CART TIMES FOR THIS SERVICE ON THIS DATE
  const getCartTimesForService = () => {
    return cartItems
      .filter(
        (item) => item.serviceId === serviceId && item.date === selectedDate
      )
      .map((item) => item.time);
  };

  const cartTimesForService = getCartTimesForService();

  // ✅ MERGE BOOKED + CART TIMES
  const getAllUnavailableTimes = () => {
    return [...new Set([...bookedTimesFormatted, ...cartTimesForService])];
  };

  // GET AVAILABLE TIMES
  const getAvailableTimes = () => {
    const unavailableTimes = getAllUnavailableTimes();
    const available = allTimeSlots.filter(
      (time) => !unavailableTimes.includes(time)
    );
    return available;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
          <span className="ml-3 text-lg">Loading service details...</span>
        </div>
      </Layout>
    );
  }

  if (isError || !service) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-2">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Service not found
            </h3>
            <p className="text-gray-600 mb-4">
              {error?.message ||
                "The service you are looking for does not exist or has been removed."}
            </p>
            <button
              onClick={() => navigate("/bookings")}
              className="bg-gradient-to-r from-pink-500 to-rose-600 text-white px-6 h-8 rounded-lg font-semibold hover:from-pink-600 hover:to-rose-700"
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

  const calculateDiscountedPrice = (price) => {
    if (isDiscountActive) {
      return price - (price * service.discount.percentage) / 100;
    }
    return price;
  };

  const handleTreatmentSelect = (treatment) => {
    setSelectedTreatment(treatment);
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
    const basePrice = selectedTreatment?.price || service.basePrice;
    const discountedBasePrice = calculateDiscountedPrice(basePrice);

    const addOnsTotal = selectedAddOns.reduce((total, addOn) => {
      return total + (addOn.finalPrice || addOn.customPrice || addOn.basePrice);
    }, 0);

    return discountedBasePrice + addOnsTotal;
  };

  const calculateTotalDuration = () => {
    const baseDuration = selectedTreatment?.duration || service.duration;

    const addOnsDuration = selectedAddOns.reduce((total, addOn) => {
      return (
        total + (addOn.finalDuration || addOn.customDuration || addOn.duration)
      );
    }, 0);

    return baseDuration + addOnsDuration;
  };

  const handleAddToCart = () => {
    if (!selectedTreatment && service.subTreatments?.length > 0) {
      toast.error("Please select a treatment option");
      return;
    }
    if (!selectedDate || !selectedTime) {
      toast.error("Please select date and time");
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
      toast.error("❌ This time slot is already in your cart!");
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
      treatment: selectedTreatment
        ? {
            id: selectedTreatment._id || selectedTreatment.id,
            name: selectedTreatment.name,
            price: selectedTreatment.price,
            duration: selectedTreatment.duration,
          }
        : null,
      addOns: selectedAddOns.map((addon) => ({
        serviceId: addon.serviceId,
        name: addon.name,
        price: addon.finalPrice || addon.customPrice || addon.basePrice,
        duration: addon.finalDuration || addon.customDuration || addon.duration,
      })),
    };

    dispatch(addToCart(cartItem));
    toast.success("Added to cart!", {
      icon: "🛒",
    });

    setSelectedDate("");
    setSelectedTime("");
    setSelectedTreatment(null);
    setSelectedAddOns([]);
  };

  const handleBooking = async () => {
    if (!selectedTreatment && service.subTreatments?.length > 0) {
      toast.error("Please select a treatment option");
      return;
    }
    if (!selectedDate || !selectedTime) {
      toast.error("Please select date and time");
      return;
    }

    if (!currentUser?.selectedLocation?.locationId) {
      toast.error("Please select a spa location first");
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
        locationId: currentUser.selectedLocation.locationId,
        notes: "",
        rewardUsed: null,
        pointsUsed: 0,
        treatment: selectedTreatment
          ? {
              id: selectedTreatment._id || selectedTreatment.id,
              name: selectedTreatment.name,
              price: selectedTreatment.price,
              duration: selectedTreatment.duration,
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
      };

      const response = await stripeService.createCheckoutSession(bookingData);

      if (response.success && response.sessionUrl) {
        window.location.href = response.sessionUrl;
      } else {
        toast.error("Failed to create payment session");
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to process booking. Please try again."
      );
      setIsProcessing(false);
    }
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  const availableTimes = getAvailableTimes();

  return (
    <Layout>
      <div className="px-4 py-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={handleBackClick}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors h-8 px-3 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Services</span>
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="relative h-64 md:h-80">
                <img
                  src={
                    service.image ||
                    "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=400&fit=crop"
                  }
                  alt={service.name}
                  className="w-full h-full object-cover"
                />
                {isDiscountActive && (
                  <div className="absolute top-4 right-4">
                    <span className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1">
                      <Percent className="w-4 h-4" />
                      {service.discount.percentage}% OFF
                    </span>
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <span className="bg-gradient-to-r from-pink-500 to-rose-600 text-white px-3 py-2 rounded-lg text-sm font-bold">
                    {service.categoryId?.name ||
                      service.categoryName ||
                      "Service"}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                      {service.name}
                    </h1>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-5 h-5 text-yellow-500 fill-current" />
                        <span className="font-semibold text-gray-900">
                          {service.rating?.toFixed(1) || "5.0"}
                        </span>
                        <span className="text-gray-600">
                          ({service.totalReviews || service.reviewCount || 0}{" "}
                          reviews)
                        </span>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${
                          service.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {service.status}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-gray-600 mb-6 leading-relaxed">
                  {service.description}
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-blue-900">
                        Practitioner
                      </span>
                    </div>
                    <p className="text-blue-800">
                      {service.practitioner ||
                        service.createdBy?.name ||
                        "Professional Staff"}
                    </p>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-900">
                        Starting Price
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isDiscountActive ? (
                        <>
                          <span className="text-lg font-bold text-green-800">
                            $
                            {calculateDiscountedPrice(
                              service.basePrice
                            ).toFixed(2)}
                          </span>
                          <span className="text-sm text-gray-500 line-through">
                            ${service.basePrice}
                          </span>
                        </>
                      ) : (
                        <span className="text-lg font-bold text-green-800">
                          ${service.basePrice}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-purple-900">
                        Duration
                      </span>
                    </div>
                    <p className="text-purple-800">
                      {service.duration} minutes
                    </p>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-orange-600" />
                      <span className="font-semibold text-orange-900">
                        Daily Limit
                      </span>
                    </div>
                    <p className="text-orange-800">
                      {service.limit} appointments
                    </p>
                  </div>
                </div>

                {(service.bookings > 0 || service.totalReviews > 0) && (
                  <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    {service.bookings > 0 && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-gray-600">
                          {service.bookings} successful bookings
                        </span>
                      </div>
                    )}
                    {service.totalReviews > 0 && (
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500" />
                        <span className="text-sm text-gray-600">
                          {service.totalReviews} customer reviews
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Treatment Options
              </h2>

              {service.subTreatments && service.subTreatments.length > 0 ? (
                <div className="grid gap-4">
                  {service.subTreatments.map((treatment, index) => (
                    <div
                      key={treatment._id || treatment.id || index}
                      onClick={() => handleTreatmentSelect(treatment)}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedTreatment?.id === treatment.id ||
                        selectedTreatment?._id === treatment._id
                          ? "border-pink-500 bg-pink-50"
                          : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                selectedTreatment?.id === treatment.id ||
                                selectedTreatment?._id === treatment._id
                                  ? "border-pink-500 bg-pink-500"
                                  : "border-gray-300"
                              }`}
                            >
                              {(selectedTreatment?.id === treatment.id ||
                                selectedTreatment?._id === treatment._id) && (
                                <div className="w-2 h-2 bg-white rounded-full" />
                              )}
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {treatment.name}
                            </h3>
                            {treatment.popular && (
                              <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">
                                Popular
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 mb-3">
                            {treatment.description}
                          </p>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-600">
                                {treatment.duration} min
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          {isDiscountActive ? (
                            <div>
                              <div className="text-lg font-bold text-green-600">
                                $
                                {calculateDiscountedPrice(
                                  treatment.price
                                ).toFixed(2)}
                              </div>
                              <div className="text-sm text-gray-500 line-through">
                                ${treatment.price}
                              </div>
                            </div>
                          ) : (
                            <div className="text-lg font-bold text-green-600">
                              ${treatment.price}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No specific treatment options available.</p>
                  <p className="text-sm">This service can be booked as is.</p>
                </div>
              )}
            </div>

            {service.linkedServices && service.linkedServices.length > 0 && (
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <Zap className="w-6 h-6 text-pink-500" />
                  <h2 className="text-xl font-bold text-gray-900">
                    Recommended Add-ons
                  </h2>
                </div>

                <p className="text-gray-600 mb-6">
                  Enhance your experience with these additional services at
                  special pricing
                </p>

                <div className="grid gap-4">
                  {service.linkedServices.map((addOn, index) => {
                    const isSelected = selectedAddOns.some(
                      (item) => item.serviceId === addOn.serviceId
                    );
                    const finalPrice =
                      addOn.finalPrice || addOn.customPrice || addOn.basePrice;
                    const finalDuration =
                      addOn.finalDuration ||
                      addOn.customDuration ||
                      addOn.duration;
                    const originalPrice = addOn.basePrice;
                    const hasSpecialPrice = finalPrice !== originalPrice;

                    return (
                      <div
                        key={addOn.serviceId || index}
                        onClick={() => handleAddOnToggle(addOn)}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          isSelected
                            ? "border-pink-500 bg-pink-50"
                            : "border-gray-200 hover:border-pink-300 hover:bg-pink-25"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-1 ${
                              isSelected
                                ? "border-pink-500 bg-pink-500"
                                : "border-gray-300"
                            }`}
                          >
                            {isSelected && (
                              <div className="w-2 h-2 bg-white rounded-full" />
                            )}
                          </div>

                          <img
                            src={
                              addOn.image ||
                              "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=100&h=100&fit=crop"
                            }
                            alt={addOn.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {addOn.name}
                              </h3>
                              {hasSpecialPrice && (
                                <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full">
                                  Special Price
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600 mb-3 text-sm">
                              {addOn.description}
                            </p>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-600">
                                  +{finalDuration} min
                                </span>
                              </div>
                              {addOn.categoryId && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                  {addOn.categoryId.name}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="text-lg font-bold text-green-600">
                                  +${finalPrice.toFixed(2)}
                                </div>
                                {hasSpecialPrice && (
                                  <div className="text-sm text-gray-500 line-through">
                                    ${originalPrice.toFixed(2)}
                                  </div>
                                )}
                              </div>
                              {isSelected ? (
                                <div className="bg-pink-500 text-white p-1 rounded-lg">
                                  <CheckCircle className="w-4 h-4" />
                                </div>
                              ) : (
                                <div className="bg-gray-100 text-gray-400 p-1 rounded-lg">
                                  <Plus className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            {hasSpecialPrice && (
                              <div className="text-xs text-green-600 mt-1">
                                Save ${(originalPrice - finalPrice).toFixed(2)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedAddOns.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">
                      Selected Add-ons ({selectedAddOns.length})
                    </h4>
                    <div className="space-y-1">
                      {selectedAddOns.map((addOn, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-green-800">{addOn.name}</span>
                          <span className="text-green-600 font-semibold">
                            +$
                            {(
                              addOn.finalPrice ||
                              addOn.customPrice ||
                              addOn.basePrice
                            ).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg p-6 shadow-sm sticky top-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Book Appointment
              </h3>

              {/* ✅ SHOW CART ITEMS */}
              {cartTimesForService.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    In Your Cart
                  </h4>
                  <div className="space-y-1">
                    {cartTimesForService.map((time, idx) => (
                      <p key={idx} className="text-sm text-blue-800">
                        ✓ {selectedDate} at {time}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {service.subTreatments && service.subTreatments.length > 0 ? (
                selectedTreatment ? (
                  <div className="mb-6 p-4 bg-pink-50 rounded-lg">
                    <h4 className="font-semibold text-pink-900 mb-2">
                      Selected Treatment
                    </h4>
                    <p className="text-pink-800 mb-2">
                      {selectedTreatment.name}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-pink-600">
                        {selectedTreatment.duration} min
                      </span>
                      <span className="font-bold text-pink-800">
                        $
                        {calculateDiscountedPrice(
                          selectedTreatment.price
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-gray-600">
                      Please select a treatment option
                    </p>
                  </div>
                )
              ) : (
                <div className="mb-6 p-4 bg-pink-50 rounded-lg">
                  <h4 className="font-semibold text-pink-900 mb-2">Service</h4>
                  <p className="text-pink-800 mb-2">{service.name}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-pink-600">
                      {service.duration} min
                    </span>
                    <span className="font-bold text-pink-800">
                      ${calculateDiscountedPrice(service.basePrice).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {selectedAddOns.length > 0 && (
                <div className="mb-6 p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-green-900">Add-ons</h4>
                    <button
                      onClick={() => setSelectedAddOns([])}
                      className="text-green-600 hover:text-green-800 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {selectedAddOns.map((addOn, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-green-800">{addOn.name}</span>
                        <span className="text-green-600 font-semibold">
                          +$
                          {(
                            addOn.finalPrice ||
                            addOn.customPrice ||
                            addOn.basePrice
                          ).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 h-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Time
                  {loadingTimes && (
                    <span className="text-xs text-gray-500 ml-2">
                      (Loading available times...)
                    </span>
                  )}
                </label>

                {selectedDate ? (
                  availableTimes.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {availableTimes.map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`px-3 h-8 text-sm font-medium rounded-lg transition-colors ${
                            selectedTime === time
                              ? "bg-gradient-to-r from-pink-500 to-rose-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm text-yellow-800">
                        ❌ No available time slots for this date. Please select
                        a different date.
                      </p>
                    </div>
                  )
                ) : (
                  <p className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
                    Please select a date first to see available times
                  </p>
                )}
              </div>

              {((selectedTreatment && service.subTreatments?.length > 0) ||
                !service.subTreatments?.length) &&
                selectedDate &&
                selectedTime && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Booking Summary
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Service:</span>
                        <span className="text-gray-900">
                          {selectedTreatment?.name || service.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date:</span>
                        <span className="text-gray-900">{selectedDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Time:</span>
                        <span className="text-gray-900">{selectedTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="text-gray-900">
                          {calculateTotalDuration()} min
                        </span>
                      </div>
                      {selectedAddOns.length > 0 && (
                        <div className="pt-2 border-t">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Base Service:</span>
                            <span>
                              $
                              {calculateDiscountedPrice(
                                selectedTreatment?.price || service.basePrice
                              ).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Add-ons ({selectedAddOns.length}):</span>
                            <span>
                              +$
                              {selectedAddOns
                                .reduce(
                                  (total, addOn) =>
                                    total +
                                    (addOn.finalPrice ||
                                      addOn.customPrice ||
                                      addOn.basePrice),
                                  0
                                )
                                .toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-semibold">
                          <span className="text-gray-900">Total:</span>
                          <span className="text-green-600">
                            ${calculateTotalPrice().toFixed(2)}
                          </span>
                        </div>
                        {isDiscountActive && (
                          <div className="text-xs text-green-600 mt-1">
                            You save $
                            {(
                              (selectedTreatment?.price || service.basePrice) -
                              calculateDiscountedPrice(
                                selectedTreatment?.price || service.basePrice
                              )
                            ).toFixed(2)}{" "}
                            on the main service!
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              <div className="space-y-2">
                <button
                  onClick={handleAddToCart}
                  disabled={
                    !selectedDate ||
                    !selectedTime ||
                    (service.subTreatments?.length > 0 && !selectedTreatment)
                  }
                  className="w-full bg-green-500 text-white h-10 rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add to Cart
                </button>

                <button
                  onClick={handleBooking}
                  disabled={
                    isProcessing ||
                    !selectedDate ||
                    !selectedTime ||
                    (service.subTreatments?.length > 0 && !selectedTreatment)
                  }
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-600 text-white h-10 rounded-lg font-semibold hover:from-pink-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-5 h-5" />
                      Book Now
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-3 text-center">
                You can cancel or reschedule up to 24 hours before your
                appointment
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ServiceDetailPage;
