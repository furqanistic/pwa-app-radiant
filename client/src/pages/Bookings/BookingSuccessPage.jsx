import Layout from '@/pages/Layout/Layout'
import { motion } from 'framer-motion'
import { ArrowRight, Calendar, CheckCircle, Home, Sparkles } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { clearCart } from '../../redux/cartSlice'

// ============================================
// CUSTOM CONFETTI ENGINE (Canvas)
// Optimized for performance & mobile
// ============================================
const ConfettiCanvas = () => {
  const canvasRef = useRef(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    let animationFrameId
    let particles = []
    
    // Theme Colors: Pink, Rose, Gold, White
    const colors = [
      '#ec4899', // Pink-500
      '#db2777', // Pink-600
      '#fb7185', // Rose-400
      '#fcd34d', // Yellow-300 (Gold-ish)
      '#ffffff', // White
    ]
    
    const createParticle = () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height, // Start above screen
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 3 + 2,
      speedX: Math.random() * 2 - 1,
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 10 - 5,
      wobble: 0,
      wobbleSpeed: Math.random() * 0.1 + 0.05
    })
    
    // Resize handler
    const resizeValues = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    
    // Initialize
    window.addEventListener('resize', resizeValues)
    resizeValues()
    
    // Initial burst
    for (let i = 0; i < 150; i++) {
      particles.push(createParticle())
    }
    
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      particles.forEach((p, index) => {
        // Physics
        p.y += p.speedY
        p.x += Math.sin(p.wobble) * 2 + p.speedX
        p.wobble += p.wobbleSpeed
        p.rotation += p.rotationSpeed
        
        // Draw
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color
        
        // Random shapes: Square or Circle
        if (index % 2 === 0) {
             ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
        } else {
             ctx.beginPath()
             ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
             ctx.fill()
        }
        
        ctx.restore()
        
        // Reset if out of bounds (infinite fall for a while)
        if (p.y > canvas.height) {
            p.y = -20
            p.x = Math.random() * canvas.width
        }
      })
      
      animationFrameId = requestAnimationFrame(render)
    }
    
    render()
    
    return () => {
      window.removeEventListener('resize', resizeValues)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-0"
    />
  )
}

const BookingSuccessPage = () => {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    // Clear cart immediately on mount if coming from a successful session
    if (sessionId) {
      dispatch(clearCart())
    }
    // Small delay for content enter animation to sync with confetti
    setTimeout(() => setShowContent(true), 100)
  }, [dispatch, sessionId])

  return (
    <Layout>
        {/* Full screen container */}
      <div className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        
        {/* 1. Background Gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-pink-50/50 to-white -z-10" />
        <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-pink-100/30 to-transparent -z-10" />
        
        {/* 2. Confetti Layer */}
        <ConfettiCanvas />

        {/* 3. Main Card Content */}
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
          className="relative z-10 w-full max-w-sm mx-4"
        >
            {/* Blurry glow behind the card */}
            <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-rose-400 blur-2xl opacity-20 transform scale-110 rounded-[3rem]" />

            <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] p-8 text-center relative overflow-hidden">
                
                {/* Decorative sheen */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/40 via-transparent to-white/40 z-0 pointer-events-none" />

                {/* Animated Icon */}
                <motion.div 
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                    className="relative z-10 w-24 h-24 mx-auto mb-6"
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-green-400 to-emerald-500 rounded-full opacity-20 blur-xl animate-pulse" />
                    <div className="relative bg-gradient-to-tr from-green-400 to-emerald-500 rounded-full w-full h-full flex items-center justify-center shadow-lg shadow-green-200">
                        <CheckCircle className="w-10 h-10 text-white stroke-[3]" />
                    </div>
                    {/* Floating sparkles */}
                    <motion.div 
                        animate={{ y: [0, -10, 0], opacity: [0, 1, 0] }}
                        transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                        className="absolute -top-2 -right-2 text-yellow-400"
                    >
                        <Sparkles className="w-6 h-6 fill-current" />
                    </motion.div>
                </motion.div>

                {/* Text Content */}
                <div className="relative z-10 space-y-2 mb-8">
                    <motion.h1 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-3xl font-black text-gray-900 tracking-tight"
                    >
                        Success!
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-gray-500 font-medium leading-relaxed px-2"
                    >
                        Your appointment has been securely confirmed. Get ready to glow!
                    </motion.p>
                </div>

                {/* Transaction Pill */}
                {sessionId && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="relative z-10 bg-gray-50 rounded-2xl py-3 px-4 mb-8 border border-gray-100 flex flex-col items-center gap-1"
                    >
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order ID</span>
                        <code className="text-xs font-mono text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-100 select-all">
                            {sessionId.slice(-8).toUpperCase()}...
                        </code>
                    </motion.div>
                )}

                {/* Action Buttons */}
                <div className="relative z-10 space-y-3">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/Booking')} // Original path was /Booking (capital B according to existing files)
                        className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-bold shadow-xl shadow-gray-200 transition-all flex items-center justify-center gap-2 group"
                    >
                        <span>View My Bookings</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                    
                    <motion.button
                        whileHover={{ scale: 1.02, backgroundColor: '#fef1f8' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/dashboard')}
                        className="w-full bg-transparent hover:bg-pink-50 text-gray-600 hover:text-pink-600 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                        <Home className="w-4 h-4" />
                        <span>Back Home</span>
                    </motion.button>
                </div>

            </div>
            
            {/* Footer Text */}
            <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-center mt-8 text-xs text-gray-400 font-medium"
            >
                A confirmation email has been sent to you.
            </motion.p>
        </motion.div>
      </div>
    </Layout>
  )
}

export default BookingSuccessPage
