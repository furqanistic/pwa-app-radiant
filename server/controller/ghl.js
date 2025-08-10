// File: server/controller/ghl.js
import axios from 'axios'

// GoHighLevel API v1 configuration for Location API Keys
const GHL_BASE_URL = 'https://rest.gohighlevel.com/v1'

// Helper function to make GHL API requests
const makeGHLRequest = async (endpoint, method = 'GET', data = null) => {
  try {
    const config = {
      method,
      url: `${GHL_BASE_URL}${endpoint}`,
      headers: {
        Authorization: `Bearer ${process.env.GHL_LOCATION_API}`,
        'Content-Type': 'application/json',
      },
    }

    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data
    }

    const response = await axios(config)
    return response.data
  } catch (error) {
    console.error('GHL API Error:', error.response?.data || error.message)
    throw error
  }
}

// Test API connection
export const testConnection = async (req, res, next) => {
  try {
    const response = await makeGHLRequest('/contacts/')

    res.status(200).json({
      success: true,
      message: 'GHL Location API connection successful',
      locationId: process.env.GHL_LOCATION_ID,
      sampleData: response,
    })
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to connect to GHL API',
      error: error.response?.data || error.message,
    })
  }
}

// Get contacts with pagination
export const getContacts = async (req, res, next) => {
  try {
    const { limit = 20, skip = 0 } = req.query

    const endpoint = `/contacts/?limit=${limit}&skip=${skip}`
    const response = await makeGHLRequest(endpoint)

    res.status(200).json({
      success: true,
      message: 'Contacts fetched successfully',
      locationId: process.env.GHL_LOCATION_ID,
      data: response,
      pagination: {
        limit: parseInt(limit),
        skip: parseInt(skip),
        count: response.contacts?.length || 0,
        total: response.meta?.total || 0,
      },
    })
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to fetch contacts',
      error: error.response?.data || error.message,
    })
  }
}

// Get all contacts (fetch all pages)
export const getAllContacts = async (req, res, next) => {
  try {
    const { maxContacts = 1000 } = req.query
    let allContacts = []
    let skip = 0
    const limit = 100
    let hasMore = true

    while (hasMore && allContacts.length < maxContacts) {
      try {
        const response = await makeGHLRequest(
          `/contacts/?limit=${limit}&skip=${skip}`
        )

        if (response.contacts && response.contacts.length > 0) {
          allContacts = allContacts.concat(response.contacts)
          skip += limit

          if (response.contacts.length < limit) {
            hasMore = false
          }
        } else {
          hasMore = false
        }

        // Add delay to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 200))
      } catch (pageError) {
        console.error(
          `Error fetching contacts at skip ${skip}:`,
          pageError.message
        )
        break
      }
    }

    res.status(200).json({
      success: true,
      message: 'All contacts fetched successfully',
      locationId: process.env.GHL_LOCATION_ID,
      data: {
        contacts: allContacts,
        meta: {
          total: allContacts.length,
          requestedMax: maxContacts,
        },
      },
    })
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to fetch all contacts',
      error: error.response?.data || error.message,
    })
  }
}

// Get specific contact by ID
export const getContactById = async (req, res, next) => {
  try {
    const { contactId } = req.params

    if (!contactId) {
      return res.status(400).json({
        success: false,
        message: 'Contact ID is required',
      })
    }

    const response = await makeGHLRequest(`/contacts/${contactId}`)

    res.status(200).json({
      success: true,
      message: 'Contact fetched successfully',
      data: response,
    })
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to fetch contact',
      error: error.response?.data || error.message,
    })
  }
}

// Search contacts by email or phone
export const lookupContact = async (req, res, next) => {
  try {
    const { email, phone } = req.query

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Either email or phone parameter is required',
      })
    }

    let endpoint = '/contacts/lookup?'
    if (email) endpoint += `email=${encodeURIComponent(email)}&`
    if (phone) endpoint += `phone=${encodeURIComponent(phone)}&`

    const response = await makeGHLRequest(endpoint.slice(0, -1))

    res.status(200).json({
      success: true,
      message: 'Contact lookup completed',
      data: response,
      searchCriteria: { email, phone },
    })
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to lookup contact',
      error: error.response?.data || error.message,
    })
  }
}

// Create new contact
export const createContact = async (req, res, next) => {
  try {
    const contactData = req.body

    if (
      !contactData.firstName &&
      !contactData.lastName &&
      !contactData.email &&
      !contactData.phone
    ) {
      return res.status(400).json({
        success: false,
        message:
          'At least one of firstName, lastName, email, or phone is required',
      })
    }

    const response = await makeGHLRequest('/contacts/', 'POST', contactData)

    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: response,
    })
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to create contact',
      error: error.response?.data || error.message,
    })
  }
}

// Update contact
export const updateContact = async (req, res, next) => {
  try {
    const { contactId } = req.params
    const updateData = req.body

    if (!contactId) {
      return res.status(400).json({
        success: false,
        message: 'Contact ID is required',
      })
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Update data is required',
      })
    }

    const response = await makeGHLRequest(
      `/contacts/${contactId}`,
      'PUT',
      updateData
    )

    res.status(200).json({
      success: true,
      message: 'Contact updated successfully',
      data: response,
    })
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to update contact',
      error: error.response?.data || error.message,
    })
  }
}

// Delete contact
export const deleteContact = async (req, res, next) => {
  try {
    const { contactId } = req.params

    if (!contactId) {
      return res.status(400).json({
        success: false,
        message: 'Contact ID is required',
      })
    }

    const response = await makeGHLRequest(`/contacts/${contactId}`, 'DELETE')

    res.status(200).json({
      success: true,
      message: 'Contact deleted successfully',
      data: response,
    })
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to delete contact',
      error: error.response?.data || error.message,
    })
  }
}

// Get opportunities
export const getOpportunities = async (req, res, next) => {
  try {
    const { limit = 20, skip = 0 } = req.query

    const endpoint = `/opportunities/?limit=${limit}&skip=${skip}`
    const response = await makeGHLRequest(endpoint)

    res.status(200).json({
      success: true,
      message: 'Opportunities fetched successfully',
      data: response,
      pagination: {
        limit: parseInt(limit),
        skip: parseInt(skip),
        count: response.opportunities?.length || 0,
      },
    })
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to fetch opportunities',
      error: error.response?.data || error.message,
    })
  }
}

// Get calendars
export const getCalendars = async (req, res, next) => {
  try {
    const response = await makeGHLRequest('/calendars/')

    res.status(200).json({
      success: true,
      message: 'Calendars fetched successfully',
      data: response,
    })
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to fetch calendars',
      error: error.response?.data || error.message,
    })
  }
}

// Get custom fields
export const getCustomFields = async (req, res, next) => {
  try {
    const response = await makeGHLRequest('/custom-fields/')

    res.status(200).json({
      success: true,
      message: 'Custom fields fetched successfully',
      data: response,
    })
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to fetch custom fields',
      error: error.response?.data || error.message,
    })
  }
}
