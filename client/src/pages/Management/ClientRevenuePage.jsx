// File: client/src/pages/Management/ClientRevenuePage.jsx
import { Skeleton } from '@/components/ui/skeleton';
import Layout from '@/pages/Layout/Layout';
import stripeService from '@/services/stripeService';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Calendar,
    ChevronRight,
    DollarSign,
    TrendingUp,
    User,
    Users
} from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

const ClientRevenuePage = () => {
  const navigate = useNavigate();

  const { data: revenueData, isLoading, error } = useQuery({
    queryKey: ['client-revenue'],
    queryFn: stripeService.getClientsRevenue
  });

  const clients = revenueData?.clients || [];
  const totalEarnings = revenueData?.totalEarnings || 0;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-12">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-rose-500 to-rose-600 text-white pb-10 pt-6 px-4 sm:px-6 lg:px-8 shadow-md">
          <div className="max-w-7xl mx-auto">
            <button 
              onClick={() => navigate('/management')}
              className="flex items-center text-white/90 hover:text-white mb-4 transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-4xl font-extrabold mb-1 tracking-tight">Client Revenue</h1>
                <p className="text-rose-100 text-sm md:text-base opacity-90">Revenue performance per client</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 md:p-6 border border-white/20">
                <p className="text-rose-100 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-1">Total Earnings</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl md:text-4xl font-black">${totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <TrendingUp className="w-4 h-4 md:w-6 h-6 text-rose-300" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 md:-mt-6">
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="bg-white rounded-xl p-3 md:p-6 shadow-sm border border-gray-100 flex items-center gap-3 md:gap-4">
              <div className="p-2 md:p-3 bg-rose-50 rounded-lg md:rounded-xl text-rose-600">
                <Users className="w-4 h-4 md:w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] md:text-sm text-gray-500 font-bold uppercase tracking-tighter md:tracking-normal">Clients</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900 leading-none md:leading-normal">{clients.length}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 md:p-6 shadow-sm border border-gray-100 flex items-center gap-3 md:gap-4">
              <div className="p-2 md:p-3 bg-rose-50 rounded-lg md:rounded-xl text-rose-600">
                <TrendingUp className="w-4 h-4 md:w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] md:text-sm text-gray-500 font-bold uppercase tracking-tighter md:tracking-normal">Avg. Value</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900 leading-none md:leading-normal">
                  ${clients.length > 0 ? (totalEarnings / clients.length).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 }) : '0'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Clients List Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-white rounded-2xl md:rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 md:px-8 py-4 md:py-6 border-b border-gray-50 bg-gray-50/30">
              <h2 className="text-base md:text-xl font-bold text-gray-900">Revenue Contribution</h2>
            </div>
            
            {isLoading ? (
              <div className="p-4 md:p-8 space-y-3 md:space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 md:gap-4 p-3 md:p-4 border border-gray-50 rounded-xl">
                    <Skeleton className="w-10 h-10 md:w-12 md:h-12 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 md:w-40 mb-2" />
                      <Skeleton className="h-3 w-32 md:w-60" />
                    </div>
                    <Skeleton className="h-6 w-16 md:w-24 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : clients.length === 0 ? (
              <div className="py-12 md:py-20 text-center px-4">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-50/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 md:w-10 md:h-10 text-gray-300" />
                </div>
                <h3 className="text-base md:text-lg font-bold text-gray-900">No client data yet</h3>
                <p className="text-gray-500 text-sm">Revenue will appear once clients make purchases.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {clients.map((client, index) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={client._id} 
                    className="p-4 md:p-8 hover:bg-rose-50/30 active:bg-rose-50 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/client/${client._id}`)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 md:gap-4 min-w-0">
                        <div className="relative flex-shrink-0">
                          {client.customerAvatar ? (
                            <img 
                              src={client.customerAvatar} 
                              alt={client.customerName} 
                              className="w-10 h-10 md:w-14 md:h-14 rounded-full object-cover border-2 border-white shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 font-bold text-sm md:text-xl border-2 border-white shadow-sm uppercase">
                              {client.customerName?.charAt(0) || 'U'}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm md:text-lg font-bold text-gray-900 truncate pr-2 group-hover:text-rose-600 transition-colors">
                            {client.customerName}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] md:text-sm text-gray-500 flex items-center">
                              <DollarSign className="w-2.5 h-2.5 md:w-3 h-3 mr-0.5" />
                              {client.transactionCount}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-[10px] md:text-sm text-gray-500 truncate">
                              {new Date(client.lastPaymentDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 md:gap-6 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-base md:text-2xl font-black text-rose-600 leading-none">${client.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                          <p className="text-[8px] md:text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Total</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-rose-400 transition-all group-hover:translate-x-1" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ClientRevenuePage;
