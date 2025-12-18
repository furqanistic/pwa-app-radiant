// File: pwa-app-radiant/client/src/components/QRCode/QRCodeScanner.jsx
// File: client/src/components/QRCode/QRCodeScanner.jsx
import { qrCodeService } from '@/services/qrCodeService'
import { motion, AnimatePresence } from 'framer-motion'
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
import { addPoints, setPoints } from '@/redux/userSlice'

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
const [manualQrId, setManualQrId] = useState("");
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
          // Try to parse as JSON
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
            // If not JSON, treat as raw qrId
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
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-6 text-white flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Scan QR Code</h2>
                <p className="text-sm opacity-90">Earn 50 points per scan!</p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Scanner Step */}
              {step === "scanner" && !result && (
                <div className="space-y-4">
                  {/* Add Manual QR ID Input */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-yellow-900 mb-3">
                      📝 Manual QR ID Entry (for testing without camera):
                    </p>
                    <input
                      type="text"
                      placeholder="Paste QR ID here (e.g., QR_123456_abc)"
                      value={manualQrId}
                      onChange={(e) => setManualQrId(e.target.value)}
                      className="w-full px-3 py-2 border border-yellow-300 rounded text-sm"
                    />
                    <button
                      onClick={() => {
                        if (manualQrId.trim()) {
                          setScannedData({ qrId: manualQrId });
                          stopCamera();
                          setStep("email");
                        }
                      }}
                      className="mt-2 w-full px-3 py-2 bg-yellow-500 text-white rounded text-sm"
                    >
                      Use This QR ID
                    </button>
                  </div>

                  {/* Original Camera UI */}
                  <div className="relative aspect-square bg-black rounded-xl...">
                    {/* existing camera code */}
                  </div>
                </div>
              )}

              {/* Email Step */}
              {step === "email" && !result && (
                <form onSubmit={handleScanSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
                      disabled={loading}
                      required
                    />
                  </div>

                  {/* Scanned Location Info */}
                  {scannedData?.locationName && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        <span className="font-semibold">Location:</span>{" "}
                        {scannedData.locationName}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("scanner");
                        setScannedData(null);
                        startCamera();
                      }}
                      disabled={loading}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Rescan
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Claim Points
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
                      <div className="text-center">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-16 h-16 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
                        >
                          <Check className="w-8 h-8 text-white" />
                        </motion.div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          Success!
                        </h3>
                        <p className="text-gray-600 mb-4">{result.message}</p>
                      </div>

                      {result.data?.user && (
                        <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">
                              Points Earned:
                            </span>
                            <span className="font-bold text-pink-600">
                              +{result.data.user.pointsEarned}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Total Points:</span>
                            <span className="font-bold text-gray-900">
                              {result.data.user.totalPoints}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-pink-200">
                            <span className="text-gray-600">Location:</span>
                            <span className="font-semibold">
                              {result.data.location?.name}
                            </span>
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
                    className="w-full px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all"
                  >
                    Done
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