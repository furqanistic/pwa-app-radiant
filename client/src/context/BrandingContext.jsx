// File: client/src/context/BrandingContext.jsx
import { resolveImageUrl } from '@/lib/imageHelpers';
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
        const spaLocationId = currentUser?.spaLocation?.locationId?.trim();
        const params = new URLSearchParams(location.search);
        const paramLocationId = params.get('spa')?.trim() || null;
        const storedLocationId = localStorage.getItem('brandingLocationId');
        const currentSubdomain = getCurrentSubdomain();
        const isEntryPage = location.pathname === '/auth' || location.pathname === '/';

        const resolveLocationId = (data) =>
          data?.locationId || data?.location?.locationId || null;

        if (paramLocationId) {
          localStorage.setItem('brandingLocationId', paramLocationId);
          setLocationId(paramLocationId);
          setSubdomain(currentSubdomain);

          const response = await brandingService.getBrandingByLocationId(paramLocationId);
          if (response.success) {
            const resolvedLocationId = resolveLocationId(response.data) || paramLocationId;
            setBranding(response.data);
            setLocationId(resolvedLocationId);
            localStorage.setItem('brandingLocationId', resolvedLocationId);
          } else {
            console.warn('Failed to load branding for locationId:', paramLocationId);
            setBranding(null);
          }
          return;
        }

        // Important: on subdomain domains, resolve location from subdomain first.
        if (currentSubdomain) {
          setSubdomain(currentSubdomain);
          const response = await brandingService.getBrandingBySubdomain(currentSubdomain);
          if (response.success) {
            const resolvedLocationId = resolveLocationId(response.data);
            setBranding(response.data);
            if (resolvedLocationId) {
              setLocationId(resolvedLocationId);
              localStorage.setItem('brandingLocationId', resolvedLocationId);
            } else {
              setLocationId(null);
            }
          } else {
            console.warn('Failed to load branding for subdomain:', currentSubdomain);
            setBranding(null);
            setLocationId(null);
          }
          return;
        }

        let activeLocationId = null;
        if (isEntryPage) {
          // Explicitly clear branding on entry pages without spa param or subdomain
          activeLocationId = null;
        } else if (storedLocationId) {
          activeLocationId = storedLocationId;
        } else if (currentUser?.selectedLocation?.locationId) {
          activeLocationId = currentUser.selectedLocation.locationId;
        } else if (spaLocationId) {
          activeLocationId = spaLocationId;
        }

        setSubdomain(currentSubdomain);

        if (activeLocationId) {
          const response = await brandingService.getBrandingByLocationId(activeLocationId);
          if (response.success) {
            const resolvedLocationId = resolveLocationId(response.data) || activeLocationId;
            setBranding(response.data);
            setLocationId(resolvedLocationId);
            localStorage.setItem('brandingLocationId', resolvedLocationId);
          } else {
            console.warn('Failed to load branding for locationId:', activeLocationId);
            setBranding(null);
          }
          return;
        }
        
        // No subdomain or locationId, use default branding
        setBranding(null);
        setLocationId(null);
      } catch (err) {
        console.error('Error loading branding:', err);
        setError(err.response?.data?.message || 'Failed to load branding');
        setBranding(null);
        setLocationId(null);
      } finally {
        setLoading(false);
      }
    };

    loadBranding();
  }, [
    location.pathname,
    location.search,
    currentUser?.selectedLocation?.locationId,
    currentUser?.spaLocation?.locationId,
  ]);

  // Update document title and favicon when branding changes
  useEffect(() => {
    if (branding) {
      // Update title
      document.title = `${branding.name} - CxR Systems`;
      
      // Update favicon
      if (branding.favicon || branding.faviconPublicId) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = resolveImageUrl(
          branding.favicon || branding.faviconPublicId,
          branding.favicon,
          { width: 64, height: 64 }
        );
      }
      
      // Update theme color CSS variable
      if (branding.themeColor) {
        document.documentElement.style.setProperty('--brand-primary', branding.themeColor);
      }
    } else {
      // Primary default title
      document.title = "CxR Systems - Luxury Beauty Management";
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
