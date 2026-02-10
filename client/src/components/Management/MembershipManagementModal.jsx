// client/src/components/Management/MembershipManagementModal.jsx
import { locationService } from '@/services/locationService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Crown, Sparkles } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';

const MembershipManagementModal = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();

    // Fetch current location data
    const { data: locationData, isLoading } = useQuery({
        queryKey: ['my-location'],
        queryFn: () => locationService.getMyLocation(),
        enabled: isOpen,
    });

    const location = locationData?.data?.location;

    // Form state
    const [formData, setFormData] = useState({
        isActive: false,
        price: 99,
        name: 'Gold Glow Membership',
        description: 'Unlock exclusive perks and premium benefits',
        benefits: ['Priority Booking', 'Free Premium Facial', '15% Product Discount'],
    });

    // Initialize form with existing data
    useEffect(() => {
        if (location?.membership) {
            setFormData({
                isActive: location.membership.isActive || false,
                price: location.membership.price || 99,
                name: location.membership.name || 'Gold Glow Membership',
                description: location.membership.description || 'Unlock exclusive perks and premium benefits',
                benefits: location.membership.benefits || ['Priority Booking', 'Free Premium Facial', '15% Product Discount'],
            });
        }
    }, [location]);

    // Update mutation
    const updateMembership = useMutation({
        mutationFn: async (membershipData) => {
            return locationService.updateLocation(location._id, {
                membership: membershipData,
            });
        },
        onSuccess: () => {
            toast.success('Membership updated successfully!');
            queryClient.invalidateQueries(['my-location']);
            queryClient.invalidateQueries(['locations']);
            onClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to update membership');
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validation
        if (formData.price < 0) {
            toast.error('Price must be a positive number');
            return;
        }

        if (formData.benefits.some(b => !b.trim())) {
            toast.error('All benefit fields must be filled');
            return;
        }

        if (!formData.name.trim()) {
            toast.error('Membership name is required');
            return;
        }

        updateMembership.mutate(formData);
    };

    const handleBenefitChange = (index, value) => {
        const newBenefits = [...formData.benefits];
        newBenefits[index] = value;
        setFormData({ ...formData, benefits: newBenefits });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <Crown className="w-6 h-6 text-amber-500" />
                        Manage Membership
                    </DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6 py-4">
                        {/* Active Toggle */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div>
                                <label className="font-semibold text-gray-900">
                                    Membership Active
                                </label>
                                <p className="text-sm text-gray-500">
                                    Enable or disable membership for your location
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                                    formData.isActive ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                            >
                                <span
                                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                                        formData.isActive ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>

                        {/* Membership Name */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                                Membership Name
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="e.g., Gold Glow Membership"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                placeholder="e.g., Unlock exclusive perks and premium benefits"
                                rows={2}
                                required
                            />
                        </div>

                        {/* Price */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                                Monthly Price ($)
                            </label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="99"
                                min="0"
                                step="1"
                                required
                            />
                        </div>

                        {/* Benefits */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                Membership Benefits (3 Points)
                            </label>
                            <div className="space-y-3">
                                {formData.benefits.map((benefit, index) => (
                                    <div key={index}>
                                        <input
                                            type="text"
                                            value={benefit}
                                            onChange={(e) => handleBenefitChange(index, e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder={`Benefit ${index + 1}`}
                                            required
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={updateMembership.isPending}
                                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                            >
                                {updateMembership.isPending ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default MembershipManagementModal;
