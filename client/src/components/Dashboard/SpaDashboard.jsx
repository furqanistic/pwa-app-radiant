import { AnimatePresence, motion } from 'framer-motion'
import {
    Activity,
    ArrowUpRight,
    BarChart3,
    Calendar,
    CheckCircle,
    Clock,
    DollarSign,
    History,
    LayoutDashboard,
    PieChart as PieIcon,
    RefreshCw,
    TrendingUp,
    UserCheck,
    Users
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import {
    Area,
    AreaChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts'

const SpaDashboard = ({ data, refetch }) => {
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [activeTab, setActiveTab] = useState('overview') 
    const { stats, analytics, liveActivity, currentBookings, spaLocation } = data

    const COLORS = ['#EC4899', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B']

    useEffect(() => {
        const interval = setInterval(() => {
            handleRefresh()
        }, 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    const handleRefresh = async () => {
        setIsRefreshing(true)
        try {
            await refetch()
        } finally {
            setIsRefreshing(false)
        }
    }

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const chartData = analytics.trendData.map(item => ({
        name: item._id.split('-').slice(1).join('/'), // Simpler date format
        bookings: item.bookings,
        revenue: item.revenue
    }))

    const serviceData = analytics.topServices.map((item, index) => ({
        name: item._id,
        value: item.count,
        color: COLORS[index % COLORS.length]
    }))

    // Sub-components for better organization
    const StatsGrid = () => (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <StatCard title="Total Clients" value={stats.totalClients} icon={Users} color="bg-blue-500" growth={stats.clientGrowth} />
            <StatCard title="Visits" value={stats.totalVisits} icon={UserCheck} color="bg-emerald-500" growth={stats.visitGrowth} />
            <StatCard title="Members" value={stats.activeMemberships} icon={TrendingUp} color="bg-violet-500" growth={stats.membershipGrowth} />
            <StatCard title="Revenue" value={`$${analytics.trendData.reduce((acc, curr) => acc + curr.revenue, 0)}`} icon={DollarSign} color="bg-amber-500" growth={stats.revenueGrowth} />
        </div>
    )

    const AnalyticsSection = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 transition-all hover:shadow-md">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-pink-50 rounded-xl">
                        <BarChart3 className="w-5 h-5 text-pink-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Execution Trend</h2>
                </div>
                <div className="h-[250px] sm:h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#EC4899" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#EC4899" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }} />
                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }} />
                            <Area type="monotone" dataKey="bookings" stroke="#EC4899" strokeWidth={3} fillOpacity={1} fill="url(#colorBookings)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center">
                <h2 className="text-xl font-bold text-gray-900 self-start mb-6">Services</h2>
                <div className="h-[200px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={serviceData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                {serviceData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                            <p className="text-xl font-black text-gray-900 leading-none">{serviceData.reduce((acc, curr) => acc + curr.value, 0)}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Total</p>
                        </div>
                    </div>
                </div>
                <div className="mt-6 space-y-2 w-full px-2">
                    {serviceData.slice(0, 3).map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs font-bold text-gray-600">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="truncate max-w-[100px]">{item.name}</span>
                            </div>
                            <span>{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )

    const ActivityFeed = () => (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-xl">
                        <Activity className="w-5 h-5 text-indigo-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
                </div>
                <span className="flex h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
            </div>
            <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                {liveActivity.map((activity) => (
                    <div key={activity._id} className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-100 to-rose-100 flex-shrink-0 flex items-center justify-center font-black text-pink-600 border-2 border-white shadow-sm overflow-hidden text-sm">
                            {activity.userId?.avatar ? <img src={activity.userId.avatar} alt="" /> : activity.userId?.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-black text-gray-900 truncate">{activity.userId?.name}</p>
                                <p className="text-[10px] text-gray-400 uppercase font-black tracking-tight">{formatDate(activity.createdAt)}</p>
                            </div>
                            <p className="text-[11px] text-gray-500 font-bold leading-tight">{activity.serviceName}</p>
                            <div className="mt-2 flex items-center justify-between">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${activity.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{activity.status}</span>
                                <span className="text-[11px] font-black text-gray-900">${activity.finalPrice}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )

    const ScheduleList = () => (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-emerald-50 rounded-xl">
                    <Calendar className="w-5 h-5 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Daily Schedule</h2>
            </div>
            <div className="space-y-4">
                {currentBookings.map((booking) => (
                    <div key={booking._id} className="flex items-center gap-4 p-4 rounded-2xl border-2 border-emerald-50 bg-white hover:bg-emerald-50/20 transition-all">
                        <div className="text-center min-w-[50px] bg-emerald-50 rounded-xl py-2">
                            <p className="text-[10px] font-black text-emerald-600 uppercase leading-none">{booking.time.split(' ')[1]}</p>
                            <p className="text-lg font-black text-gray-900 leading-none mt-1">{booking.time.split(' ')[0]}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-black text-gray-900 truncate text-sm">{booking.serviceName}</p>
                            <p className="text-xs text-gray-500 font-bold">{booking.userId?.name}</p>
                        </div>
                        <div className={`p-2 rounded-xl flex-shrink-0 ${booking.status === 'confirmed' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-100 text-gray-400'}`}>
                            <CheckCircle className="w-5 h-5" />
                        </div>
                    </div>
                ))}
                {currentBookings.length === 0 && (
                    <div className="text-center py-16">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                             <Calendar className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Everything is clear</p>
                    </div>
                )}
            </div>
        </div>
    )

    const StatCard = ({ title, value, icon: Icon, color, growth }) => (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 sm:p-3 rounded-xl ${color}`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <p className="text-xs sm:text-sm font-semibold text-gray-500 truncate">{title}</p>
            </div>
            <div className="flex items-end justify-between">
                <h3 className="text-xl sm:text-3xl font-bold text-gray-900 leading-none">{value}</h3>
                {growth !== undefined && (
                    <div className="flex items-center gap-0.5 text-green-500 font-black text-[10px] sm:text-xs bg-green-50 px-1.5 py-0.5 rounded-lg border border-green-100">
                        <ArrowUpRight className="w-3 h-3" />
                        {growth}%
                    </div>
                )}
            </div>
        </motion.div>
    )

    const TabButton = ({ id, label, icon: Icon }) => (
        <button onClick={() => setActiveTab(id)} className={`flex-1 flex flex-col items-center justify-center py-3 px-1 rounded-2xl transition-all relative ${activeTab === id ? 'text-pink-600 bg-pink-50/50' : 'text-gray-400'}`}>
            <Icon className={`w-5 h-5 mb-1 ${activeTab === id ? 'text-pink-600' : 'text-gray-400'}`} />
            <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
            {activeTab === id && <motion.div layoutId="activeTabUnderline" className="absolute bottom-1 w-8 h-1 bg-pink-500 rounded-full" />}
        </button>
    )

    return (
        <div className="space-y-6 sm:space-y-8 pb-10">
            {/* Header */}
           

            {/* Layout Wrapper */}
            <div className="relative">
                {/* Mobile Tabbed View - Only visible on small screens */}
                <div className="sm:hidden space-y-4">
                    <div className="flex bg-white/90 backdrop-blur-md rounded-2xl p-1 shadow-lg shadow-gray-100/50 border border-gray-100 sticky top-16 z-30 mb-6">
                        <TabButton id="overview" label="Hub" icon={LayoutDashboard} />
                        <TabButton id="analytics" label="Charts" icon={BarChart3} />
                        <TabButton id="activity" label="Feed" icon={History} />
                        <TabButton id="schedule" label="Today" icon={Calendar} />
                    </div>

                    <AnimatePresence mode="wait">
                        {activeTab === 'overview' && <motion.div key="ov" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><StatsGrid /></motion.div>}
                        {activeTab === 'analytics' && <motion.div key="an" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><AnalyticsSection /></motion.div>}
                        {activeTab === 'activity' && <motion.div key="ac" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><ActivityFeed /></motion.div>}
                        {activeTab === 'schedule' && <motion.div key="sc" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><ScheduleList /></motion.div>}
                    </AnimatePresence>
                </div>

                {/* Desktop View - Grid-based, shows everything */}
                <div className="hidden sm:flex flex-col gap-8">
                    <StatsGrid />
                    <AnalyticsSection />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <ActivityFeed />
                        <ScheduleList />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SpaDashboard
