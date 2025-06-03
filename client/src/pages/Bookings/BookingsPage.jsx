import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronDown,
  Clock,
  DollarSign,
  Edit3,
  Eye,
  Filter,
  Mail,
  MoreVertical,
  Phone,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
  Users,
  XCircle,
} from 'lucide-react'
import React, { useMemo, useState } from 'react'
import Layout from '../Layout/Layout'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
}

const tableRowVariants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 35,
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: 0.2,
    },
  },
}

const dropdownVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: -10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -10,
    transition: {
      duration: 0.15,
    },
  },
}

const headerVariants = {
  hidden: {
    opacity: 0,
    y: -30,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      delay: 0.1,
    },
  },
}

const statsCardVariants = {
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
}

// Professional Status Badge Component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    confirmed: {
      color: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      dot: 'bg-emerald-500',
    },
    pending: {
      color: 'bg-amber-50 text-amber-700 border border-amber-200',
      dot: 'bg-amber-500',
    },
    cancelled: {
      color: 'bg-red-50 text-red-700 border border-red-200',
      dot: 'bg-red-500',
    },
    completed: {
      color: 'bg-blue-50 text-blue-700 border border-blue-200',
      dot: 'bg-blue-500',
    },
  }

  const config = statusConfig[status] || statusConfig.pending

  return (
    <motion.div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${config.color}`}
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <motion.div
        className={`w-1.5 h-1.5 rounded-full ${config.dot}`}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span className='capitalize'>{status}</span>
    </motion.div>
  )
}

// Action Dropdown Component
const ActionDropdown = ({ booking }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className='relative'>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className='p-1.5 hover:bg-gray-100 rounded-md transition-colors duration-200'
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <MoreVertical className='w-4 h-4 text-gray-400' />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className='fixed inset-0 z-10'
              onClick={() => setIsOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              variants={dropdownVariants}
              initial='hidden'
              animate='visible'
              exit='exit'
              className='absolute right-0 top-8 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20'
            >
              <motion.button
                className='w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2'
                whileHover={{ x: 4 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <Eye className='w-3 h-3' />
                View Details
              </motion.button>
              <motion.button
                className='w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2'
                whileHover={{ x: 4 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <Edit3 className='w-3 h-3' />
                Edit Booking
              </motion.button>
              <motion.button
                className='w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2'
                whileHover={{ x: 4 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <Trash2 className='w-3 h-3' />
                Cancel
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// Professional Table Row Component
const BookingRow = ({ booking }) => {
  return (
    <motion.div
      layout
      variants={tableRowVariants}
      initial='hidden'
      animate='visible'
      exit='exit'
      className='border-b border-gray-100'
    >
      <div className='grid grid-cols-12 gap-4 items-center py-4 px-6'>
        {/* Client Info */}
        <div className='col-span-12 md:col-span-3'>
          <div className='flex items-center gap-3'>
            <motion.div
              className='w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-medium text-xs'
              whileHover={{ scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              {booking.client.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </motion.div>
            <div className='min-w-0'>
              <p className='font-medium text-gray-900 truncate'>
                {booking.client.name}
              </p>
              <p className='text-xs text-gray-500 truncate'>
                {booking.client.phone}
              </p>
            </div>
          </div>
        </div>

        {/* Service */}
        <div className='col-span-6 md:col-span-2'>
          <p className='font-medium text-gray-900 text-sm'>{booking.service}</p>
          <p className='text-xs text-gray-500'>{booking.duration} min</p>
        </div>

        {/* Date & Time */}
        <div className='col-span-6 md:col-span-2'>
          <p className='font-medium text-gray-900 text-sm'>{booking.date}</p>
          <p className='text-xs text-gray-500'>{booking.time}</p>
        </div>

        {/* Status */}
        <div className='col-span-6 md:col-span-2'>
          <StatusBadge status={booking.status} />
        </div>

        {/* Price */}
        <div className='col-span-4 md:col-span-2'>
          <motion.p
            className='font-semibold text-gray-900'
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            ${booking.price}
          </motion.p>
        </div>

        {/* Actions */}
        <div className='col-span-2 md:col-span-1 flex justify-end'>
          <ActionDropdown booking={booking} />
        </div>
      </div>
    </motion.div>
  )
}

// Professional Search and Filter Bar
const SearchFilterBar = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
}) => {
  return (
    <motion.div
      variants={itemVariants}
      className='flex flex-col sm:flex-row gap-4 mb-6'
    >
      {/* Search */}
      <div className='relative flex-1'>
        <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
        <motion.input
          type='text'
          placeholder='Search clients, services, or phone numbers...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className='w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-pink-500 focus:border-pink-500 bg-white text-sm transition-all duration-200'
          whileFocus={{
            scale: 1.02,
            transition: { type: 'spring', stiffness: 400, damping: 30 },
          }}
        />
      </div>

      {/* Filter */}
      <div className='relative'>
        <motion.select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className='pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-pink-500 focus:border-pink-500 bg-white appearance-none min-w-[140px] text-sm'
          whileFocus={{
            scale: 1.02,
            transition: { type: 'spring', stiffness: 400, damping: 30 },
          }}
        >
          <option value='all'>All Status</option>
          <option value='confirmed'>Confirmed</option>
          <option value='pending'>Pending</option>
          <option value='cancelled'>Cancelled</option>
          <option value='completed'>Completed</option>
        </motion.select>
        <ChevronDown className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none' />
      </div>
    </motion.div>
  )
}

// Simplified Modern Stats Card
const StatsCard = ({ title, value, icon: Icon, color = 'pink' }) => {
  const colorClasses = {
    pink: 'from-pink-500 to-rose-500',
    blue: 'from-blue-500 to-indigo-500',
    green: 'from-emerald-500 to-teal-500',
  }

  return (
    <motion.div
      variants={statsCardVariants}
      className='bg-white rounded-xl p-6 border border-gray-100 shadow-sm'
      whileHover={{
        y: -2,
        shadow:
          '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        transition: { type: 'spring', stiffness: 400, damping: 30 },
      }}
    >
      <div className='flex items-center justify-between'>
        <div className='flex-1'>
          <p className='text-sm text-gray-600 mb-1'>{title}</p>
          <motion.p
            className='text-2xl font-bold text-gray-900'
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
              delay: 0.2,
            }}
          >
            {value}
          </motion.p>
        </div>
        <motion.div
          className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} shadow-lg`}
          whileHover={{
            scale: 1.1,
            rotate: 5,
            transition: { type: 'spring', stiffness: 400, damping: 30 },
          }}
        >
          <Icon className='w-6 h-6 text-white' />
        </motion.div>
      </div>
    </motion.div>
  )
}

// Professional Table Header
const TableHeader = () => (
  <motion.div
    className='bg-gray-50 border-b border-gray-200'
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.4 }}
  >
    <div className='grid grid-cols-12 gap-4 py-3 px-6'>
      <div className='col-span-12 md:col-span-3'>
        <p className='text-xs font-semibold text-gray-600 uppercase tracking-wide'>
          Client
        </p>
      </div>
      <div className='col-span-6 md:col-span-2'>
        <p className='text-xs font-semibold text-gray-600 uppercase tracking-wide'>
          Service
        </p>
      </div>
      <div className='col-span-6 md:col-span-2'>
        <p className='text-xs font-semibold text-gray-600 uppercase tracking-wide'>
          Date & Time
        </p>
      </div>
      <div className='col-span-6 md:col-span-2'>
        <p className='text-xs font-semibold text-gray-600 uppercase tracking-wide'>
          Status
        </p>
      </div>
      <div className='col-span-4 md:col-span-2'>
        <p className='text-xs font-semibold text-gray-600 uppercase tracking-wide'>
          Price
        </p>
      </div>
      <div className='col-span-2 md:col-span-1'>
        <p className='text-xs font-semibold text-gray-600 uppercase tracking-wide text-right'>
          Actions
        </p>
      </div>
    </div>
  </motion.div>
)

const BookingsPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Mock booking data
  const bookings = [
    {
      id: 1,
      client: {
        name: 'Sarah Johnson',
        phone: '(555) 123-4567',
        email: 'sarah@email.com',
      },
      service: 'Facial Treatment',
      date: 'Dec 15, 2024',
      time: '10:00 AM',
      duration: 60,
      status: 'confirmed',
      price: 120,
    },
    {
      id: 2,
      client: {
        name: 'Emily Chen',
        phone: '(555) 234-5678',
        email: 'emily@email.com',
      },
      service: 'Laser Hair Removal',
      date: 'Dec 15, 2024',
      time: '2:30 PM',
      duration: 45,
      status: 'pending',
      price: 200,
    },
    {
      id: 3,
      client: {
        name: 'Jessica Williams',
        phone: '(555) 345-6789',
        email: 'jessica@email.com',
      },
      service: 'Botox',
      date: 'Dec 16, 2024',
      time: '11:15 AM',
      duration: 30,
      status: 'completed',
      price: 350,
    },
    {
      id: 4,
      client: {
        name: 'Amanda Davis',
        phone: '(555) 456-7890',
        email: 'amanda@email.com',
      },
      service: 'Chemical Peel',
      date: 'Dec 16, 2024',
      time: '3:00 PM',
      duration: 90,
      status: 'cancelled',
      price: 180,
    },
    {
      id: 5,
      client: {
        name: 'Maria Rodriguez',
        phone: '(555) 567-8901',
        email: 'maria@email.com',
      },
      service: 'Microneedling',
      date: 'Dec 17, 2024',
      time: '9:30 AM',
      duration: 75,
      status: 'confirmed',
      price: 250,
    },
    {
      id: 6,
      client: {
        name: 'Rachel Kim',
        phone: '(555) 678-9012',
        email: 'rachel@email.com',
      },
      service: 'Lip Fillers',
      date: 'Dec 17, 2024',
      time: '1:45 PM',
      duration: 45,
      status: 'pending',
      price: 400,
    },
    {
      id: 7,
      client: {
        name: 'Ashley Brown',
        phone: '(555) 789-0123',
        email: 'ashley@email.com',
      },
      service: 'HydraFacial',
      date: 'Dec 18, 2024',
      time: '4:00 PM',
      duration: 90,
      status: 'confirmed',
      price: 200,
    },
    {
      id: 8,
      client: {
        name: 'Sophie Martinez',
        phone: '(555) 890-1234',
        email: 'sophie@email.com',
      },
      service: 'Dermal Fillers',
      date: 'Dec 18, 2024',
      time: '11:30 AM',
      duration: 60,
      status: 'completed',
      price: 450,
    },
  ]

  // Filter bookings based on search and status
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesSearch =
        searchTerm === '' ||
        booking.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.client.phone.includes(searchTerm)

      const matchesStatus =
        statusFilter === 'all' || booking.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [searchTerm, statusFilter])

  // Stats calculations
  const stats = {
    total: bookings.length,
    upcoming: bookings.filter((b) => b.status === 'confirmed').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
  }

  return (
    <Layout>
      <div className='min-h-screen bg-gray-50'>
        <motion.div
          className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'
          variants={containerVariants}
          initial='hidden'
          animate='visible'
        >
          {/* Header */}
          <motion.div variants={headerVariants} className='mb-8'>
            <h1 className='text-3xl font-bold text-gray-900 mb-2'>
              My SPA Appointments
            </h1>
            <p className='text-gray-600'>
              View and manage all your spa bookings in one place
            </p>
          </motion.div>

          {/* Simplified Stats Cards */}
          <motion.div
            className='grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8'
            variants={containerVariants}
          >
            <StatsCard
              title='Total Bookings'
              value={stats.total}
              icon={Calendar}
              color='pink'
            />
            <StatsCard
              title='Upcoming'
              value={stats.upcoming}
              icon={Clock}
              color='blue'
            />
            <StatsCard
              title='Completed'
              value={stats.completed}
              icon={CheckCircle}
              color='green'
            />
          </motion.div>

          {/* Search and Filter */}
          <SearchFilterBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />

          {/* Professional Table */}
          <motion.div
            className='bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm'
            variants={itemVariants}
          >
            <TableHeader />
            <AnimatePresence mode='wait'>
              <motion.div
                className='divide-y divide-gray-100'
                variants={containerVariants}
                initial='hidden'
                animate='visible'
              >
                {filteredBookings.map((booking) => (
                  <BookingRow key={booking.id} booking={booking} />
                ))}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Empty State */}
          <AnimatePresence>
            {filteredBookings.length === 0 && (
              <motion.div
                className='text-center py-12 bg-white rounded-lg border border-gray-200 mt-8'
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <motion.div
                  className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4'
                  animate={{
                    rotate: [0, 10, -10, 0],
                    transition: {
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    },
                  }}
                >
                  <Search className='w-8 h-8 text-gray-400' />
                </motion.div>
                <h3 className='text-lg font-medium text-gray-900 mb-2'>
                  No bookings found
                </h3>
                <p className='text-gray-500'>
                  Try adjusting your search criteria or filters
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </Layout>
  )
}

export default BookingsPage
