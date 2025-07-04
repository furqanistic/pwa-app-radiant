import { Zap } from 'lucide-react'
import React, { useEffect, useState } from 'react'

const SpinWheel = ({ onSpin, spinning, result }) => {
  const [rotation, setRotation] = useState(0)
  const [glowing, setGlowing] = useState(false)

  // Wheel segments with prizes and colors
  const segments = [
    {
      label: '30% OFF',
      startColor: '#f472b6',
      endColor: '#ec4899',
      textColor: 'text-white',
    },
    {
      label: 'Free Facial',
      startColor: '#a78bfa',
      endColor: '#8b5cf6',
      textColor: 'text-white',
    },
    {
      label: '$50 Credit',
      startColor: '#818cf8',
      endColor: '#6366f1',
      textColor: 'text-white',
    },
    {
      label: '25% OFF',
      startColor: '#f9a8d4',
      endColor: '#f472b6',
      textColor: 'text-white',
    },
    {
      label: 'Beauty Kit',
      startColor: '#c4b5fd',
      endColor: '#a78bfa',
      textColor: 'text-white',
    },
    {
      label: '$75 Credit',
      startColor: '#a5b4fc',
      endColor: '#818cf8',
      textColor: 'text-white',
    },
    {
      label: '40% OFF',
      startColor: '#ec4899',
      endColor: '#db2777',
      textColor: 'text-white',
    },
    {
      label: 'Spa Package',
      startColor: '#8b5cf6',
      endColor: '#7c3aed',
      textColor: 'text-white',
    },
  ]

  const segmentAngle = 360 / segments.length

  const handleSpin = () => {
    if (!spinning && !result) {
      const spins = 6 + Math.random() * 6 // 6-12 full rotations
      const finalAngle = Math.random() * 360
      const totalRotation = rotation + spins * 360 + finalAngle

      setRotation(totalRotation)
      setGlowing(true)
      onSpin()

      setTimeout(() => setGlowing(false), 5000)
    }
  }

  const createSegments = () => {
    return segments.map((segment, index) => {
      const startAngle = index * segmentAngle
      const endAngle = (index + 1) * segmentAngle

      const startAngleRad = (startAngle * Math.PI) / 180
      const endAngleRad = (endAngle * Math.PI) / 180
      const largeArcFlag = segmentAngle > 180 ? 1 : 0

      const x1 = 200 + 180 * Math.cos(startAngleRad)
      const y1 = 200 + 180 * Math.sin(startAngleRad)
      const x2 = 200 + 180 * Math.cos(endAngleRad)
      const y2 = 200 + 180 * Math.sin(endAngleRad)

      const pathData = [
        `M 200 200`,
        `L ${x1} ${y1}`,
        `A 180 180 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z',
      ].join(' ')

      const textAngle = startAngle + segmentAngle / 2
      const textAngleRad = (textAngle * Math.PI) / 180
      const textX = 200 + 120 * Math.cos(textAngleRad)
      const textY = 200 + 120 * Math.sin(textAngleRad)

      return (
        <g key={index}>
          <defs>
            <linearGradient
              id={`gradient-${index}`}
              x1='0%'
              y1='0%'
              x2='100%'
              y2='100%'
            >
              <stop offset='0%' stopColor={segment.startColor} />
              <stop offset='100%' stopColor={segment.endColor} />
            </linearGradient>
          </defs>
          <path
            d={pathData}
            fill={`url(#gradient-${index})`}
            stroke='white'
            strokeWidth='3'
            className='transition-all duration-300 hover:brightness-125 '
          />
          <text
            x={textX}
            y={textY}
            textAnchor='middle'
            dominantBaseline='middle'
            className={`${segment.textColor} text-sm font-extrabold pointer-events-none `}
            transform={`rotate(${textAngle} ${textX} ${textY})`}
          >
            {segment.label}
          </text>
        </g>
      )
    })
  }

  return (
    <div className='flex flex-col items-center space-y-8 p-6  rounded-2xl '>
      {/* Wheel Container */}
      <div className='relative'>
        {/* Pointer */}
        <div className='absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-4 z-20'>
          <div className='w-0 h-0 border-l-[16px] border-r-[16px] border-b-[28px] border-l-transparent border-r-transparent border-b-yellow-500'></div>
        </div>

        {/* Enhanced Glow effect */}
        {glowing && (
          <div className='absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 opacity-40 blur-2xl animate-pulse scale-110'></div>
        )}

        {/* Wheel */}
        <div
          className={`relative transition-transform duration-[5000ms] ease-[cubic-bezier(0.19,1,0.22,1)] ${
            spinning ? 'animate-[pulse_1.5s_ease-in-out_infinite]' : ''
          }`}
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <svg width='400' height='400' className='drop'>
            {/* Outer decorative ring */}
            <circle
              cx='200'
              cy='200'
              r='192'
              fill='none'
              stroke='url(#outerGradient)'
              strokeWidth='10'
              className='drop'
            />
            <defs>
              <linearGradient
                id='outerGradient'
                x1='0%'
                y1='0%'
                x2='100%'
                y2='100%'
              >
                <stop offset='0%' stopColor='#f472b6' />
                <stop offset='100%' stopColor='#8b5cf6' />
              </linearGradient>
            </defs>

            {/* Segments */}
            {createSegments()}

            {/* Inner decorative circle */}
            <circle
              cx='200'
              cy='200'
              r='40'
              fill='white'
              stroke='url(#innerGradient)'
              strokeWidth='4'
              className=''
            />
            <defs>
              <linearGradient
                id='innerGradient'
                x1='0%'
                y1='0%'
                x2='100%'
                y2='100%'
              >
                <stop offset='0%' stopColor='#ec4899' />
                <stop offset='100%' stopColor='#6366f1' />
              </linearGradient>
            </defs>
          </svg>

          {/* Center Spin Button */}
          <button
            onClick={handleSpin}
            disabled={spinning || result}
            className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                       w-24 h-24 rounded-full bg-gradient-to-br from-pink-600 to-purple-600 
                       text-white font-extrabold text-lg border-4 border-white
                       transition-all duration-300 hover:scale-105 active:scale-95
                       disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100
                       ${
                         spinning
                           ? 'animate-[pulse_1s_ease-in-out_infinite]'
                           : ''
                       }
                       ${
                         glowing
                           ? 'ring-4 ring-purple-300 ring-opacity-70 shadow-[0_0_20px_rgba(236,72,153,0.7)]'
                           : ''
                       }`}
          >
            SPIN
          </button>
        </div>
      </div>

      {/* Status Text */}
      <div className='text-center'>
        {spinning && (
          <div className='flex items-center justify-center space-x-3 text-purple-700 animate-[fadeIn_0.5s_ease-in]'>
            <Zap size={24} className='animate-spin' />
            <span className='font-bold text-lg tracking-wide'>Spinning...</span>
            <Zap size={24} className='animate-spin' />
          </div>
        )}
        {result && (
          <div className='text-purple-700 font-bold text-xl animate-[bounceIn_0.7s_ease-out]'>
            You won: {result}!
          </div>
        )}
      </div>
    </div>
  )
}

export default SpinWheel
