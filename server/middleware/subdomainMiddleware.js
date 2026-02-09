// File: server/middleware/subdomainMiddleware.js

/**
 * Middleware to extract subdomain from request hostname
 * Attaches subdomain to req.subdomain
 */
export const extractSubdomain = (req, res, next) => {
  const host = req.hostname || req.headers.host;
  
  if (!host) {
    req.subdomain = null;
    return next();
  }

  // Remove port if present
  const hostname = host.split(':')[0];

  // Development environment (localhost)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Check for subdomain in query parameter for testing
    req.subdomain = req.query.subdomain || null;
    return next();
  }

  // Production environment
  // Expected format: {subdomain}.cxrsystems.com
  const parts = hostname.split('.');
  
  // If hostname has more than 2 parts and is not www
  if (parts.length > 2) {
    const potentialSubdomain = parts[0];
    
    // Ignore www
    if (potentialSubdomain !== 'www') {
      req.subdomain = potentialSubdomain.toLowerCase();
      return next();
    }
  }

  // No subdomain found
  req.subdomain = null;
  next();
};
