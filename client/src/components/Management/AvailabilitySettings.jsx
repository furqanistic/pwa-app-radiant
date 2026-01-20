import { Button } from "@/components/ui/button";
import { useAvailability, useUpdateAvailability } from "@/hooks/useAvailability";
import { authService } from "@/services/authService";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
    Calendar,
    Clock,
    Layers,
    Moon,
    Save,
    Sun,
    X
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const AvailabilitySettings = ({ isOpen, onClose }) => {
  const { currentUser } = useSelector((state) => state.user);
  const updateAvailability = useUpdateAvailability();

  // Initialize with current user's hours or defaults
  const [schedule, setSchedule] = useState({});


  // Fetch fresh user data to get current hours
  const { data: userData } = useQuery({
    queryKey: ["currentUser", currentUser?._id],
    queryFn: () => authService.getCurrentUser(),
    enabled: !!currentUser,
  });



  useEffect(() => {
    // Prefer fetched data for business hours
    const sourceUser = userData?.data || currentUser;
    
    if (sourceUser?.spaLocation?.businessHours) {
      setSchedule(sourceUser.spaLocation.businessHours);
    } else {
        // Default structure
        const defaults = {};
        DAYS.forEach(day => {
            defaults[day] = { open: "09:00", close: "17:00", closed: false };
        });
        setSchedule(defaults);
    }

  }, [userData, currentUser]);

  const handleDayChange = (day, field, value) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleToggleClosed = (day) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        closed: !prev[day]?.closed,
      },
    }));
  };

  const handleCopyToAll = (sourceDay) => {
    const sourceConfig = schedule[sourceDay];
    if (!sourceConfig) return;

    setSchedule((prev) => {
      const newSchedule = { ...prev };
      DAYS.forEach((day) => {
        if (day !== sourceDay) {
          newSchedule[day] = { ...sourceConfig };
        }
      });
      return newSchedule;
    });
    toast.success(`Copied ${sourceDay}'s hours to all days`);
  };

  const handleSet9to5 = () => {
    setSchedule((prev) => {
      const newSchedule = { ...prev };
      DAYS.forEach((day) => {
        newSchedule[day] = { open: "09:00", close: "17:00", closed: false };
      });
      return newSchedule;
    });
    toast.success("Set all days to 9:00 AM - 5:00 PM");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateAvailability.mutateAsync({
        businessHours: schedule,
      });
      toast.success("Availability updated successfully!");
      onClose();
    } catch (error) {
      toast.error("Failed to update availability");
      console.error(error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 md:inset-x-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:bottom-auto w-full md:max-w-3xl bg-white md:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]"
          >
            {/* Native-style Grabber for Mobile */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-3 md:hidden shrink-0" />

            {/* Header */}
            <div className="px-6 py-4 md:px-10 md:py-8 border-b border-gray-50 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                    Hours of Operation
                </h2>
                <p className="text-xs md:text-sm font-bold text-pink-500 uppercase tracking-widest mt-0.5">
                    Schedule Management
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 bg-gray-100 text-gray-500 rounded-2xl hover:bg-pink-50 hover:text-pink-500 transition-all group"
              >
                <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-10 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-pink-50/50 rounded-3xl border border-pink-100/50">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                        <Calendar className="w-5 h-5 text-pink-500" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-gray-900 leading-none">Global Setting</p>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter mt-1">Quick Configuration</p>
                    </div>
                 </div>
                 <Button 
                    variant="white" 
                    size="sm" 
                    onClick={handleSet9to5}
                    className="rounded-xl font-bold text-xs h-10 px-6 shadow-sm border-none bg-white hover:bg-pink-50 text-pink-600 transition-all"
                >
                    9:00 AM - 5:00 PM
                </Button>
              </div>



              <form onSubmit={handleSubmit} className="space-y-3">
                {DAYS.map((day) => {
                  const config = schedule[day] || {
                    open: "09:00",
                    close: "17:00",
                    closed: false,
                  };
                  const isClosed = config.closed;

                  return (
                    <div
                      key={day}
                      className={`relative flex flex-col md:flex-row md:items-center gap-3 md:gap-6 p-4 md:p-5 rounded-[2.5rem] border-2 transition-all min-h-[140px] md:min-h-[96px] ${
                        isClosed
                          ? "bg-gray-50/50 border-gray-100 opacity-60"
                          : "bg-white border-gray-50 shadow-sm hover:border-pink-100"
                      }`}
                    >
                      {/* Day Label */}
                      <div className="md:w-32 flex items-center gap-3 shrink-0 md:border-r md:border-gray-50 md:pr-4">
                        <div className={`p-2.5 rounded-2xl shrink-0 ${isClosed ? 'bg-gray-200 text-gray-400' : 'bg-pink-100 text-pink-500'}`}>
                            <Clock className="w-4 h-4" />
                        </div>
                        <span className="font-extrabold capitalize text-gray-900 shrink-0 text-sm md:text-base">
                          {day}
                        </span>
                      </div>

                      {/* Controls Area */}
                      <div className="flex-1 flex items-center justify-between gap-4">
                        <div className="flex-1 flex flex-row items-center gap-3 md:gap-6">
                          {/* Custom Toggle for Closed State */}
                          <button
                            type="button"
                            onClick={() => handleToggleClosed(day)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all shrink-0 ${
                              isClosed 
                              ? "bg-gray-200 text-gray-600 shadow-inner" 
                              : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            }`}
                          >
                            {isClosed ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                            {isClosed ? "Closed" : "Open"}
                          </button>

                          {!isClosed ? (
                            <div className="flex items-center gap-2 flex-1 max-w-[320px]">
                              <div className="relative flex-1">
                                  <input
                                      type="time"
                                      value={config.open}
                                      onChange={(e) => handleDayChange(day, "open", e.target.value)}
                                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs md:text-sm font-bold text-gray-900 focus:ring-2 focus:ring-pink-500 outline-none transition-all text-center"
                                  />
                              </div>
                              <span className="text-gray-300 font-bold">-</span>
                              <div className="relative flex-1">
                                  <input
                                      type="time"
                                      value={config.close}
                                      onChange={(e) => handleDayChange(day, "close", e.target.value)}
                                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs md:text-sm font-bold text-gray-900 focus:ring-2 focus:ring-pink-500 outline-none transition-all text-center"
                                  />
                              </div>
                            </div>
                          ) : (
                              <div className="flex-1 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                 Away / Not Available
                              </div>
                          )}
                        </div>
                        
                        {/* Apply to All Button */}
                        <button
                            type="button"
                            onClick={() => handleCopyToAll(day)}
                            className="p-3.5 bg-gray-50 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-2xl transition-all shrink-0 shadow-sm md:shadow-none"
                             title="Apply to all days"
                        >
                            <Layers className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Footer Actions */}
                <div className="pt-8 pb-4 flex flex-col md:flex-row gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 rounded-2xl h-14 font-black uppercase tracking-widest text-xs border-2 hover:bg-gray-50 transition-all"
                  >
                    Discard Changes
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateAvailability.isPending}
                    className="flex-[2] rounded-2xl h-14 bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-xl shadow-pink-200/50 font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {updateAvailability.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Save className="w-5 h-5" />
                        Confirm & Save
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AvailabilitySettings;

