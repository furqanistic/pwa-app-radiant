import { AnimatePresence, motion } from 'framer-motion'
import { RotateCw } from 'lucide-react'
import React, { useRef, useState } from 'react'

const SpinWheel = ({ game, onResult, isPlaying, onPlay }) => {
  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [hasPlayed, setHasPlayed] = useState(false)

  const items = game.items || []
  const segmentAngle = 360 / items.length

  const handlePlay = async () => {
    if (isSpinning || isPlaying || hasPlayed) return

    try {
      await onPlay(game.id)
      setHasPlayed(true)
      spin()
    } catch (error) {
      console.error('Error playing game:', error)
    }
  }

  const spin = () => {
    setIsSpinning(true)

    const spins = 5 + Math.random() * 5
    const finalRotation = rotation + spins * 360 + Math.random() * 360

    setRotation(finalRotation)

    setTimeout(() => {
      const normalizedRotation = (360 - (finalRotation % 360)) % 360
      const winningIndex = Math.floor(normalizedRotation / segmentAngle)
      const winningItem = items[winningIndex] || items[0]

      setIsSpinning(false)
    }, 3000)
  }

  return (
    <div className='flex flex-col items-center space-y-6'>
      <div className='relative'>
        <div
          className='relative w-80 h-80 rounded-full border-8 border-gray-300 shadow-2xl'
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning
              ? 'transform 3s cubic-bezier(0.23, 1, 0.320, 1)'
              : 'none',
          }}
        >
          <svg className='w-full h-full' viewBox='0 0 200 200'>
            {items.map((item, index) => {
              const startAngle = index * segmentAngle * (Math.PI / 180)
              const endAngle = (index + 1) * segmentAngle * (Math.PI / 180)
              const midAngle = (startAngle + endAngle) / 2

              const x1 = 100 + 90 * Math.cos(startAngle)
              const y1 = 100 + 90 * Math.sin(startAngle)
              const x2 = 100 + 90 * Math.cos(endAngle)
              const y2 = 100 + 90 * Math.sin(endAngle)

              const textX = 100 + 60 * Math.cos(midAngle)
              const textY = 100 + 60 * Math.sin(midAngle)

              return (
                <g key={index}>
                  <path
                    d={`M 100 100 L ${x1} ${y1} A 90 90 0 0 1 ${x2} ${y2} Z`}
                    fill={item.color || '#FF6B6B'}
                    stroke='#fff'
                    strokeWidth='2'
                  />
                  <text
                    x={textX}
                    y={textY}
                    textAnchor='middle'
                    dominantBaseline='middle'
                    className='fill-white font-bold text-xs'
                    transform={`rotate(${
                      (index + 0.5) * segmentAngle
                    }, ${textX}, ${textY})`}
                  >
                    {item.title.length > 8
                      ? item.title.substring(0, 8) + '...'
                      : item.title}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        <div className='absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2'>
          <div className='w-6 h-8 bg-red-500 rounded-b-full shadow-lg' />
        </div>

        <button
          onClick={handlePlay}
          disabled={isSpinning || isPlaying || hasPlayed}
          className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg hover:from-yellow-500 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed border-4 border-white'
        >
          <RotateCw
            className={`w-6 h-6 text-white ${isSpinning ? 'animate-spin' : ''}`}
          />
        </button>
      </div>
    </div>
  )
}

export default SpinWheel
