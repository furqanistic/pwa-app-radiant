// client/src/pages/Bookings/ServiceCatalogPage.jsx - ENHANCED PWA VERSION
import {
  useActiveServices,
  useCategories,
  useDiscountedServices,
} from '@/hooks/useServices'
import {
  Check,
  ChevronDown,
  Clock,
  DollarSign,
  Filter,
  Gift,
  Percent,
  Search,
  SortAsc,
  Sparkles,
  Star,
  X,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../Layout/Layout'

// Custom hook for debounced search
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Service Card Skeleton Component
const ServiceCardSkeleton = () => {
  return (
    <div className='bg-white rounded-2xl border border-pink-100 overflow-hidden animate-pulse'>
      <div className='relative h-40 md:h-48 bg-gradient-to-r from-pink-100 to-rose-100'>
        {/* Skeleton badges */}
        <div className='absolute top-3 left-3'>
          <div className='bg-pink-200 rounded-full h-6 w-20'></div>
        </div>
        <div className='absolute bottom-3 left-3'>
          <div className='bg-pink-200 rounded-full h-6 w-16'></div>
        </div>
      </div>

      <div className='p-4'>
        {/* Title skeleton */}
        <div className='h-6 bg-pink-100 rounded-xl mb-2 w-3/4'></div>

        {/* Description skeleton */}
        <div className='space-y-2 mb-4'>
          <div className='h-4 bg-gray-100 rounded-lg w-full'></div>
          <div className='h-4 bg-gray-100 rounded-lg w-2/3'></div>
        </div>

        {/* Stats skeleton */}
        <div className='grid grid-cols-2 gap-3 mb-4'>
          <div className='bg-pink-50 p-3 rounded-xl border border-pink-200'>
            <div className='h-4 bg-pink-100 rounded-lg mb-2 w-1/2'></div>
            <div className='h-6 bg-pink-200 rounded-lg w-3/4'></div>
          </div>
          <div className='bg-purple-50 p-3 rounded-xl border border-purple-200'>
            <div className='h-4 bg-purple-100 rounded-lg mb-2 w-1/2'></div>
            <div className='h-6 bg-purple-200 rounded-lg w-3/4'></div>
          </div>
        </div>

        {/* Bottom info skeleton */}
        <div className='flex items-center justify-between pt-3 border-t border-pink-100'>
          <div className='h-4 bg-gray-100 rounded-lg w-1/3'></div>
          <div className='h-4 bg-gray-100 rounded-lg w-1/4'></div>
        </div>
      </div>
    </div>
  )
}

// Compact Dropdown Component
const CompactDropdown = ({
  value,
  onChange,
  options,
  placeholder,
  icon: Icon,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedOption, setSelectedOption] = useState(
    options.find((opt) => opt.value === value) || options[0]
  )

  const handleSelect = (option) => {
    setSelectedOption(option)
    onChange(option.value)
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='w-full h-8 bg-white border border-pink-200 rounded-xl px-2 flex items-center justify-between hover:border-pink-300 focus:outline-none transition-all text-xs'
      >
        <div className='flex items-center gap-1'>
          {Icon && <Icon className='w-3 h-3 text-pink-500' />}
          <span className='text-gray-800 font-medium truncate'>
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-3 h-3 text-pink-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className='fixed inset-0 z-40'
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className='absolute top-full left-0 right-0 mt-1 bg-white border border-pink-200 rounded-xl z-50 max-h-48 overflow-y-auto'>
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option)}
                className={`w-full px-2 py-2 text-left hover:bg-pink-50 transition-colors flex items-center gap-1 text-xs first:rounded-t-xl last:rounded-b-xl ${
                  selectedOption?.value === option.value
                    ? 'bg-pink-50 text-pink-700'
                    : 'text-gray-700'
                }`}
              >
                {option.icon && <option.icon className='w-3 h-3' />}
                <span className='font-medium truncate'>{option.label}</span>
                {selectedOption?.value === option.value && (
                  <Check className='w-3 h-3 ml-auto text-pink-600 flex-shrink-0' />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Enhanced Service Card Component
const ServiceCard = ({ service, onSelect }) => {
  const calculateDiscountedPrice = (price) => {
    if (service.discount.active) {
      return price - (price * service.discount.percentage) / 100
    }
    return price
  }

  const isDiscountActive =
    service.discount.active &&
    new Date() >= new Date(service.discount.startDate || Date.now()) &&
    new Date() <= new Date(service.discount.endDate || Date.now())

  return (
    <div
      onClick={() => onSelect(service)}
      className='bg-white rounded-2xl border border-pink-100 overflow-hidden hover:border-pink-300 hover:scale-105 transform transition-all duration-200 cursor-pointer group'
    >
      <div className='relative h-40 md:h-48 overflow-hidden'>
        <img
          src={
            service.image ||
            'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=500&h=300&fit=crop'
          }
          alt={service.name}
          className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
        />

        {/* Category Badge */}
        <div className='absolute top-3 left-3'>
          <span className='bg-gradient-to-r from-pink-500 to-rose-500 text-white px-3 py-1 rounded-full text-xs font-bold border border-white/20'>
            {service.categoryId?.name || service.categoryName || 'Service'}
          </span>
        </div>

        {/* Discount Badge */}
        {isDiscountActive && (
          <div className='absolute top-3 right-3'>
            <span className='bg-gradient-to-r from-rose-500 to-red-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-white/20'>
              <Percent className='w-3 h-3' />
              {service.discount.percentage}% OFF
            </span>
          </div>
        )}

        {/* Status Badge */}
        <div className='absolute bottom-3 left-3'>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border border-white/20 ${
              service.status === 'active'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                : 'bg-gray-500 text-white'
            }`}
          >
            {service.status}
          </span>
        </div>
      </div>

      <div className='p-4'>
        <h3 className='text-lg font-bold text-gray-900 mb-2 line-clamp-1'>
          {service.name}
        </h3>

        <p className='text-gray-600 text-sm mb-4 line-clamp-2'>
          {service.description}
        </p>

        {/* Service stats */}
        <div className='grid grid-cols-2 gap-3 mb-4'>
          <div className='bg-gradient-to-r from-pink-50 to-rose-50 p-3 rounded-xl border border-pink-200'>
            <div className='flex items-center gap-2 mb-1'>
              <DollarSign className='w-4 h-4 text-pink-600' />
              <span className='text-xs font-bold text-pink-700'>From</span>
            </div>
            <div>
              {isDiscountActive ? (
                <div className='flex flex-col'>
                  <span className='text-lg font-bold text-pink-700'>
                    ${calculateDiscountedPrice(service.basePrice)}
                  </span>
                  <span className='text-xs text-gray-500 line-through'>
                    ${service.basePrice}
                  </span>
                </div>
              ) : (
                <span className='text-lg font-bold text-pink-700'>
                  ${service.basePrice}
                </span>
              )}
            </div>
          </div>

          <div className='bg-gradient-to-r from-purple-50 to-indigo-50 p-3 rounded-xl border border-purple-200'>
            <div className='flex items-center gap-2 mb-1'>
              <Clock className='w-4 h-4 text-purple-600' />
              <span className='text-xs font-bold text-purple-700'>
                Duration
              </span>
            </div>
            <span className='text-lg font-bold text-purple-700'>
              {service.duration}min
            </span>
          </div>
        </div>

        {/* Bottom info */}
        <div className='flex items-center justify-between pt-3 border-t border-pink-100'>
          <span className='text-sm text-gray-600'>
            Daily limit: {service.limit}
          </span>
          <span className='text-sm text-gray-600 flex items-center gap-1'>
            <Star className='w-3 h-3 text-pink-500' />
            {service.subTreatments?.length || 0} options
          </span>
        </div>
      </div>
    </div>
  )
}

// Main Service Catalog Component
const ServiceCatalog = ({ onServiceSelect }) => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [sortBy, setSortBy] = useState('name')

  // Debounce search term to avoid excessive API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // API calls using React Query hooks
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCategories(false)

  const {
    services,
    stats,
    pagination,
    isLoading: servicesLoading,
    error: servicesError,
  } = useActiveServices({
    search: debouncedSearchTerm,
    category: selectedCategory,
    sortBy: sortBy,
  })

  const { services: discountedServices = [], isLoading: discountsLoading } =
    useDiscountedServices()

  // Calculate derived state
  const currentServices = services || []
  const activeServices = currentServices.filter((s) => s.status === 'active')

  // Determine if we should show skeletons
  const isSearching = searchTerm !== debouncedSearchTerm
  const isLoadingContent = servicesLoading || isSearching

  // Enhanced filter options with icons
  const categoryOptions = [
    { value: '', label: 'All Categories', icon: Filter },
    ...categories.map((category) => ({
      value: category._id,
      label: category.name,
      icon: Star,
    })),
  ]

  const sortOptions = [
    { value: 'name', label: 'A-Z', icon: SortAsc },
    { value: 'price-low', label: 'Price: Low to High', icon: DollarSign },
    { value: 'price-high', label: 'Price: High to Low', icon: DollarSign },
    { value: 'duration', label: 'Duration', icon: Clock },
    { value: 'rating', label: 'Rating', icon: Star },
    { value: 'bookings', label: 'Popularity', icon: Star },
  ]

  // Error state
  if (servicesError || categoriesError) {
    return (
      <Layout>
        <div className='min-h-screen bg-gradient-to-br from-pink-50 to-rose-50'>
          <div className='max-w-sm mx-auto md:max-w-6xl lg:max-w-7xl px-4 md:px-6 lg:px-8 py-4'>
            <div className='flex items-center justify-center min-h-[60vh]'>
              <div className='text-center max-w-sm mx-auto'>
                <div className='w-16 h-16 bg-gradient-to-r from-pink-100 to-rose-100 rounded-2xl mx-auto mb-4 border border-pink-200'></div>
                <h3 className='text-lg font-bold text-gray-900 mb-2'>
                  Oops! Something went wrong
                </h3>
                <p className='text-gray-600 mb-4 text-sm'>
                  {servicesError?.message ||
                    categoriesError?.message ||
                    'Please try again later, sweetie!'}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className='px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-rose-600 hover:scale-105 transform transition-all duration-200'
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className='min-h-screen bg-gradient-to-br from-pink-50 to-rose-50'>
        <div className='max-w-sm mx-auto md:max-w-6xl lg:max-w-7xl px-4 md:px-6 lg:px-8 py-4 md:py-6'>
          {/* ENHANCED COMPACT HEADER - Inspired by RewardsCatalogPage */}
          <div className='bg-white rounded-2xl border border-pink-100 mb-4 relative'>
            {/* Header & Search Row */}
            <div className='bg-gradient-to-r from-pink-500 to-rose-500 text-white p-4 rounded-t-2xl'>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-3'>
                  <div>
                    <div className='text-xl font-bold'>Our Services</div>
                    <div className='text-xs opacity-80'>
                      {activeServices.length} available treatments
                    </div>
                  </div>
                </div>
                <div className='text-right'>
                  <div className='text-sm font-medium'>
                    {discountedServices.length} special
                  </div>
                  <div className='text-xs opacity-80'>offers</div>
                </div>
              </div>

              {/* Integrated Search */}
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-pink-300 w-4 h-4' />
                <input
                  type='text'
                  placeholder='Search services...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='w-full pl-10 pr-10 py-2 bg-white/20 border border-white/30 rounded-xl focus:outline-none focus:bg-white/30 transition-all text-white placeholder-pink-200 text-sm'
                />
                {/* Loading indicator */}
                {isSearching && (
                  <div className='absolute right-8 top-1/2 transform -translate-y-1/2'>
                    <div className='w-3 h-3 border border-white border-t-transparent rounded-full animate-spin'></div>
                  </div>
                )}
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className='absolute right-3 top-1/2 transform -translate-y-1/2 text-pink-200 hover:text-white'
                  >
                    <X className='w-4 h-4' />
                  </button>
                )}
              </div>
            </div>

            {/* Compact Filters */}
            <div className='px-3 py-3 bg-pink-50 border-t border-pink-100 relative rounded-b-2xl'>
              <div className='grid grid-cols-2 gap-3 relative z-10'>
                <CompactDropdown
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  options={categoryOptions}
                  placeholder='Filter'
                  icon={Filter}
                  className='w-full'
                />
                <CompactDropdown
                  value={sortBy}
                  onChange={setSortBy}
                  options={sortOptions}
                  placeholder='Sort'
                  icon={SortAsc}
                  className='w-full'
                />
              </div>

              {/* Compact Active Filters */}
              {(searchTerm || selectedCategory) && (
                <div className='flex items-center gap-1 mt-2'>
                  {searchTerm && (
                    <span className='inline-flex items-center gap-1 bg-pink-200 text-pink-800 px-2 py-0.5 rounded-full text-xs'>
                      "{searchTerm.slice(0, 12)}
                      {searchTerm.length > 12 ? '...' : ''}"
                      <X
                        onClick={() => setSearchTerm('')}
                        className='w-3 h-3 cursor-pointer hover:text-pink-600'
                      />
                    </span>
                  )}
                  {selectedCategory && (
                    <span className='inline-flex items-center gap-1 bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full text-xs'>
                      {
                        categoryOptions.find(
                          (opt) => opt.value === selectedCategory
                        )?.label
                      }
                      <X
                        onClick={() => setSelectedCategory('')}
                        className='w-3 h-3 cursor-pointer hover:text-purple-600'
                      />
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setSelectedCategory('')
                    }}
                    className='text-xs text-gray-500 hover:text-gray-700 underline ml-1'
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Special Offers Section */}
          {searchTerm === '' &&
            selectedCategory === '' &&
            !discountsLoading &&
            discountedServices.length > 0 && (
              <div className='mb-6 md:mb-8'>
                <div className='flex items-center gap-2 mb-4'>
                  <Gift className='w-5 h-5 text-rose-500' />
                  <h2 className='text-xl md:text-2xl font-bold text-gray-900'>
                    Special Offers
                  </h2>
                  <Sparkles className='w-5 h-5 text-pink-500' />
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'>
                  {discountedServices.slice(0, 3).map((service) => (
                    <ServiceCard
                      key={service._id}
                      service={service}
                      onSelect={onServiceSelect}
                    />
                  ))}
                </div>
              </div>
            )}

          {/* All Services */}
          <div className='mb-4 md:mb-6'>
            <h2 className='text-xl md:text-2xl font-bold text-gray-900 mb-4'>
              {searchTerm || selectedCategory
                ? 'Search Results'
                : 'All Services'}
              <span className='text-base md:text-lg font-normal text-gray-600 ml-2'>
                {isLoadingContent ? (
                  <span className='inline-block w-16 h-4 bg-gray-200 rounded-lg animate-pulse'></span>
                ) : (
                  <>
                    ({currentServices.length}{' '}
                    {currentServices.length === 1 ? 'service' : 'services'})
                  </>
                )}
              </span>
            </h2>
          </div>

          {/* Loading State with Skeletons */}
          {isLoadingContent ? (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'>
              {[...Array(6)].map((_, index) => (
                <ServiceCardSkeleton key={`skeleton-${index}`} />
              ))}
            </div>
          ) : currentServices.length > 0 ? (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'>
              {currentServices.map((service) => (
                <ServiceCard
                  key={service._id}
                  service={service}
                  onSelect={onServiceSelect}
                />
              ))}
            </div>
          ) : (
            <div className='text-center py-12 md:py-16 bg-white rounded-2xl border border-pink-100'>
              <div className='w-16 h-16 bg-gradient-to-r from-pink-100 to-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-pink-200'>
                <Search className='w-8 h-8 text-pink-500' />
              </div>
              <h3 className='text-xl md:text-2xl font-bold text-gray-900 mb-3'>
                No services found
              </h3>
              <p className='text-gray-600 mb-6 px-4'>
                {searchTerm || selectedCategory
                  ? 'Try adjusting your search terms or filters, sweetie!'
                  : 'No services are currently available.'}
              </p>
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategory('')
                }}
                className='bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-rose-600 hover:scale-105 transform transition-all duration-200'
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Bottom CTA */}
          <div className='mt-8 md:mt-12 bg-gradient-to-r from-pink-50 to-rose-50 rounded-2xl p-6 md:p-8 text-center border border-pink-200'>
            <div className='flex items-center justify-center gap-2 mb-3'>
              <h3 className='text-xl md:text-2xl font-bold text-gray-900'>
                Can't find what you're looking for?
              </h3>
            </div>
            <p className='text-gray-600 mb-6 text-sm md:text-base'>
              Contact our lovely team for personalized treatment
              recommendations.
            </p>
            <button className='bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 md:px-8 py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-rose-600 hover:scale-105 transform transition-all duration-200'>
              Contact Us
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

// Main component that handles navigation
const ServiceCatalogPage = () => {
  const navigate = useNavigate()

  const handleServiceSelect = (service) => {
    navigate(`/services/${service._id}`)
  }

  return <ServiceCatalog onServiceSelect={handleServiceSelect} />
}

export default ServiceCatalogPage
