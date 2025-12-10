// File: client/src/hooks/useServices.js
import { servicesService } from '@/services/servicesService'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// ===============================================
// QUERY KEYS
// ===============================================

export const serviceQueryKeys = {
  all: ['services'],
  lists: () => [...serviceQueryKeys.all, 'list'],
  list: (filters) => [...serviceQueryKeys.all, 'list', filters],
  details: () => [...serviceQueryKeys.all, 'detail'],
  detail: (id) => [...serviceQueryKeys.all, 'detail', id],
  categories: ['categories'],
  categoriesList: (includeCount) => [
    ...serviceQueryKeys.categories,
    'list',
    includeCount,
  ],
  stats: ['serviceStats'],
  statsOverview: (locationId) => [
    ...serviceQueryKeys.stats,
    'overview',
    locationId,
  ],
  availableAddons: (serviceId, filters) => [
    ...serviceQueryKeys.all,
    'available-addons',
    serviceId,
    filters,
  ],
  withLinkedServices: (serviceId) => [
    ...serviceQueryKeys.all,
    'with-linked',
    serviceId,
  ],
}

// ===============================================
// SERVICE QUERY HOOKS
// ===============================================

// Get all services with filtering and search
export const useServices = (params = {}) => {
  return useQuery({
    queryKey: serviceQueryKeys.list(params),
    queryFn: () => servicesService.getServices(params),
    select: (data) => data.data, // Extract the data object
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useServiceWithAddOns = (id, options = {}) => {
  return useQuery({
    queryKey: [...serviceQueryKeys.detail(id), 'with-addons'],
    queryFn: async () => {
      // First get the service with linked services
      const serviceResponse = await servicesService.getService(id)
      return serviceResponse
    },
    select: (data) => {
      const service = data?.data?.service || null

      // Ensure linkedServices are properly formatted for the frontend
      if (service && service.linkedServices) {
        service.linkedServices = service.linkedServices.map((link) => ({
          ...link,
          // Ensure we have all the necessary fields for display
          serviceId: link.serviceId || link._id,
          finalPrice: link.finalPrice || link.customPrice || link.basePrice,
          finalDuration:
            link.finalDuration || link.customDuration || link.duration,
        }))
      }

      return service
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  })
}

// You can also update the existing useService hook to include linkedServices by default
export const useService = (id, options = {}) => {
  return useQuery({
    queryKey: serviceQueryKeys.detail(id),
    queryFn: () => servicesService.getService(id),
    select: (data) => {
      const service = data?.data?.service || null

      // Transform linkedServices to ensure proper format
      if (service && service.linkedServices) {
        service.linkedServices = service.linkedServices.map((link) => ({
          ...link,
          serviceId: link.serviceId || link._id,
          finalPrice: link.finalPrice || link.customPrice || link.basePrice,
          finalDuration:
            link.finalDuration || link.customDuration || link.duration,
        }))
      }

      return service
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  })
}

// Get service statistics
export const useServiceStats = (locationId = null) => {
  return useQuery({
    queryKey: serviceQueryKeys.statsOverview(locationId),
    queryFn: () => servicesService.getServiceStats(locationId),
    select: (data) => data?.data || {},
    staleTime: 15 * 60 * 1000, // 15 minutes
  })
}

// ===============================================
// SERVICE LINKING QUERY HOOKS
// ===============================================

// Get available services for linking as add-ons
export const useAvailableAddOnServices = (serviceId, params = {}) => {
  return useQuery({
    queryKey: serviceQueryKeys.availableAddons(serviceId, params),
    queryFn: () => servicesService.getAvailableAddOnServices(serviceId, params),
    select: (data) => data?.data?.services || [],
    enabled: !!serviceId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  })
}

// Get service with linked services details
export const useServiceWithLinkedServices = (serviceId) => {
  return useQuery({
    queryKey: serviceQueryKeys.withLinkedServices(serviceId),
    queryFn: () => servicesService.getServiceWithLinkedServices(serviceId),
    select: (data) => data?.data?.service || null,
    enabled: !!serviceId,
    staleTime: 5 * 60 * 1000,
  })
}

// ===============================================
// CATEGORY QUERY HOOKS
// ===============================================

// Get all categories
export const useCategories = (includeCount = false) => {
  return useQuery({
    queryKey: serviceQueryKeys.categoriesList(includeCount),
    queryFn: () => servicesService.getCategories({ includeCount }),
    select: (data) => data?.data?.categories || [],
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// ===============================================
// SERVICE MUTATION HOOKS
// ===============================================

// Create new service
export const useCreateService = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: servicesService.createService,
    onSuccess: (data) => {
      // Invalidate and refetch services
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.stats })
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.categories })

      // Call success callback
      options.onSuccess?.(data)
    },
    onError: (error) => {
      console.error('Error creating service:', error)
      options.onError?.(error)
    },
  })
}

// Update existing service
// Enhanced useUpdateService hook in hooks/useServices.js
export const useUpdateService = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...data }) => {
      console.log('🔄 Updating service:', { id, data })
      return servicesService.updateService(id, data)
    },
    onSuccess: (data, variables) => {
      console.log('✅ Service updated successfully:', data)

      // Update cache for the specific service
      queryClient.setQueryData(
        serviceQueryKeys.detail(variables.id),
        (oldData) => ({
          ...oldData,
          data: { service: data.data.service },
        })
      )

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.stats })
      queryClient.invalidateQueries({
        queryKey: serviceQueryKeys.withLinkedServices(variables.id),
      })

      // Call success callback
      options.onSuccess?.(data)
    },
    onError: (error, variables) => {
      console.error('❌ Error updating service:', error)
      console.error('Variables that caused error:', variables)

      // Log detailed error information
      if (error.response) {
        console.error('Response data:', error.response.data)
        console.error('Response status:', error.response.status)
      }

      options.onError?.(error)
    },
  })
}

// Delete service
export const useDeleteService = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: servicesService.deleteService,
    onSuccess: (data, serviceId) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: serviceQueryKeys.detail(serviceId),
      })

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.stats })
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.categories })
      queryClient.invalidateQueries({
        queryKey: [...serviceQueryKeys.all, 'available-addons'],
      })

      // Call success callback
      options.onSuccess?.(data)
    },
    onError: (error) => {
      console.error('Error deleting service:', error)
      options.onError?.(error)
    },
  })
}

// ===============================================
// SERVICE LINKING MUTATION HOOKS
// ===============================================

// Link services as add-ons mutation
export const useLinkServicesToService = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ serviceId, serviceIds, customOptions = {} }) =>
      servicesService.linkServicesToService(
        serviceId,
        serviceIds,
        customOptions
      ),
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: serviceQueryKeys.detail(variables.serviceId),
      })
      queryClient.invalidateQueries({
        queryKey: serviceQueryKeys.withLinkedServices(variables.serviceId),
      })
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: [...serviceQueryKeys.all, 'available-addons'],
      })

      // Call success callback
      options.onSuccess?.(data)
    },
    onError: (error) => {
      console.error('Error linking services:', error)
      options.onError?.(error)
    },
  })
}

// Unlink service from add-ons mutation
export const useUnlinkServiceFromService = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ serviceId, linkedServiceId }) =>
      servicesService.unlinkServiceFromService(serviceId, linkedServiceId),
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: serviceQueryKeys.detail(variables.serviceId),
      })
      queryClient.invalidateQueries({
        queryKey: serviceQueryKeys.withLinkedServices(variables.serviceId),
      })
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: [...serviceQueryKeys.all, 'available-addons'],
      })

      // Call success callback
      options.onSuccess?.(data)
    },
    onError: (error) => {
      console.error('Error unlinking service:', error)
      options.onError?.(error)
    },
  })
}

// ===============================================
// CATEGORY MUTATION HOOKS
// ===============================================

// Create new category
export const useCreateCategory = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: servicesService.createCategory,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.categories })
      options.onSuccess?.(data)
    },
    onError: (error) => {
      console.error('Error creating category:', error)
      options.onError?.(error)
    },
  })
}

// Update category
export const useUpdateCategory = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...data }) => servicesService.updateCategory(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.categories })
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.lists() })
      options.onSuccess?.(data)
    },
    onError: (error) => {
      console.error('Error updating category:', error)
      options.onError?.(error)
    },
  })
}

// Delete category
export const useDeleteCategory = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: servicesService.deleteCategory,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.categories })
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.lists() })
      options.onSuccess?.(data)
    },
    onError: (error) => {
      console.error('Error deleting category:', error)
      options.onError?.(error)
    },
  })
}

// ===============================================
// SEARCH AND FILTER HOOKS
// ===============================================

// Search services with rewards
export const useSearchServicesWithRewards = (query, filters = {}) => {
  return useQuery({
    queryKey: ['search-services-rewards', query, filters],
    queryFn: () => servicesService.searchServicesWithRewards(query, filters),
    select: (data) => data?.data?.services || [],
    enabled: query.length > 2, // Only search when query is at least 3 characters
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Get services by category
export const useServicesByCategory = (categoryId, includeRewards = false) => {
  return useQuery({
    queryKey: ['services-by-category', categoryId, includeRewards],
    queryFn: () =>
      servicesService.getServicesByCategory(categoryId, includeRewards),
    select: (data) => data?.data?.services || [],
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
  })
}

// Get services with rewards
export const useServicesWithRewards = (params = {}) => {
  return useQuery({
    queryKey: ['services-with-rewards', params],
    queryFn: () => servicesService.getServicesWithRewards(params),
    select: (data) => data?.data?.services || [],
    staleTime: 5 * 60 * 1000,
  })
}

// ===============================================
// UTILITY AND HELPER HOOKS
// ===============================================

// Get filtered services with computed properties
export const useFilteredServices = (filters = {}) => {
  const { data: servicesData, ...queryResult } = useServices(filters)

  const services = servicesData?.services || []
  const stats = servicesData?.stats || {}
  const pagination = servicesData?.pagination || {}

  // Add computed properties
  const processedServices = services.map((service) => ({
    ...service,
    // Calculate discounted price if discount is active
    discountedPrice:
      service.discount?.active && service.discount?.percentage > 0
        ? service.basePrice -
          (service.basePrice * service.discount.percentage) / 100
        : service.basePrice,
    // Check if discount is currently active
    isDiscountActive:
      service.discount?.active &&
      new Date() >= new Date(service.discount.startDate || Date.now()) &&
      new Date() <= new Date(service.discount.endDate || Date.now()),
    // Category name for display
    categoryName: service.categoryId?.name,
  }))

  return {
    ...queryResult,
    services: processedServices,
    stats,
    pagination,
  }
}

// Get active services only (for booking/catalog pages)
export const useActiveServices = (additionalFilters = {}) => {
  return useFilteredServices({
    status: 'active',
    ...additionalFilters,
  })
}

// Get services with discounts
export const useDiscountedServices = (additionalFilters = {}) => {
  const { data: servicesData, ...queryResult } = useServices(additionalFilters)

  const services = servicesData?.services || []

  // Filter for services with active discounts
  const discountedServices = services.filter((service) => {
    if (!service.discount?.active) return false
    const now = new Date()
    const startDate = service.discount.startDate
      ? new Date(service.discount.startDate)
      : new Date()
    const endDate = service.discount.endDate
      ? new Date(service.discount.endDate)
      : new Date()
    return now >= startDate && now <= endDate
  })

  return {
    ...queryResult,
    services: discountedServices,
  }
}

// ===============================================
// WORKFLOW MANAGEMENT HOOKS
// ===============================================

// Hook to manage service linking workflow
export const useServiceLinkingWorkflow = (serviceId) => {
  const availableServices = useAvailableAddOnServices(serviceId)
  const linkMutation = useLinkServicesToService()
  const unlinkMutation = useUnlinkServiceFromService()

  const linkServices = async (serviceIds, options = {}) => {
    try {
      const result = await linkMutation.mutateAsync({
        serviceId,
        serviceIds,
        customOptions: options,
      })
      return result
    } catch (error) {
      throw error
    }
  }

  const unlinkService = async (linkedServiceId) => {
    try {
      const result = await unlinkMutation.mutateAsync({
        serviceId,
        linkedServiceId,
      })
      return result
    } catch (error) {
      throw error
    }
  }

  return {
    availableServices: availableServices.data || [],
    isLoadingAvailable: availableServices.isLoading,
    linkServices,
    unlinkService,
    isLinking: linkMutation.isPending,
    isUnlinking: unlinkMutation.isPending,
    linkError: linkMutation.error,
    unlinkError: unlinkMutation.error,
  }
}

// Hook for service form management with linking
export const useServiceFormWithLinking = (serviceId = null) => {
  const service = useService(serviceId)
  const createMutation = useCreateService()
  const updateMutation = useUpdateService()
  const { linkServices } = useServiceLinkingWorkflow(serviceId)

  const handleSaveService = async (formData, linkedServiceIds = []) => {
    try {
      let savedService

      if (serviceId) {
        // Update existing service
        savedService = await updateMutation.mutateAsync({
          id: serviceId,
          ...formData,
        })
      } else {
        // Create new service
        savedService = await createMutation.mutateAsync(formData)
      }

      // Link services if any are selected
      if (linkedServiceIds.length > 0) {
        const serviceIdToLink = serviceId || savedService.data.service._id
        await linkServices(linkedServiceIds)
      }

      return savedService
    } catch (error) {
      throw error
    }
  }

  return {
    service: service.data,
    isLoading: service.isLoading,
    handleSaveService,
    isSaving: createMutation.isPending || updateMutation.isPending,
    error: service.error || createMutation.error || updateMutation.error,
  }
}

// ===============================================
// BULK OPERATIONS HOOKS
// ===============================================

// Bulk update services mutation
export const useBulkUpdateServices = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ serviceIds, updateData }) =>
      servicesService.bulkUpdateServices(serviceIds, updateData),
    onSuccess: (data) => {
      // Invalidate all service-related queries
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.details() })
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.stats })

      options.onSuccess?.(data)
    },
    onError: (error) => {
      console.error('Error bulk updating services:', error)
      options.onError?.(error)
    },
  })
}

// ===============================================
// PREFETCH UTILITIES
// ===============================================

// Prefetch service details (useful for hover states, etc.)
export const usePrefetchService = () => {
  const queryClient = useQueryClient()

  return (id) => {
    queryClient.prefetchQuery({
      queryKey: serviceQueryKeys.detail(id),
      queryFn: () => servicesService.getService(id),
      staleTime: 10 * 60 * 1000,
    })
  }
}









// ✅ ONLY THE FIXED HOOK - Replace the useBookedTimes section in your useServices.js

// ===============================================
// BOOKED TIMES QUERY HOOKS (FIXED)
// ===============================================

export const bookingQueryKeys = {
  all: ['bookings'],
  bookedTimes: (serviceId, date) => [...bookingQueryKeys.all, 'booked-times', serviceId, date],
}

// ✅ FIXED: Correct extraction path
export const useBookedTimes = (serviceId, date) => {
  return useQuery({
    queryKey: bookingQueryKeys.bookedTimes(serviceId, date),
    queryFn: async () => {
      // Validate inputs
      if (!serviceId || !date) {
        console.warn('⚠️ Missing serviceId or date for booked times');
        return [];
      }

      try {
        const response = await fetch(
          `/api/bookings/booked-times?serviceId=${serviceId}&date=${date}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        if (!response.ok) {
          console.error('❌ API Error:', response.status);
          throw new Error('Failed to fetch booked times');
        }

        const data = await response.json();
        
        // 🔧 DEBUG LOG
        console.log('📥 Booked Times API Response:', {
          full: data,
          extracted: data.data?.bookedTimes,
        });

        // ✅ CORRECT EXTRACTION PATH
        // Backend returns: { success: true, data: { bookedTimes: [...] } }
        // So we need: data.data.bookedTimes
        const bookedTimes = data.data?.bookedTimes || [];
        
        console.log('✅ Extracted booked times:', bookedTimes);
        
        return bookedTimes;
      } catch (error) {
        console.error('❌ Error fetching booked times:', error);
        return [];
      }
    },
    enabled: !!serviceId && !!date,
    staleTime: 1 * 60 * 1000, // 1 minute cache
    retry: 1,
  });
}