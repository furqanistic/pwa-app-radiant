// File: client/src/hooks/useServices.js
// client/src/hooks/useServices.js
import { servicesService } from '@/services/servicesService'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Query Keys
export const serviceQueryKeys = {
  all: ['services'],
  lists: () => [...serviceQueryKeys.all, 'list'],
  list: (filters) => [...serviceQueryKeys.lists(), { filters }],
  details: () => [...serviceQueryKeys.all, 'detail'],
  detail: (id) => [...serviceQueryKeys.details(), id],
  categories: ['categories'],
  categoriesList: (includeCount) => [
    ...serviceQueryKeys.categories,
    'list',
    { includeCount },
  ],
  stats: ['serviceStats'],
  statsOverview: (locationId) => [
    ...serviceQueryKeys.stats,
    'overview',
    { locationId },
  ],
}

// =====================================
// QUERY HOOKS (GET operations)
// =====================================

// Get all services with filtering
export const useServices = (filters = {}) => {
  return useQuery({
    queryKey: serviceQueryKeys.list(filters),
    queryFn: () => servicesService.getServices(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => data.data, // Extract the data object
  })
}

// Get single service
export const useService = (id, options = {}) => {
  return useQuery({
    queryKey: serviceQueryKeys.detail(id),
    queryFn: () => servicesService.getService(id),
    enabled: !!id, // Only run if ID is provided
    staleTime: 10 * 60 * 1000, // 10 minutes
    select: (data) => data.data.service,
    ...options,
  })
}

// Get categories
export const useCategories = (includeCount = false) => {
  return useQuery({
    queryKey: serviceQueryKeys.categoriesList(includeCount),
    queryFn: () => servicesService.getCategories(includeCount),
    staleTime: 10 * 60 * 1000, // 10 minutes
    select: (data) => data.data.categories,
  })
}

// Get service statistics
export const useServiceStats = (locationId = null) => {
  return useQuery({
    queryKey: serviceQueryKeys.statsOverview(locationId),
    queryFn: () => servicesService.getServiceStats(locationId),
    staleTime: 2 * 60 * 1000, // 2 minutes (shorter for stats)
    select: (data) => data.data,
  })
}

// =====================================
// MUTATION HOOKS (CREATE/UPDATE/DELETE)
// =====================================

// Create service
export const useCreateService = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: servicesService.createService,
    onSuccess: (data) => {
      // Invalidate and refetch services list
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.lists() })
      // Invalidate stats
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.stats })
      // Run any additional success callback
      options.onSuccess?.(data)
    },
    onError: (error) => {
      console.error('Error creating service:', error)
      options.onError?.(error)
    },
  })
}

// Update service
export const useUpdateService = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...serviceData }) =>
      servicesService.updateService(id, serviceData),
    onSuccess: (data, variables) => {
      // Update the specific service in cache
      queryClient.setQueryData(
        serviceQueryKeys.detail(variables.id),
        (oldData) =>
          oldData ? { ...oldData, data: { service: data.data.service } } : data
      )
      // Invalidate services list to ensure consistency
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.lists() })
      // Invalidate stats
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.stats })
      // Run any additional success callback
      options.onSuccess?.(data, variables)
    },
    onError: (error) => {
      console.error('Error updating service:', error)
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
      // Invalidate services list
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.lists() })
      // Invalidate stats
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.stats })
      // Run any additional success callback
      options.onSuccess?.(data, serviceId)
    },
    onError: (error) => {
      console.error('Error deleting service:', error)
      options.onError?.(error)
    },
  })
}

// =====================================
// CATEGORY MUTATION HOOKS
// =====================================

// Create category
export const useCreateCategory = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: servicesService.createCategory,
    onSuccess: (data) => {
      // Invalidate categories list
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.categories })
      // Run any additional success callback
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
    mutationFn: ({ id, ...categoryData }) =>
      servicesService.updateCategory(id, categoryData),
    onSuccess: (data) => {
      // Invalidate categories list
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.categories })
      // Invalidate services list in case category name changed
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.lists() })
      // Run any additional success callback
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
    onSuccess: (data, categoryId) => {
      // Invalidate categories list
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.categories })
      // Invalidate services list
      queryClient.invalidateQueries({ queryKey: serviceQueryKeys.lists() })
      // Run any additional success callback
      options.onSuccess?.(data, categoryId)
    },
    onError: (error) => {
      console.error('Error deleting category:', error)
      options.onError?.(error)
    },
  })
}

// =====================================
// UTILITY HOOKS
// =====================================

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
