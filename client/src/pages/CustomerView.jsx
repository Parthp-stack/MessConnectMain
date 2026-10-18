import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import { MessCard } from '../components/customer/MessCard';
import { PauseSubscriptionModal } from '../components/customer/PauseSubscriptionModal';
import { DigitalMealPassModal } from '../components/customer/DigitalMealPassModal';
import { CampusFlexiPassModal } from '../components/customer/CampusFlexiPassModal';
import { RoommateGroupModal } from '../components/customer/RoommateGroupModal';
import { StudentSettingsView } from '../components/customer/StudentSettingsView';
import { StudentAttendanceView } from '../components/customer/StudentAttendanceView';
import { StudentProfileModal } from '../components/customer/StudentProfileModal';
import { NotificationCenterModal } from '../components/common/NotificationCenterModal';
import {
  Home, Search, Heart, ClipboardList, Bell, User, MapPin, SlidersHorizontal,
  Star, Utensils, CheckCircle2, Pause, Play, Clock, Sparkles, Tag, Shield,
  CreditCard, ChevronRight, X, RotateCcw, AlertTriangle, RefreshCw, QrCode,
  Ticket, Users, Zap, Settings, Navigation, Megaphone, LogOut
} from 'lucide-react';
import { fetchLiveLocationZomatoStyle } from '../utils/geolocation';

export const CustomerView = ({
  onOpenDetails,
  onBookTrial,
  onSubscribe,
  onOpenLocationModal
}) => {
  const { messes, loading, filters, setFilters, userLocation, updateLocation, favorites, isUsingOfflineCache } = useApp();
  const [quickGpsLoading, setQuickGpsLoading] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [activeAnnouncements, setActiveAnnouncements] = useState([]);

  const handleQuickLiveGps = async () => {
    setQuickGpsLoading(true);
    try {
      const resolved = await fetchLiveLocationZomatoStyle();
      if (updateLocation) {
        updateLocation({
          method: 'GPS',
          area: resolved.area,
          city: resolved.city,
          pincode: resolved.pincode,
          label: resolved.label,
          coords: resolved.coords,
          landmark: resolved.landmark
        });
      }
      showToast(`Location set to: ${resolved.label}`, 'success', '📍 Live Location (Zomato-style)');
    } catch (e) {
      onOpenLocationModal();
    } finally {
      setQuickGpsLoading(false);
    }
  };
  const { currentUser, switchRole, logout } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead, showToast, requestPermission } = useNotification();

  const [activeBottomNav, setActiveBottomNav] = useState('home'); // 'home', 'discover', 'favorites', 'subscriptions', 'notifications'
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showStudentProfileModal, setShowStudentProfileModal] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedSubToPause, setSelectedSubToPause] = useState(null);
  const [selectedNotifFilter, setSelectedNotifFilter] = useState('ALL');

  // Phase 4: Payment History & Passes State
  const [passesTab, setPassesTab] = useState('active'); // 'active' | 'payments'
  const [userPayments, setUserPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paySearchQuery, setPaySearchQuery] = useState('');
  const [payFilterStatus, setPayFilterStatus] = useState('ALL');

  // Feature 1 & Phase 3 modal states
  const [showPassModal, setShowPassModal] = useState(false);
  const [selectedMessForPass, setSelectedMessForPass] = useState(null);
  const [showFlexiModal, setShowFlexiModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Load subscriptions
  const fetchSubscriptions = async () => {
    if (!currentUser?.id) {
      setSubscriptions([]);
      return;
    }
    try {
      const res = await api.getSubscriptions(currentUser.id);
      if (res && res.subscriptions) {
        setSubscriptions(res.subscriptions);
      } else {
        setSubscriptions([]);
      }
    } catch (e) {
      console.warn('[CustomerView] Failed to fetch subscriptions:', e);
    }
  };

  // Load student payments (Phase 4)
  const fetchPayments = async () => {
    if (!currentUser?.id) {
      setUserPayments([]);
      return;
    }
    setLoadingPayments(true);
    try {
      const res = await api.getUserPayments(currentUser.id);
      if (res && res.payments) {
        setUserPayments(res.payments);
      } else {
        setUserPayments([]);
      }
    } catch (e) {
      console.warn('[CustomerView] Failed to fetch payments:', e);
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    fetchPayments();

    const handlePaymentEvent = () => {
      fetchSubscriptions();
      fetchPayments();
    };
    window.addEventListener('messconnect:payment-success', handlePaymentEvent);
    return () => window.removeEventListener('messconnect:payment-success', handlePaymentEvent);
  }, [currentUser]);

  // Handle renewal subscription checkout
  const handleRenewSubscription = (sub) => {
    const targetMess = messes.find(m => m.id === sub.messId) || {
      id: sub.messId,
      name: sub.messName || 'My Mess',
      plans: [{ id: sub.planId, name: sub.planName, price: sub.amount }]
    };
    const plan = {
      id: sub.planId,
      name: sub.planName || 'Monthly Plan',
      price: sub.amount,
      durationDays: sub.totalDays || 30
    };
    onSubscribe(targetMess, plan, { isRenewal: true, subscriptionId: sub.id });
  };

  // Resume subscription
  const handleResumeSubscription = async (subId) => {
    try {
      const res = await api.resumeSubscription(subId);
      if (res && res.success) {
        showToast('Your subscription is now active! Enjoy your hot meals.', 'success', '▶️ Meals Resumed');
        fetchSubscriptions();
      }
    } catch (e) {
      showToast('Failed to resume subscription', 'error');
    }
  };

  // Filter chips on home (Pune student hubs)
  const quickFilters = [
    { label: 'All Pune Messes', key: 'all' },
    { label: 'Kothrud 📍', key: 'kothrud' },
    { label: 'Karve Nagar 📍', key: 'karve' },
    { label: 'Alandi (MITAOE) 📍', key: 'alandi' },
    { label: 'Pure Veg 🥗', key: 'veg' },
    { label: 'Top Rated ⭐ 4.5+', key: 'rating' },
    { label: 'Budget (≤₹2800)', key: 'budget' },
    { label: 'Trial Available 🍲', key: 'trial' }
  ];

  const handleQuickFilterClick = (key) => {
    if (key === 'all') {
      setFilters(prev => ({ ...prev, area: '', isPureVeg: false, minRating: '', maxPrice: '', trialAvailable: false }));
    } else if (key === 'kothrud') {
      setFilters(prev => ({ ...prev, area: prev.area === 'Kothrud' ? '' : 'Kothrud' }));
    } else if (key === 'karve') {
      setFilters(prev => ({ ...prev, area: prev.area === 'Karve Nagar' ? '' : 'Karve Nagar' }));
    } else if (key === 'alandi') {
      setFilters(prev => ({ ...prev, area: prev.area === 'Alandi' ? '' : 'Alandi' }));
    } else if (key === 'veg') {
      setFilters(prev => ({ ...prev, isPureVeg: !prev.isPureVeg }));
    } else if (key === 'rating') {
      setFilters(prev => ({ ...prev, minRating: prev.minRating ? '' : '4.5' }));
    } else if (key === 'budget') {
      setFilters(prev => ({ ...prev, maxPrice: prev.maxPrice ? '' : '2800' }));
    } else if (key === 'trial') {
      setFilters(prev => ({ ...prev, trialAvailable: !prev.trialAvailable }));
    }
  };

  // Favorite messes
  const favoriteMesses = messes.filter(m => favorites.includes(m.id));

  // Offers loaded dynamically from real broadcasts
  const [offersList, setOffersList] = useState([]);

  useEffect(() => {
    const loadOffers = async () => {
      try {
        const res = await api.getOffers();
        if (res && res.offers) {
          setOffersList(res.offers);
        }
      } catch (e) {
        console.warn('[CustomerView] Error fetching offers:', e);
      }
    };
    loadOffers();
  }, []);

  // Phase 6: Load Active Announcements & Mess Broadcasts (Maintenance notices permanently filtered)
  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const res = await api.getAnnouncements({ status: 'ACTIVE' });
        if (res && res.announcements) {
          const relevant = res.announcements.filter(a => {
            // Permanently filter out any maintenance notices
            if (a.title?.toLowerCase().includes('maintenance') || a.message?.toLowerCase().includes('maintenance')) {
              return false;
            }
            if (a.target === 'ALL_STUDENTS') return true;
            if (a.target === 'SPECIFIC_USER' && a.targetId === currentUser?.id) return true;
            if (a.target === 'SPECIFIC_MESS' && subscriptions.some(s => (s.messId === a.targetId || s.messId === a.messId) && s.status === 'ACTIVE')) return true;
            if (a.messId && subscriptions.some(s => s.messId === a.messId && s.status === 'ACTIVE')) return true;
            return false;
          });
          setActiveAnnouncements(relevant);
        }
      } catch (err) {
        console.warn('[CustomerView] Failed to load announcements:', err);
      }
    };
    loadAnnouncements();
  }, [currentUser, subscriptions]);

  // Listen for open profile events
  useEffect(() => {
    const handleOpenProfileEvent = () => setShowStudentProfileModal(true);
    window.addEventListener('messconnect:open-student-profile', handleOpenProfileEvent);
    return () => window.removeEventListener('messconnect:open-student-profile', handleOpenProfileEvent);
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800">
      
      {/* DESKTOP RESPONSIVE WORKABLE NAVIGATION BAR (Compact & Guaranteed Visible on All Screens) */}
      <header className="hidden md:flex items-center justify-between px-3 sm:px-4 lg:px-6 py-2 bg-white border-b border-slate-200 shrink-0 shadow-2xs sticky top-0 z-30 w-full overflow-hidden">
        
        {/* Left: Campus Location & Live GPS */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onOpenLocationModal}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-xs text-slate-700 transition border border-slate-200 shadow-2xs cursor-pointer shrink-0"
            title="Change Dining Area"
          >
            <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            <span className="font-bold text-slate-900 max-w-[110px] xl:max-w-[140px] truncate">{userLocation.label}</span>
            <span className="text-[10px] text-orange-600 font-bold underline shrink-0">Change</span>
          </button>

          <button
            onClick={handleQuickLiveGps}
            disabled={quickGpsLoading}
            title="Fetch live location via GPS"
            className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-orange-50 hover:bg-orange-100 text-orange-700 transition border border-orange-200 text-[11px] font-bold shadow-2xs cursor-pointer shrink-0"
          >
            <Navigation className={`w-3 h-3 ${quickGpsLoading ? 'animate-spin' : ''}`} />
            <span className="hidden xl:inline">{quickGpsLoading ? 'Locating...' : 'GPS'}</span>
          </button>
        </div>

        {/* Center: Workable Compact Navigation Menu */}
        <nav className="flex items-center gap-0.5 bg-slate-100/90 p-1 rounded-2xl border border-slate-200 text-xs font-semibold shrink min-w-0">
          {[
            { key: 'home', label: 'Explore', icon: Home },
            { key: 'discover', label: 'Search', icon: Search },
            { key: 'attendance', label: 'Attendance', icon: CheckCircle2 },
            { key: 'subscriptions', label: 'Passes', icon: ClipboardList, badge: subscriptions.filter(s => s.status === 'ACTIVE').length },
            { key: 'favorites', label: 'Favorites', icon: Heart, badge: favoriteMesses.length },
            { key: 'notifications', label: 'Alerts', icon: Bell, badge: unreadCount },
            { key: 'settings', label: 'Settings', icon: Settings }
          ].map(item => {
            const Icon = item.icon;
            const isActive = activeBottomNav === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveBottomNav(item.key)}
                className={`flex items-center gap-1 px-2 lg:px-2.5 py-1.5 rounded-xl transition cursor-pointer select-none whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-white text-orange-600 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden lg:inline">{item.label}</span>
                {item.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-orange-600 text-white text-[9px] font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Quick Passes & Interactive Student Profile (Guaranteed On-Screen) */}
        <div className="flex items-center gap-1.5 lg:gap-2 shrink-0">
          
          {/* Today's Meal Pass Button */}
          <button
            onClick={() => setShowPassModal(true)}
            className="flex items-center gap-1 px-2.5 lg:px-3 py-1.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition cursor-pointer shrink-0"
            title="Open Today's QR Meal Pass"
          >
            <QrCode className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xl:inline">Today's</span>
            <span>Pass</span>
          </button>

          {/* Quick Passes (Only on large monitors to avoid pushing profile picture) */}
          <div className="hidden 2xl:flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowFlexiModal(true)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition cursor-pointer shrink-0"
              title="Campus FlexiPass"
            >
              <Ticket className="w-3 h-3" />
              <span>Flexi</span>
            </button>

            <button
              onClick={() => setShowGroupModal(true)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition cursor-pointer shrink-0"
              title="Roommate Mess Pod"
            >
              <Users className="w-3 h-3" />
              <span>Pod</span>
            </button>
          </div>

          {/* Notifications Bell */}
          <button
            onClick={() => setShowNotifModal(true)}
            className="relative p-2 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition cursor-pointer shrink-0"
            title="Open Notifications"
          >
            <Bell className="w-4 h-4 text-orange-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-orange-600 text-white text-[9px] font-bold">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Interactive Student Profile Trigger - ALWAYS VISIBLE ON RIGHT EDGE */}
          <div
            onClick={() => setShowStudentProfileModal(true)}
            className="flex items-center gap-1.5 pl-2 border-l border-slate-200 cursor-pointer group select-none hover:opacity-90 transition shrink-0"
            title="Click to view & change profile photo and name"
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-orange-500/40 group-hover:border-orange-600 transition flex items-center justify-center bg-orange-100 text-sm shrink-0 shadow-2xs">
              {currentUser?.avatar && currentUser.avatar.length <= 4 ? (
                <span>{currentUser.avatar}</span>
              ) : (
                <img
                  src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                  alt={currentUser?.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <div className="text-left hidden lg:block text-xs shrink-0">
              <div className="font-bold text-slate-900 leading-tight group-hover:text-orange-600 transition flex items-center gap-1">
                <span className="max-w-[80px] xl:max-w-[120px] truncate">{currentUser?.name || 'Student'}</span>
                <span className="text-[10px] text-orange-600 underline font-semibold">Edit</span>
              </div>
              <div className="text-[10px] text-slate-400">Student Profile</div>
            </div>
          </div>

        </div>
      </header>

      {/* MOBILE APP HEADER (Visible only on mobile) */}
      <header className="md:hidden px-4 pt-3 pb-2.5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 shadow-xs sticky top-0 z-30">
        <div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenLocationModal}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition"
            >
              <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span className="font-bold text-slate-900 truncate max-w-[150px]">{userLocation.label}</span>
              <span className="text-[10px] text-orange-600 font-semibold underline ml-0.5">Change</span>
            </button>
            <button
              onClick={handleQuickLiveGps}
              disabled={quickGpsLoading}
              title="Live GPS Location"
              className="p-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200"
            >
              <Navigation className={`w-3 h-3 ${quickGpsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="text-[10px] text-orange-600 font-semibold mt-0.5">MITAOE Alandi Edition • Verified Messes</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotifModal(true)}
            className="relative p-1.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border border-white"></span>
            )}
          </button>

          <button
            onClick={() => setShowPassModal(true)}
            className="p-1.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200"
            title="Today's Meal Pass"
          >
            <QrCode className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowStudentProfileModal(true)}
            className="relative w-8 h-8 rounded-full overflow-hidden border border-orange-500/40 shadow-xs cursor-pointer"
            title="Edit Student Profile"
          >
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
              alt={currentUser?.name}
              className="w-full h-full object-cover"
            />
          </button>
        </div>
      </header>

      {/* Main Scrollable Body */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-12 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8">
        
        {/* ================= TAB 1: HOME ================= */}
        {activeBottomNav === 'home' && (
          <div className="p-5 space-y-5 animate-in fade-in duration-150">
            {/* Greeting */}
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Welcome, {currentUser?.name || 'Student'} 👋</h2>
              <p className="text-xs text-slate-500">Find your perfect mess near college</p>
            </div>

            {/* Search Bar (Section 7) */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Pune messes by name, locality (e.g. Kailash Mess, Kothrud, Karve Nagar)..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs shadow-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            {/* Phase 6: Active Campus & Mess Announcements */}
            {activeAnnouncements.length > 0 && (
              <div className="space-y-2">
                {activeAnnouncements.map(ann => (
                  <div
                    key={ann.id}
                    className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-300 text-slate-800 text-xs flex items-start justify-between gap-3 shadow-2xs animate-in slide-in-from-top-2"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 font-bold mt-0.5">
                        📢
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900">{ann.title}</span>
                          <span className="px-1.5 py-0.2 rounded-md bg-amber-200/60 text-amber-900 text-[9px] font-bold">
                            {ann.createdByName || 'Mess Notice'}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">{ann.message}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveAnnouncements(prev => prev.filter(a => a.id !== ann.id))}
                      className="text-slate-400 hover:text-slate-600 font-bold p-1 shrink-0 cursor-pointer"
                      title="Dismiss notice"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Phase 4: Active Subscription Widget (Section 9, 10, 11) */}
            {Array.isArray(subscriptions) && subscriptions.length > 0 ? (
              (() => {
                const currentSub = subscriptions.find(s => s?.status === 'ACTIVE') || subscriptions.find(s => s?.status === 'PAUSED') || subscriptions[0];
                if (!currentSub) return null;
                const daysLeft = currentSub.endDate ? Math.ceil((new Date(currentSub.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
                const isExpiringSoon = currentSub.status === 'ACTIVE' && daysLeft <= 5;
                const isExpired = currentSub.status === 'EXPIRED' || daysLeft <= 0;

                return (
                  <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl space-y-3.5 relative overflow-hidden border border-indigo-900/40">
                    {/* Header Bar */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-black tracking-widest text-indigo-300">
                          Active Subscription
                        </span>
                        {currentSub.status === 'ACTIVE' && !isExpired ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold tracking-wider flex items-center gap-1 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                            🟢 ACTIVE
                          </span>
                        ) : isExpired ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-extrabold tracking-wider flex items-center gap-1 border border-rose-500/30">
                            🔴 EXPIRED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold tracking-wider flex items-center gap-1 border border-amber-500/30">
                            ⏸️ {currentSub.status}
                          </span>
                        )}
                      </div>

                      {currentSub.status === 'ACTIVE' && !isExpired && (
                        <span className="font-mono text-xs text-amber-400 font-black tracking-wide">
                          PIN: {currentSub.token || 'Active'}
                        </span>
                      )}
                    </div>

                    {/* Mess Details & Price */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black text-base text-white tracking-tight">{currentSub.messName}</h3>
                        <p className="text-xs text-indigo-200 font-medium mt-0.5">
                          {currentSub.planName || 'Monthly Plan'} • ₹{currentSub.amount}/month
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Started: {currentSub.startDate || 'N/A'}</div>
                        <div className={`text-xs font-bold ${isExpired ? 'text-rose-400' : isExpiringSoon ? 'text-amber-400' : 'text-emerald-400'}`}>
                          Expires: {currentSub.endDate || 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Expiration or Renewal Alert Banner */}
                    {(isExpiringSoon || isExpired) && (
                      <div className={`p-3 rounded-2xl flex items-center justify-between gap-3 text-xs border ${
                        isExpired
                          ? 'bg-rose-950/60 border-rose-800/60 text-rose-200'
                          : 'bg-amber-950/60 border-amber-800/60 text-amber-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                          <span className="text-[11px] font-semibold">
                            {isExpired
                              ? 'Subscription expired. Renew to unlock daily meals.'
                              : `Subscription expires in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}.`}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRenewSubscription(currentSub)}
                          className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-[11px] transition shrink-0 shadow-md flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Renew</span>
                        </button>
                      </div>
                    )}

                    {/* Quick Access Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      {currentSub.status === 'ACTIVE' && !isExpired ? (
                        <>
                          <button
                            onClick={() => setActiveBottomNav('attendance')}
                            className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Scan QR Attendance</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedMessForPass(currentSub.messId);
                              setShowPassModal(true);
                            }}
                            className="flex-1 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 border border-white/10"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Meal Pass</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleRenewSubscription(currentSub)}
                          className="w-full py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>Renew Subscription (Extend Validity)</span>
                        </button>
                      )}
                    </div>

                    {/* Innovation Shortcuts: Campus FlexiPass & Mess Pods */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
                      <button
                        onClick={() => setShowFlexiModal(true)}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-left transition flex items-center gap-2"
                      >
                        <Ticket className="w-4 h-4 text-amber-400 shrink-0" />
                        <div className="truncate">
                          <div className="font-bold text-[11px] text-white">Campus FlexiPass</div>
                          <div className="text-[9px] text-slate-300">Multi-mess dining pass</div>
                        </div>
                      </button>

                      <button
                        onClick={() => setShowGroupModal(true)}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-left transition flex items-center gap-2"
                      >
                        <Users className="w-4 h-4 text-purple-300 shrink-0" />
                        <div className="truncate">
                          <div className="font-bold text-[11px] text-white">Roommate Pods</div>
                          <div className="text-[9px] text-emerald-300 font-semibold">Group meal savings</div>
                        </div>
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-lg space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                    <QrCode className="w-3 h-3 text-orange-400" />
                    Digital QR Meal Pass
                  </span>
                  <span className="text-[10px] text-orange-400 font-medium">Ready to Enroll</span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-white">No Active Meal Pass</h3>
                    <p className="text-[11px] text-slate-300">Subscribe to any verified mess below to activate your meal QR.</p>
                  </div>
                  <button
                    onClick={() => {
                      const el = document.getElementById('messes-list-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-3.5 py-2 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm shadow-orange-500/30"
                  >
                    <Utensils className="w-3.5 h-3.5" />
                    <span>Browse</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
                  <button
                    onClick={() => setShowFlexiModal(true)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-left transition flex items-center gap-2"
                  >
                    <Ticket className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="truncate">
                      <div className="font-bold text-[11px] text-white">Campus FlexiPass</div>
                      <div className="text-[9px] text-slate-300">Multi-mess dining pass</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowGroupModal(true)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-left transition flex items-center gap-2"
                  >
                    <Users className="w-4 h-4 text-purple-300 shrink-0" />
                    <div className="truncate">
                      <div className="font-bold text-[11px] text-white">Roommate Pods</div>
                      <div className="text-[9px] text-emerald-300 font-semibold">Group discounts</div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Quick Filter Horizontal Chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {quickFilters.map((qf) => {
                const isActive =
                  (qf.key === 'all' && !filters.area && !filters.isPureVeg && !filters.minRating && !filters.maxPrice && !filters.trialAvailable) ||
                  (qf.key === 'kothrud' && filters.area === 'Kothrud') ||
                  (qf.key === 'karve' && filters.area === 'Karve Nagar') ||
                  (qf.key === 'alandi' && filters.area === 'Alandi') ||
                  (qf.key === 'veg' && filters.isPureVeg) ||
                  (qf.key === 'rating' && filters.minRating === '4.5') ||
                  (qf.key === 'budget' && filters.maxPrice === '2800') ||
                  (qf.key === 'trial' && filters.trialAvailable);

                return (
                  <button
                    key={qf.key}
                    onClick={() => handleQuickFilterClick(qf.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition border ${
                      isActive
                        ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {qf.label}
                  </button>
                );
              })}
            </div>

            {/* Offers Near You (Section 7) */}
            {offersList.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-orange-600" />
                    <span>Offers Near You</span>
                  </h3>
                  <span className="text-[10px] text-orange-600 font-semibold">Verified Deals</span>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                  {offersList.map(off => (
                    <div
                      key={off.id}
                      className="min-w-[240px] p-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="text-[10px] font-medium text-orange-100 uppercase tracking-wider">{off.messName || off.mess}</div>
                        <div className="text-sm font-bold mt-0.5">{off.title}</div>
                        {off.description && <p className="text-[11px] text-orange-100 mt-1 line-clamp-1">{off.description}</p>}
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-xs font-mono font-bold text-[10px]">
                          {off.code ? `CODE: ${off.code}` : 'PROMO'}
                        </span>
                        <span className="font-extrabold">{off.discountPercent ? `${off.discountPercent}% OFF` : (off.discount || 'Special Deal')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Messes List (Section 7 Cards) */}
            <div id="messes-list-section">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {filters.area ? `Messes in ${filters.area}` : 'Registered Messes'} ({messes.length})
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {filters.area ? `Verified Kitchens in ${filters.area}` : `Verified Messes near ${userLocation.label}`}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Registered Partners Only
                </span>
              </div>

              {loading ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2].map(n => (
                    <div key={n} className="h-56 bg-slate-200 rounded-3xl"></div>
                  ))}
                </div>
              ) : messes.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 text-xs text-slate-500 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
                    <Utensils className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">No registered mess found in this area</p>
                    <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
                      MessConnect only displays authentic messes that are verified and registered through our platform.
                    </p>
                  </div>
                  <button
                    onClick={() => handleQuickFilterClick('all')}
                    className="px-4 py-2 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 transition"
                  >
                    View All Registered Messes
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {messes.map(mess => (
                    <MessCard
                      key={mess.id}
                      mess={mess}
                      onOpenDetails={onOpenDetails}
                      onBookTrial={onBookTrial}
                      onSubscribe={onSubscribe}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: DISCOVER ================= */}
        {activeBottomNav === 'discover' && (
          <div className="p-5 space-y-4 animate-in fade-in duration-150">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Discover Messes</h2>
              <p className="text-xs text-slate-500">Filter by meal timings, budget, and ratings</p>
            </div>

            {/* Multi-criteria filter controls (Section 24) */}
            <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-xs space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1 text-[11px]">Meal Timing</label>
                  <select
                    value={filters.meal || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, meal: e.target.value }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="">All Timings</option>
                    <option value="breakfast">Breakfast Available</option>
                    <option value="lunch">Lunch Available</option>
                    <option value="dinner">Dinner Available</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-600 block mb-1 text-[11px]">Sort By</label>
                  <select
                    value={filters.sort || 'popular'}
                    onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="popular">Most Popular</option>
                    <option value="rating">Highest Rated ★</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="nearest">Nearest Distance</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, isPureVeg: !prev.isPureVeg }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${
                    filters.isPureVeg ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  Pure Veg Only
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, trialAvailable: !prev.trialAvailable }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${
                    filters.trialAvailable ? 'bg-orange-50 text-orange-800 border-orange-300' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  Trial Meal (₹60-80)
                </button>
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {messes.map(mess => (
                <MessCard
                  key={mess.id}
                  mess={mess}
                  onOpenDetails={onOpenDetails}
                  onBookTrial={onBookTrial}
                  onSubscribe={onSubscribe}
                />
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB: ATTENDANCE ================= */}
        {activeBottomNav === 'attendance' && (
          <StudentAttendanceView onNavigateToMesses={() => setActiveBottomNav('home')} />
        )}

        {/* ================= TAB 3: FAVORITES ================= */}
        {activeBottomNav === 'favorites' && (
          <div className="p-5 space-y-4 animate-in fade-in duration-150">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Saved Messes ({favoriteMesses.length})</h2>
              <p className="text-xs text-slate-500">Stored locally in Room / IndexedDB for offline quick access</p>
            </div>

            {favoriteMesses.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 space-y-2">
                <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
                  <Heart className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-slate-800">No Favorites Yet</h4>
                <p className="text-xs text-slate-400">Tap the heart icon on any mess card to save it here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {favoriteMesses.map(mess => (
                  <MessCard
                    key={mess.id}
                    mess={mess}
                    onOpenDetails={onOpenDetails}
                    onBookTrial={onBookTrial}
                    onSubscribe={onSubscribe}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: SUBSCRIPTIONS & PAYMENT HISTORY (PHASE 4) ================= */}
        {activeBottomNav === 'subscriptions' && (
          <div className="p-5 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Passes & Payments</h2>
                <p className="text-xs text-slate-500">Manage your active meal passes, validity, and verified payment history</p>
              </div>
              <button
                onClick={() => {
                  fetchSubscriptions();
                  fetchPayments();
                }}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Top Sub-Navigation Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button
                onClick={() => setPassesTab('active')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  passesTab === 'active'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Utensils className="w-3.5 h-3.5 text-orange-600" />
                <span>Active Passes ({subscriptions.filter(s => s.status === 'ACTIVE').length})</span>
              </button>
              <button
                onClick={() => {
                  setPassesTab('payments');
                  fetchPayments();
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  passesTab === 'payments'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                <span>Payment History 💳 ({userPayments.length})</span>
              </button>
            </div>

            {/* Innovation Banners: Multi-Mess FlexiPass & Mess Pods */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowFlexiModal(true)}
                className="p-3 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100/70 border border-indigo-200 text-left transition hover:border-indigo-300 shadow-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">Multi-Mess</span>
                  <Ticket className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="font-bold text-xs text-indigo-950">Campus FlexiPass</div>
                <div className="text-[10px] text-indigo-600 mt-0.5">24 meals left • 6 messes</div>
              </button>

              <button
                onClick={() => setShowGroupModal(true)}
                className="p-3 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100/70 border border-purple-200 text-left transition hover:border-purple-300 shadow-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase text-purple-700 tracking-wider">Mess Pod</span>
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <div className="font-bold text-xs text-purple-950">Roommate Squad</div>
                <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">12% OFF • 3 Flatmates</div>
              </button>
            </div>

            {/* SUB-VIEW 1: ACTIVE PASSES */}
            {passesTab === 'active' && (
              <>
                {subscriptions.length === 0 ? (
                  <div className="p-10 text-center bg-white rounded-3xl border border-slate-100 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
                      <ClipboardList className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-800">No Active Subscriptions</h4>
                    <p className="text-xs text-slate-400">Choose a mess and subscribe to start receiving delicious daily meals.</p>
                    <button
                      onClick={() => setActiveBottomNav('home')}
                      className="px-4 py-2 bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs"
                    >
                      Explore Nearby Messes
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {subscriptions.map(sub => {
                      const daysLeft = sub.endDate ? Math.ceil((new Date(sub.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
                      const isExpiringSoon = sub.status === 'ACTIVE' && daysLeft <= 5;
                      const isExpired = sub.status === 'EXPIRED' || daysLeft <= 0;

                      return (
                        <div
                          key={sub.id}
                          className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">{sub.messName}</span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    sub.status === 'ACTIVE' && !isExpired
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : isExpired || sub.status === 'EXPIRED'
                                      ? 'bg-rose-100 text-rose-800'
                                      : sub.status === 'PAUSED'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-800'
                                  }`}
                                >
                                  {sub.status === 'ACTIVE' && !isExpired ? 'ACTIVE' : isExpired ? 'EXPIRED' : sub.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">{sub.planName || 'Monthly Plan'} • ₹{sub.amount}/mo</p>
                            </div>

                            <div className="text-right">
                              <div className="text-xs font-bold text-slate-900">Valid Till</div>
                              <div className={`text-[11px] font-semibold ${isExpired ? 'text-rose-600' : isExpiringSoon ? 'text-amber-600' : 'text-orange-600'}`}>
                                {sub.endDate}
                              </div>
                            </div>
                          </div>

                          {/* Primary Action: Show Anti-Proxy QR Pass */}
                          {sub.status === 'ACTIVE' && !isExpired && (
                            <button
                              onClick={() => {
                                setSelectedMessForPass(sub.messId);
                                setShowPassModal(true);
                              }}
                              className="w-full py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm shadow-orange-500/20"
                            >
                              <QrCode className="w-4 h-4" />
                              <span>Show Digital Meal Pass (QR & PIN)</span>
                            </button>
                          )}

                          {/* Renewal Action if Expired or Expiring Soon */}
                          {(isExpiringSoon || isExpired) && (
                            <button
                              onClick={() => handleRenewSubscription(sub)}
                              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm shadow-orange-500/20"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Renew Subscription ({sub.planName || 'Monthly'})</span>
                            </button>
                          )}

                          {/* Days Tracking Breakdown */}
                          <div className="grid grid-cols-4 gap-2 text-center text-xs">
                            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                              <div className="text-[10px] text-slate-400">Total</div>
                              <div className="font-bold text-slate-900">{sub.totalDays || 30}d</div>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                              <div className="text-[10px] text-slate-400">Active</div>
                              <div className="font-bold text-slate-900">{sub.activeDays || 15}d</div>
                            </div>
                            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
                              <div className="text-[10px] text-amber-800">Paused</div>
                              <div className="font-bold text-amber-900">{sub.pausedDays || 0}d</div>
                            </div>
                            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                              <div className="text-[10px] text-emerald-800">Remaining</div>
                              <div className="font-bold text-emerald-900">{sub.remainingDays !== undefined ? sub.remainingDays : Math.max(0, daysLeft)}d</div>
                            </div>
                          </div>

                          {/* Pause Record Alert if Paused */}
                          {sub.status === 'PAUSED' && sub.pauses && sub.pauses.length > 0 && (
                            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                              <div>
                                <div className="font-bold">Meals currently on pause</div>
                                <div className="text-[11px] text-amber-700">Reason: {sub.pauses[sub.pauses.length - 1].reason}</div>
                              </div>
                              <button
                                onClick={() => handleResumeSubscription(sub.id)}
                                className="px-3 py-1.5 rounded-xl bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 shadow-xs"
                              >
                                Resume Now
                              </button>
                            </div>
                          )}

                          {/* Actions: Pause or Resume */}
                          <div className="flex gap-2 pt-2 border-t border-slate-100">
                            {sub.status === 'ACTIVE' && !isExpired ? (
                              <button
                                onClick={() => setSelectedSubToPause(sub)}
                                className="flex-1 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition border border-amber-200 flex items-center justify-center gap-1.5"
                              >
                                <Pause className="w-3.5 h-3.5" />
                                <span>Pause Meals</span>
                              </button>
                            ) : sub.status === 'PAUSED' ? (
                              <button
                                onClick={() => handleResumeSubscription(sub.id)}
                                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5"
                              >
                                <Play className="w-3.5 h-3.5" />
                                <span>Resume Subscription</span>
                              </button>
                            ) : null}

                            <button
                              onClick={() => onOpenDetails(sub.messId, 'menu')}
                              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition text-center"
                            >
                              View Menu
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* SUB-VIEW 2: PAYMENT HISTORY (SECTION 8) */}
            {passesTab === 'payments' && (
              <div className="space-y-4">
                {/* Search & Filters */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by mess, plan, or receipt ID..."
                      value={paySearchQuery}
                      onChange={(e) => setPaySearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs shadow-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>

                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {['ALL', 'SUCCESS', 'PENDING', 'FAILED', 'REFUNDED'].map(st => (
                      <button
                        key={st}
                        onClick={() => setPayFilterStatus(st)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition border ${
                          payFilterStatus === st
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {st === 'ALL' ? 'All Payments' : st === 'SUCCESS' ? 'Successful' : st.charAt(0) + st.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {loadingPayments ? (
                  <div className="space-y-3 animate-pulse">
                    {[1, 2, 3].map(n => (
                      <div key={n} className="h-28 bg-slate-100 rounded-3xl"></div>
                    ))}
                  </div>
                ) : (() => {
                  const filteredPayments = userPayments.filter(p => {
                    const matchesSearch = !paySearchQuery ||
                      (p.messName && p.messName.toLowerCase().includes(paySearchQuery.toLowerCase())) ||
                      (p.planName && p.planName.toLowerCase().includes(paySearchQuery.toLowerCase())) ||
                      (p.paymentId && p.paymentId.toLowerCase().includes(paySearchQuery.toLowerCase())) ||
                      (p.orderId && p.orderId.toLowerCase().includes(paySearchQuery.toLowerCase())) ||
                      (p.receiptNumber && p.receiptNumber.toLowerCase().includes(paySearchQuery.toLowerCase()));

                    const matchesStatus = payFilterStatus === 'ALL' ||
                      (p.status && p.status.toUpperCase() === payFilterStatus);

                    return matchesSearch && matchesStatus;
                  });

                  if (filteredPayments.length === 0) {
                    return (
                      <div className="p-10 text-center bg-white rounded-3xl border border-slate-100 space-y-2">
                        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                          <CreditCard className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-sm text-slate-800">No Payment Records Found</h4>
                        <p className="text-xs text-slate-400">
                          {paySearchQuery || payFilterStatus !== 'ALL'
                            ? 'No transactions matched your search or status filter.'
                            : 'Your completed meal pass subscriptions and renewals will appear here.'}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {filteredPayments.map(p => (
                        <div
                          key={p.id}
                          className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-900 text-sm">{p.messName || 'Mess Partner'}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                  p.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' :
                                  p.status === 'REFUNDED' || p.status === 'PARTIALLY_REFUNDED' ? 'bg-purple-100 text-purple-800' :
                                  p.status === 'FAILED' ? 'bg-rose-100 text-rose-800' :
                                  'bg-amber-100 text-amber-800'
                                }`}>
                                  {p.status === 'SUCCESS' ? '✅ Successful' :
                                   p.status === 'REFUNDED' ? '↩️ Refunded' :
                                   p.status === 'PARTIALLY_REFUNDED' ? '↩️ Partial Refund' :
                                   p.status === 'FAILED' ? '❌ Failed' : '⏳ Pending'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 font-medium">{p.planName || 'Monthly Meal Subscription'}</p>
                            </div>

                            <div className="text-right">
                              <div className="text-sm font-black text-slate-900">₹{p.amount?.toLocaleString('en-IN') || 0}</div>
                              <div className="text-[10px] text-slate-400">
                                {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                              </div>
                            </div>
                          </div>

                          {/* Sanitized Receipt Details */}
                          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100/80 text-[11px] grid grid-cols-2 gap-2 text-slate-600">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Payment ID:</span>
                              <span className="font-mono font-bold text-slate-800 text-[10px] truncate block">{p.paymentId || 'Processing'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Receipt #:</span>
                              <span className="font-mono font-bold text-slate-800 text-[10px] truncate block">{p.receiptNumber || p.orderId || 'N/A'}</span>
                            </div>
                            {p.subscriptionStartDate && p.subscriptionEndDate && (
                              <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                                <span className="text-slate-400">Subscription Period:</span>
                                <span className="font-semibold text-slate-700">{p.subscriptionStartDate} to {p.subscriptionEndDate}</span>
                              </div>
                            )}
                          </div>

                          {p.status === 'FAILED' && (
                            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between">
                              <span className="text-[11px]">Payment verification failed or gateway cancelled.</span>
                              <button
                                onClick={() => setActiveBottomNav('home')}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[10px]"
                              >
                                Retry
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 5: NOTIFICATIONS ================= */}
        {activeBottomNav === 'notifications' && (
          <div className="p-5 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
                <p className="text-xs text-slate-500">Meal reminders, trial approvals & offers</p>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-orange-600 font-semibold hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification Channels Chips (Section 11) */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {['ALL', 'Meals', 'Subscriptions', 'Trials', 'Offers'].map(ch => (
                <button
                  key={ch}
                  onClick={() => setSelectedNotifFilter(ch)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                    selectedNotifFilter === ch
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="space-y-2.5">
              {notifications
                .filter(n => selectedNotifFilter === 'ALL' || n.channel?.toLowerCase() === selectedNotifFilter.toLowerCase())
                .map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => markRead(notif.id)}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                      notif.read ? 'bg-white border-slate-100 text-slate-600' : 'bg-orange-50/50 border-orange-200 text-slate-900'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                      <Bell className="w-4 h-4 text-orange-600" />
                    </div>

                    <div className="flex-1 text-xs">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-slate-900">{notif.title}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">{notif.time || 'Today'}</span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-1 leading-relaxed">{notif.message}</p>
                    </div>

                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-orange-600 shrink-0 mt-1.5"></span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ================= TAB 6: SETTINGS ================= */}
        {activeBottomNav === 'settings' && (
          <div className="pt-4 animate-in fade-in duration-150">
            <StudentSettingsView
              onTriggerPauseModal={(sub) => setSelectedSubToPause(sub)}
              subscriptions={subscriptions}
            />
          </div>
        )}
      </main>

      {/* Pause Modal */}
      {selectedSubToPause && (
        <PauseSubscriptionModal
          subscription={selectedSubToPause}
          isOpen={Boolean(selectedSubToPause)}
          onClose={() => setSelectedSubToPause(null)}
          onSuccess={fetchSubscriptions}
        />
      )}

      {/* Profile & Settings Drawer (Section 35) */}
      {showProfileDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xs bg-white h-full shadow-2xl p-5 overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900">App Settings</h3>
                <button onClick={() => setShowProfileDrawer(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Student Info */}
              <div
                onClick={() => {
                  setShowProfileDrawer(false);
                  setShowStudentProfileModal(true);
                }}
                className="flex items-center gap-3 p-3 rounded-2xl bg-orange-50/60 border border-orange-200/80 cursor-pointer hover:bg-orange-50 transition"
                title="Click to edit profile & photo"
              >
                <img
                  src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                  alt={currentUser?.name}
                  className="w-12 h-12 rounded-full object-cover shrink-0"
                />
                <div className="text-xs min-w-0">
                  <div className="font-bold text-slate-900 truncate flex items-center gap-1">
                    <span>{currentUser?.name}</span>
                    <span className="text-[10px] text-orange-600 underline font-semibold">Edit</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{currentUser?.college}</div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-semibold mt-1 inline-block">
                    Student Account
                  </span>
                </div>
              </div>

              {/* Student Contact Info (Email & Mobile Stored in DB) */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Account Details</div>
                <div className="flex flex-col gap-1 text-[11px]">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">Email:</span>
                    <span className="font-medium text-slate-900 truncate max-w-[170px]">{currentUser?.email || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">Mobile No:</span>
                    <span className="font-medium text-slate-900">{currentUser?.phone || 'Not provided'}</span>
                  </div>
                  {currentUser?.preferences?.diet && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">Diet:</span>
                      <span className="font-medium text-slate-900">{currentUser?.preferences?.diet}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Full Settings Shortcut */}
              <div>
                <button
                  onClick={() => {
                    setShowProfileDrawer(false);
                    setActiveBottomNav('settings');
                  }}
                  className="w-full p-3 rounded-2xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold flex items-center justify-between transition"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-orange-600" />
                    <span>Open ⚙️ Settings</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-orange-400" />
                </button>
              </div>

              {/* Notification Permission Setting (Section 13) */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">Preferences</div>
                <button
                  onClick={requestPermission}
                  className="w-full p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-left text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-orange-600" />
                    <span>Push Notifications</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">Manage</span>
                </button>
              </div>

              {/* Sign Out Button */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    setShowProfileDrawer(false);
                    logout();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs transition flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of Student Account</span>
                </button>
              </div>

              {/* Storage Info (Section 37) */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                <div className="font-semibold text-slate-800">Local Storage (Room Database)</div>
                <div className="text-[11px] text-slate-500 flex justify-between">
                  <span>Saved Messes in Cache</span>
                  <span className="font-bold">{messes.length}</span>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between">
                  <span>Storage Engine</span>
                  <span className="font-bold text-emerald-700">IndexedDB Active</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 text-center">
              MessConnect v1.0 • Student Portal
            </div>
          </div>
        </div>
      )}

      {/* Feature 1 & Phase 3 Modals */}
      <DigitalMealPassModal
        isOpen={showPassModal}
        onClose={() => setShowPassModal(false)}
        messId={selectedMessForPass}
        onSwitchToOwnerScanner={(token) => {
          switchRole('OWNER');
        }}
      />

      <CampusFlexiPassModal
        isOpen={showFlexiModal}
        onClose={() => setShowFlexiModal(false)}
        onOpenPassForMess={(mId) => {
          setSelectedMessForPass(mId);
          setShowPassModal(true);
        }}
      />

      <RoommateGroupModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
      />

      {/* Interactive Student Profile Editor Modal */}
      <StudentProfileModal
        isOpen={showStudentProfileModal}
        onClose={() => setShowStudentProfileModal(false)}
        subscriptions={subscriptions}
      />

      {/* Customer Bottom Navigation Bar (Section 27: Visible only on mobile screens) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-2 flex items-center justify-around z-40 shadow-lg">
        {[
          { key: 'home', label: 'Home', icon: Home },
          { key: 'discover', label: 'Discover', icon: Search },
          { key: 'attendance', label: 'Attendance', icon: CheckCircle2 },
          { key: 'subscriptions', label: 'Passes', icon: ClipboardList },
          { key: 'notifications', label: 'Alerts', icon: Bell, badge: unreadCount },
          { key: 'settings', label: 'Settings', icon: Settings }
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeBottomNav === item.key;
          return (
            <button
              key={item.key}
              onClick={() => {
                if (item.key === 'notifications') {
                  setShowNotifModal(true);
                } else {
                  setActiveBottomNav(item.key);
                }
              }}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition relative ${
                isActive ? 'text-orange-600 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-bold">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Phase 6: Slide-Over Notification Center Modal */}
      <NotificationCenterModal
        isOpen={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        userRole="CUSTOMER"
      />
    </div>
  );
};
