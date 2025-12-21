// File: client/src/pages/Layout/Topbar.jsx
import { motion } from "framer-motion";
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
  const navigate = useNavigate();

  return (
    <>
      <div className={cn("bg-white border-b border-gray-200 sticky top-0 z-30", className)}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Install Button */}
            <div className="flex items-center space-x-2 lg:space-x-3">
              <InstallButton />
            </div>

            {/* Right side - Cart, Notifications and User Profile */}
            <div className="flex items-center space-x-2 lg:space-x-4">
              {/* Shopping Cart */}
              <button
                onClick={() => navigate("/cart")}
                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>

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
