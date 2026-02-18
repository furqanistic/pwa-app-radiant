import { useBranding } from '@/context/BrandingContext';
import { locationService } from '@/services/locationService';
import stripeService from '@/services/stripeService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { Crown, Plus, Save, Sparkles, Trash2, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { Button } from '../ui/button';

const MAX_PLANS = 3;

const DEFAULT_PLAN = {
  name: 'Gold Glow Membership',
  description: 'Unlock exclusive perks and premium benefits',
  price: 99,
  benefits: ['Priority Booking', 'Free Premium Facial', '15% Product Discount'],
};

const adjustHex = (hex, amount) => {
  const cleaned = (hex || '').replace('#', '');
  if (cleaned.length !== 6) return '#be185d';
  const num = parseInt(cleaned, 16);
  const clamp = (value) => Math.max(0, Math.min(255, value));
  const r = clamp((num >> 16) + amount);
  const g = clamp(((num >> 8) & 0xff) + amount);
  const b = clamp((num & 0xff) + amount);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

const normalizePlan = (plan = {}) => {
  const benefits = Array.isArray(plan.benefits)
    ? plan.benefits
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  return {
    name: plan.name?.trim() || DEFAULT_PLAN.name,
    description: plan.description?.trim() || DEFAULT_PLAN.description,
    price: Number.isFinite(Number(plan.price))
      ? Math.max(0, Number(plan.price))
      : DEFAULT_PLAN.price,
    benefits: benefits.length > 0 ? benefits : [...DEFAULT_PLAN.benefits],
  };
};

const normalizeMembership = (membership) => {
  if (Array.isArray(membership?.plans) && membership.plans.length > 0) {
    return {
      isActive: Boolean(membership.isActive),
      plans: membership.plans.slice(0, MAX_PLANS).map((plan) => normalizePlan(plan)),
    };
  }

  if (membership && (membership.name || membership.description || membership.price !== undefined)) {
    return {
      isActive: Boolean(membership.isActive),
      plans: [normalizePlan(membership)],
    };
  }

  return {
    isActive: false,
    plans: [normalizePlan(DEFAULT_PLAN)],
  };
};

const MembershipManagementModal = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const { currentUser } = useSelector((state) => state.user);
  const isSuperAdmin = currentUser?.role === 'super-admin';
  const isSpaReadOnly = currentUser?.role === 'spa';
  const { branding } = useBranding();
  const brandColor = branding?.themeColor || '#ec4899';
  const brandColorDark = adjustHex(brandColor, -24);

  const { data: locationData, isLoading: isLoadingMyLocation } = useQuery({
    queryKey: ['my-location'],
    queryFn: () => locationService.getMyLocation(),
    enabled: isOpen && !isSuperAdmin,
  });

  const { data: locationsData, isLoading: isLoadingLocations } = useQuery({
    queryKey: ['locations', 'membership-modal'],
    queryFn: () => locationService.getAllLocations(),
    enabled: isOpen && isSuperAdmin,
  });
  const { data: spaStripeStatusData } = useQuery({
    queryKey: ['stripe-account-status', 'membership-modal'],
    queryFn: () => stripeService.getAccountStatus(),
    enabled: isOpen && isSpaReadOnly,
  });

  const locations = useMemo(
    () => locationsData?.data?.locations || [],
    [locationsData]
  );
  const [selectedLocationId, setSelectedLocationId] = useState('');

  useEffect(() => {
    if (isSuperAdmin && isOpen && locations.length > 0 && !selectedLocationId) {
      setSelectedLocationId(locations[0]._id);
    }
  }, [isSuperAdmin, isOpen, locations, selectedLocationId]);

  const location = isSuperAdmin
    ? locations.find((item) => item._id === selectedLocationId) || null
    : locationData?.data?.location;

  const isSelectedLocationStripeConnected = isSuperAdmin
    ? Boolean(location?.membershipStripeConnected)
    : true;
  const stripeNotConnectedMessage = location?.membershipStripeMessage || 'Spa user has not connected Stripe.';

  const [formData, setFormData] = useState({
    isActive: false,
    plans: [normalizePlan(DEFAULT_PLAN)],
  });

  useEffect(() => {
    if (location?.membership) {
      setFormData(normalizeMembership(location.membership));
    }
  }, [location]);

  const updateMembership = useMutation({
    mutationFn: async (membershipData) => {
      if (!location?._id) {
        throw new Error('Please select a location first.');
      }
      return locationService.updateLocation(location._id, {
        membership: membershipData,
      });
    },
    onSuccess: () => {
      toast.success('Membership updated successfully!');
      queryClient.invalidateQueries(['my-location']);
      queryClient.invalidateQueries(['locations']);
      queryClient.invalidateQueries(['locations', 'membership-modal']);
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update membership');
    },
  });

  const handlePlanChange = (planIndex, key, value) => {
    setFormData((prev) => {
      const nextPlans = [...prev.plans];
      nextPlans[planIndex] = {
        ...nextPlans[planIndex],
        [key]: key === 'price' ? Number(value) : value,
      };
      return {
        ...prev,
        plans: nextPlans,
      };
    });
  };

  const handleBenefitChange = (planIndex, benefitIndex, value) => {
    setFormData((prev) => {
      const nextPlans = [...prev.plans];
      const nextBenefits = [...nextPlans[planIndex].benefits];
      nextBenefits[benefitIndex] = value;
      nextPlans[planIndex] = {
        ...nextPlans[planIndex],
        benefits: nextBenefits,
      };
      return {
        ...prev,
        plans: nextPlans,
      };
    });
  };

  const addPlan = () => {
    if (formData.plans.length >= MAX_PLANS) return;
    setFormData((prev) => ({
      ...prev,
      plans: [
        ...prev.plans,
        {
          ...normalizePlan(DEFAULT_PLAN),
          name: `Plan ${prev.plans.length + 1}`,
        },
      ],
    }));
  };

  const removePlan = (index) => {
    if (formData.plans.length <= 1) {
      toast.error('At least one membership plan is required.');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      plans: prev.plans.filter((_, i) => i !== index),
    }));
  };

  const addFeaturePoint = (planIndex) => {
    setFormData((prev) => {
      const nextPlans = [...prev.plans];
      nextPlans[planIndex] = {
        ...nextPlans[planIndex],
        benefits: [...nextPlans[planIndex].benefits, ''],
      };
      return {
        ...prev,
        plans: nextPlans,
      };
    });
  };

  const removeFeaturePoint = (planIndex, benefitIndex) => {
    setFormData((prev) => {
      const nextPlans = [...prev.plans];
      const currentBenefits = nextPlans[planIndex].benefits;
      if (currentBenefits.length <= 1) return prev;
      nextPlans[planIndex] = {
        ...nextPlans[planIndex],
        benefits: currentBenefits.filter((_, i) => i !== benefitIndex),
      };
      return {
        ...prev,
        plans: nextPlans,
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isSpaReadOnly) {
      toast.message('Spa accounts can only view membership. Contact super-admin to update plans.');
      return;
    }

    if (!location?._id) {
      toast.error('Please select a location first.');
      return;
    }

    if (formData.plans.length < 1 || formData.plans.length > MAX_PLANS) {
      toast.error('You can create between 1 and 3 plans.');
      return;
    }

    for (const [index, plan] of formData.plans.entries()) {
      if (!plan.name?.trim()) {
        toast.error(`Plan ${index + 1}: name is required.`);
        return;
      }

      if (!plan.description?.trim()) {
        toast.error(`Plan ${index + 1}: description is required.`);
        return;
      }

      if (!Number.isFinite(plan.price) || plan.price < 0) {
        toast.error(`Plan ${index + 1}: price must be 0 or more.`);
        return;
      }

      if (!Array.isArray(plan.benefits) || plan.benefits.length < 1) {
        toast.error(`Plan ${index + 1}: add at least one feature point.`);
        return;
      }

      if (plan.benefits.some((benefit) => !benefit?.trim())) {
        toast.error(`Plan ${index + 1}: all feature points must be filled.`);
        return;
      }
    }

    const payload = {
      isActive: formData.isActive,
      plans: formData.plans.map((plan) => ({
        ...plan,
        name: plan.name.trim(),
        description: plan.description.trim(),
        price: Number(plan.price),
        benefits: plan.benefits.map((benefit) => benefit.trim()),
      })),
    };

    updateMembership.mutate(payload);
  };

  const isLoading = isSuperAdmin ? isLoadingLocations : isLoadingMyLocation;
  const hasNoLocations = isSuperAdmin && !isLoading && locations.length === 0;
  const spaStripeConnected = Boolean(
    spaStripeStatusData?.connected && spaStripeStatusData?.account?.chargesEnabled
  );
  const spaMembershipPlans = Array.isArray(formData?.plans) ? formData.plans : [];
  const spaHasActiveMembership = Boolean(formData?.isActive && spaMembershipPlans.length > 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          <div
            className="fixed inset-x-0 bottom-0 md:inset-x-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:bottom-auto w-full md:max-w-3xl bg-white md:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]"
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-3 md:hidden shrink-0" />

            <div className="px-6 py-4 md:px-8 md:py-6 border-b border-gray-50 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Crown className="w-5 h-5 text-[color:var(--brand-primary)]" />
                  Manage Membership
                </h2>
                <p className="text-xs md:text-sm font-bold text-pink-500 uppercase tracking-widest mt-0.5">
                  Plans & Features
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 bg-gray-100 text-gray-500 rounded-2xl hover:bg-pink-50 hover:text-pink-500 transition-all group"
                type="button"
              >
                <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12 flex-1">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin"></div>
              </div>
            ) : isSpaReadOnly ? (
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 space-y-4">
                {!spaHasActiveMembership && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium text-gray-800">
                    No membership yet.
                  </div>
                )}

                {!spaStripeConnected && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm font-medium text-amber-800">
                    No membership yet because Stripe is not connected. Please connect Stripe first.
                  </div>
                )}

                {spaHasActiveMembership && (
                  <div className="space-y-4">
                    <p className="text-xs font-black text-gray-900 uppercase tracking-wider">
                      Your Membership Plans
                    </p>
                    {spaMembershipPlans.map((plan, index) => (
                      <div key={index} className="p-4 bg-white rounded-2xl border border-gray-200 space-y-2">
                        <p className="font-black text-gray-900">{plan.name}</p>
                        <p className="text-sm text-gray-600">{plan.description}</p>
                        <p className="text-sm font-bold text-gray-900">${plan.price}/month</p>
                        <ul className="text-sm text-gray-700 list-disc pl-5">
                          {Array.isArray(plan.benefits) && plan.benefits.map((benefit, i) => (
                            <li key={i}>{benefit}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 space-y-5">
                  {isSpaReadOnly && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-sm font-medium text-blue-800">
                      View only: spa role can see current membership plans, but only super-admin can create or update them.
                    </div>
                  )}

                  {isSuperAdmin && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Location
                      </label>
                      <select
                        value={selectedLocationId}
                        onChange={(e) => setSelectedLocationId(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-pink-500 outline-none"
                      >
                        {locations.map((item) => (
                          <option key={item._id} value={item._id}>
                            {item.name || item.locationId}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {hasNoLocations && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm font-medium text-amber-800">
                      No locations found. Create a location first, then assign membership plans.
                    </div>
                  )}

                  {isSuperAdmin && location && !isSelectedLocationStripeConnected && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm font-medium text-amber-800">
                      Save disabled: {stripeNotConnectedMessage}
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4 bg-pink-50/50 rounded-3xl border border-pink-100/50">
                    <div>
                      <label className="text-sm font-black text-gray-900">
                        Membership Active
                      </label>
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-1">
                        Enable all plans for this location
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                      disabled={isSpaReadOnly}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        formData.isActive ? 'bg-pink-500' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          formData.isActive ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-gray-900 uppercase tracking-wider">
                      Plans ({formData.plans.length}/{MAX_PLANS})
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addPlan}
                      disabled={isSpaReadOnly || formData.plans.length >= MAX_PLANS || hasNoLocations}
                      className="rounded-2xl h-10"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Plan
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {formData.plans.map((plan, planIndex) => (
                      <div key={planIndex} className="p-4 md:p-5 bg-white rounded-3xl border-2 border-pink-50 space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="font-black text-gray-900 tracking-tight">Plan {planIndex + 1}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => removePlan(planIndex)}
                            disabled={isSpaReadOnly || formData.plans.length <= 1 || hasNoLocations}
                            className="text-red-600 hover:text-red-700 rounded-xl"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">Plan Name</label>
                          <input
                            type="text"
                            value={plan.name}
                            onChange={(e) => handlePlanChange(planIndex, 'name', e.target.value)}
                            disabled={isSpaReadOnly}
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-pink-500 outline-none"
                            placeholder="e.g. Gold Glow Membership"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">Description</label>
                          <textarea
                            value={plan.description}
                            onChange={(e) => handlePlanChange(planIndex, 'description', e.target.value)}
                            disabled={isSpaReadOnly}
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-pink-500 outline-none resize-none"
                            placeholder="Describe this plan"
                            rows={2}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">Monthly Price ($)</label>
                          <input
                            type="number"
                            value={plan.price}
                            onChange={(e) => handlePlanChange(planIndex, 'price', e.target.value)}
                            disabled={isSpaReadOnly}
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-pink-500 outline-none"
                            placeholder="99"
                            min="0"
                            step="1"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                              Feature Points
                            </label>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => addFeaturePoint(planIndex)}
                              disabled={isSpaReadOnly || hasNoLocations}
                              className="rounded-xl h-8 px-3"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" />
                              Add
                            </Button>
                          </div>

                          <div className="space-y-2">
                            {plan.benefits.map((benefit, benefitIndex) => (
                              <div key={benefitIndex} className="flex gap-2">
                                <input
                                  type="text"
                                  value={benefit}
                                  onChange={(e) =>
                                    handleBenefitChange(planIndex, benefitIndex, e.target.value)
                                  }
                                  disabled={isSpaReadOnly}
                                  className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-pink-500 outline-none"
                                  placeholder={`Feature point ${benefitIndex + 1}`}
                                  required
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => removeFeaturePoint(planIndex, benefitIndex)}
                                  disabled={isSpaReadOnly || plan.benefits.length <= 1 || hasNoLocations}
                                  className="px-3 rounded-2xl"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="shrink-0 px-6 md:px-8 py-4 border-t border-gray-100 bg-white">
                  <div className="flex flex-col md:flex-row gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      className="flex-1 rounded-2xl h-12 font-black uppercase tracking-widest text-xs border-2"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        updateMembership.isPending ||
                        hasNoLocations ||
                        (isSuperAdmin && !isSelectedLocationStripeConnected)
                      }
                      className="flex-1 rounded-2xl h-12 font-black uppercase tracking-widest text-xs text-white"
                      style={{
                        background: `linear-gradient(90deg, ${brandColor}, ${brandColorDark})`,
                      }}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateMembership.isPending
                        ? 'Saving...'
                        : isSuperAdmin && !isSelectedLocationStripeConnected
                        ? 'Stripe Required'
                        : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MembershipManagementModal;
