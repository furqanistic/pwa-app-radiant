// File: client/src/pages/Bookings/ServiceDetailPage.jsx
// ✅ FIXED: Booked times + Cart duplicate prevention

import { useAvailability } from "@/hooks/useAvailability";
import { useService } from "@/hooks/useServices";
import Layout from "@/pages/Layout/Layout";
import {
    ArrowLeft,
    Calendar,
    Check,
    CheckCircle,
    Clock,
    DollarSign,
    Info,
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
import { useNavigate, useParams } from "react-router-dom";
import { toast } from 'sonner';
import { addToCart } from "../../redux/cartSlice";
import stripeService from "../../services/stripeService";

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

  // ✅ DYNAMIC AVAILABILITY
  const { 
    data: availabilityData, 
    isLoading: loadingAvailability 
  } = useAvailability(
    currentUser?.selectedLocation?.locationId,
    selectedDate,
    serviceId
  );

  const availableSlots = availabilityData?.slots || [];

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

  // Auto-select single treatment if strict match
  useEffect(() => {
    if (service?.subTreatments?.length === 1 && !selectedTreatment) {
       setSelectedTreatment(service.subTreatments[0]);
    }
  }, [service, selectedTreatment]);


  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
          <span className="ml-3 text-lg font-medium text-gray-600">
            Loading service details...
          </span>
        </div>
      </Layout>
    );
  }

  if (isError || !service) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh] px-4">
          <div className="text-center max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
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

  const calculateDiscountedPrice = (price) => {
    if (isDiscountActive) {
      return price - (price * service.discount.percentage) / 100;
    }
    return price;
  };

  const handleTreatmentSelect = (treatment) => {
    // Simply set the treatment, React handles the rest. 
    // This fixes the issue where user might think it's not working if they click again.
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
    // Validation
    if ((service.subTreatments?.length > 0) && !selectedTreatment) {
      toast.error("Please select a treatment option");
      const element = document.getElementById('treatments-section');
      if (element) element.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (!selectedDate || !selectedTime) {
      toast.error("Please select date and time");
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

    // Optional: Reset selection or navigate
    setSelectedDate("");
    setSelectedTime("");
    // Don't reset treatment if it's the main choice user made
  };

  const handleBooking = async () => {
    if ((service.subTreatments?.length > 0) && !selectedTreatment) {
      toast.error("Please select a treatment option");
       const element = document.getElementById('treatments-section');
       if (element) element.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (!selectedDate || !selectedTime) {
      toast.error("Please select date and time");
       const element = document.getElementById('datetime-section');
       if (element) element.scrollIntoView({ behavior: 'smooth' });
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

  const totalPrice = calculateTotalPrice();
  const totalDuration = calculateTotalDuration();

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
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-bold shadow-lg shadow-pink-500/20">
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
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-pink-400" />
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
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                 <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Info className="w-5 h-5 text-gray-400" /> About this service
                 </h2>
                 <p className="text-gray-600 leading-relaxed">
                   {service.description}
                 </p>
                 
                 {/* Quick Stats Grid */}
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
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
                     <div className="text-center p-3 rounded-xl bg-purple-50/50">
                       <Zap className="w-5 h-5 mx-auto text-purple-600 mb-1.5" />
                       <div className="text-xs text-gray-500">Instant</div>
                       <div className="font-semibold text-gray-900 text-sm">Booking</div>
                    </div>
                 </div>
              </div>

              {/* Treatment Options */}
              <div id="treatments-section" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Select Treatment</h2>
                
                {service.subTreatments && service.subTreatments.length > 0 ? (
                  <div className="grid gap-4">
                    {service.subTreatments.map((treatment) => {
                      // Robust ID check
                      const isSelected = (selectedTreatment?._id && treatment._id && selectedTreatment._id === treatment._id) || 
                                       (selectedTreatment?.id && treatment.id && selectedTreatment.id === treatment.id) ||
                                       (selectedTreatment?._id === treatment.id) || 
                                       (selectedTreatment?.id === treatment._id);

                      return (
                        <div
                          key={treatment._id || treatment.id}
                          onClick={() => handleTreatmentSelect(treatment)}
                          className={`relative cursor-pointer rounded-2xl p-5 transition-all duration-200 border-2 ${
                            isSelected
                              ? "border-pink-500 bg-pink-50 ring-2 ring-pink-200 ring-offset-1"
                              : "border-gray-100 hover:border-pink-200 hover:bg-gray-50"
                          }`}
                        >
                           <div className="flex justify-between items-start">
                              <div className="flex gap-4">
                                 {/* Custom Radio Button */}
                                 <div className={`mt-0.5 h-6 w-6 min-w-[1.5rem] rounded-full border-2 flex items-center justify-center transition-all ${
                                    isSelected ? "border-pink-500 bg-pink-500" : "border-gray-300"
                                 }`}>
                                    {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                                 </div>
                                 
                                 <div>
                                    <h3 className={`font-bold text-lg mb-1 leading-snug ${isSelected ? "text-pink-900" : "text-gray-900"}`}>
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
                                 <div className={`text-xl font-bold ${isSelected ? "text-pink-600" : "text-gray-900"}`}>
                                    ${treatment.price}
                                 </div>
                              </div>
                           </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-6 text-center border border-dashed border-gray-300">
                     <p className="text-gray-500">Standard service booking. No variants available.</p>
                  </div>
                )}
              </div>

               {/* Add-ons Section */}
               {service.linkedServices && service.linkedServices.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                   <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-gray-900">Recommended Add-ons</h2>
                      <span className="bg-pink-100 text-pink-700 text-xs font-bold px-2 py-1 rounded-full">Optional</span>
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
                                    : "border-gray-200 hover:border-gray-300"
                               }`}
                            >
                               <div className="flex items-center gap-3">
                                  <div className={`flex items-center justify-center h-5 w-5 min-w-[1.25rem] rounded-md border-2 transition-colors ${
                                     isSelected ? "bg-green-500 border-green-500" : "border-gray-300"
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

              {/* Date & Time Section */}
              <div id="datetime-section" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Select Date & Time</h2>
                
                <div className="space-y-6">
                   {/* Date Picker */}
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
                        className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all appearance-none text-base"
                        style={{ WebkitAppearance: 'none' }} 
                      />
                   </div>

                   {/* Time Slots */}
                   <div>
                      <div className="flex items-center justify-between mb-3">
                         <label className="block text-sm font-medium text-gray-700">Available Slots</label>
                         {loadingAvailability && <span className="text-xs text-pink-500 animate-pulse">Checking availability...</span>}
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
                                     ? "bg-gradient-to-r from-pink-500 to-rose-600 text-white border-transparent shadow-lg"
                                     : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                 }`}
                               >
                                 {time}
                               </button>
                             ))}
                           </div>
                         ) : (
                           <div className="p-6 bg-gray-50 rounded-xl text-center border border-gray-100">
                              <p className="text-gray-500">No time slots available for this date.</p>
                           </div>
                         )
                      ) : (
                         <div className="p-6 bg-gray-50 rounded-xl text-center border border-gray-100">
                            <p className="text-gray-500">Please select a date to view times.</p>
                         </div>
                      )}
                   </div>
                </div>
              </div>

            </div>

             {/* RIGHT COLUMN - DESKTOP SUMMARY */}
             <div className="hidden lg:block lg:col-span-1">
                <div className="sticky top-24 bg-white rounded-2xl p-6 shadow-xl shadow-gray-200/50 border border-gray-100">
                   <h3 className="font-bold text-gray-900 mb-4 text-lg">Booking Summary</h3>
                   
                   <div className="space-y-4 mb-6">
                      <div className="flex justify-between text-sm">
                         <span className="text-gray-500">Service</span>
                         <span className="font-medium text-gray-900 text-right max-w-[60%]">{selectedTreatment?.name || service.name}</span>
                      </div>
                      {selectedAddOns.length > 0 && (
                          <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Add-ons ({selectedAddOns.length})</span>
                              <span className="font-medium text-gray-900">+${selectedAddOns.reduce((acc, curr) => acc + (curr.finalPrice || curr.basePrice), 0)}</span>
                          </div>
                      )}
                      
                      <div className="h-px bg-gray-100 my-2" />
                      
                      <div className="flex justify-between items-center">
                         <span className="text-gray-900 font-bold">Total</span>
                         <div className="text-right">
                            <div className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-rose-600 bg-clip-text text-transparent">
                               ${totalPrice.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500 font-medium">{totalDuration} mins</div>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <button
                        onClick={handleBooking}
                        disabled={isProcessing}
                        className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-xl font-bold shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? "Processing..." : "Book Now"}
                      </button>
                      <button
                        onClick={handleAddToCart}
                        className="w-full py-3.5 bg-white border-2 border-gray-100 text-gray-900 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-200 transition-all flex items-center justify-center gap-2"
                      >
                         <Plus className="w-4 h-4" /> Add to Cart
                      </button>
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
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-[60] pb-[calc(1rem+env(safe-area-inset-bottom))]">
         <div className="flex items-center gap-4 max-w-lg mx-auto">
            <div className="flex-1">
               <div className="text-xs text-gray-500 font-medium mb-0.5">Total for {totalDuration} min</div>
               <div className="text-2xl font-bold text-gray-900 leading-none">
                  ${totalPrice.toFixed(2)}
               </div>
            </div>
            <div className="flex gap-2">
               <button
                  onClick={handleAddToCart}
                   className="p-3.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
               >
                  <Plus className="w-6 h-6" />
               </button>
               <button
                  onClick={handleBooking}
                  disabled={isProcessing}
                  className="px-6 py-3.5 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-xl font-bold shadow-lg shadow-pink-500/25 disabled:opacity-50"
               >
                  {isProcessing ? (
                     <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                     </span>
                  ) : (
                     "Book"
                  )}
               </button>
            </div>
         </div>
         {/* Safe area is handled by padding-bottom now, removed separate spacer div to avoid double spacing if any */}
      </div>
    </Layout>
  );
};

export default ServiceDetailPage;
