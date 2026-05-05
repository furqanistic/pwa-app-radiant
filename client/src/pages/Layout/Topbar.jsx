import CreditsPurchaseDialog from "@/components/Membership/CreditsPurchaseDialog";
import { useBranding } from "@/context/BrandingContext";
import { resolveBrandingLogoUrl } from "@/lib/imageHelpers";
import { selectIsElevatedUser, selectIsSuperAdmin } from "@/redux/userSlice";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { BadgeCent, Plus, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import NotificationPanel from "./NotificationPanel";

const cn = (...classes) => classes.filter(Boolean).join(" ");

const clampChannel = (value) => Math.max(0, Math.min(255, value));

const adjustHex = (hex, amount) => {
  const cleaned = `${hex || ""}`.replace("#", "");
  if (cleaned.length !== 6) return "#b0164e";
  const num = parseInt(cleaned, 16);
  const r = clampChannel(((num >> 16) & 255) + amount);
  const g = clampChannel(((num >> 8) & 255) + amount);
  const b = clampChannel((num & 255) + amount);
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};

const Topbar = ({
  className = "",
  showNotifications = true,
}) => {
  const { currentUser } = useSelector((state) => state.user);
  const { totalItems } = useSelector((state) => state.cart);
  const { branding } = useBranding();
  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const isElevatedUser = useSelector(selectIsElevatedUser);
  const { isInstalled, browserInfo, triggerInstall } = usePwaInstall();
  const brandColor = branding?.themeColor || '#ec4899';
  const brandColorDark = adjustHex(brandColor, -24);
  const navigate = useNavigate();
  const [creditsDialogOpen, setCreditsDialogOpen] = useState(false);

  // Hide cart for super-admin and admin/spa
  const showCart = !isSuperAdmin && !isElevatedUser;
  const creditSystemEnabled = Boolean(branding?.membership?.creditSystem?.isEnabled);
  const showCredits = showCart && creditSystemEnabled;
  const availableCredits = Math.max(0, Number(currentUser?.credits || 0));
  const showInstallHint = !isInstalled && browserInfo?.isMobile;

  const handleInstallHint = async () => {
    try {
      const result = await triggerInstall();
      if (result.status === "unavailable") {
        window.dispatchEvent(
          new CustomEvent("radiant:open-install-prompt", {
            detail: { source: "topbar-install-hint" },
          })
        );
      }
    } catch (error) {
      console.error("Install hint action failed:", error);
    }
  };

  return (
    <>
      <div className={cn("bg-white border-b border-gray-200 sticky top-0 z-30", className)}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Brand Logo + Install Button */}
            <div className="flex items-center space-x-3">
              {(branding?.logo || branding?.logoPublicId) && (
                <>
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
                    <img
                      src={resolveBrandingLogoUrl(branding, { width: 64, height: 64 })}
                      alt={branding?.name || "Brand Logo"}
                      className="w-full h-full object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="h-7 w-px bg-gray-200" />
                </>
              )}
            </div>

            {/* Right side - Cart, Notifications and User Profile */}
            <div className="flex items-center space-x-2 lg:space-x-4">
              {showCredits && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setCreditsDialogOpen(true)}
                  aria-label={`Buy credits. You currently have ${availableCredits} credits.`}
                  className="group relative flex items-center gap-1.5 rounded-full border px-2 py-1.5 transition-all duration-300 overflow-hidden sm:gap-3 sm:px-3"
                  style={{
                    backgroundColor: `${brandColor}08`,
                    borderColor: `${brandColor}2b`,
                    color: brandColorDark,
                  }}
                >
                  {/* Subtle Shimmer Effect */}
                  <div 
                    className="absolute inset-x-0 -top-full h-full bg-linear-to-b from-transparent via-white/10 to-transparent transition-all duration-1000 group-hover:top-full"
                  />
                  
                  <div className="relative flex items-center gap-1.5 sm:gap-2.5">
                    <div
                      className="flex items-center justify-center transition-transform duration-300 group-hover:rotate-12"
                      style={{ color: brandColor }}
                    >
                      <BadgeCent className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>

                    <div className="flex flex-col items-start leading-tight">
                      <span className="hidden text-[9px] font-bold uppercase tracking-tight opacity-60 sm:block">
                        Credits
                      </span>
                      <span className="text-xs font-bold tabular-nums">
                        {availableCredits}
                        <span className="ml-1 hidden font-semibold sm:inline-block opacity-60">Balance</span>
                      </span>
                    </div>

                    <div
                      className="flex h-5 w-5 items-center justify-center rounded-full text-white shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:scale-110 sm:h-6 sm:w-6"
                      style={{ backgroundColor: brandColor }}
                    >
                      <Plus className="h-3 w-3 stroke-[3] sm:h-3.5 sm:w-3.5" />
                    </div>
                  </div>
                </motion.button>
              )}

              {/* Shopping Cart */}
              {showCart && (
                <button
                  onClick={() => navigate("/cart")}
                  className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {totalItems > 0 && (
                    <span 
                      className="absolute -top-1 -right-1 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: brandColor }}
                    >
                      {totalItems}
                    </span>
                  )}
                </button>
              )}

              {/* Notifications */}
              {showNotifications && <NotificationPanel />}

              {/* User Profile */}
              <div className="flex items-center space-x-3">
                {/* User Name */}
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {currentUser?.name}
                  </p>
                  <p className="text-xs text-gray-500">{currentUser?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {showInstallHint && (
          <div className="border-t border-gray-100 px-4 py-1.5 text-center">
            <button
              type="button"
              onClick={handleInstallHint}
              className="text-[11px] font-medium text-gray-500 transition-colors hover:text-[color:var(--brand-primary-dark)]"
            >
              Using the browser? Tap{" "}
              <span style={{ color: brandColor }} className="font-semibold">
                here
              </span>{" "}
              to install the app.
            </button>
          </div>
        )}
      </div>
      <CreditsPurchaseDialog
        open={creditsDialogOpen}
        onOpenChange={setCreditsDialogOpen}
      />
    </>
  );
};

export default Topbar;
