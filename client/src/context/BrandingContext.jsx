// File: client/src/context/BrandingContext.jsx
import { brandingService } from '@/services/brandingService';
import { getCurrentSubdomain } from '@/utils/subdomain';
import React, { createContext, useContext, useEffect, useState } from 'react';

const BrandingContext = createContext(null);

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within BrandingProvider');
  }
  return context;
};

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subdomain, setSubdomain] = useState(null);

  useEffect(() => {
    const loadBranding = async () => {
      setLoading(true);
      setError(null);

      try {
        const currentSubdomain = getCurrentSubdomain();
        setSubdomain(currentSubdomain);

        if (!currentSubdomain) {
          // No subdomain, use default branding
          setBranding(null);
          setLoading(false);
          return;
        }

        // Fetch branding for this subdomain
        const response = await brandingService.getBrandingBySubdomain(currentSubdomain);
        
        if (response.success) {
          setBranding(response.data);
        } else {
          console.warn('Failed to load branding for subdomain:', currentSubdomain);
          setBranding(null);
        }
      } catch (err) {
        console.error('Error loading branding:', err);
        setError(err.response?.data?.message || 'Failed to load branding');
        setBranding(null);
      } finally {
        setLoading(false);
      }
    };

    loadBranding();
  }, []);

  // Update document title and favicon when branding changes
  useEffect(() => {
    if (branding) {
      // Update title
      document.title = `${branding.name} - RadiantAI`;
      
      // Update favicon
      if (branding.favicon) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = branding.favicon;
      }
      
      // Update theme color CSS variable
      if (branding.themeColor) {
        document.documentElement.style.setProperty('--brand-primary', branding.themeColor);
      }
    } else {
      // Primary default title
      document.title = "RadiantAI - Luxury Beauty Management";
      document.documentElement.style.setProperty('--brand-primary', '#ec4899'); // Default pink
    }
  }, [branding]);

  const value = {
    branding,
    loading,
    error,
    subdomain,
    hasBranding: !!branding,
    isSubdomain: !!subdomain,
  };

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
};
