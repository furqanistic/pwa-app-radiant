import { Button } from "@/components/ui/button";
import { useUpdateAvailability } from "@/hooks/useAvailability";
import { authService } from "@/services/authService";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
    Calendar,
    Clock,
    Layers,
    LocateFixed,
    MapPin,
    Moon,
    Phone,
    Save,
    Search,
    Sun,
    X
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useSelector } from "react-redux";
import { toast } from "sonner";

// Fix Leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const MapPicker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position ? <Marker position={position} draggable={true} eventHandlers={{
    dragend: (e) => {
        setPosition(e.target.getLatLng());
    }
  }} /> : null;
};

// Component to handle map view updates
const MapUpdater = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, 13);
    }
  }, [position, map]);
  return null;
};

const AvailabilitySettings = ({ isOpen, onClose }) => {
  const { currentUser } = useSelector((state) => state.user);
  const updateAvailability = useUpdateAvailability();

  const [schedule, setSchedule] = useState({});
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [reviewLink, setReviewLink] = useState("");
  const [position, setPosition] = useState(null); // { lat, lng }
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Fetch fresh user data to get current hours and location info
  const { data: userData } = useQuery({
    queryKey: ["currentUser", currentUser?._id],
    queryFn: () => authService.getCurrentUser(),
    enabled: !!currentUser && isOpen,
  });

  useEffect(() => {
    const sourceUser = userData?.data?.user || currentUser;
    const spaLoc = sourceUser?.spaLocation;
    
    if (spaLoc) {
      if (spaLoc.businessHours) setSchedule(spaLoc.businessHours);
      setAddress(spaLoc.locationAddress || "");
      setPhone(spaLoc.locationPhone || "");
      setReviewLink(spaLoc.reviewLink || "");
      if (spaLoc.coordinates?.latitude && spaLoc.coordinates?.longitude) {
        setPosition({ lat: spaLoc.coordinates.latitude, lng: spaLoc.coordinates.longitude });
      } else {
        // Default to a reasonable center if no position (e.g., London or NY or based on some context)
        // Let's try to geocode if address exists, otherwise just default
        setPosition({ lat: 51.505, lng: -0.09 }); 
      }
    } else {
        // Default structure
        const defaults = {};
        DAYS.forEach(day => {
            defaults[day] = { open: "09:00", close: "17:00", closed: false };
        });
        setSchedule(defaults);
    }
  }, [userData, currentUser, isOpen]);

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
        address,
        phone,
        reviewLink,
        latitude: position?.lat,
        longitude: position?.lng
      });
      onClose();
      toast.success("Location and time settings updated!");
    } catch (error) {
      toast.error("Failed to update settings");
      console.error(error);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newPos = { lat: parseFloat(lat), lng: parseFloat(lon) };
        setPosition(newPos);
        toast.success(`Found: ${data[0].display_name}`);
      } else {
        toast.error("Location not found. Try a more specific address.");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search location");
    } finally {
      setIsSearching(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsSearching(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(newPos);
        setSearchTerm(""); // Clear search as we found by GPS
        toast.success("Location pinpointed via GPS!");
        setIsSearching(false);
      },
      (err) => {
        console.error("GPS error:", err);
        toast.error("Could not get your location. Please check browser permissions.");
        setIsSearching(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 md:inset-x-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:bottom-auto w-full md:max-w-4xl bg-white md:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]"
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-3 md:hidden shrink-0" />

            <div className="px-6 py-4 md:px-10 md:py-8 border-b border-gray-50 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                    Edit Location and Time
                </h2>
                <p className="text-xs md:text-sm font-bold text-pink-500 uppercase tracking-widest mt-0.5">
                    SPA Member Tools
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 bg-gray-100 text-gray-500 rounded-2xl hover:bg-pink-50 hover:text-pink-500 transition-all group"
              >
                <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-10 space-y-8">
              {/* Part 1: Location Basic Info */}
              <div className="space-y-6">
                 <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-pink-100 rounded-2xl">
                        <MapPin className="w-5 h-5 text-pink-600" />
                    </div>
                    <h3 className="text-lg font-black text-gray-900">Clinic Details</h3>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Street Address</label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Enter clinic street address"
                            className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-pink-500 outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Phone Number</label>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Clinic contact number"
                                className="w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-pink-500 outline-none transition-all"
                            />
                        </div>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Review Link</label>
                    <input
                        type="url"
                        value={reviewLink}
                        onChange={(e) => setReviewLink(e.target.value)}
                        placeholder="https://g.page/your-spa/review"
                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-pink-500 outline-none transition-all"
                    />
                    <p className="text-[10px] font-medium text-gray-400 ml-1">
                        This link is used for the “Leave Review” action on the user dashboard.
                    </p>
                 </div>

                 {/* Interactive Map Picker */}
                 <div className="space-y-3">
                    <div className="flex justify-between items-end mb-1">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Map Position (Drop Pin)</label>
                            <p className="text-[10px] font-medium text-pink-500">Search for your address or drag pin to fine-tune</p>
                        </div>
                    </div>
                    
                    {/* Search Bar */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Search address, city or zip..."
                                className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-pink-500 outline-none transition-all shadow-sm"
                            />
                        </div>
                        <Button 
                            type="button"
                            onClick={handleGetLocation}
                            disabled={isSearching}
                            title="Locate me using GPS"
                            className="bg-pink-50 text-pink-600 hover:bg-pink-100 hover:text-pink-700 border-2 border-pink-100 rounded-2xl px-4 h-auto shadow-sm transition-all active:scale-95 group"
                        >
                            <LocateFixed className={`w-5 h-5 ${isSearching ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} />
                        </Button>
                        <Button 
                            type="button"
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="bg-gray-900 text-white rounded-2xl px-6 h-auto text-xs font-bold"
                        >
                            {isSearching ? "..." : "Find"}
                        </Button>
                    </div>

                    <div className="h-64 rounded-3xl overflow-hidden border-4 border-gray-50 shadow-inner z-0">
                        {position && (
                            <MapContainer center={position} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <MapPicker position={position} setPosition={setPosition} />
                                <MapUpdater position={position} />
                            </MapContainer>
                        )}
                    </div>
                 </div>
              </div>

              <div className="h-px bg-gray-100" />

              {/* Part 2: Working Hours */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-100 rounded-2xl">
                            <Clock className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900">Working Hours</h3>
                    </div>
                    <Button 
                        variant="white" 
                        size="sm" 
                        onClick={handleSet9to5}
                        className="rounded-xl font-bold text-[10px] h-9 px-4 shadow-sm border-none bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-all uppercase tracking-widest"
                    >
                        Reset to 9-5
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-3">
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
                        className={`relative flex flex-col md:flex-row md:items-center gap-3 md:gap-6 p-4 md:p-5 rounded-3xl border-2 transition-all ${
                            isClosed
                            ? "bg-gray-50/50 border-gray-100 opacity-60"
                            : "bg-white border-gray-50 shadow-sm hover:border-pink-100"
                        }`}
                        >
                        <div className="md:w-32 flex items-center gap-3 shrink-0">
                            <span className="font-extrabold capitalize text-gray-900 shrink-0 text-sm md:text-base">
                            {day}
                            </span>
                        </div>

                        <div className="flex-1 flex items-center justify-between gap-4">
                            <div className="flex-1 flex flex-row items-center gap-3 md:gap-6">
                            <button
                                type="button"
                                onClick={() => handleToggleClosed(day)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
                                isClosed 
                                ? "bg-gray-200 text-gray-600" 
                                : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                }`}
                            >
                                {isClosed ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                                {isClosed ? "Closed" : "Open"}
                            </button>

                            {!isClosed ? (
                                <div className="flex items-center gap-2 flex-1 max-w-[280px]">
                                    <input
                                        type="time"
                                        value={config.open}
                                        onChange={(e) => handleDayChange(day, "open", e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 border-none rounded-xl text-xs md:text-sm font-bold text-gray-900 focus:ring-1 focus:ring-pink-500 outline-none text-center"
                                    />
                                    <span className="text-gray-300 font-bold">-</span>
                                    <input
                                        type="time"
                                        value={config.close}
                                        onChange={(e) => handleDayChange(day, "close", e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 border-none rounded-xl text-xs md:text-sm font-bold text-gray-900 focus:ring-1 focus:ring-pink-500 outline-none text-center"
                                    />
                                </div>
                            ) : (
                                <div className="flex-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    Not accepting appointments
                                </div>
                            )}
                            </div>
                            
                            <button
                                type="button"
                                onClick={() => handleCopyToAll(day)}
                                className="p-2.5 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-all shrink-0"
                                title="Apply to all days"
                            >
                                <Layers className="w-4 h-4" />
                            </button>
                        </div>
                        </div>
                    );
                    })}
                </div>
              </div>

              <div className="pt-4 pb-4 flex flex-col md:flex-row gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 rounded-2xl h-14 font-black uppercase tracking-widest text-xs border-2"
                >
                  Discard
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={updateAvailability.isPending}
                  className="flex-[2] rounded-2xl h-14 bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-xl shadow-pink-200/50 font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {updateAvailability.isPending ? "Saving..." : "Save Precise Location & Time"}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AvailabilitySettings;
