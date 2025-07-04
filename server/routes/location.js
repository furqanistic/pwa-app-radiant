import express from 'express'

import {
  createLocation,
  deleteLocation,
  getActiveLocationIds,
  getAllLocations,
  getLocation,
  toggleLocationStatus,
  updateLocation,
} from '../controller/location.js'
import { checkPermission, verifyToken } from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes require authentication
router.use(verifyToken)

// All routes require permission checking (admin only)
router.use(checkPermission)

// CRUD Routes
router.post('/', createLocation) // POST /locations
router.get('/', getAllLocations) // GET /locations
router.get('/active-ids', getActiveLocationIds) // GET /locations/active-ids
router.get('/:id', getLocation) // GET /locations/:id
router.put('/:id', updateLocation) // PUT /locations/:id
router.delete('/:id', deleteLocation) // DELETE /locations/:id
router.patch('/:id/toggle-status', toggleLocationStatus) // PATCH /locations/:id/toggle-status

export default router
