// File: client/src/services/brandingService.js
import { axiosInstance } from '@/config';

/**
 * Get branding data for a subdomain
 * @param {string} subdomain - Subdomain to fetch branding for
 * @returns {Promise} - Branding data
 */
export const getBrandingBySubdomain = async (subdomain) => {
  const response = await axiosInstance.get(`/branding/${subdomain}`);
  return response.data;
};

/**
 * Validate subdomain availability
 * @param {string} subdomain - Subdomain to validate
 * @param {string} locationId - Optional location ID if editing
 * @returns {Promise} - Validation result
 */
export const validateSubdomain = async (subdomain, locationId = null) => {
  const response = await axiosInstance.post('/branding/validate-subdomain', {
    subdomain,
    locationId,
  });
  return response.data;
};

export const brandingService = {
  getBrandingBySubdomain,
  validateSubdomain,
};
