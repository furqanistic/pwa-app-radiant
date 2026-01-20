// File: server/routes/location.js - FIXED TO ALLOW PUBLIC ACCESS TO ACTIVE LOCATIONS
import express from 'express'
import {
    createLocation,
    deleteLocation,
    getActiveLocationIds,
    getActiveLocationsForUsers,
    getAllLocations,
    getLocation,
    getMyLocation,
    toggleLocationStatus,
    updateLocation,
} from '../controller/location.js'
import {
    requireAdminOrAbove,
    verifyToken,
} from '../middleware/authMiddleware.js'

const router = express.Router()

// PUBLIC route for authenticated users to get active locations
// This MUST come BEFORE the middleware that requires admin access
router.get('/active', verifyToken, getActiveLocationsForUsers)
router.get('/my-location', verifyToken, getMyLocation)

// ALL OTHER routes require admin access
router.use(verifyToken, requireAdminOrAbove)

// Admin-only CRUD Routes
router.post('/', createLocation)
router.get('/', getAllLocations)
router.get('/active-ids', getActiveLocationIds)
router.get('/:id', getLocation)
router.put('/:id', updateLocation)
router.delete('/:id', deleteLocation)
router.patch('/:id/toggle-status', toggleLocationStatus)

export default router
