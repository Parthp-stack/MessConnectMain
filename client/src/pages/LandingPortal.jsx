import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { MessCard } from '../components/customer/MessCard';
import { LegalSupportModal } from '../components/common/LegalSupportModal';
import {
  GraduationCap, ChefHat, Search, MapPin, ShieldCheck,
  Sparkles, CheckCircle2, ArrowRight, Utensils, Star,
  Smartphone, Calendar, QrCode, Ticket, Heart, Users,
  Phone, Mail, MessageSquare, Headphones, Shield, FileText,
  Lock, HelpCircle, ExternalLink, Clock, IndianRupee,
  HeartHandshake, ChevronRight, Send
} from 'lucide-react';

export const LandingPortal = ({
  onOpenStudentLogin,
  onOpenStudentSignup,
  onOpenOwnerLogin,
  onOpenOwnerSignup,
  onOpenAdminLogin,
  onOpenDetails,
  onBookTrial,
  onSubscribe,
  onOpenLocationModal
}) => {
  const { messes, filters, setFilters, userLocation } = useApp();
  const { quickDemoLogin } = useAuth();
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'veg', 'trial'
  const [cityFilter, setCityFilter] = useState('pune'); // 'pune' or 'all'
  const [selectedArea, setSelectedArea] = useState('all'); // 'all' or specific Pune area
  const [legalModal, setLegalModal] = useState({ isOpen: false, tab: 'support' });
  const handleOpenLegalModal = (tab = 'support') => setLegalModal({ isOpen: true, tab });

  // Popular Pune student localities
  const POPULAR_PUNE_HUBS = [
    { area: 'Kothrud', label: 'Kothrud' },
    { area: 'Karve Nagar', label: 'Karve Nagar' },
    { area: 'Alandi', label: 'Alandi (MITAOE)' },
    { area: 'Wakad', label: 'Wakad' },
    { area: 'Ravet', label: 'Ravet' },
    { area: 'Hinjawadi', label: 'Hinjawadi' },
    { area: 'Bhosari', label: 'Bhosari' }
  ];

  // Dynamic locality counts based on real registered messes
  const puneLocalities = POPULAR_PUNE_HUBS.map(hub => {
    const count = messes.filter(m => {
      if (!m || m.id === 'mess_alandi_1' || m.id?.startsWith('mess_demo')) return false;
      const isPune = !m.city || m.city.toLowerCase() === 'pune';
      return isPune && m.area?.toLowerCase().includes(hub.area.toLowerCase());
    }).length;
    return { ...hub, count };
  });

  const totalPuneMesses = messes.filter(m => {
    if (!m || m.id === 'mess_alandi_1' || m.id?.startsWith('mess_demo')) return false;
    return !m.city || m.city.toLowerCase() === 'pune';
  }).length;

  const filteredMesses = messes.filter(m => {
    if (!m || m.id === 'mess_alandi_1' || m.id?.startsWith('mess_demo')) return false;
    
    // Strict Pune city filter when active
    if (cityFilter === 'pune') {
      const isPune = !m.city || m.city.toLowerCase() === 'pune';
      if (!isPune) return false;
    }

    // Specific Pune area/locality filter
    if (selectedArea && selectedArea !== 'all') {
      const matchArea = m.area?.toLowerCase().includes(selectedArea.toLowerCase());
      if (!matchArea) return false;
    }

    // Dietary & trial filters
    if (activeTab === 'veg' && !m.isPureVeg) return false;
    if (activeTab === 'trial' && !m.trialAvailable) return false;

    // Search query matching mess name or locality
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      const matchName = m.name?.toLowerCase().includes(q);
      const matchArea = m.area?.toLowerCase().includes(q);
      const matchCity = m.city?.toLowerCase().includes(q);
      return matchName || matchArea || matchCity;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpeg"
              alt="MessConnect"
              className="w-9 h-9 rounded-2xl object-contain shadow-sm"
            />
            <div>
              <span className="font-extrabold text-slate-900 text-base tracking-tight block leading-none">
                MessConnect
              </span>
              <span className="text-[10px] text-orange-600 font-bold uppercase tracking-wider">
                MITAOE Alandi Edition
              </span>
            </div>
          </div>

          {/* Location Chip */}
          <button
            onClick={onOpenLocationModal}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/70 text-xs text-slate-700 transition border border-slate-200"
          >
            <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            <span className="font-bold text-slate-900">{userLocation.label}</span>
            <span className="text-[10px] text-orange-600 underline font-semibold">Change</span>
          </button>

          {/* Action Portals Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenLegalModal('support')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              <Headphones className="w-3.5 h-3.5 text-orange-600" />
              <span>Admin Support</span>
            </button>

            <button
              onClick={onOpenStudentLogin}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student Login</span>
            </button>

            <button
              onClick={onOpenOwnerLogin}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
            >
              <ChefHat className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Mess Owner</span>
              <span>Portal</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto pt-2 pb-4 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-bold border border-orange-200">
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            <span>MITAOE Alandi Edition • Smart Mess Subscriptions & Daily Campus Dining</span>
          </div>
          
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            Find. Subscribe. Eat. <span className="text-orange-600">Simplify.</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Explore verified partner kitchens near campus, book single trial meals, and access your student or mess owner portal.
          </p>
        </section>

        {/* Live Mess Discovery Catalog (Now at the top) */}
        <section className="space-y-4 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-orange-600" />
                  <span>Explore Registered Partner Messes ({filteredMesses.length})</span>
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  📍 Pune Region Only
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Currently operating in Pune & PCMC campus zones • Verified partner kitchens registered on MessConnect
              </p>
            </div>

            {/* Quick Filter Buttons with Pune Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setCityFilter(cityFilter === 'pune' ? 'all' : 'pune')}
                className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  cityFilter === 'pune'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                title="Filter messes strictly in Pune region"
              >
                <MapPin className="w-3.5 h-3.5 text-orange-500" />
                <span>Pune Only</span>
                {cityFilter === 'pune' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
              </button>
              <button
                onClick={() => { setActiveTab('all'); setSelectedArea('all'); }}
                className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 cursor-pointer ${
                  activeTab === 'all' && selectedArea === 'all'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                All Messes
              </button>
              <button
                onClick={() => setActiveTab(activeTab === 'veg' ? 'all' : 'veg')}
                className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 cursor-pointer ${
                  activeTab === 'veg'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Pure Veg 🥗
              </button>
              <button
                onClick={() => setActiveTab(activeTab === 'trial' ? 'all' : 'trial')}
                className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 cursor-pointer ${
                  activeTab === 'trial'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Trial Available 🍲
              </button>
            </div>
          </div>

          {/* Search Bar + Pune Locality Selector Dropdown */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative sm:w-60 shrink-0">
              <MapPin className="w-4 h-4 text-orange-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full pl-9 pr-8 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 cursor-pointer appearance-none"
              >
                <option value="all">📍 All Pune Localities ({totalPuneMesses})</option>
                {puneLocalities.map(loc => (
                  <option key={loc.area} value={loc.area}>
                    {loc.label} {loc.count > 0 ? `(${loc.count})` : ''}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
                ▼
              </div>
            </div>

            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search messes in Pune (e.g. Kailash Mess, Kothrud, Karve Nagar)..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-xs shadow-2xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
              {filters.search && (
                <button
                  onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer p-1"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Quick Pune Locality Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1 mr-1">
              <MapPin className="w-3 h-3 text-orange-600" />
              Pune Hubs:
            </span>
            <button
              onClick={() => setSelectedArea('all')}
              className={`px-2.5 py-1 rounded-xl font-bold transition shrink-0 cursor-pointer ${
                selectedArea === 'all'
                  ? 'bg-orange-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Pune ({totalPuneMesses})
            </button>
            {puneLocalities.map(loc => (
              <button
                key={loc.area}
                onClick={() => setSelectedArea(selectedArea === loc.area ? 'all' : loc.area)}
                className={`px-2.5 py-1 rounded-xl font-semibold transition shrink-0 cursor-pointer flex items-center gap-1 ${
                  selectedArea === loc.area
                    ? 'bg-orange-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{loc.label}</span>
                {loc.count > 0 && (
                  <span className={`text-[9px] px-1 py-0.2 rounded-full font-bold ${
                    selectedArea === loc.area ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {loc.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Mess Cards Grid */}
          {filteredMesses.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 mx-auto flex items-center justify-center">
                <ChefHat className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-800">No Messes Listed Yet</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Be the first partner to list your mess or tiffin service! Register now to receive student subscriptions and manage meal passes.
              </p>
              <button
                onClick={onOpenOwnerSignup}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                <span>Register Your Mess</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredMesses.map(mess => (
                <div key={mess.id} onClick={() => onOpenDetails(mess.id)} className="cursor-pointer">
                  <MessCard
                    mess={mess}
                    onOpenDetails={() => onOpenDetails(mess.id)}
                    onBookTrial={() => onBookTrial(mess)}
                    onSubscribe={(m, plan) => onSubscribe(m, plan)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Dedicated Portals Section (Now below mess catalog) */}
        <section className="space-y-4 pt-6 border-t border-slate-200/80">
          <div className="text-center max-w-2xl mx-auto space-y-1">
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Access Your Dedicated Portal
            </h3>
            <p className="text-xs text-slate-500">
              Students get contactless digital passes and vacation pause credits. Mess owners manage daily attendance and menus.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            
            {/* CARD 1: STUDENT PORTAL */}
            <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 rounded-3xl p-6 sm:p-7 text-white shadow-xl shadow-orange-500/15 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition duration-500"></div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                    <GraduationCap className="w-7 h-7 text-white" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-white/20 text-[11px] font-extrabold uppercase tracking-wider">
                    For Students
                  </span>
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">Student Dining Portal</h2>
                  <p className="text-orange-100 text-xs sm:text-sm mt-1.5 leading-relaxed">
                    Sign in to view today's active meal pass QR, pause meal days during college exams/vacations, and explore verified messes near campus.
                  </p>
                </div>

                {/* Student Features Pill Checklist */}
                <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-orange-50">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>Digital QR Meal Pass</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>Exam Holiday Pause</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>Book Single Trial Meals</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>Campus FlexiPass™</span>
                  </div>
                </div>
              </div>

              {/* Student Action Buttons */}
              <div className="pt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onOpenStudentLogin}
                  className="flex-1 py-3 px-4 rounded-2xl bg-white hover:bg-orange-50 text-orange-700 font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Student Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onOpenStudentSignup}
                  className="py-3 px-4 rounded-2xl bg-orange-700/60 hover:bg-orange-700 text-white font-bold text-xs border border-white/30 transition text-center cursor-pointer"
                >
                  Create Student Account
                </button>
              </div>
            </div>

            {/* CARD 2: MESS OWNER PORTAL */}
            <div className="bg-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl shadow-slate-900/20 flex flex-col justify-between relative overflow-hidden group border border-slate-800">
              <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-orange-600/10 rounded-full blur-xl group-hover:scale-125 transition duration-500"></div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shadow-inner">
                    <ChefHat className="w-7 h-7 text-amber-400" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-slate-800 text-amber-400 border border-slate-700 text-[11px] font-extrabold uppercase tracking-wider">
                    For Mess Owners
                  </span>
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">Mess Partner Portal</h2>
                  <p className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
                    Sign in to publish your daily breakfast, lunch, and dinner menus, scan student meal passes in 1 second, and track demand forecasting.
                  </p>
                </div>

                {/* Owner Features Pill Checklist */}
                <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>1-Second Pass Scanner</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Publish Daily Menus</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Demand & Wastage Analytics</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Broadcast Student Offers</span>
                  </div>
                </div>
              </div>

              {/* Owner Action Buttons */}
              <div className="pt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onOpenOwnerLogin}
                  className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Owner Portal Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onOpenOwnerSignup}
                  className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition text-center cursor-pointer"
                >
                  Register Your Mess
                </button>
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* Clean Minimal Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 px-4 sm:px-8 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
          <div>
            © 2026 MessConnect Inc. All rights reserved. MITAOE Alandi Edition.
          </div>

          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => handleOpenLegalModal('support')}
              className="hover:text-slate-700 cursor-pointer"
            >
              Help & Support
            </button>
            <span>•</span>
            <button
              onClick={() => handleOpenLegalModal('legal')}
              className="hover:text-slate-700 cursor-pointer"
            >
              Terms
            </button>
            <span>•</span>
            <button
              onClick={() => handleOpenLegalModal('privacy')}
              className="hover:text-slate-700 cursor-pointer"
            >
              Privacy
            </button>
            <span>•</span>
            <button
              onClick={() => handleOpenLegalModal('refund')}
              className="hover:text-slate-700 cursor-pointer"
            >
              Refunds
            </button>
          </div>
        </div>
      </footer>

      {/* Interactive Legal, Privacy & Customer Support Modal */}
      <LegalSupportModal
        isOpen={legalModal.isOpen}
        onClose={() => setLegalModal(prev => ({ ...prev, isOpen: false }))}
        initialTab={legalModal.tab}
      />

    </div>
  );
};
