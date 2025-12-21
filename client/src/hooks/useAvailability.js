import { axiosInstance } from '@/config';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const useAvailability = (locationId, date, serviceId) => {
  return useQuery({
    queryKey: ['availability', locationId, date, serviceId],
    queryFn: async () => {
      if (!locationId || !date || !serviceId) return { slots: [] };
      const response = await axiosInstance.get('/bookings/availability', {
        params: { locationId, date, serviceId },
      });
      return response.data.data;
    },
    enabled: !!locationId && !!date && !!serviceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUpdateAvailability = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (businessHours) => {
      const response = await axiosInstance.put('/bookings/availability', {
        businessHours,
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['availability']);
      queryClient.invalidateQueries(['currentUser']); // Update user state if cached
    },
  });
};
