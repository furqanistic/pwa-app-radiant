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
    checkManagementAccess,
    requireAdminOrAbove,
    verifyToken,
} from '../middleware/authMiddleware.js'

const router = express.Router()

// PUBLIC route to get active locations (no auth required for selection)
// This MUST come BEFORE the middleware that requires admin access
router.get('/active', getActiveLocationsForUsers)
router.get('/my-location', verifyToken, getMyLocation)

// ALL OTHER routes require management access
router.use(verifyToken)

// CRUD Routes
router.post('/', requireAdminOrAbove, createLocation)
router.get('/', checkManagementAccess, getAllLocations)
router.get('/active-ids', requireAdminOrAbove, getActiveLocationIds)
router.get('/:id', checkManagementAccess, getLocation)
router.put('/:id', checkManagementAccess, updateLocation)
router.delete('/:id', requireAdminOrAbove, deleteLocation)
router.patch('/:id/toggle-status', requireAdminOrAbove, toggleLocationStatus)

export default router
