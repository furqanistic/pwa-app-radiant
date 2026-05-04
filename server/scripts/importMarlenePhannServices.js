import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Import models
import Service from '../models/Service.js'
import Location from '../models/Location.js'
import Category from '../models/Category.js'

const MARLENE_PHANN_LOCATION_ID = '4RPt12eSpAB61cDq8i90'
const MARLENE_PHANN_MONGODB_ID = '69f91d4e1c9c02cb2fad5e01'
const MARLENE_PHANN_USER_ID = '6998df8a9970e0479dc75a7b'
const STAFF_MEMBER_NAME = 'Marlene Phann'

// Parse CSV manually
function parseCSV(fileContent) {
  const lines = fileContent.split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const records = []
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    // Simple CSV parsing (handles basic cases)
    const values = []
    let currentValue = ''
    let inQuotes = false
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      const nextChar = line[j + 1]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim().replace(/^"|"$/g, ''))
        currentValue = ''
      } else {
        currentValue += char
      }
    }
    values.push(currentValue.trim().replace(/^"|"$/g, ''))
    
    const record = {}
    headers.forEach((header, idx) => {
      record[header] = values[idx] || ''
    })
    records.push(record)
  }
  
  return records
}

// Parse duration string to minutes
function parseDuration(durationStr) {
  if (!durationStr) return 30 // Default 30 minutes
  
  const str = String(durationStr).toLowerCase().trim()
  
  // Handle "X hrs" format
  if (str.includes('hr')) {
    const match = str.match(/(\d+)\s*hrs?/)
    if (match) {
      const hours = parseInt(match[1])
      // Check if there are also minutes
      const minMatch = str.match(/(\d+)\s*mins?/)
      const minutes = minMatch ? parseInt(minMatch[1]) : 0
      return hours * 60 + minutes
    }
  }
  
  // Handle "X mins" format
  if (str.includes('min')) {
    const match = str.match(/(\d+)\s*mins?/)
    if (match) {
      return parseInt(match[1])
    }
  }
  
  // Handle "1hr 15 mins" or similar
  const hoursMatch = str.match(/(\d+)\s*hrs?/)
  const minutesMatch = str.match(/(\d+)\s*mins?/)
  
  if (hoursMatch || minutesMatch) {
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0
    const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0
    return hours * 60 + minutes
  }
  
  return 30 // Default fallback
}

// Parse price - handles ranges like "$95 - $160" or "$95"
function parsePrice(priceStr) {
  if (!priceStr) return 0
  
  const str = String(priceStr).trim()
  // Extract first number
  const match = str.match(/\d+/)
  return match ? parseInt(match[0]) : 0
}

// Main import function
async function importServices() {
  try {
    // Connect to MongoDB
    if (!mongoose.connection.readyState) {
      const mongoUri = process.env.MONGO || process.env.MONGO_URI || 'mongodb://localhost:27017/radiant'
      console.log(`Connecting to MongoDB...`)
      await mongoose.connect(mongoUri)
    }
    
    console.log('✅ Connected to MongoDB')
    
    // Verify location exists
    const location = await Location.findById(MARLENE_PHANN_MONGODB_ID)
    if (!location) {
      throw new Error(`Location ${MARLENE_PHANN_MONGODB_ID} not found!`)
    }
    console.log(`✅ Location found: ${location.name}`)
    
    // Create or get category for Laser Services
    let category = await Category.findOne({
      name: 'Laser Services',
      locationId: MARLENE_PHANN_MONGODB_ID,
    })
    
    if (!category) {
      console.log('📂 Creating Laser Services category...')
      category = await Category.create({
        name: 'Laser Services',
        description: 'Professional laser hair removal and skin treatments',
        locationId: MARLENE_PHANN_MONGODB_ID,
        createdBy: mongoose.Types.ObjectId.createFromHexString(MARLENE_PHANN_USER_ID),
        isActive: true,
      })
      console.log(`✅ Category created: ${category._id}`)
    } else {
      console.log(`✅ Found existing category: ${category._id}`)
    }
    
    const categoryId = category._id
    
    // Read CSV file
    const csvPath = path.join(__dirname, '../../client/public/CXR_Onboarding_Sheet - Services.csv')
    console.log(`📖 Reading CSV from: ${csvPath}`)
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const records = parseCSV(csvContent)
    console.log(`📊 Total records in CSV: ${records.length}`)
    
    // Filter for "Marlene Phann | Laser Specialist" services
    const marleneServices = records.filter(record => {
      const businessName = (record['Business Name'] || '').trim()
      return businessName === 'Marlene Phann | Laser Specialist'
    })
    
    console.log(`🔍 Found ${marleneServices.length} services for Marlene Phann | Laser Specialist`)
    
    if (marleneServices.length === 0) {
      console.warn('⚠️ No services found for Marlene Phann | Laser Specialist')
      process.exit(0)
    }
    
    // Deduplicate services by name (keep first occurrence)
    const seenServices = new Set()
    const uniqueServices = []
    
    for (const service of marleneServices) {
      const serviceName = (service['Service Name'] || '').trim()
      const key = `${serviceName}`
      
      if (!seenServices.has(key)) {
        seenServices.add(key)
        uniqueServices.push(service)
      }
    }
    
    console.log(`✅ After deduplication: ${uniqueServices.length} unique services`)
    
    // Prepare services for database
    const servicesData = uniqueServices
      .filter(s => (s['Service Name'] || '').trim()) // Skip empty names
      .map(s => ({
        name: (s['Service Name'] || '').trim(),
        description: (s['Description'] || 'Professional laser service').trim() || 'Professional laser service',
        basePrice: parsePrice(s['Regular Price']),
        memberPrice: parsePrice(s['Member Price']),
        duration: parseDuration(s['Session Length']),
        staffMember: STAFF_MEMBER_NAME,
        locationId: MARLENE_PHANN_LOCATION_ID,
        categoryId: categoryId,
        createdBy: mongoose.Types.ObjectId.createFromHexString(MARLENE_PHANN_USER_ID),
        // Default values
        serviceType: 'treatment',
        isActive: true,
        hasRewards: true,
        showInMenu: true,
        limit: 5,
        status: 'active',
      }))
    
    console.log(`\n📝 Sample service to be created:`)
    console.log(JSON.stringify(servicesData[0], null, 2))
    
    // Check existing services to avoid duplicates
    const existingServices = await Service.find({
      locationId: MARLENE_PHANN_MONGODB_ID,
      staffMember: STAFF_MEMBER_NAME,
    })
    
    console.log(`\n📋 Existing services for this location: ${existingServices.length}`)
    
    if (existingServices.length > 0) {
      console.log('Existing services:')
      existingServices.slice(0, 5).forEach(s => console.log(`  - ${s.name} ($${s.basePrice})`))
      if (existingServices.length > 5) {
        console.log(`  ... and ${existingServices.length - 5} more`)
      }
    }
    
    // Create services
    console.log(`\n🚀 Creating ${servicesData.length} services...`)
    
    const createdServices = await Service.insertMany(servicesData)
    
    console.log(`✅ Successfully created ${createdServices.length} services!`)
    
    // Print summary
    console.log('\n📊 Service Import Summary:')
    console.log(`  Location: ${location.name} (${MARLENE_PHANN_LOCATION_ID})`)
    console.log(`  Staff Member: ${STAFF_MEMBER_NAME}`)
    console.log(`  Services Created: ${createdServices.length}`)
    console.log(`  Price Range: $${Math.min(...createdServices.map(s => s.basePrice))} - $${Math.max(...createdServices.map(s => s.basePrice))}`)
    console.log(`  Duration Range: ${Math.min(...createdServices.map(s => s.duration))}-${Math.max(...createdServices.map(s => s.duration))} minutes`)
    
    console.log('\n✨ Import completed successfully!')
    
  } catch (error) {
    console.error('❌ Error importing services:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect()
    }
  }
}

// Run the import
importServices()
