// File: server/routes/ghl.js
// server/routes/ghl.js
import express from 'express'
import {
  getCalendarServices,
  getCalendarServiceById,
  createContact,
  deleteContact,
  getAllContacts,
  getLocationBookingsByDate,
  getCalendars,
  getContactById,
  getContacts,
  getCustomFields,
  getOpportunities,
  getWorkflows,
  lookupContact,
  testConnection,
  updateContact,
} from '../controller/ghl.js'

const router = express.Router()

// Test routes
router.get('/test', testConnection)

// Contact routes
router.get('/contacts', getContacts)
router.get('/contacts/all', getAllContacts)
router.get('/contacts/lookup', lookupContact)
router.get('/contacts/:contactId', getContactById)
router.post('/contacts', createContact)
router.put('/contacts/:contactId', updateContact)
router.delete('/contacts/:contactId', deleteContact)

// Other resource routes
router.get('/opportunities', getOpportunities)
router.get('/calendars', getCalendars)
router.get('/calendar-services', getCalendarServices)
router.get('/calendar-services/:serviceId', getCalendarServiceById)
router.get('/bookings', getLocationBookingsByDate)
router.get('/workflows', getWorkflows)
router.get('/custom-fields', getCustomFields)

export default router
