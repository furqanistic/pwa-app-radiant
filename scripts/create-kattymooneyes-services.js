// Script to create services for Kattymooneyes Lash and Wax Bar
// Location ID: jSbMtMXkhWrLHwtEV2uB
// Run with: node scripts/create-kattymooneyes-services.js

const API_URL = 'http://localhost:8800/api'

// ==========================================
// CONFIG - Update these credentials
// ==========================================
const LOGIN_EMAIL = process.env.ADMIN_EMAIL || ''
const LOGIN_PASSWORD = process.env.ADMIN_PASSWORD || ''
const LOCATION_ID = 'jSbMtMXkhWrLHwtEV2uB'

if (!LOGIN_EMAIL || !LOGIN_PASSWORD) {
  console.error('Error: Please set ADMIN_EMAIL and ADMIN_PASSWORD environment variables')
  console.error('Example: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret node scripts/create-kattymooneyes-services.js')
  process.exit(1)
}

// ==========================================
// DATA - Kattymooneyes Lash and Wax Bar Services
// ==========================================

const categories = [
  { name: 'Lash Services', description: 'Professional lash extension and lift services', color: '#8B5CF6' },
  { name: 'Facials', description: 'Rejuvenating facial treatments', color: '#EC4899' },
  { name: 'Waxing Services', description: 'Professional waxing for smooth, long-lasting results', color: '#F59E0B' },
  { name: 'Brow Services', description: 'Expert brow shaping and lamination', color: '#10B981' },
  { name: 'Promos & Packages', description: 'Special promotions and bundled packages', color: '#EF4444' },
]

const services = [
  // Lash extensions - parent service with sub-treatments
  {
    name: 'Lash Extensions',
    description: 'Professional lash extension services ranging from natural classic to dramatic mega volume.',
    categoryName: 'Lash Services',
    basePrice: 95,
    duration: 80,
    subTreatments: [
      { name: 'Classic Lash Extensions', description: 'A natural, mascara-like look using one extension per natural lash. Perfect for everyday beauty with soft definition and effortless elegance.', price: 95, duration: 80 },
      { name: 'Hybrid Lash Extensions', description: 'The perfect mix of classic and volume lashes for a fuller, textured look. Ideal if you want something noticeable but still soft and wispy.', price: 115, duration: 80 },
      { name: 'Volume Lash Extensions', description: 'Lightweight handmade fans are applied to create a fuller, fluffier look. Perfect for clients who love bold, glamorous lashes.', price: 135, duration: 80 },
      { name: 'Mega Volume Lash Extensions', description: 'Maximum fullness and drama using ultra-light fans. Designed for a dark, dense, and ultra-glam look.', price: 160, duration: 80 },
      { name: 'Lash Lift & Tint', description: 'Enhance your natural lashes by lifting and curling them from the root, finished with a tint for a darker, mascara-free look that lasts weeks.', price: 95, duration: 60 },
      { name: 'Lash Removal', description: 'Safe and gentle removal of lash extensions without damaging your natural lashes.', price: 20, duration: 20 },
      { name: 'Lash Touch-Up (Fill)', description: 'Maintain your lash set by replacing outgrown extensions and refreshing your look. Recommended every 2–3 weeks for best retention.', price: 65, duration: 60 },
    ],
  },

  // Facials - parent service with sub-treatments
  {
    name: 'Facials',
    description: 'Rejuvenating facial treatments for glowing, refreshed skin.',
    categoryName: 'Facials',
    basePrice: 70,
    duration: 60,
    subTreatments: [
      { name: 'Basic Facial (with Extractions)', description: 'A deep-cleansing facial that removes impurities, unclogs pores, and refreshes your skin. Includes gentle extractions for a smoother, clearer complexion.', price: 70, duration: 60 },
      { name: 'Dermaplaning Facial', description: 'A non-invasive treatment that removes dead skin cells and peach fuzz, leaving your skin instantly smoother, brighter, and glowing. Perfect for flawless makeup application.', price: 100, duration: 60 },
    ],
  },

  // Waxing services - parent service with sub-treatments
  {
    name: 'Waxing Services',
    description: 'Professional hair removal using high-quality wax for smooth, long-lasting results.',
    categoryName: 'Waxing Services',
    basePrice: 20,
    duration: 30,
    subTreatments: [
      { name: 'Full Body Waxing', description: 'Professional hair removal using high-quality wax for smooth, long-lasting results. Leaves skin soft and hair-free for weeks.', price: 220, duration: 90 },
      { name: 'Bikini / Brazilian Wax', description: 'Precise and hygienic hair removal in intimate areas for a clean, smooth finish and longer-lasting results compared to shaving.', price: 65, duration: 30 },
      { name: 'Facial Waxing (Brows, Upper Lip, Chin)', description: 'Quick and gentle removal of unwanted facial hair, leaving your skin smooth and polished.', price: 20, duration: 20 },
    ],
  },

  // Brow services - parent service with sub-treatments
  {
    name: 'Brow Services',
    description: 'Expert brow shaping and lamination for perfectly defined brows.',
    categoryName: 'Brow Services',
    basePrice: 20,
    duration: 30,
    subTreatments: [
      { name: 'Brow Lamination', description: 'A treatment that lifts and sets your brow hairs into place for a fuller, fluffier, and more defined look that lasts weeks.', price: 55, duration: 45 },
      { name: 'Brow Shaping', description: 'Customized brow grooming using waxing/tweezing to enhance your natural shape and frame your face beautifully.', price: 20, duration: 30 },
    ],
  },

  // FIRST TIME CLIENT PROMOS - parent service with sub-treatments
  {
    name: 'FIRST TIME CLIENT PROMOS',
    description: 'Special introductory packages for first-time clients.',
    categoryName: 'Promos & Packages',
    basePrice: 150,
    duration: 120,
    subTreatments: [
      { name: 'Dermaplaning Facial + Brazilian Wax + Classic Lashes', description: 'Complete glow package including dermaplaning facial, Brazilian wax, and classic lash extensions.', price: 150, duration: 120 },
      { name: 'Brazilian Wax + Hybrid Lashes', description: 'Brazilian wax paired with beautiful hybrid lash extensions for a complete refresh.', price: 175, duration: 100 },
      { name: 'Dermaplaning Facial + Lash Lift & Tint + Brow Wax', description: 'Dermaplaning facial combined with lash lift & tint and brow wax for a polished, radiant look.', price: 205, duration: 120 },
    ],
  },

  // BRIDAL PACKAGES - parent service with sub-treatments
  {
    name: 'BRIDAL PACKAGES',
    description: 'Luxury bridal beauty packages for your special day.',
    categoryName: 'Promos & Packages',
    basePrice: 195,
    duration: 150,
    subTreatments: [
      { name: 'Bridal Glow', description: 'Full lash set + brow wax & shape + mini aftercare guidance.', price: 195, duration: 120 },
      { name: 'Bridal Radiance', description: 'Lash set + brow wax & shape + dermaplaning facial + lash aftercare kit.', price: 295, duration: 150 },
      { name: 'Bridal Luxury Experience', description: 'Lash trail set (1-2 weeks before) + wedding day full lash set + brow wax & precision + dermaplaning facial + aftercare kit + priority booking.', price: 425, duration: 150 },
    ],
  },
]

// ==========================================
// API Helper Functions
// ==========================================

async function apiCall(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`
  const defaultHeaders = {
    'Content-Type': 'application/json',
  }

  if (options.token) {
    defaultHeaders['Authorization'] = `Bearer ${options.token}`
  }

  const config = {
    method: options.method || 'GET',
    headers: { ...defaultHeaders, ...options.headers },
  }

  if (options.body) {
    config.body = JSON.stringify(options.body)
  }

  console.log(`  → ${config.method} ${url}`)

  const response = await fetch(url, config)
  const data = await response.json()

  if (!response.ok) {
    console.error(`  ✗ Error ${response.status}:`, data.message || JSON.stringify(data))
    throw new Error(`API Error: ${data.message || response.statusText}`)
  }

  return data
}

async function login(email, password) {
  console.log('\n🔐 Logging in...')
  const data = await apiCall('/auth/signin', {
    method: 'POST',
    body: { email, password, locationId: LOCATION_ID },
  })
  console.log('  ✓ Login successful')
  return data.token
}

async function createCategory(token, category) {
  console.log(`\n📁 Creating category: "${category.name}"`)
  try {
    const data = await apiCall('/services/categories', {
      method: 'POST',
      token,
      body: {
        ...category,
        locationId: LOCATION_ID,
      },
    })
    console.log(`  ✓ Created: ${data.data.category._id}`)
    return data.data.category
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`  ⚠ Category already exists, fetching...`)
      // Fetch existing categories to find the ID
      const categoriesData = await apiCall('/services/categories/all', {
        token,
      })
      const existing = categoriesData.data.categories.find(
        (c) => c.name.toLowerCase() === category.name.toLowerCase() && !c.isDeleted
      )
      if (existing) {
        console.log(`  ✓ Found existing: ${existing._id}`)
        return existing
      }
    }
    throw error
  }
}

async function createService(token, service, categoryId) {
  console.log(`\n✨ Creating service: "${service.name}"`)
  try {
    const data = await apiCall('/services', {
      method: 'POST',
      token,
      body: {
        name: service.name,
        description: service.description,
        categoryId,
        basePrice: service.basePrice,
        duration: service.duration,
        locationId: LOCATION_ID,
        status: 'active',
        limit: 1,
        discount: { percentage: 0, active: false },
        subTreatments: service.subTreatments || [],
        showPriceRange: false,
        offerDiscountListPrice: false,
        membershipPricing: [],
        creditValue: 0,
        ghlCalendar: {},
        ghlService: {},
        ghlBooking: {},
      },
    })
    console.log(`  ✓ Created: ${data.data.service._id}`)
    return data.data.service
  } catch (error) {
    console.error(`  ✗ Failed to create "${service.name}":`, error.message)
    throw error
  }
}

// ==========================================
// Main Script
// ==========================================

async function main() {
  console.log('========================================')
  console.log('Kattymooneyes Lash and Wax Bar - Service Upload')
  console.log(`Location ID: ${LOCATION_ID}`)
  console.log('========================================')

  try {
    // Step 1: Login
    const token = await login(LOGIN_EMAIL, LOGIN_PASSWORD)

    // Step 2: Create categories
    console.log('\n📂 Step 1: Creating categories...')
    const categoryMap = {}

    for (const category of categories) {
      const created = await createCategory(token, category)
      categoryMap[category.name] = created._id
    }

    console.log('\n📋 Category mapping:')
    for (const [name, id] of Object.entries(categoryMap)) {
      console.log(`  ${name}: ${id}`)
    }

    // Step 3: Create services
    console.log('\n🛠️ Step 2: Creating services...')
    const createdServices = []
    let successCount = 0
    let failCount = 0

    for (const service of services) {
      const categoryId = categoryMap[service.categoryName]
      if (!categoryId) {
        console.error(`  ✗ Category "${service.categoryName}" not found for service "${service.name}"`)
        failCount++
        continue
      }

      try {
        await createService(token, service, categoryId)
        successCount++
      } catch (error) {
        failCount++
      }
    }

    // Summary
    console.log('\n========================================')
    console.log('📊 Summary')
    console.log('========================================')
    console.log(`Categories created/found: ${Object.keys(categoryMap).length}`)
    console.log(`Services created successfully: ${successCount}`)
    console.log(`Services failed: ${failCount}`)
    console.log(`Total services attempted: ${services.length}`)
    console.log('========================================')

    if (failCount === 0) {
      console.log('\n✅ All services uploaded successfully!')
    } else {
      console.log(`\n⚠️ ${failCount} service(s) failed to upload. Check the logs above.`)
    }
  } catch (error) {
    console.error('\n❌ Script failed:', error.message)
    process.exit(1)
  }
}

main()
