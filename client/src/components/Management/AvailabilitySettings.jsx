import { Button } from "@/components/ui/button";
import { useAvailability, useUpdateAvailability } from "@/hooks/useAvailability";
import { authService } from "@/services/authService";
import { useQuery } from "@tanstack/react-query";
import { Clock, Copy, Save, X } from "lucide-react";
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
    // Prefer fetched data, fallback to redux, then defaults
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
      await updateAvailability.mutateAsync(schedule);
      toast.success("Availability updated successfully!");
      onClose();
    } catch (error) {
      toast.error("Failed to update availability");
      console.error(error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-pink-500" />
            <h2 className="text-xl font-bold text-gray-900">
              Availability Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600">
              Set your weekly business hours.
            </p>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSet9to5}
                className="text-xs h-8"
            >
                Quick Set: 9am-5pm
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border transition-all ${
                    isClosed
                      ? "bg-gray-50 border-gray-200"
                      : "bg-white border-gray-200 hover:border-pink-200 hover:shadow-sm"
                  }`}
                >
                  <div className="w-24">
                    <span className="font-semibold capitalize text-gray-700">
                      {day}
                    </span>
                  </div>

                  <div className="flex-1 flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none min-w-[80px]">
                      <input
                        type="checkbox"
                        checked={isClosed}
                        onChange={() => handleToggleClosed(day)}
                        className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                      />
                      <span className="text-sm text-gray-600">Closed</span>
                    </label>

                    {!isClosed ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time"
                          value={config.open}
                          onChange={(e) =>
                            handleDayChange(day, "open", e.target.value)
                          }
                          className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                          type="time"
                          value={config.close}
                          onChange={(e) =>
                            handleDayChange(day, "close", e.target.value)
                          }
                          className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                        />
                      </div>
                    ) : (
                        <div className="flex-1 text-sm text-gray-400 italic">
                            No appointments available
                        </div>
                    )}
                    
                    <button
                        type="button"
                        onClick={() => handleCopyToAll(day)}
                        className="p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-colors title='Apply to all days'"
                         title="Apply this schedule to all days"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="pt-6 flex justify-end gap-3 border-t border-gray-100 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateAvailability.isPending}
                className="bg-gradient-to-r from-pink-500 to-rose-600 text-white hover:from-pink-600 hover:to-rose-700"
              >
                {updateAvailability.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Save Changes
                  </div>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AvailabilitySettings;
