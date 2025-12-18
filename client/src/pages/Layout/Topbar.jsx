// File: client/src/pages/Layout/Topbar.jsx - UPDATED WITH QR SCANNER
import QRCodeScanner from "@/components/QRCode/QRCodeScanner";
import { motion } from "framer-motion";
import { Menu, QrCode, ShoppingCart } from "lucide-react";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import InstallButton from "./InstallButton";
import NotificationPanel from "./NotificationPanel";

const cn = (...classes) => classes.filter(Boolean).join(" ");

const Topbar = ({
  className = "",
  showNotifications = true,
  showMobileMenu = false,
  onMenuClick,
}) => {
  const { currentUser } = useSelector((state) => state.user);
  const { totalItems } = useSelector((state) => state.cart);
  const navigate = useNavigate();
  const [qrScannerOpen, setQrScannerOpen] = useState(false);

  return (
    <>
      <div className={cn("bg-white border-b border-gray-200", className)}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Mobile Menu and Install Button */}
            <div className="flex items-center space-x-2 lg:space-x-3">
              {showMobileMenu && (
                <button
                  onClick={onMenuClick}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <Menu className="h-5 w-5" />
                </button>
              )}
              {/* Install Button - Moved to left side */}
              <InstallButton />
            </div>

            {/* Right side - QR Scanner, Cart, Notifications and User Profile */}
            <div className="flex items-center space-x-2 lg:space-x-4">
              {/* QR Code Scanner Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setQrScannerOpen(true)}
                className="relative p-2 text-gray-500 hover:text-pink-600 hover:bg-pink-50 rounded-md transition-colors group"
                title="Scan QR Code to earn points"
              >
                <QrCode className="h-5 w-5" />
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 to-purple-500 scale-x-0 group-hover:scale-x-100 transition-transform"></div>
              </motion.button>

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

      {/* QR Code Scanner Modal */}
      <QRCodeScanner
        isOpen={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
      />
    </>
  );
};

export default Topbar;
