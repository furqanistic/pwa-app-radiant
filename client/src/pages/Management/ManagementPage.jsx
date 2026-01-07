// File: client/src/pages/Management/ManagementPage.jsx - UPDATED (CLEANUP)

import { authService } from "@/services/authService";
import { locationService } from "@/services/locationService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Award,
    Building,
    Calendar,
    Clock,
    Gift,
    MapPin,
    QrCode,
    RefreshCw,
    Settings,
    TrendingUp,
    UserCheck,
    UserPlus,
    XIcon,
    Zap,
} from "lucide-react";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from 'sonner';

// Import components
import AddUserForm from "@/components/Management/AddUserForm";
import AvailabilitySettings from "@/components/Management/AvailabilitySettings"; // Import
import LocationAssignmentForm from "@/components/Management/LocationAssignmentForm";
import LocationForm from "@/components/Management/LocationForm";
import QRCodeManagement from "@/components/QRCode/QRCodeManagement";
import StripeConnect from "@/components/Stripe/StripeConnect";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import Layout from "@/pages/Layout/Layout";

const ManagementPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser } = useSelector((state) => state.user);

  // State management
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isLocationFormOpen, setIsLocationFormOpen] = useState(false);
  const [isLocationAssignmentOpen, setIsLocationAssignmentOpen] =
    useState(false);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false); // New State
  const [selectedQRLocation, setSelectedQRLocation] = useState(null);

  // Permission checks
  const isElevatedUser = [
    "admin",
    "team",
    "enterprise",
    "super-admin",
  ].includes(currentUser?.role);
  const isAdminOrAbove = ["admin", "super-admin"].includes(currentUser?.role);
  const isTeamOrAbove = ["team", "admin", "super-admin"].includes(currentUser?.role); // Team check

  const currentUserLocationId =
    currentUser?.selectedLocation?.locationId ||
    currentUser?.spaLocation?.locationId;

  // Fetch locations (admin only)
  const {
    data: locationsData,
    isLoading: isLoadingLocations,
    refetch: refetchLocations,
  } = useQuery({
    queryKey: ["locations"],
    queryFn: () => locationService.getAllLocations(),
    enabled: isAdminOrAbove,
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: authService.createTeamMember,
    onSuccess: () => {
      toast.success("User created successfully!");
      // Invalidate queries to update lists in other pages (like ContactsPage)
      queryClient.invalidateQueries(["all-users"]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to create user");
    },
  });

  // Navigation cards
  const managementRoutes = [
    {
      title: "Service Management",
      description: "Manage services, bookings, and pricing",
      icon: Settings,
      path: "/management/services",
      color: "from-blue-500 to-blue-600",
      visible: isElevatedUser,
    },
    {
      title: "Manage Bookings",
      description: "View and manage all client bookings",
      icon: Calendar,
      path: "/management/bookings",
      color: "from-yellow-500 to-yellow-600",
      visible: isAdminOrAbove,
    },
    {
      title: "Spin & Games",
      description: "Configure scratch cards and spin games",
      icon: Zap,
      path: "/management/spin",
      color: "from-purple-500 to-purple-600",
      visible: isElevatedUser,
    },
    {
      title: "Rewards System",
      description: "Manage rewards, points, and incentives",
      icon: Gift,
      path: "/management/rewards",
      color: "from-green-500 to-green-600",
      visible: isElevatedUser,
    },
    {
      title: "Referral Program",
      description: "Configure referral bonuses and tracking",
      icon: Award,
      path: "/management/referral",
      color: "from-pink-500 to-pink-600",
      visible: isElevatedUser,
    },
    {
      title: "Client Revenue",
      description: "Track earnings per client and total revenue",
      icon: TrendingUp,
      path: "/management/revenue",
      color: "from-rose-500 to-rose-600",
      visible: isTeamOrAbove, // Accessible to team role (spa managers)
    },
  ];

  const locations = locationsData?.data?.locations || [];

  const handleCreateUser = async (userData) => {
    await createUserMutation.mutateAsync(userData);
    setIsAddUserOpen(false);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Management Dashboard
            </h1>
            <p className="text-gray-600">
              Manage system settings and configurations
              {currentUserLocationId && (
                <span className="block text-sm text-blue-600 mt-1">
                  Current location:{" "}
                  {currentUser?.selectedLocation?.locationName ||
                    currentUser?.spaLocation?.locationName}
                </span>
              )}
            </p>
          </div>

          {/* Navigation Cards */}
          {isElevatedUser && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {managementRoutes
                  .filter((route) => route.visible)
                  .map((route) => (
                    <button
                      key={route.path}
                      onClick={() => navigate(route.path)}
                      className={`p-4 bg-gradient-to-r ${route.color} rounded-lg text-white hover:opacity-90 transition-all transform hover:scale-105 flex flex-col items-center text-center`}
                    >
                      <route.icon className="w-6 h-6 mb-2 " />
                      <h3 className="font-semibold text-sm mb-1">
                        {route.title}
                      </h3>
                      <p className="text-xs opacity-90">{route.description}</p>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Button
              onClick={() => setIsAddUserOpen(true)}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>

            {isTeamOrAbove && (
               <Button
                onClick={() => setIsAvailabilityOpen(true)}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              >
                <Clock className="w-4 h-4 mr-2" />
                Availability Settings
              </Button>
            )}

            {isAdminOrAbove && (
              <>
                <Button
                  onClick={() => setIsLocationFormOpen(true)}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Add Location
                </Button>

                <Button
                  onClick={() => setIsLocationAssignmentOpen(true)}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  Assign Location
                </Button>
              </>
            )}
          </div>

          {/* Stripe Connect - Team Role Only */}
          {currentUser?.role === "team" && (
            <div className="mb-8">
              <StripeConnect />
            </div>
          )}

          {/* Location Management Section */}
          {isAdminOrAbove && (
            <div className="mt-8 bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Locations ({locations.length})
                </h3>
                <Button
                  size="sm"
                  onClick={() => refetchLocations()}
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>

              {isLoadingLocations ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-green-200 border-t-green-500 rounded-full animate-spin"></div>
                </div>
              ) : locations.length === 0 ? (
                <div className="text-center py-12">
                  <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No locations found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Address
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {locations.map((location) => (
                        <tr key={location._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {location.name || "Unnamed Location"}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {location.locationId}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {location.address || "No address"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                location.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {location.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(location.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedQRLocation(location)}
                              className="flex items-center gap-2 text-pink-600 border-pink-200 hover:bg-pink-50"
                            >
                              <QrCode className="w-4 h-4" />
                              QR Code
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modals */}
        <AddUserForm
          isOpen={isAddUserOpen}
          onClose={() => setIsAddUserOpen(false)}
          onSubmit={handleCreateUser}
        />
        
        {/* Availability Modal */}
        <AvailabilitySettings 
          isOpen={isAvailabilityOpen}
          onClose={() => setIsAvailabilityOpen(false)}
        />

        {/* QR Code Modal */}
        <Dialog 
            open={!!selectedQRLocation} 
            onOpenChange={(open) => !open && setSelectedQRLocation(null)}
        >
            <DialogContent 
                showCloseButton={false}
                className="max-w-[95vw] md:max-w-[1100px] w-full p-0 border-none bg-transparent shadow-none"
            >
                <div className="bg-white rounded-[2.5rem] md:rounded-[4rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]">
                    {/* Header Area */}
                    <div className="px-6 py-8 md:px-12 md:py-10 flex items-center justify-between border-b border-gray-50 shrink-0">
                        <DialogHeader>
                            <DialogTitle className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">
                                {selectedQRLocation?.name}
                            </DialogTitle>
                        </DialogHeader>
                        
                        <button 
                            onClick={() => setSelectedQRLocation(null)}
                            className="p-3 rounded-full bg-gray-100/80 text-gray-500 hover:bg-pink-500 hover:text-white transition-all duration-300 shadow-sm hover:rotate-90 group shrink-0"
                        >
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Scrollable Content with room for shadows */}
                    <div className="overflow-y-auto p-6 md:p-12 pt-4 md:pt-6">
                        <div className="pb-10"> {/* Extra bottom padding to avoid clipping shadow */}
                            {selectedQRLocation && (
                                <QRCodeManagement
                                    locationId={selectedQRLocation._id}
                                    locationName={selectedQRLocation.name}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        {isAdminOrAbove && (
          <>
            <LocationForm
              isOpen={isLocationFormOpen}
              onClose={() => setIsLocationFormOpen(false)}
              onSuccess={() => {
                toast.success("Location created successfully!");
                refetchLocations();
              }}
            />

            <LocationAssignmentForm
              isOpen={isLocationAssignmentOpen}
              onClose={() => setIsLocationAssignmentOpen(false)}
              onSuccess={() => {
                queryClient.invalidateQueries(["all-users"]);
                refetchLocations();
              }}
            />
          </>
        )}
      </div>
    </Layout>
  );
};

export default ManagementPage;
