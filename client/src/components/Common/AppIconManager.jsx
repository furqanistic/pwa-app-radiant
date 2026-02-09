
import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useBranding } from '@/context/BrandingContext';

/**
 * AppIconManager dynamically updates the PWA manifest and icons based on the selected spa location.
 * This ensures that when a user selects a spa, the app branding (icon and manifest) matches that spa.
 */
const AppIconManager = () => {
    const { currentUser } = useSelector((state) => state.user);
    const { branding } = useBranding();
    const manifestUrlRef = useRef(null);
    
    // Determine the active location based on role
    // Spa owners use spaLocation, regular users use selectedLocation
    const activeLocation = currentUser?.role === 'spa' 
        ? currentUser?.spaLocation 
        : currentUser?.selectedLocation;

    const spaLogo = activeLocation?.logo;
    const spaName = activeLocation?.locationName;
    const spaThemeColor = activeLocation?.themeColor;

    // Prefer subdomain branding, then selected spa data
    const brandName = branding?.name || spaName;
    const brandLogo = branding?.logo || spaLogo;
    const brandFavicon = branding?.favicon || brandLogo;
    const brandThemeColor = branding?.themeColor || spaThemeColor;

    useEffect(() => {
        // Default values from index.html/manifest.json
        const DEFAULT_ICON = '/favicon_io/android-chrome-512x512.png';
        const DEFAULT_FAVICON = '/favicon_io/favicon.ico';
        const DEFAULT_APPLE_ICON = '/favicon_io/apple-touch-icon.png';
        const DEFAULT_MANIFEST = '/manifest.json';
        const DEFAULT_APP_NAME = 'RadiantAI';
        const DEFAULT_THEME_COLOR = '#ec4899';

        const updateMetadata = async () => {
            const pwaIconToUse = brandLogo || brandFavicon || DEFAULT_ICON;
            const faviconToUse = brandFavicon || DEFAULT_FAVICON;
            const appleLogoToUse = brandLogo || brandFavicon || DEFAULT_APPLE_ICON;
            const nameToUse = brandName ? `${brandName}` : DEFAULT_APP_NAME;
            const themeColorToUse = brandThemeColor || DEFAULT_THEME_COLOR;

            // 1. Update Title
            document.title = brandName ? `${brandName} | RadiantAI` : DEFAULT_APP_NAME;

            // 2. Update Icon Links (Force refresh by replacing elements)
            const updateLink = (rel, href) => {
                let link = document.querySelector(`link[rel="${rel}"]`);
                if (link) {
                    link.href = href;
                } else {
                    link = document.createElement('link');
                    link.rel = rel;
                    link.href = href;
                    document.head.appendChild(link);
                }
                // Force browser to re-read by toggling the rel
                const originalRel = link.rel;
                link.rel = 'search';
                link.rel = originalRel;
            };

            const updateAllLinks = (selector, href) => {
                document.querySelectorAll(selector).forEach((link) => {
                    link.href = href;
                    const originalRel = link.rel;
                    link.rel = 'search';
                    link.rel = originalRel;
                });
            };

            // Update various icon sizes
            updateAllLinks("link[rel='icon']", faviconToUse);
            updateLink('icon', faviconToUse);
            updateLink('shortcut icon', faviconToUse);
            
            // 3. Update Apple Touch Icon
            updateAllLinks("link[rel='apple-touch-icon']", appleLogoToUse);
            updateLink('apple-touch-icon', appleLogoToUse);

            // 4. Update Meta Tags
            const metaTitle = document.querySelector("meta[name='apple-mobile-web-app-title']");
            if (metaTitle) metaTitle.setAttribute("content", nameToUse);
            
            const applicationName = document.querySelector("meta[name='application-name']");
            if (applicationName) applicationName.setAttribute("content", nameToUse);

            const themeColor = document.querySelector("meta[name='theme-color']");
            if (themeColor) themeColor.setAttribute("content", themeColorToUse);

            const msNavColor = document.querySelector("meta[name='msapplication-navbutton-color']");
            if (msNavColor) msNavColor.setAttribute("content", themeColorToUse);
            
            const ogTitle = document.querySelector("meta[property='og:title']");
            if (ogTitle) ogTitle.setAttribute("content", nameToUse);
            
            const ogImage = document.querySelector("meta[property='og:image']");
            if (ogImage) ogImage.setAttribute("content", pwaIconToUse);

            const twitterTitle = document.querySelector("meta[name='twitter:title']");
            if (twitterTitle) twitterTitle.setAttribute("content", nameToUse);

            const twitterImage = document.querySelector("meta[name='twitter:image']");
            if (twitterImage) twitterImage.setAttribute("content", pwaIconToUse);

            // 5. Dynamic Manifest Update (Crucial for PWA)
            if (brandLogo || brandName || brandThemeColor) {
                try {
                    // Fetch original manifest or use a base template
                    const response = await fetch(DEFAULT_MANIFEST);
                    const manifest = await response.json();

                    // Customize manifest
                    manifest.name = nameToUse;
                    manifest.short_name = brandName || DEFAULT_APP_NAME;
                    manifest.theme_color = themeColorToUse;
                    
                    if (pwaIconToUse) {
                        manifest.icons = [
                            {
                                src: pwaIconToUse,
                                sizes: "192x192",
                                type: "image/png",
                                purpose: "any"
                            },
                            {
                                src: pwaIconToUse,
                                sizes: "512x512",
                                type: "image/png",
                                purpose: "any"
                            },
                            {
                                src: pwaIconToUse,
                                sizes: "512x512",
                                type: "image/png",
                                purpose: "maskable"
                            }
                        ];
                    }

                    // Create Blob URL for the new manifest
                    const stringManifest = JSON.stringify(manifest);
                    const blob = new Blob([stringManifest], { type: 'application/json' });
                    const manifestURL = URL.createObjectURL(blob);

                    // Update Manifest Link
                    let manifestLink = document.querySelector("link[rel='manifest']");
                    if (manifestLink) {
                        manifestLink.href = manifestURL;
                    }

                    if (manifestUrlRef.current) {
                        URL.revokeObjectURL(manifestUrlRef.current);
                    }
                    manifestUrlRef.current = manifestURL;
                } catch (error) {
                    console.error("Error updating dynamic manifest:", error);
                }
            } else {
                // Reset to default manifest if no spa selected
                let manifestLink = document.querySelector("link[rel='manifest']");
                if (manifestLink) {
                    manifestLink.href = DEFAULT_MANIFEST;
                }
            }
        };

        updateMetadata();
        return () => {
            if (manifestUrlRef.current) {
                URL.revokeObjectURL(manifestUrlRef.current);
                manifestUrlRef.current = null;
            }
        };
    }, [brandLogo, brandFavicon, brandName, brandThemeColor]);

    return null; // This component doesn't render anything
};

export default AppIconManager;
