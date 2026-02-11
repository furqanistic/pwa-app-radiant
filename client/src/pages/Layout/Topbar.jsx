import { useBranding } from "@/context/BrandingContext";
import { resolveImageUrl } from "@/lib/imageHelpers";
import { selectIsElevatedUser, selectIsSuperAdmin } from "@/redux/userSlice";
import { ShoppingCart } from "lucide-react";
import React from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import InstallButton from "./InstallButton";
import NotificationPanel from "./NotificationPanel";

const cn = (...classes) => classes.filter(Boolean).join(" ");

const Topbar = ({
  className = "",
  showNotifications = true,
}) => {
  const { currentUser } = useSelector((state) => state.user);
  const { totalItems } = useSelector((state) => state.cart);
  const { branding } = useBranding();
  const isSuperAdmin = useSelector(selectIsSuperAdmin);
  const isElevatedUser = useSelector(selectIsElevatedUser);
  const brandColor = branding?.themeColor || '#ec4899';
  const navigate = useNavigate();

  // Hide cart for super-admin and admin/spa
  const showCart = !isSuperAdmin && !isElevatedUser;

  return (
    <>
      <div className={cn("bg-white border-b border-gray-200 sticky top-0 z-30", className)}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Brand Logo + Separator + Install Button */}
            <div className="flex items-center space-x-3">
              {(branding?.logo || branding?.logoPublicId) && (
                <div className="w-10 h-10 rounded-lg border border-gray-200 shadow-sm bg-gradient-to-br from-gray-100 to-gray-200 p-1.5 flex items-center justify-center">
                  <img
                    src={resolveImageUrl(
                      branding.logo || branding.logoPublicId,
                      branding.logo,
                      { width: 64, height: 64 }
                    )}
                    alt={branding?.name || "Brand Logo"}
                    className="w-full h-full object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              )}
              <div className="h-7 w-px bg-gray-200" />
              <InstallButton />
            </div>

            {/* Right side - Cart, Notifications and User Profile */}
            <div className="flex items-center space-x-2 lg:space-x-4">
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
      </div>
    </>
  );
};

export default Topbar;
