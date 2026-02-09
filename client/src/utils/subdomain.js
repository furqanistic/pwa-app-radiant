// File: client/src/utils/subdomain.js

/**
 * Extract subdomain from current hostname
 * @returns {string|null} - Subdomain or null if none
 */
export const getCurrentSubdomain = () => {
  if (typeof window === 'undefined') return null;

  const hostname = window.location.hostname;

  // Development environment (localhost)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Check for subdomain in URL params for testing
    const params = new URLSearchParams(window.location.search);
    return params.get('subdomain') || null;
  }

  // Production environment
  // Expected format: {subdomain}.cxrsystems.com
  const parts = hostname.split('.');
  
  // If hostname has more than 2 parts and is not www
  if (parts.length > 2) {
    const potentialSubdomain = parts[0];
    
    // Ignore www
    if (potentialSubdomain !== 'www') {
      return potentialSubdomain.toLowerCase();
    }
  }

  // No subdomain found
  return null;
};

/**
 * Check if currently on a subdomain
 * @returns {boolean}
 */
export const isSubdomain = () => {
  return getCurrentSubdomain() !== null;
};

/**
 * Build full subdomain URL
 * @param {string} subdomain - Subdomain name
 * @returns {string} - Full URL
 */
export const buildSubdomainUrl = (subdomain) => {
  if (!subdomain) return null;

  // Development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `${window.location.origin}?subdomain=${subdomain}`;
  }

  // Production
  return `https://${subdomain}.cxrsystems.com`;
};

/**
 * Validate subdomain format (client-side validation)
 * @param {string} subdomain - Subdomain to validate
 * @returns {object} - { valid: boolean, error: string|null }
 */
export const validateSubdomainFormat = (subdomain) => {
  if (!subdomain) {
    return { valid: false, error: 'Subdomain is required' };
  }

  const cleanSubdomain = subdomain.toLowerCase().trim();

  // Length check
  if (cleanSubdomain.length < 3 || cleanSubdomain.length > 20) {
    return { valid: false, error: 'Subdomain must be 3-20 characters' };
  }

  // Format check: lowercase alphanumeric with hyphens, cannot start/end with hyphen
  const regex = /^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/;
  if (!regex.test(cleanSubdomain)) {
    return {
      valid: false,
      error: 'Subdomain must be lowercase letters, numbers, and hyphens only. Cannot start or end with a hyphen.',
    };
  }

  // Reserved subdomains
  const reserved = ['www', 'api', 'admin', 'app', 'mail', 'ftp', 'localhost', 'staging', 'dev', 'test'];
  if (reserved.includes(cleanSubdomain)) {
    return { valid: false, error: 'This subdomain is reserved' };
  }

  return { valid: true, error: null };
};
