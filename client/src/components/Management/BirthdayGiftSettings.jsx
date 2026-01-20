import { Button } from "@/components/ui/button";
import { useUpdateAvailability } from "@/hooks/useAvailability";
import { locationService } from "@/services/locationService";
import { servicesService } from "@/services/servicesService";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, Save, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

const BirthdayGiftSettings = ({ isOpen, onClose }) => {
  const { currentUser } = useSelector((state) => state.user);
  const updateAvailability = useUpdateAvailability();

  const [birthdayGift, setBirthdayGift] = useState({
    isActive: false,
    giftType: "free",
    value: 0,
    serviceId: "",
    message: "Happy Birthday! Here is a special gift for you.",
  });

  // Fetch my location settings
  const { data: locationData } = useQuery({
    queryKey: ["myLocation"],
    queryFn: () => locationService.getMyLocation(),
    enabled: !!currentUser,
  });

  // Fetch services for gift selection
  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesService.getServices(),
    enabled: !!currentUser,
  });

  useEffect(() => {
    // Set birthday gift settings from location data
    if (locationData?.data?.location?.birthdayGift) {
      setBirthdayGift({
        isActive: locationData.data.location.birthdayGift.isActive || false,
        giftType: locationData.data.location.birthdayGift.giftType || "free",
        value: locationData.data.location.birthdayGift.value || 0,
        serviceId: locationData.data.location.birthdayGift.serviceId || "",
        message:
          locationData.data.location.birthdayGift.message ||
          "Happy Birthday! Here is a special gift for you.",
      });
    }
  }, [locationData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateAvailability.mutateAsync({
        birthdayGift: birthdayGift,
      });
      toast.success("Birthday gift settings updated!");
      onClose();
    } catch (error) {
      toast.error("Failed to update settings");
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
            className="fixed inset-x-0 bottom-0 md:inset-x-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:bottom-auto w-full md:max-w-xl bg-white md:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[95vh]"
          >
            {/* Native-style Grabber for Mobile */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-3 md:hidden shrink-0" />

            {/* Header */}
            <div className="px-6 py-4 md:px-8 md:py-6 border-b border-gray-50 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                  Gift Settings
                </h2>
                <p className="text-xs md:text-sm font-bold text-purple-500 uppercase tracking-widest mt-0.5">
                  Automated Rewards
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 bg-gray-100 text-gray-500 rounded-2xl hover:bg-purple-50 hover:text-purple-500 transition-all group"
              >
                <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-purple-50/50 rounded-3xl border border-purple-100/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                      <Gift className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 leading-none">
                        Birthday Gift
                      </p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter mt-1">
                        Automated User Reward
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {birthdayGift.isActive ? "Enabled" : "Disabled"}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setBirthdayGift((prev) => ({
                          ...prev,
                          isActive: !prev.isActive,
                        }))
                      }
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        birthdayGift.isActive ? "bg-purple-500" : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          birthdayGift.isActive
                            ? "translate-x-6"
                            : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {birthdayGift.isActive && (
                  <div className="p-4 md:p-6 bg-white rounded-3xl border-2 border-purple-50 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                          Gift Type
                        </label>
                        <select
                          value={birthdayGift.giftType}
                          onChange={(e) =>
                            setBirthdayGift((prev) => ({
                              ...prev,
                              giftType: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                          <option value="free">100% Free</option>
                          <option value="percentage">Percentage Discount</option>
                          <option value="fixed">Fixed Amount Off</option>
                        </select>
                      </div>

                      {birthdayGift.giftType !== "free" && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                            {birthdayGift.giftType === "percentage"
                              ? "Discount Percentage (%)"
                              : "Discount Amount ($)"}
                          </label>
                          <input
                            type="number"
                            value={birthdayGift.value}
                            onChange={(e) =>
                              setBirthdayGift((prev) => ({
                                ...prev,
                                value: parseFloat(e.target.value) || 0,
                              }))
                            }
                            placeholder="Enter value..."
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                          Select Gift Service
                        </label>
                        <select
                          value={birthdayGift.serviceId}
                          onChange={(e) =>
                            setBirthdayGift((prev) => ({
                              ...prev,
                              serviceId: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                          <option value="">Select a service...</option>
                          {servicesData?.data?.services?.map((service) => (
                            <option key={service._id} value={service._id}>
                              {service.name} (${service.price})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                          Gift Message
                        </label>
                        <input
                          type="text"
                          value={birthdayGift.message}
                          onChange={(e) =>
                            setBirthdayGift((prev) => ({
                              ...prev,
                              message: e.target.value,
                            }))
                          }
                          placeholder="Enter a birthday message..."
                          className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="pt-4 flex flex-col md:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 rounded-2xl h-14 font-black uppercase tracking-widest text-xs border-2 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={updateAvailability.isPending}
                  className="flex-[2] rounded-2xl h-14 bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-xl shadow-purple-200/50 font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {updateAvailability.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save className="w-5 h-5" />
                      Save Settings
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BirthdayGiftSettings;
