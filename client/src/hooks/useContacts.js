// client/src/hooks/useContacts.js
import { axiosInstance } from '@/config'
import { useQuery, useQueryClient } from '@tanstack/react-query'

// Fetch contacts with pagination
export const useContacts = ({
  limit = 20,
  skip = 0,
  searchTerm = '',
  enabled = true,
}) => {
  return useQuery({
    queryKey: ['contacts', { limit, skip, searchTerm }],
    queryFn: async () => {
      const response = await axiosInstance.get('/ghl/contacts', {
        params: { limit, skip },
      })
      return response.data
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Search contacts by email/phone
export const useContactLookup = ({ email, phone, enabled = false }) => {
  return useQuery({
    queryKey: ['contacts', 'lookup', { email, phone }],
    queryFn: async () => {
      const params = {}
      if (email) params.email = email
      if (phone) params.phone = phone

      const response = await axiosInstance.get('/ghl/contacts/lookup', {
        params,
      })
      return response.data
    },
    enabled: enabled && (email || phone),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Get contact stats
export const useContactStats = () => {
  return useQuery({
    queryKey: ['contacts', 'stats'],
    queryFn: async () => {
      // Get first batch to get total count
      const response = await axiosInstance.get('/ghl/contacts', {
        params: { limit: 1, skip: 0 },
      })

      // Calculate basic stats from the response
      const total = response.data.pagination?.total || 0

      return {
        total,
        leads: total, // All contacts are essentially leads in GHL
        recent: 0, // We can calculate this later if needed
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Prefetch next page
export const usePrefetchContacts = () => {
  const queryClient = useQueryClient()

  return ({ limit, skip }) => {
    queryClient.prefetchQuery({
      queryKey: ['contacts', { limit, skip: skip + limit }],
      queryFn: async () => {
        const response = await axiosInstance.get('/ghl/contacts', {
          params: { limit, skip: skip + limit },
        })
        return response.data
      },
      staleTime: 5 * 60 * 1000,
    })
  }
}

// Get individual contact by ID
export const useContact = (contactId, enabled = false) => {
  return useQuery({
    queryKey: ['contact', contactId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/ghl/contacts/${contactId}`)
      return response.data
    },
    enabled: enabled && !!contactId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  })
}
