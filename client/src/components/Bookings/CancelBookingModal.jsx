// File: client/src/components/Bookings/CancelBookingModal.jsx

import { Button } from "@/components/ui/button";
import { bookingService } from "@/services/bookingService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { toast } from 'sonner';

const CancelBookingModal = ({ isOpen, onClose, booking }) => {
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: () => bookingService.cancelBooking(booking._id, reason),
    onSuccess: () => {
      toast.success("Booking cancelled successfully");
      queryClient.invalidateQueries(["bookings"]);
      setReason("");
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to cancel booking");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-bold text-gray-900">Cancel Booking?</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-gray-600 mb-4">
          Are you sure you want to cancel this booking? This action cannot be
          undone.
        </p>

        <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-1">
            {booking.serviceName}
          </h3>
          <p className="text-sm text-gray-600">
            {new Date(booking.date).toLocaleDateString()} at {booking.time}
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason (Optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Help us improve by telling us why..."
            rows="3"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
          />
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={cancelMutation.isPending}
            className="flex-1"
          >
            Keep Booking
          </Button>
          <Button
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            className="flex-1 bg-red-500 hover:bg-red-600"
          >
            {cancelMutation.isPending ? "Cancelling..." : "Cancel Booking"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CancelBookingModal;
