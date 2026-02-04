import { Button } from "@/components/ui/button";
import { locationService } from "@/services/locationService";
import { uploadService } from "@/services/uploadService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Edit2, Gift, Image as ImageIcon, RefreshCw, Save, Sparkles, Trash2, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

const TEMPLATE_GIFT_NAMES = [
  "New Years", "St. Valentine's Day", "St. Patrick's Day", 
  "Easter Special", "Halloween", "Black Friday", 
  "Christmas", "Birthday Special", "Client Anniversary"
];

const AutomatedGiftSettings = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [automatedGifts, setAutomatedGifts] = useState([]);
  const [editingGift, setEditingGift] = useState(null);
  const [giftForm, setGiftForm] = useState({
    name: "",
    content: "",
    image: "",
    isActive: false,
    type: "fixed-date",
    month: 1,
    day: 1,
  });

  // Fetch my location settings
  const { data: locationData, isLoading } = useQuery({
    queryKey: ["myLocation"],
    queryFn: () => locationService.getMyLocation(),
    enabled: isOpen,
  });

  useEffect(() => {
    if (locationData?.data?.location?.automatedGifts) {
      setAutomatedGifts(locationData.data.location.automatedGifts);
    }
  }, [locationData]);

  const updateLocationMutation = useMutation({
    mutationFn: (data) => locationService.updateLocation(locationData.data.location._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["myLocation"]);
      toast.success("Settings updated successfully!");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update settings");
    },
  });

  const handleToggleGift = (index) => {
    const updatedGifts = [...automatedGifts];
    updatedGifts[index].isActive = !updatedGifts[index].isActive;
    setAutomatedGifts(updatedGifts);
    updateLocationMutation.mutate({ automatedGifts: updatedGifts });
  };

  const handleEditGift = (gift, index) => {
    setEditingGift({ ...gift, index });
    setGiftForm({
      name: gift.name,
      content: gift.content,
      image: gift.image || "",
      isActive: gift.isActive,
      type: gift.type || "fixed-date",
      month: gift.month || 1,
      day: gift.day || 1,
    });
  };

  const handleSaveGift = async () => {
    if (!giftForm.name || !giftForm.content) {
      toast.error("Name and content are required");
      return;
    }

    const updatedGifts = [...automatedGifts];
    if (editingGift !== null) {
      updatedGifts[editingGift.index] = { ...giftForm };
    } else {
      updatedGifts.push({ ...giftForm });
    }

    setAutomatedGifts(updatedGifts);
    await updateLocationMutation.mutateAsync({ automatedGifts: updatedGifts });
    setEditingGift(null);
    setGiftForm({
      name: "",
      content: "",
      image: "",
      isActive: false,
      type: "fixed-date",
      month: 1,
      day: 1,
    });
  };

  const handleDeleteGift = (index) => {
    const updatedGifts = automatedGifts.filter((_, i) => i !== index);
    setAutomatedGifts(updatedGifts);
    updateLocationMutation.mutate({ automatedGifts: updatedGifts });
  };

  const compressImage = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            resolve(blob);
          }, "image/jpeg", 0.7);
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast.info("Image is large, compressing...");
    }

    try {
      const compressedBlob = await compressImage(file);
      if (compressedBlob.size > 1024 * 1024) {
        toast.error("Image is still too large (> 1MB). Please use a smaller image.");
        return;
      }

      const res = await uploadService.uploadImage(compressedBlob);
      setGiftForm((prev) => ({ ...prev, image: res.url }));
      toast.success("Image uploaded!");
    } catch (error) {
      toast.error("Failed to upload image");
      console.error(error);
    }
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
            className="fixed inset-x-0 bottom-0 md:inset-x-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:bottom-auto w-full md:max-w-3xl bg-white md:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-3 md:hidden shrink-0" />

            <div className="px-6 py-4 md:px-8 md:py-6 border-b border-gray-50 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                  Automated Gifts
                </h2>
                <p className="text-xs md:text-sm font-bold text-pink-500 uppercase tracking-widest mt-0.5">
                  Manage Occasions & Rewards
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateLocationMutation.mutate({ automatedGifts: [] })}
                  title="Reload default templates"
                  className="p-2.5 bg-gray-100 text-gray-500 rounded-2xl hover:bg-blue-50 hover:text-blue-500 transition-all group"
                >
                  <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2.5 bg-gray-100 text-gray-500 rounded-2xl hover:bg-pink-50 hover:text-pink-500 transition-all group"
                >
                  <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <RefreshCw className="w-10 h-10 text-pink-500 animate-spin mb-4" />
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Loading Gifts...</p>
                </div>
              ) : editingGift !== null ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">Gift Name</label>
                      <input
                        type="text"
                        value={giftForm.name}
                        onChange={(e) => setGiftForm({ ...giftForm, name: e.target.value })}
                        placeholder="e.g. Christmas Special"
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">Gift Content</label>
                      <input
                        type="text"
                        value={giftForm.content}
                        onChange={(e) => setGiftForm({ ...giftForm, content: e.target.value })}
                        placeholder="e.g. 20% Off"
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">Gift Type</label>
                      <select
                        value={giftForm.type}
                        onChange={(e) => setGiftForm({ ...giftForm, type: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-pink-500"
                      >
                        <option value="fixed-date">Fixed Date (Holiday)</option>
                        <option value="birthday">User Birthday</option>
                        <option value="anniversary">Client Anniversary</option>
                        <option value="custom">Custom (Always Active)</option>
                      </select>
                    </div>
                  </div>

                  {giftForm.type === "fixed-date" && (
                    <div className="grid grid-cols-2 gap-6 p-4 bg-pink-50 rounded-3xl">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">Month</label>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={giftForm.month}
                          onChange={(e) => setGiftForm({ ...giftForm, month: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 bg-white border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-pink-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">Day</label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={giftForm.day}
                          onChange={(e) => setGiftForm({ ...giftForm, day: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 bg-white border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-pink-500"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">Gift Image</label>
                    <div className="flex items-center gap-4">
                      {giftForm.image ? (
                        <div className="relative w-24 h-24 rounded-2xl overflow-hidden group">
                          <img src={giftForm.image} alt="Gift" className="w-full h-full object-cover" />
                          <button
                            onClick={() => setGiftForm({ ...giftForm, image: "" })}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-5 h-5 text-white" />
                          </button>
                        </div>
                      ) : (
                        <label className="w-24 h-24 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                          <span className="text-[10px] font-bold text-gray-500 mt-1 uppercase">Upload</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                      )}
                      <p className="text-xs text-gray-500 max-w-[200px]">
                        Upload an image for the gift. It will be compressed automatically. Max size after compression: 1MB.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-3xl">
                    <div className="flex-1">
                      <p className="text-sm font-black text-gray-900">Active Status</p>
                      <p className="text-xs text-gray-500">Enable this gift to show it on client dashboards.</p>
                    </div>
                    <button
                      onClick={() => setGiftForm({ ...giftForm, isActive: !giftForm.isActive })}
                      className={`w-12 h-6 rounded-full relative transition-colors ${giftForm.isActive ? "bg-pink-500" : "bg-gray-300"}`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${giftForm.isActive ? "translate-x-6" : ""}`} />
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setEditingGift(null)}
                      className="flex-1 rounded-2xl h-12 font-black uppercase tracking-widest text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveGift}
                      className="flex-[2] rounded-2xl h-12 bg-pink-500 text-white font-black uppercase tracking-widest text-xs"
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Available Gifts ({automatedGifts.length})</h3>
                    <Button
                      size="sm"
                      onClick={() => setEditingGift({
                        name: "",
                        content: "",
                        image: "",
                        isActive: true,
                        type: "fixed-date",
                        month: new Date().getMonth() + 1,
                        day: new Date().getDate(),
                        index: automatedGifts.length
                      })}
                      className="bg-pink-500 text-white rounded-xl text-[10px] font-black uppercase"
                    >
                      Add New Gift
                    </Button>
                  </div>

                  {automatedGifts.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-[2rem]">
                      <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-bold text-gray-500">No automated gifts found.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {automatedGifts.map((gift, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-[2rem] hover:shadow-md transition-shadow"
                        >
                          <div className="w-14 h-14 rounded-2xl bg-pink-50 flex items-center justify-center overflow-hidden shrink-0">
                            {gift.image ? (
                              <img src={gift.image} alt={gift.name} className="w-full h-full object-cover" />
                            ) : (
                              <Gift className="w-6 h-6 text-pink-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="text-sm font-black text-gray-900 truncate">{gift.name}</h4>
                              {TEMPLATE_GIFT_NAMES.includes(gift.name) && (
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-500 text-[8px] font-black uppercase rounded-full border border-blue-100">
                                  Template
                                </span>
                              )}
                              {gift.type === 'custom' && (
                                <span className="px-2 py-0.5 bg-purple-50 text-purple-500 text-[8px] font-black uppercase rounded-full border border-purple-100">
                                  Custom
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-pink-500">{gift.content}</p>
                              <span className="text-[10px] font-black text-gray-300 uppercase shrink-0">
                                • {gift.type === 'fixed-date' ? `${gift.month}/${gift.day}` : gift.type}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleGift(index)}
                              className={`w-10 h-5 rounded-full relative transition-colors ${gift.isActive ? "bg-green-500" : "bg-gray-300"}`}
                            >
                              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${gift.isActive ? "translate-x-5" : ""}`} />
                            </button>
                            <button
                              onClick={() => handleEditGift(gift, index)}
                              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                              <Edit2 className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AutomatedGiftSettings;
