import { useBranding } from '@/context/BrandingContext'
import { addPoints, setPoints } from '@/redux/userSlice'
import { qrCodeService } from '@/services/qrCodeService'
import { AnimatePresence, motion } from 'framer-motion'
import {
    AlertCircle,
    Camera,
    Check,
    Loader2,
    MapPin,
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
  const { branding } = useBranding()
  const brandColor = branding?.themeColor || '#ec4899'
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
            <div className="bg-white px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Scan QR Code</h2>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mt-0.5">Earn points per scan</p>
              </div>
              <button
                onClick={handleClose}
                className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-600"
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
                  <div className="relative aspect-square bg-black rounded-3xl overflow-hidden shadow-inner ring-1 ring-gray-100">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Scanner Overlay - Material 3 Style */}
                    <div className="absolute inset-0 border-2 border-white/20 m-12 rounded-3xl">
                      <div className="absolute inset-0 bg-black/5" />
                      
                      {/* Corner Accents - Solid Brand Color */}
                      <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 rounded-tl-2xl" style={{ borderColor: brandColor }} />
                      <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 rounded-tr-2xl" style={{ borderColor: brandColor }} />
                      <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 rounded-bl-2xl" style={{ borderColor: brandColor }} />
                      <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 rounded-br-2xl" style={{ borderColor: brandColor }} />
                      
                      {/* Scanning Line */}
                      <motion.div 
                        animate={{ top: ['10%', '90%', '10%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute left-6 right-6 h-0.5 shadow-lg"
                        style={{ backgroundColor: brandColor }}
                      />
                    </div>

                    {!scanning && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm">
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: brandColor }} />
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
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest px-1">
                      Verify Account
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-5 py-4 bg-gray-100 border border-transparent rounded-2xl focus:bg-white focus:border-gray-200 outline-none transition-all font-medium text-gray-800"
                      disabled={loading}
                      required
                    />
                  </div>

                  {/* Scanned Location Info */}
                  {scannedData?.locationName && (
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
                      <div className="bg-white p-2.5 rounded-xl shadow-sm border border-gray-50">
                        <MapPin className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Scanned Location</p>
                        <p className="font-bold text-gray-900">{scannedData.locationName}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      style={{ backgroundColor: brandColor }}
                      className="w-full h-14 text-white font-bold rounded-full shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase text-xs tracking-[0.2em]"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          VERIFYING...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          CONFIRM & EARN
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStep("scanner");
                        setScannedData(null);
                        startCamera();
                      }}
                      disabled={loading}
                      className="w-full h-14 bg-gray-100 text-gray-600 font-bold rounded-full hover:bg-gray-200 transition-all disabled:opacity-50 uppercase text-xs tracking-[0.2em]"
                    >
                      Rescan
                    </button>
                  </div>
                </form>
              )}

              {/* Result Step */}
              {result && (
                <div className="space-y-4">
                  {result.success ? (
                    <>
                      <div className="text-center py-6">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-gray-100"
                          style={{ backgroundColor: brandColor }}
                        >
                          <Check className="w-10 h-10 text-white" strokeWidth={4} />
                        </motion.div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">
                          Verification Success!
                        </h3>
                        <p className="text-sm font-medium text-gray-500 mb-8">{result.message}</p>
                      </div>

                      {result.data?.user && (
                        <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                              Points Awarded
                            </span>
                            <span className="text-2xl font-bold" style={{ color: brandColor }}>
                              +{result.data.user.pointsEarned}
                            </span>
                          </div>
                          
                          <div className="h-px bg-gray-200" />
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">New Balance</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-bold text-gray-900">
                                {result.data.user.totalPoints}
                                </span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Points</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-center py-6">
                        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <AlertCircle className="w-10 h-10 text-amber-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {result.message.includes("account")
                            ? "Account Setup Needed"
                            : "Processing..."}
                        </h3>
                        <p className="text-gray-500 text-sm">{result.message}</p>
                      </div>
                    </>
                  )}

                  <button
                    onClick={handleClose}
                    className="w-full h-14 bg-gray-900 text-white font-bold rounded-full hover:bg-gray-800 active:scale-[0.98] transition-all uppercase text-xs tracking-[0.2em] mt-6"
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