// client/src/components/Bookings/MembershipCard.jsx
import { Crown, Sparkles, Zap } from 'lucide-react';
import React from 'react';

// Premium Membership Card - Dark "Black Card" Aesthetic
const MembershipCard = ({ service, onSelect, membership }) => {
    // Use membership data if provided, otherwise fall back to service data
    const price = membership?.price ?? service.basePrice ?? 99;
    const benefits = membership?.benefits ?? [
        'Priority Booking',
        'Free Premium Facial',
        '15% Product Discount'
    ];
    const membershipName = membership?.name ?? service.name ?? 'Gold Glow Membership';
    const description = membership?.description ?? service.description ?? 'Unlock exclusive perks and premium benefits';
    const isSelectable = typeof onSelect === 'function' && !!service?._id && !service._id.startsWith('location-membership');
    const handleCardClick = () => {
        if (isSelectable) {
            onSelect(service);
        }
    };

    // Icons for benefits
    const benefitIcons = [Zap, Sparkles, Crown];

    return (
        <div 
            onClick={handleCardClick}
            className={`relative overflow-hidden rounded-[2.5rem] p-6 md:p-10 text-white group transition-all duration-300 bg-gray-900 border border-gray-200/70 shadow-2xl h-full flex flex-col justify-center ${isSelectable ? 'cursor-pointer hover:scale-[1.01]' : 'cursor-default'}`}
        >
            {/* Background - Dark Premium Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-[#1A1A1A] to-black" />
            
            {/* Decorative Gold Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-[color:var(--brand-primary)/0.08] blur-[60px] rounded-full pointer-events-none" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay" />
            
            {/* Shine Effect on Hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-gradient-to-tr from-transparent via-white/5 to-transparent" />

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-center h-full">
                {/* Left Side: Identity & Info */}
                <div className="md:col-span-7 flex flex-col h-full justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-6">
                            <div className="bg-gradient-to-br from-amber-200 to-yellow-600 p-3 rounded-2xl text-amber-900 shadow-lg shadow-amber-900/20">
                                <Crown size={28} strokeWidth={2} />
                            </div>
                            <div className="text-right md:text-left md:hidden">
                                <span className="block text-[10px] font-bold text-amber-500 tracking-[0.2em] uppercase mb-1">Monthly</span>
                                <span className="text-3xl font-black text-white tracking-tight">${price}</span>
                            </div>
                        </div>

                        <h3 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-amber-200 mb-4 tracking-tight">
                            {membershipName}
                        </h3>
                        <p className="text-gray-400 text-sm md:text-base font-medium leading-relaxed max-w-sm">
                            {description}
                        </p>
                    </div>
                    
                    <div className="hidden md:block mt-8">
                         <span className="block text-[10px] font-bold text-amber-500 tracking-[0.2em] uppercase mb-1">Price</span>
                         <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black text-white tracking-tighter">${price}</span>
                            <span className="text-sm font-bold text-gray-500">/ month</span>
                         </div>
                    </div>
                </div>

                {/* Divider (Mobile Only) */}
                <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-700 to-transparent md:hidden" />
                
                {/* Desktop Divider (Vertical) */}
                <div className="hidden md:block w-px h-full bg-gradient-to-b from-transparent via-gray-800 to-transparent absolute left-[60%]" />

                {/* Right Side: Perks & Action */}
                <div className="md:col-span-5 flex flex-col h-full justify-center md:pl-6">
                    <ul className="space-y-4 mb-8">
                         {benefits.map((benefit, index) => {
                             const Icon = benefitIcons[index] || Zap;
                             return (
                                 <li key={index} className="flex items-center gap-3 text-sm md:text-base font-bold text-gray-300">
                                     <div className="p-1.5 rounded-full bg-amber-500/20 text-amber-400">
                                         <Icon size={12} fill="currentColor" />
                                     </div>
                                     <span>{benefit}</span>
                                 </li>
                             );
                         })}
                    </ul>

                    <button 
                        onClick={(e) => e.stopPropagation()} 
                        className="w-full bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 text-amber-950 font-black py-3.5 rounded-xl shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-all active:scale-95 flex items-center justify-center gap-2 tracking-wide uppercase text-xs md:text-sm whitespace-nowrap"
                    >
                        {isSelectable ? 'Join Exclusive Club' : 'Membership Plan'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MembershipCard
