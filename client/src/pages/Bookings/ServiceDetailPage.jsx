// client/src/pages/Bookings/ServiceDetailPage.jsx
// client/src/pages/Bookings/ServicePageDetail.jsx
// client/src/pages/Bookings/ServiceDetailPage.jsx
import { useService } from '@/hooks/useServices'
import Layout from '@/pages/Layout/Layout'
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Percent,
  Star,
  User,
} from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'react-hot-toast'
import { useNavigate, useParams } from 'react-router-dom'

const ServiceDetailPage = () => {
  const { serviceId } = useParams()
  const navigate = useNavigate()

  const [selectedTreatment, setSelectedTreatment] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')

  // API call to get service details
  const {
    data: service,
    isLoading,
    error,
    isError,
  } = useService(serviceId, {
    enabled: !!serviceId, // Only fetch if serviceId exists
  })

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className='flex items-center justify-center min-h-[50vh]'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
          <span className='ml-3 text-lg'>Loading service details...</span>
        </div>
      </Layout>
    )
  }

  // Error state
  if (isError || !service) {
    return (
      <Layout>
        <div className='flex items-center justify-center min-h-[50vh]'>
          <div className='text-center'>
            <div className='text-red-500 text-xl mb-2'>⚠️</div>
            <h3 className='text-lg font-semibold text-gray-900 mb-2'>
              Service not found
            </h3>
            <p className='text-gray-600 mb-4'>
              {error?.message ||
                'The service you are looking for does not exist or has been removed.'}
            </p>
            <button
              onClick={() => navigate('/bookings')}
              className='bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700'
            >
              Back to Services
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  const isDiscountActive =
    service.discount?.active &&
    new Date() >= new Date(service.discount.startDate) &&
    new Date() <= new Date(service.discount.endDate)

  const calculateDiscountedPrice = (price) => {
    if (isDiscountActive) {
      return price - (price * service.discount.percentage) / 100
    }
    return price
  }

  const handleTreatmentSelect = (treatment) => {
    setSelectedTreatment(treatment)
  }

  const handleBooking = () => {
    if (!selectedTreatment) {
      toast.error('Please select a treatment option')
      return
    }
    if (!selectedDate || !selectedTime) {
      toast.error('Please select date and time')
      return
    }

    const finalPrice = calculateDiscountedPrice(selectedTreatment.price)

    // TODO: Replace with actual booking API call
    toast.success(
      `Booking confirmed!\nTreatment: ${
        selectedTreatment.name
      }\nPrice: $${finalPrice.toFixed(
        2
      )}\nDate: ${selectedDate}\nTime: ${selectedTime}`
    )

    // For now, just show success message
    // In the future, this would call your booking API:
    // const bookingData = {
    //   serviceId: service._id,
    //   subTreatmentId: selectedTreatment._id || selectedTreatment.id,
    //   date: selectedDate,
    //   time: selectedTime,
    //   totalPrice: finalPrice
    // }
    // bookingMutation.mutate(bookingData)
  }

  const handleBackClick = () => {
    navigate(-1) // Go back to previous page
  }

  // Mock available time slots (this would come from availability API in the future)
  const timeSlots = [
    '9:00 AM',
    '10:30 AM',
    '12:00 PM',
    '2:00 PM',
    '3:30 PM',
    '5:00 PM',
  ]

  return (
    <Layout>
      <div className='px-4 py-6 max-w-6xl mx-auto'>
        {/* Back Button */}
        <div className='mb-6'>
          <button
            onClick={handleBackClick}
            className='flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors'
          >
            <ArrowLeft className='w-5 h-5' />
            <span>Back to Services</span>
          </button>
        </div>

        <div className='grid lg:grid-cols-3 gap-6'>
          {/* Service Details - Left Column */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Main Service Info */}
            <div className='bg-white rounded-lg shadow-sm overflow-hidden'>
              <div className='relative h-64 md:h-80'>
                <img
                  src={
                    service.image ||
                    'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=400&fit=crop'
                  }
                  alt={service.name}
                  className='w-full h-full object-cover'
                />
                {isDiscountActive && (
                  <div className='absolute top-4 right-4'>
                    <span className='bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1'>
                      <Percent className='w-4 h-4' />
                      {service.discount.percentage}% OFF
                    </span>
                  </div>
                )}
                <div className='absolute top-4 left-4'>
                  <span className='bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-bold'>
                    {service.categoryId?.name ||
                      service.categoryName ||
                      'Service'}
                  </span>
                </div>
              </div>

              <div className='p-6'>
                <div className='flex items-start justify-between mb-4'>
                  <div>
                    <h1 className='text-2xl md:text-3xl font-bold text-gray-900 mb-2'>
                      {service.name}
                    </h1>
                    <div className='flex items-center gap-4'>
                      <div className='flex items-center gap-1'>
                        <Star className='w-5 h-5 text-yellow-500 fill-current' />
                        <span className='font-semibold text-gray-900'>
                          {service.rating?.toFixed(1) || '5.0'}
                        </span>
                        <span className='text-gray-600'>
                          ({service.totalReviews || service.reviewCount || 0}{' '}
                          reviews)
                        </span>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${
                          service.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {service.status}
                      </span>
                    </div>
                  </div>
                </div>

                <p className='text-gray-600 mb-6 leading-relaxed'>
                  {service.description}
                </p>

                {/* Service Info Grid */}
                <div className='grid md:grid-cols-2 gap-4 mb-6'>
                  <div className='bg-blue-50 p-4 rounded-lg'>
                    <div className='flex items-center gap-2 mb-2'>
                      <User className='w-5 h-5 text-blue-600' />
                      <span className='font-semibold text-blue-900'>
                        Practitioner
                      </span>
                    </div>
                    <p className='text-blue-800'>
                      {service.practitioner ||
                        service.createdBy?.name ||
                        'Professional Staff'}
                    </p>
                  </div>

                  <div className='bg-green-50 p-4 rounded-lg'>
                    <div className='flex items-center gap-2 mb-2'>
                      <DollarSign className='w-5 h-5 text-green-600' />
                      <span className='font-semibold text-green-900'>
                        Starting Price
                      </span>
                    </div>
                    <div className='flex items-center gap-2'>
                      {isDiscountActive ? (
                        <>
                          <span className='text-lg font-bold text-green-800'>
                            $
                            {calculateDiscountedPrice(
                              service.basePrice
                            ).toFixed(2)}
                          </span>
                          <span className='text-sm text-gray-500 line-through'>
                            ${service.basePrice}
                          </span>
                        </>
                      ) : (
                        <span className='text-lg font-bold text-green-800'>
                          ${service.basePrice}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className='bg-purple-50 p-4 rounded-lg'>
                    <div className='flex items-center gap-2 mb-2'>
                      <Clock className='w-5 h-5 text-purple-600' />
                      <span className='font-semibold text-purple-900'>
                        Duration
                      </span>
                    </div>
                    <p className='text-purple-800'>
                      {service.duration} minutes
                    </p>
                  </div>

                  <div className='bg-orange-50 p-4 rounded-lg'>
                    <div className='flex items-center gap-2 mb-2'>
                      <Calendar className='w-5 h-5 text-orange-600' />
                      <span className='font-semibold text-orange-900'>
                        Daily Limit
                      </span>
                    </div>
                    <p className='text-orange-800'>
                      {service.limit} appointments
                    </p>
                  </div>
                </div>

                {/* Additional Service Stats */}
                {(service.bookings > 0 || service.totalReviews > 0) && (
                  <div className='grid md:grid-cols-2 gap-4 pt-4 border-t border-gray-100'>
                    {service.bookings > 0 && (
                      <div className='flex items-center gap-2'>
                        <CheckCircle className='w-5 h-5 text-green-500' />
                        <span className='text-sm text-gray-600'>
                          {service.bookings} successful bookings
                        </span>
                      </div>
                    )}
                    {service.totalReviews > 0 && (
                      <div className='flex items-center gap-2'>
                        <Star className='w-5 h-5 text-yellow-500' />
                        <span className='text-sm text-gray-600'>
                          {service.totalReviews} customer reviews
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Treatment Options */}
            <div className='bg-white rounded-lg p-6 shadow-sm'>
              <h2 className='text-xl font-bold text-gray-900 mb-6'>
                Treatment Options
              </h2>

              {service.subTreatments && service.subTreatments.length > 0 ? (
                <div className='grid gap-4'>
                  {service.subTreatments.map((treatment, index) => (
                    <div
                      key={treatment._id || treatment.id || index}
                      onClick={() => handleTreatmentSelect(treatment)}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedTreatment?.id === treatment.id ||
                        selectedTreatment?._id === treatment._id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className='flex items-start justify-between'>
                        <div className='flex-1'>
                          <div className='flex items-center gap-3 mb-2'>
                            <div
                              className={`w-4 h-4 rounded-full border-2 ${
                                selectedTreatment?.id === treatment.id ||
                                selectedTreatment?._id === treatment._id
                                  ? 'border-blue-500 bg-blue-500'
                                  : 'border-gray-300'
                              }`}
                            >
                              {(selectedTreatment?.id === treatment.id ||
                                selectedTreatment?._id === treatment._id) && (
                                <CheckCircle className='w-4 h-4 text-white' />
                              )}
                            </div>
                            <h3 className='text-lg font-semibold text-gray-900'>
                              {treatment.name}
                            </h3>
                            {treatment.popular && (
                              <span className='bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full'>
                                Popular
                              </span>
                            )}
                          </div>
                          <p className='text-gray-600 mb-3'>
                            {treatment.description}
                          </p>
                          <div className='flex items-center gap-4'>
                            <div className='flex items-center gap-1'>
                              <Clock className='w-4 h-4 text-gray-500' />
                              <span className='text-sm text-gray-600'>
                                {treatment.duration} min
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className='text-right ml-4'>
                          {isDiscountActive ? (
                            <div>
                              <div className='text-lg font-bold text-green-600'>
                                $
                                {calculateDiscountedPrice(
                                  treatment.price
                                ).toFixed(2)}
                              </div>
                              <div className='text-sm text-gray-500 line-through'>
                                ${treatment.price}
                              </div>
                            </div>
                          ) : (
                            <div className='text-lg font-bold text-green-600'>
                              ${treatment.price}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-center py-8 text-gray-500'>
                  <Clock className='w-8 h-8 mx-auto mb-2 text-gray-400' />
                  <p>No specific treatment options available.</p>
                  <p className='text-sm'>This service can be booked as is.</p>
                </div>
              )}
            </div>
          </div>

          {/* Booking Panel - Right Column */}
          <div className='lg:col-span-1'>
            <div className='bg-white rounded-lg p-6 shadow-sm sticky top-6'>
              <h3 className='text-xl font-bold text-gray-900 mb-6'>
                Book Appointment
              </h3>

              {/* Treatment Selection or Default Service */}
              {service.subTreatments && service.subTreatments.length > 0 ? (
                // Show selected treatment if sub-treatments exist
                selectedTreatment ? (
                  <div className='mb-6 p-4 bg-blue-50 rounded-lg'>
                    <h4 className='font-semibold text-blue-900 mb-2'>
                      Selected Treatment
                    </h4>
                    <p className='text-blue-800 mb-2'>
                      {selectedTreatment.name}
                    </p>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm text-blue-600'>
                        {selectedTreatment.duration} min
                      </span>
                      <span className='font-bold text-blue-800'>
                        $
                        {calculateDiscountedPrice(
                          selectedTreatment.price
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className='mb-6 p-4 bg-gray-50 rounded-lg text-center'>
                    <p className='text-gray-600'>
                      Please select a treatment option
                    </p>
                  </div>
                )
              ) : (
                // Show default service info if no sub-treatments
                <div className='mb-6 p-4 bg-blue-50 rounded-lg'>
                  <h4 className='font-semibold text-blue-900 mb-2'>Service</h4>
                  <p className='text-blue-800 mb-2'>{service.name}</p>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-blue-600'>
                      {service.duration} min
                    </span>
                    <span className='font-bold text-blue-800'>
                      ${calculateDiscountedPrice(service.basePrice).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Date Selection */}
              <div className='mb-4'>
                <label className='block text-sm font-semibold text-gray-700 mb-2'>
                  Select Date
                </label>
                <input
                  type='date'
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>

              {/* Time Selection */}
              <div className='mb-6'>
                <label className='block text-sm font-semibold text-gray-700 mb-2'>
                  Select Time
                </label>
                <div className='grid grid-cols-2 gap-2'>
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        selectedTime === time
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Booking Summary */}
              {((selectedTreatment && service.subTreatments?.length > 0) ||
                !service.subTreatments?.length) &&
                selectedDate &&
                selectedTime && (
                  <div className='mb-6 p-4 bg-gray-50 rounded-lg'>
                    <h4 className='font-semibold text-gray-900 mb-3'>
                      Booking Summary
                    </h4>
                    <div className='space-y-2 text-sm'>
                      <div className='flex justify-between'>
                        <span className='text-gray-600'>Treatment:</span>
                        <span className='text-gray-900'>
                          {selectedTreatment?.name || service.name}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-gray-600'>Date:</span>
                        <span className='text-gray-900'>{selectedDate}</span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-gray-600'>Time:</span>
                        <span className='text-gray-900'>{selectedTime}</span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-gray-600'>Duration:</span>
                        <span className='text-gray-900'>
                          {selectedTreatment?.duration || service.duration} min
                        </span>
                      </div>
                      <div className='border-t pt-2 mt-2'>
                        <div className='flex justify-between font-semibold'>
                          <span className='text-gray-900'>Total:</span>
                          <span className='text-green-600'>
                            $
                            {calculateDiscountedPrice(
                              selectedTreatment?.price || service.basePrice
                            ).toFixed(2)}
                          </span>
                        </div>
                        {isDiscountActive && (
                          <div className='text-xs text-green-600 mt-1'>
                            You save $
                            {(
                              (selectedTreatment?.price || service.basePrice) -
                              calculateDiscountedPrice(
                                selectedTreatment?.price || service.basePrice
                              )
                            ).toFixed(2)}
                            !
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {/* Book Button */}
              <button
                onClick={handleBooking}
                disabled={
                  !selectedDate ||
                  !selectedTime ||
                  (service.subTreatments?.length > 0 && !selectedTreatment)
                }
                className='w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              >
                Book Appointment
              </button>

              <p className='text-xs text-gray-500 mt-3 text-center'>
                You can cancel or reschedule up to 24 hours before your
                appointment
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default ServiceDetailPage
