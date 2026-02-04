
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';

/**
 * AppIconManager dynamically updates the PWA manifest and icons based on the selected spa location.
 * This ensures that when a user selects a spa, the app branding (icon and manifest) matches that spa.
 */
const AppIconManager = () => {
    const { currentUser } = useSelector((state) => state.user);
    
    // Determine the active location based on role
    // Spa owners use spaLocation, regular users use selectedLocation
    const activeLocation = currentUser?.role === 'spa' 
        ? currentUser?.spaLocation 
        : currentUser?.selectedLocation;

    const spaLogo = activeLocation?.logo;
    const spaName = activeLocation?.locationName;

    useEffect(() => {
        // Default values from index.html/manifest.json
        const DEFAULT_ICON = '/favicon_io/android-chrome-512x512.png';
        const DEFAULT_APPLE_ICON = '/favicon_io/apple-touch-icon.png';
        const DEFAULT_MANIFEST = '/manifest.json';
        const DEFAULT_APP_NAME = 'RadiantAI';

        const updateMetadata = async () => {
            const logoToUse = spaLogo || DEFAULT_ICON;
            const appleLogoToUse = spaLogo || DEFAULT_APPLE_ICON;
            const nameToUse = spaName ? `${spaName}` : DEFAULT_APP_NAME;

            // 1. Update Title
            document.title = spaName ? `${spaName} | RadiantAI` : DEFAULT_APP_NAME;

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

            // Update various icon sizes
            updateLink('icon', logoToUse);
            updateLink('shortcut icon', logoToUse);
            
            // 3. Update Apple Touch Icon
            updateLink('apple-touch-icon', appleLogoToUse);

            // 4. Update Meta Tags
            const metaTitle = document.querySelector("meta[name='apple-mobile-web-app-title']");
            if (metaTitle) metaTitle.setAttribute("content", nameToUse);
            
            const ogTitle = document.querySelector("meta[property='og:title']");
            if (ogTitle) ogTitle.setAttribute("content", nameToUse);
            
            const ogImage = document.querySelector("meta[property='og:image']");
            if (ogImage) ogImage.setAttribute("content", logoToUse);

            // 5. Dynamic Manifest Update (Crucial for PWA)
            if (spaLogo || spaName) {
                try {
                    // Fetch original manifest or use a base template
                    const response = await fetch(DEFAULT_MANIFEST);
                    const manifest = await response.json();

                    // Customize manifest
                    manifest.name = nameToUse;
                    manifest.short_name = spaName || DEFAULT_APP_NAME;
                    
                    if (spaLogo) {
                        manifest.icons = [
                            {
                                src: spaLogo,
                                sizes: "192x192",
                                type: "image/png",
                                purpose: "any"
                            },
                            {
                                src: spaLogo,
                                sizes: "512x512",
                                type: "image/png",
                                purpose: "any"
                            },
                            {
                                src: spaLogo,
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
    }, [spaLogo, spaName]);

    return null; // This component doesn't render anything
};

export default AppIconManager;
