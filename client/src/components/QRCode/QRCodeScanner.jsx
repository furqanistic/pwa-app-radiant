// File: pwa-app-radiant/client/src/components/QRCode/QRCodeScanner.jsx
// File: client/src/components/QRCode/QRCodeScanner.jsx
import { addPoints, setPoints } from '@/redux/userSlice'
import { qrCodeService } from '@/services/qrCodeService'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  Camera,
  Check,
  Loader2,
  X,
} from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'

// Simple QR code decoder (you'll need jsQR library)
// Install with: npm install jsqr

const QRCodeScanner = ({ isOpen, onClose }) => {
  const [scanning, setScanning] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('scanner') // 'scanner' or 'email'
  const [scannedData, setScannedData] = useState(null)
  const [result, setResult] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const { currentUser } = useSelector((state) => state.user)
  const dispatch = useDispatch()
  // Start camera
  const startCamera = async () => {
    try {
      setScanning(true)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      toast.error('Could not access camera')
      setScanning(false)
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setScanning(false)
  }

  // Capture frame from video
  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return null

    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    const video = videoRef.current

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    return canvas
  }

  // Scan for QR codes
  useEffect(() => {
    if (!scanning) return

    let intervalId

    const scanInterval = async () => {
      const canvas = captureFrame()
      if (!canvas) return

      try {
        // Import jsQR dynamically
        const jsQR = (await import('jsqr')).default
        const imageData = canvas
          .getContext('2d')
          .getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(
          imageData.data,
          imageData.width,
          imageData.height
        )

        if (code && code.data) {
          console.log('Detected QR:', code.data)
          
          // Handle URL format: https://domain.com/claim-reward?qrId=QR_123
          if (code.data.includes('qrId=')) {
            try {
              const url = new URL(code.data)
              const qrId = url.searchParams.get('qrId')
              if (qrId) {
                setScannedData({ qrId })
                stopCamera()
                setStep('email')
                toast.success('QR code detected!')
                return
              }
            } catch (e) {
              console.error('Error parsing QR URL:', e)
            }
          }

          // Handle JSON format (backward compatibility)
          try {
            const qrData = JSON.parse(code.data)
            if (qrData.qrId) {
              setScannedData(qrData)
              stopCamera()
              setStep('email')
              toast.success('QR code detected!')
              return
            }
          } catch (e) {
            // Handle raw QR ID
            if (code.data.startsWith('QR_')) {
              setScannedData({ qrId: code.data })
              stopCamera()
              setStep('email')
              toast.success('QR code detected!')
              return
            }
          }
        }
      } catch (error) {
        // jsQR library not available, show manual entry
        console.warn('QR scanning unavailable, use manual entry')
      }
    }

    intervalId = setInterval(scanInterval, 500)

    return () => clearInterval(intervalId)
  }, [scanning])

  // Handle scan submission
 const handleScanSubmit = async (e) => {
   e.preventDefault();
   if (!scannedData?.qrId || !email.trim()) {
     toast.error("Please enter your email");
     return;
   }

   setLoading(true);
   try {
     const response = await qrCodeService.scanQRCode(
       scannedData.qrId,
       email.trim().toLowerCase()
     );

     if (response.status === "success" || response.status === "verified") {
       console.log("Response data:", response.data);
       console.log("Total points:", response.data?.user?.totalPoints);

       // ✅ UPDATE REDUX WITH TOTAL POINTS
       if (response.data?.user?.totalPoints) {
         console.log(
           "Dispatching setPoints with:",
           response.data.user.totalPoints
         );
         dispatch(setPoints(response.data.user.totalPoints));
       }

       setResult({
         success: true,
         message: response.message,
         data: response.data,
       });
       toast.success("Points awarded!");
     } else if (response.status === "pending") {
       setResult({
         success: false,
         message: response.message,
         data: response.data,
       });
       toast.info(response.message);
     }
   } catch (error) {
     const errorMessage =
       error.response?.data?.message || "Failed to process QR code";
     setResult({
       success: false,
       message: errorMessage,
     });
     toast.error(errorMessage);
   } finally {
     setLoading(false);
   }
 };

  // Close modal
  const handleClose = () => {
    stopCamera()
    setStep('scanner')
    setScannedData(null)
    setEmail('')
    setResult(null)
    onClose()
  }

  // Pre-fill email if user is logged in
  useEffect(() => {
    if (currentUser?.email) {
      setEmail(currentUser.email)
    }
  }, [currentUser])

  // Start camera when scanner opens
  useEffect(() => {
    if (isOpen && step === 'scanner') {
      startCamera()
    }
    return () => {
      stopCamera()
    }
  }, [isOpen, step])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-6 text-white flex items-center justify-between relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
              <div className="relative z-10">
                <h2 className="text-xl font-black tracking-tight">Scan QR Code</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                  <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">Earn points per scan!</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="relative z-10 p-2 hover:bg-white/20 backdrop-blur-md rounded-xl transition-all border border-white/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Scanner Step */}
              {step === "scanner" && !result && (
                <div className="space-y-4">
                  {/* Original Camera UI */}
                  <div className="relative aspect-square bg-black rounded-xl overflow-hidden shadow-inner ring-4 ring-gray-100">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Scanner Overlay */}
                    <div className="absolute inset-0 border-2 border-pink-500/30 m-16 rounded-3xl">
                      <div className="absolute inset-0 animate-pulse bg-pink-500/5" />
                      {/* Corner Accents - Minimal and Elegant */}
                      <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-pink-500 rounded-tl-2xl" />
                      <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-pink-500 rounded-tr-2xl" />
                      <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-pink-500 rounded-bl-2xl" />
                      <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-pink-500 rounded-br-2xl" />
                      
                      {/* Scanning Line */}
                      <motion.div 
                        animate={{ top: ['10%', '90%', '10%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-pink-400 to-transparent shadow-[0_0_8px_rgba(244,114,182,0.8)]"
                      />
                    </div>

                    {!scanning && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
                        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <p className="text-gray-500 text-sm">
                      Align the QR code within the frame to scan
                    </p>
                  </div>
                </div>
              )}

              {/* Email Step */}
              {step === "email" && !result && (
                <form onSubmit={handleScanSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-black text-pink-500 uppercase tracking-widest ml-1">
                      Verify Account
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-5 py-3.5 bg-pink-50/50 border-2 border-pink-100 rounded-2xl focus:ring-4 focus:ring-pink-100 focus:border-pink-500 outline-none transition-all font-bold text-gray-800 placeholder-pink-300"
                      disabled={loading}
                      required
                    />
                  </div>

                  {/* Scanned Location Info */}
                  {scannedData?.locationName && (
                    <div className="bg-gradient-to-r from-pink-50 to-rose-50 border-2 border-pink-100 rounded-2xl p-4 flex items-center gap-3">
                      <div className="bg-pink-100 p-2 rounded-xl text-pink-600">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-pink-400 uppercase tracking-wider">Scanned Location</p>
                        <p className="font-bold text-gray-900">{scannedData.locationName}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("scanner");
                        setScannedData(null);
                        startCamera();
                      }}
                      disabled={loading}
                      className="flex-1 px-4 py-3.5 border-2 border-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-50 transition-all disabled:opacity-50"
                    >
                      Rescan
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-2 px-8 py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black rounded-2xl shadow-lg shadow-pink-200 hover:shadow-pink-300 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase text-xs tracking-wider"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          VERIFYING...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          CONFIRM
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Result Step */}
              {result && (
                <div className="space-y-4">
                  {result.success ? (
                    <>
                      <div className="text-center py-4">
                        <motion.div
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          className="w-20 h-20 bg-gradient-to-br from-pink-400 to-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-pink-200 rotate-12"
                        >
                          <Check className="w-10 h-10 text-white" strokeWidth={3} />
                        </motion.div>
                        <h3 className="text-2xl font-black text-gray-900 mb-1 tracking-tight">
                          Verification Success!
                        </h3>
                        <p className="text-sm font-medium text-gray-500 mb-6">{result.message}</p>
                      </div>

                      {result.data?.user && (
                        <div className="bg-gradient-to-br from-pink-50 to-rose-50 border-2 border-pink-100 rounded-[2.5rem] p-6 space-y-4 relative overflow-hidden">
                          <div className="absolute -top-10 -right-10 w-32 h-32 bg-pink-200/20 blur-3xl rounded-full" />
                          
                          <div className="flex items-center justify-between relative z-10">
                            <span className="text-xs font-black text-pink-400 uppercase tracking-widest">
                              Points Awarded
                            </span>
                            <span className="text-2xl font-black text-rose-600">
                              +{result.data.user.pointsEarned}
                            </span>
                          </div>
                          
                          <div className="h-px bg-pink-200/50" />
                          
                          <div className="flex items-center justify-between relative z-10">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">New Balance</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black text-gray-900">
                                {result.data.user.totalPoints}
                                </span>
                                <span className="text-[10px] font-black text-gray-400 uppercase">Points</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-center">
                        <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {result.message.includes("account")
                            ? "Account Setup Needed"
                            : "Processing..."}
                        </h3>
                        <p className="text-gray-600 mb-4">{result.message}</p>
                      </div>
                    </>
                  )}

                  <button
                    onClick={handleClose}
                    className="w-full px-4 py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-gray-800 active:scale-[0.98] transition-all uppercase text-xs tracking-[0.2em] mt-4"
                  >
                    Close Scanner
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default QRCodeScanner