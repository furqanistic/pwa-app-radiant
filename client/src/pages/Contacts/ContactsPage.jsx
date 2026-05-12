import { authService } from "@/services/authService";
import { locationService } from "@/services/locationService";
import { useBranding } from "@/context/BrandingContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    BadgeCent,
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
import CreditsManager from "@/components/Management/CreditsManager";
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

/** When listing users scoped to a location, show that location's label (not only last-selected spa). */
function getContactLocationLabel(user, scopeLocationId) {
  const scope = `${scopeLocationId || ""}`.trim();
  if (scope) {
    const fromAssigned = Array.isArray(user?.assignedLocations)
      ? user.assignedLocations.find((loc) => loc?.locationId === scope)
      : null;
    if (fromAssigned?.locationName) return fromAssigned.locationName;
    if (user?.selectedLocation?.locationId === scope) {
      return user.selectedLocation.locationName || scope;
    }
    if (user?.spaLocation?.locationId === scope) {
      return user.spaLocation.locationName || scope;
    }
  }
  return (
    user.selectedLocation?.locationName ||
    user.spaLocation?.locationName ||
    "Not assigned"
  );
}

const clampChannel = (value) => Math.max(0, Math.min(255, value))

const adjustHex = (hex, amount) => {
  if (!hex) return '#0f172a'
  const cleaned = hex.replace('#', '')
  if (cleaned.length !== 6) return '#0f172a'
  const num = parseInt(cleaned, 16)
  const r = clampChannel(((num >> 16) & 255) + amount)
  const g = clampChannel(((num >> 8) & 255) + amount)
  const b = clampChannel((num & 255) + amount)
  return `#${r.toString(16).padStart(2, '0')}${g
    .toString(16)
    .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

const ContactsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser } = useSelector((state) => state.user);
  const { branding, locationId: brandedLocationId } = useBranding();
  const brandColor = branding?.themeColor || "var(--brand-primary)";

  // State management
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isNotificationSenderOpen, setIsNotificationSenderOpen] = useState(false);
  const [isPointsManagerOpen, setIsPointsManagerOpen] = useState(false);
  const [isCreditsManagerOpen, setIsCreditsManagerOpen] = useState(false);
  const [selectedUserForNotification, setSelectedUserForNotification] = useState(null);
  const [selectedUserForPoints, setSelectedUserForPoints] = useState(null);
  const [selectedUserForCredits, setSelectedUserForCredits] = useState(null);
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
    brandedLocationId ||
    currentUser?.selectedLocation?.locationId ||
    currentUser?.spaLocation?.locationId;
  const scopedLocationId = currentUserLocationId || "";
  const effectiveLocationFilter = isSuperAdmin
    ? locationFilter || scopedLocationId
    : scopedLocationId;
  const activeLocationName =
    branding?.name ||
    currentUser?.selectedLocation?.locationName ||
    currentUser?.spaLocation?.locationName ||
    effectiveLocationFilter;

  const withSpaParam = (path) => {
    if (!brandedLocationId) return path;
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}spa=${encodeURIComponent(brandedLocationId)}`;
  };

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
        excludeTestUsers: true,
        excludeEmailDomain: "test.com",
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
          excludeTestUsers: true,
          excludeEmailDomain: "test.com",
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

  const deleteUserMutation = useMutation({
    mutationFn: authService.deleteUser,
    onSuccess: () => {
      toast.success("User permanently deleted from database.");
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete user");
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

  const handleDeleteUser = async (user) => {
    if (!isSuperAdmin) {
      toast.error("Only super-admin can delete users.");
      return;
    }

    const userId = user?._id || user?.userId || user?.id;
    if (!userId) {
      toast.error("Unable to delete this user.");
      return;
    }

    if (userId === currentUser?._id || userId === currentUser?.id) {
      toast.error("You cannot delete your own account.");
      return;
    }

    const displayName = user?.name || user?.email || "this user";
    const confirmed = window.confirm(
      `Delete ${displayName} permanently?\n\nThis action cannot be undone and will remove the user from the database.`
    );

    if (!confirmed) return;

    await deleteUserMutation.mutateAsync(userId);
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

  const handleOpenCreditsManager = (user = null) => {
    setSelectedUserForCredits(user);
    setIsCreditsManagerOpen(true);
  };

  const handleCloseCreditsManager = () => {
    setSelectedUserForCredits(null);
    setIsCreditsManagerOpen(false);
  };

  const roleBadge = (role) => {
    const styles = {
      'super-admin': 'bg-slate-800 text-white',
      admin: 'bg-slate-200 text-slate-800',
      spa: 'bg-slate-100 text-slate-600',
      enterprise: 'bg-slate-100 text-slate-600',
      user: 'bg-slate-50 text-slate-400',
    }
    return styles[role] || 'bg-slate-100 text-slate-600'
  }

  return (
    <Layout>
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">

          {/* ── Header card ─────────────────────────────── */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-6">
            <div className="h-0.5 w-full" style={{ background: brandColor }} />
            <div className="px-6 py-5 md:px-8 md:py-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-xl md:text-2xl font-semibold text-slate-900 tracking-tight">
                    Contacts & Users
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Manage your spa members, clients, and notifications
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {totalUsers} total
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-200" />
                    <span>
                      {effectiveLocationFilter
                        ? activeLocationName || effectiveLocationFilter
                        : 'All locations'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {isSuperAdmin && (
                    <Button
                      onClick={() => setIsAddUserOpen(true)}
                      className="h-9 rounded-xl text-sm font-medium px-4 text-white transition-all hover:opacity-90 active:scale-[0.98]"
                      style={{ background: `linear-gradient(135deg, ${brandColor}, ${adjustHex(brandColor, -24)})` }}
                    >
                      <UserPlus className="mr-1.5 h-4 w-4" />
                      Add User
                    </Button>
                  )}
                  {isElevatedUser && (
                    <Button
                      onClick={() => handleOpenNotificationSender()}
                      variant="outline"
                      className="h-9 rounded-xl text-sm font-medium px-4 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                    >
                      <Bell className="mr-1.5 h-4 w-4" />
                      Notify
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['all-users'] })}
                    className="h-9 rounded-xl text-sm font-medium px-4 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <RefreshCw className="mr-1.5 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Filters card ────────────────────────────── */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-6">
            <div className="p-4 md:p-5">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 focus:border-slate-300 transition-shadow placeholder:text-slate-400"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1) }}
                  className="h-9 text-sm rounded-lg border border-slate-200 bg-white px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 transition-shadow text-slate-600"
                >
                  {roleFilterOptions.map((role) => (
                    <option key={role} value={role}>
                      {role === 'all' ? 'All roles' : role}
                    </option>
                  ))}
                </select>

                {isSuperAdmin && (
                  <select
                    value={locationFilter}
                    onChange={(e) => { setLocationFilter(e.target.value); setCurrentPage(1) }}
                    className="h-9 text-sm rounded-lg border border-slate-200 bg-white px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 transition-shadow text-slate-600"
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
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setDebouncedSearchTerm('');
                    setRoleFilter('all');
                    setLocationFilter('');
                    setCurrentPage(1);
                  }}
                  className="h-9 rounded-lg text-xs px-3 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>

          {/* ── Users table card ────────────────────────── */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">
                {isSuperAdmin ? 'All Users' : 'Spa Members'}
                {totalUsers > 0 && (
                  <span className="text-slate-400 font-normal ml-1">({totalUsers})</span>
                )}
              </h2>
            </div>

            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
              </div>
            ) : usersError ? (
              <div className="text-center py-12">
                <p className="text-sm text-red-500 font-medium">Error loading users</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-14">
                <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500">
                  {searchTerm
                    ? 'No users found matching your search'
                    : isSuperAdmin
                    ? 'No users found in the app'
                    : 'No users found in your location'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead>
                      <tr>
                        {['User', 'Role', 'Location', 'Points', 'Credits', 'Joined', ''].map((h) => (
                          <th
                            key={h}
                            className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {users.map((user) => {
                        const userId = user?._id || user?.userId || user?.id
                        return (
                          <tr
                            key={userId || user?.email}
                            className={`transition-colors ${
                              userId ? 'cursor-pointer hover:bg-slate-50' : ''
                            }`}
                            onClick={() => {
                              if (!userId) return toast.error('Unable to open profile for this user.')
                              navigate(withSpaParam(`/client/${userId}`), { state: { user } })
                            }}
                          >
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold text-white"
                                  style={{ backgroundColor: brandColor }}
                                >
                                  {user.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-slate-900">{user.name}</div>
                                  <div className="text-xs text-slate-400">{user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${roleBadge(user.role)}`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-600">
                              {getContactLocationLabel(user, effectiveLocationFilter)}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-700 font-medium tabular-nums">
                              {user.points || 0}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-700 font-medium tabular-nums">
                              {(() => {
                                const uc = user.credits || {}
                                return Math.max(0, Number(
                                  typeof uc === 'number' ? uc : (uc[effectiveLocationFilter] ?? 0)
                                ))
                              })()}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-400">
                              {user.createdAt
                                ? new Date(user.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })
                                : '—'}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="w-4 h-4 text-slate-400" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="rounded-xl border-slate-200 shadow-lg p-1.5 min-w-[180px]"
                                  onClick={(e) => e.stopPropagation()}
                                  onPointerDown={(e) => e.stopPropagation()}
                                >
                                  {isSuperAdmin && (
                                    <DropdownMenuItem
                                      className="rounded-lg text-sm text-slate-700 focus:bg-slate-50 focus:text-slate-900"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        navigate(withSpaParam(`/client/${user._id}`))
                                      }}
                                    >
                                      <Edit className="w-4 h-4 mr-2.5 text-slate-400" />
                                      Edit User
                                    </DropdownMenuItem>
                                  )}
                                  {isElevatedUser && (
                                    <DropdownMenuItem
                                      className="rounded-lg text-sm text-slate-700 focus:bg-slate-50 focus:text-slate-900"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleOpenPointsManager(user)
                                      }}
                                    >
                                      <Calculator className="w-4 h-4 mr-2.5 text-slate-400" />
                                      Manage Points
                                    </DropdownMenuItem>
                                  )}
                                  {isElevatedUser && (
                                    <DropdownMenuItem
                                      className="rounded-lg text-sm text-slate-700 focus:bg-slate-50 focus:text-slate-900"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleOpenCreditsManager(user)
                                      }}
                                    >
                                      <BadgeCent className="w-4 h-4 mr-2.5 text-slate-400" />
                                      Manage Credits
                                    </DropdownMenuItem>
                                  )}
                                  {isElevatedUser && (
                                    <DropdownMenuItem
                                      className="rounded-lg text-sm text-slate-700 focus:bg-slate-50 focus:text-slate-900"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleOpenNotificationSender(user)
                                      }}
                                    >
                                      <Send className="w-4 h-4 mr-2.5 text-slate-400" />
                                      Send Notification
                                    </DropdownMenuItem>
                                  )}
                                  {isSuperAdmin && <DropdownMenuSeparator className="my-1 bg-slate-100" />}
                                  {isSuperAdmin && (
                                    <DropdownMenuItem
                                      className="rounded-lg text-sm text-red-600 focus:bg-red-50 focus:text-red-700"
                                      disabled={deleteUserMutation.isPending}
                                      onSelect={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        void handleDeleteUser(user)
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2.5" />
                                      {deleteUserMutation.isPending && deleteUserMutation.variables === userId
                                        ? 'Deleting...'
                                        : 'Delete User'}
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ── Pagination ────────────────────────────── */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                    <p className="text-xs text-slate-400">
                      Showing <span className="font-medium text-slate-600">{startIndex}</span>
                      {' '}to{' '}
                      <span className="font-medium text-slate-600">{endIndex}</span>
                      {' '}of{' '}
                      <span className="font-medium text-slate-600">{totalUsers}</span>
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0 rounded-lg border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-30"
                      >
                        <span className="text-xs">&lt;</span>
                      </Button>
                      {(() => {
                        const pages = []
                        const maxVisible = 5
                        if (totalPages <= maxVisible) {
                          for (let i = 1; i <= totalPages; i++) pages.push(i)
                        } else {
                          let start = Math.max(1, currentPage - 2)
                          let end = Math.min(totalPages, start + maxVisible - 1)
                          if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1)
                          if (start > 1) { pages.push(1); if (start > 2) pages.push('...') }
                          for (let i = start; i <= end; i++) pages.push(i)
                          if (end < totalPages) { if (end < totalPages - 1) pages.push('...'); pages.push(totalPages) }
                        }
                        return pages.map((page, i) =>
                          page === '...' ? (
                            <span key={`ellipsis-${i}`} className="px-1 text-xs text-slate-300">...</span>
                          ) : (
                            <Button
                              key={page}
                              variant={page === currentPage ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handlePageChange(page)}
                              className={`h-8 w-8 p-0 rounded-lg text-xs font-medium ${
                                page === currentPage
                                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                                  : 'border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {page}
                            </Button>
                          )
                        )
                      })()}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0 rounded-lg border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-30"
                      >
                        <span className="text-xs">&gt;</span>
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Modals ──────────────────────────────────── */}
          <AddUserForm
            isOpen={isAddUserOpen}
            onClose={() => setIsAddUserOpen(false)}
            onSubmit={handleCreateUser}
          />

          {isElevatedUser && (
            <>
              <NotificationSender
                isOpen={isNotificationSenderOpen}
                onClose={handleCloseNotificationSender}
                currentUser={currentUser}
                preSelectedUser={selectedUserForNotification}
                scopeRole={roleFilter}
                scopeLocationId={effectiveLocationFilter}
              />
              <PointsManager
                isOpen={isPointsManagerOpen}
                onClose={handleClosePointsManager}
                user={selectedUserForPoints}
                locationId={effectiveLocationFilter}
              />
              <CreditsManager
                isOpen={isCreditsManagerOpen}
                onClose={handleCloseCreditsManager}
                user={selectedUserForCredits}
                locationId={effectiveLocationFilter}
              />
            </>
          )}
        </div>
      </div>
    </Layout>
  )
};

export default ContactsPage;
