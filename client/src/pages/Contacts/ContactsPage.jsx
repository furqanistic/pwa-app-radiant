import { authService } from "@/services/authService";
import { locationService } from "@/services/locationService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Bell,
    Calculator,
    Edit,
    Mail,
    MoreVertical,
    Phone,
    Plus,
    RefreshCw,
    Search,
    Send,
    Trash2,
    User,
    UserPlus,
    Users,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from 'sonner';

// Import components
import AddUserForm from "@/components/Management/AddUserForm";
import NotificationSender from "@/components/Management/NotificationSender";
import PointsManager from "@/components/Management/PointsManager";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Layout from "../Layout/Layout";

const ContactsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser } = useSelector((state) => state.user);
  const brandColor = "var(--brand-primary)";

  // State management
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isNotificationSenderOpen, setIsNotificationSenderOpen] = useState(false);
  const [isPointsManagerOpen, setIsPointsManagerOpen] = useState(false);
  const [selectedUserForNotification, setSelectedUserForNotification] = useState(null);
  const [selectedUserForPoints, setSelectedUserForPoints] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("");

  // Permission checks
  const isElevatedUser = [
    "admin",
    "spa",
    "enterprise",
    "super-admin",
  ].includes(currentUser?.role);
  const isAdminOrAbove = ["admin", "super-admin"].includes(currentUser?.role);
  const isSuperAdmin = currentUser?.role === "super-admin";

  const currentUserLocationId =
    currentUser?.selectedLocation?.locationId ||
    currentUser?.spaLocation?.locationId;
  const scopedLocationId = isSuperAdmin ? "" : currentUserLocationId;
  const effectiveLocationFilter = isSuperAdmin ? locationFilter : scopedLocationId;

  const roleFilterOptions = isSuperAdmin
    ? ["all", "super-admin", "admin", "spa", "enterprise", "user"]
    : isAdminOrAbove
    ? ["all", "admin", "spa", "enterprise", "user"]
    : ["all", "user"];

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: locationsData } = useQuery({
    queryKey: ["contacts-filter-locations"],
    queryFn: () => locationService.getAllLocations({ limit: 200 }),
    enabled: isSuperAdmin,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Fetch users (Reusing the same query logic from ManagementPage)
  const {
    data: usersData,
    isLoading: isLoadingUsers,
    error: usersError,
  } = useQuery({
    queryKey: [
      "all-users",
      currentPage,
      pageSize,
      debouncedSearchTerm,
      roleFilter,
      effectiveLocationFilter,
      currentUser?.role,
    ],
    queryFn: () =>
      authService.getAllUsers({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearchTerm,
        role: roleFilter,
        sortBy: "createdAt",
        sortOrder: "desc",
        ...(effectiveLocationFilter && {
          locationId: effectiveLocationFilter,
        }),
      }),
    placeholderData: (previousData) => previousData,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!usersData?.data?.pagination?.hasNextPage) return;
    const nextPage = currentPage + 1;
    queryClient.prefetchQuery({
      queryKey: [
        "all-users",
        nextPage,
        pageSize,
        debouncedSearchTerm,
        roleFilter,
        effectiveLocationFilter,
        currentUser?.role,
      ],
      queryFn: () =>
        authService.getAllUsers({
          page: nextPage,
          limit: pageSize,
          search: debouncedSearchTerm,
          role: roleFilter,
          sortBy: "createdAt",
          sortOrder: "desc",
          ...(effectiveLocationFilter && {
            locationId: effectiveLocationFilter,
          }),
        }),
      staleTime: 2 * 60 * 1000,
    });
  }, [
    usersData,
    currentPage,
    pageSize,
    debouncedSearchTerm,
    roleFilter,
    effectiveLocationFilter,
    currentUser?.role,
    queryClient,
  ]);

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: authService.createSpaMember,
    onSuccess: () => {
      toast.success("User created successfully!");
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to create user");
    },
  });

  // Pagination
  const pagination = usersData?.data?.pagination || {};
  const users = usersData?.data?.users || [];
  const totalUsers = pagination.totalUsers || 0;
  const totalPages = pagination.totalPages || 1;
  const startIndex = totalUsers > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(startIndex + users.length - 1, totalUsers);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  };

  const handleCreateUser = async (userData) => {
    await createUserMutation.mutateAsync(userData);
    setIsAddUserOpen(false);
  };

  const handleOpenNotificationSender = (user = null) => {
    setSelectedUserForNotification(user);
    setIsNotificationSenderOpen(true);
  };

  const handleCloseNotificationSender = () => {
    setSelectedUserForNotification(null);
    setIsNotificationSenderOpen(false);
  };

  const handleOpenPointsManager = (user = null) => {
    setSelectedUserForPoints(user);
    setIsPointsManagerOpen(true);
  };

  const handleClosePointsManager = () => {
    setSelectedUserForPoints(null);
    setIsPointsManagerOpen(false);
  };

  const renderPagination = () => {
      if (totalPages <= 1) return null;
  
      const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
  
        if (totalPages <= maxVisible) {
          for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
          }
        } else {
          const start = Math.max(1, currentPage - 2);
          const end = Math.min(totalPages, start + maxVisible - 1);
  
          for (let i = start; i <= end; i++) {
            pages.push(i);
          }
  
          if (start > 1) {
            pages.unshift("...");
            pages.unshift(1);
          }
  
          if (end < totalPages) {
            pages.push("...");
            pages.push(totalPages);
          }
        }
  
        return pages;
      };
  
      return (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
  
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex}</span> to{" "}
                <span className="font-medium">{endIndex}</span> of{" "}
                <span className="font-medium">{totalUsers}</span> results
              </p>
            </div>
  
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                &lt;
              </Button>
  
              {getPageNumbers().map((page, index) => (
                <Button
                  key={index}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    typeof page === "number" && handlePageChange(page)
                  }
                  disabled={page === "..."}
                  className={page === currentPage ? "bg-[var(--brand-primary)] text-white" : ""}
                >
                  {page}
                </Button>
              ))}
  
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                &gt;
              </Button>
            </div>
          </div>
        </div>
      );
    };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Contacts & Users
            </h1>
            <p className="text-gray-600">
              Manage your spa members, clients, and notifications
              {!isSuperAdmin && currentUserLocationId && (
                <span className="block text-sm mt-1 text-[var(--brand-primary)]">
                  Showing contacts from:{" "}
                  {currentUser?.selectedLocation?.locationName ||
                    currentUser?.spaLocation?.locationName}
                </span>
              )}
              {isSuperAdmin && (
                <span className="block text-sm mt-1 text-[var(--brand-primary)]">
                  Showing contacts from all locations
                </span>
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {isSuperAdmin && (
              <Button
                onClick={() => setIsAddUserOpen(true)}
                className="hover:opacity-90"
                style={{ backgroundColor: brandColor, color: "#fff" }}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            )}

            {isElevatedUser && (
              <Button
                onClick={() => handleOpenNotificationSender()}
                className="hover:opacity-90"
                style={{ backgroundColor: brandColor, color: "#fff" }}
              >
                <Bell className="w-4 h-4 mr-2" />
                Send Notification
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ["all-users"] })
              }
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Search */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              >
                {roleFilterOptions.map((role) => (
                  <option key={role} value={role}>
                    {role === "all" ? "All roles" : role}
                  </option>
                ))}
              </select>
              {isSuperAdmin && (
                <select
                  value={locationFilter}
                  onChange={(e) => {
                    setLocationFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                >
                  <option value="">All locations</option>
                  {(locationsData?.data?.locations || []).map((location) => (
                    <option key={location._id || location.locationId} value={location.locationId}>
                      {location.name || location.locationId}
                    </option>
                  ))}
                </select>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setDebouncedSearchTerm("");
                  setRoleFilter("all");
                  setLocationFilter("");
                  setCurrentPage(1);
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {isSuperAdmin ? "All Users" : "Spa Members"} ({totalUsers})
              </h3>
            </div>

            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-[var(--brand-primary)] rounded-full animate-spin"></div>
              </div>
            ) : usersError ? (
              <div className="text-center py-12">
                <p className="text-red-600">Error loading users</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm
                    ? "No users found matching your search"
                    : isSuperAdmin
                    ? "No users found in the app"
                    : "No users found in your location"}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Points
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => {
                        const userId = user?._id || user?.userId || user?.id;
                        return (
                        <tr
                          key={userId || user?.email || user?.name}
                          className={`hover:bg-gray-50 ${userId ? "cursor-pointer" : "cursor-not-allowed"}`}
                          onClick={() => {
                            if (!userId) {
                              toast.error("Unable to open profile for this user.");
                              return;
                            }
                            navigate(`/client/${userId}`, { state: { user } });
                          }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div
                                  className="h-10 w-10 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: brandColor }}
                                >
                                  <span className="text-white font-medium text-sm">
                                    {user.name?.charAt(0)?.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                user.role === "super-admin"
                                  ? "bg-red-100 text-red-800"
                                  : user.role === "admin"
                                  ? "bg-purple-100 text-purple-800"
                                  : user.role === "spa"
                                  ? "bg-blue-100 text-blue-800"
                                  : user.role === "enterprise"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.selectedLocation?.locationName ||
                              user.spaLocation?.locationName ||
                              "Not assigned"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.points || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {isSuperAdmin && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/client/${user._id}`);
                                    }}
                                  >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit User
                                  </DropdownMenuItem>
                                )}
                                {isElevatedUser && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenPointsManager(user);
                                    }}
                                  >
                                    <Calculator className="w-4 h-4 mr-2" />
                                    Manage Points
                                  </DropdownMenuItem>
                                )}
                                {isElevatedUser && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenNotificationSender(user);
                                    }}
                                  >
                                    <Send className="w-4 h-4 mr-2" />
                                    Send Notification
                                  </DropdownMenuItem>
                                )}
                                {(isAdminOrAbove || isElevatedUser) &&
                                  isAdminOrAbove && <DropdownMenuSeparator />}
                                {isSuperAdmin && (
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Implementation for delete would go here
                                      toast.error("Delete functionality pending");
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete User
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {renderPagination()}
              </>
            )}
          </div>

          {/* Modals */}
          <AddUserForm
            isOpen={isAddUserOpen}
            onClose={() => setIsAddUserOpen(false)}
            onSubmit={handleCreateUser}
          />

          {isElevatedUser && (
            <NotificationSender
              isOpen={isNotificationSenderOpen}
              onClose={handleCloseNotificationSender}
              currentUser={currentUser}
              preSelectedUser={selectedUserForNotification}
              scopeRole={roleFilter}
              scopeLocationId={effectiveLocationFilter}
            />
          )}

          {isElevatedUser && (
            <PointsManager
              isOpen={isPointsManagerOpen}
              onClose={handleClosePointsManager}
              user={selectedUserForPoints}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ContactsPage;
