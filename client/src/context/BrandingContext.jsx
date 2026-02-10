// File: client/src/context/BrandingContext.jsx
import { selectCurrentUser } from '@/redux/userSlice';
import { brandingService } from '@/services/brandingService';
import { getCurrentSubdomain } from '@/utils/subdomain';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

const BrandingContext = createContext(null);

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within BrandingProvider');
  }
  return context;
};

export const BrandingProvider = ({ children }) => {
  const location = useLocation();
  const currentUser = useSelector(selectCurrentUser);
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subdomain, setSubdomain] = useState(null);
  const [locationId, setLocationId] = useState(null);

  useEffect(() => {
    const loadBranding = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams(location.search);
        const paramLocationId = params.get('spa')?.trim() || null;
        const storedLocationId = localStorage.getItem('brandingLocationId');
        const currentSubdomain = getCurrentSubdomain();
        const isEntryPage = location.pathname === '/auth' || location.pathname === '/';

        let activeLocationId = null;

        if (paramLocationId) {
          localStorage.setItem('brandingLocationId', paramLocationId);
          activeLocationId = paramLocationId;
        } else if (isEntryPage) {
          // Explicitly clear branding on entry pages without a spa param
          activeLocationId = null;
        } else if (storedLocationId) {
          activeLocationId = storedLocationId;
        } else if (currentUser?.selectedLocation?.locationId) {
          activeLocationId = currentUser.selectedLocation.locationId;
        }

        setLocationId(activeLocationId);
        setSubdomain(currentSubdomain);

        if (activeLocationId) {
          const response = await brandingService.getBrandingByLocationId(activeLocationId);
          if (response.success) {
            setBranding(response.data);
          } else {
            console.warn('Failed to load branding for locationId:', activeLocationId);
            setBranding(null);
          }
          setLoading(false);
          return;
        }

        if (currentSubdomain) {
          const response = await brandingService.getBrandingBySubdomain(currentSubdomain);
          if (response.success) {
            setBranding(response.data);
          } else {
            console.warn('Failed to load branding for subdomain:', currentSubdomain);
            setBranding(null);
          }
          setLoading(false);
          return;
        }
        
        // No subdomain or locationId, use default branding
        setBranding(null);
        setLoading(false);
      } catch (err) {
        console.error('Error loading branding:', err);
        setError(err.response?.data?.message || 'Failed to load branding');
        setBranding(null);
      } finally {
        setLoading(false);
      }
    };

    loadBranding();
  }, [location.search, currentUser?.selectedLocation?.locationId]);

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
    locationId,
    hasBranding: !!branding,
    isSubdomain: !!subdomain,
  };

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
};
