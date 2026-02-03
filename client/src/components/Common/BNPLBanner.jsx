// File: client/src/components/Common/BNPLBanner.jsx
import { motion } from 'framer-motion'
import { CreditCard, Sparkles } from 'lucide-react'

const BNPLBanner = ({ className = "", variant = "default" }) => {
  if (variant === "minimal") {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 bg-pink-50 border border-pink-100 rounded-xl ${className}`}>
        <p className="text-[10px] font-bold text-pink-600 uppercase tracking-wider flex items-center gap-1.5">
          Buy Now, Pay Later Available at 0% Interest
        </p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 p-4 text-white shadow-lg shadow-pink-200/50 ${className}`}
    >
      {/* Decorative Shimmer */}
      <motion.div
        animate={{
          x: ['-100%', '200%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
          repeatDelay: 2
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none"
      />

      <div className="relative flex items-center gap-4">
        <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex-shrink-0">
          <CreditCard className="w-6 h-6 text-white" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-100">Premium Option</span>
           
          </div>
          <h4 className="text-sm sm:text-base font-bold leading-tight">
            Buy Now, Pay Later Available
          </h4>
          <p className="text-[10px] sm:text-xs text-pink-50 font-medium opacity-90">
            Enjoy your treatments now and spread the cost with our flexible payment options at checkout.
          </p>
        </div>

     
      </div>
    </motion.div>
  )
}

export default BNPLBanner
