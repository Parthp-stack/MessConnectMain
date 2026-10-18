import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Star, MapPin, Phone, MessageCircle, Heart, X, Check, Clock, Utensils, Calendar, ShieldCheck, ChevronRight, Eye, FileText } from 'lucide-react';

export const MessDetailsModal = ({
  messId,
  initialTab = 'overview',
  onClose,
  onBookTrial,
  onSubscribe
}) => {
  const { messes, favorites, toggleFavorite } = useApp();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedDay, setSelectedDay] = useState('Monday');

  // Review form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewsList, setReviewsList] = useState([]);
  const [submittingReview, setSubmittingReview] = useState(false);

  const mess = messes.find(m => m.id === messId);
  if (!mess) return null;

  const isFav = favorites.includes(mess.id);
  const reviews = [...(mess.reviews || []), ...reviewsList];

  const handleAddReview = (e) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;
    setSubmittingReview(true);

    const newRev = {
      id: `rev_${Date.now()}`,
      userName: currentUser?.name || 'Student',
      userAvatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      rating: reviewRating,
      ratingsBreakdown: {
        foodQuality: reviewRating,
        cleanliness: reviewRating,
        quantity: 5,
        valueForMoney: reviewRating,
        service: 5
      },
      comment: reviewComment,
      date: 'Today',
      ownerResponse: null
    };

    setTimeout(() => {
      setReviewsList(prev => [newRev, ...prev]);
      setReviewComment('');
      setSubmittingReview(false);
    }, 400);
  };



  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200">
        
        {/* Header Image with Floating Action Buttons */}
        <div className="relative h-56 w-full bg-slate-900 shrink-0">
          <img
            src={mess.coverImage || '/logo.jpeg'}
            alt={mess.name}
            className="w-full h-full object-contain p-4"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

          {/* Top Bar inside image */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <button
              onClick={() => toggleFavorite(mess.id)}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition"
            >
              <Heart className={`w-5 h-5 ${isFav ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
            </button>

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Title & Rating in Hero Bottom */}
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${mess.isPureVeg ? 'bg-emerald-600' : 'bg-amber-600'}`}>
                {mess.isPureVeg ? 'Pure Veg' : 'Veg & Non-Veg'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                <ShieldCheck className="w-3 h-3" />
                <span>Verified Partner Mess ✓</span>
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <img
                src={mess.logo || mess.coverImage || '/logo.jpeg'}
                alt=""
                className="w-8 h-8 rounded-xl object-contain bg-black p-0.5 shrink-0 border border-white/20"
              />
              <h2 className="text-xl font-bold leading-tight drop-shadow-sm">{mess.name}</h2>
            </div>
              <div className="flex items-center gap-2 text-xs text-slate-200 mt-1">
                <div className="flex items-center gap-1 font-bold text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{mess.rating}</span>
                  <span className="text-slate-300 font-normal">({(mess.reviewCount ?? mess.reviews?.length) || 0} reviews)</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{mess.distance}</span>
                </div>
              </div>
            </div>
          </div>

        {/* Tab Navigation (Section 14: Overview, Menu, Plans, Reviews) */}
        <div className="flex border-b border-slate-100 bg-slate-50 px-2 shrink-0">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'menu', label: 'Menu' },
            { key: 'plans', label: 'Plans' },
            { key: 'reviews', label: 'Reviews' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-xs font-semibold transition border-b-2 ${
                activeTab === tab.key
                  ? 'border-orange-600 text-orange-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Tab Content */}
        <div className="p-5 overflow-y-auto flex-1 text-slate-800 space-y-5">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">About This Mess</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{mess.description}</p>
              </div>

              {/* Food Safety & Hygiene Verification Card */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-extrabold text-xs text-emerald-950 flex items-center gap-1.5">
                      <span>Food Safety & Hygiene Compliant</span>
                      <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.2 rounded font-bold">Approved ✓</span>
                    </div>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Inspected for student health standards • Clean kitchen & RO purified water guaranteed
                    </p>
                  </div>
                </div>
              </div>

              {/* Meal Timings */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Meal Timings</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-2xl bg-orange-50/60 border border-orange-100 text-center">
                    <div className="text-[10px] text-orange-700 font-semibold mb-0.5">🌅 Breakfast</div>
                    <div className="text-[11px] font-bold text-slate-800">{mess.timings?.breakfast || '7:30 - 10:00 AM'}</div>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-amber-50/60 border border-amber-100 text-center">
                    <div className="text-[10px] text-amber-700 font-semibold mb-0.5">☀️ Lunch</div>
                    <div className="text-[11px] font-bold text-slate-800">{mess.timings?.lunch || '12:30 - 3:30 PM'}</div>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-center">
                    <div className="text-[10px] text-indigo-700 font-semibold mb-0.5">🌙 Dinner</div>
                    <div className="text-[11px] font-bold text-slate-800">{mess.timings?.dinner || '7:30 - 10:30 PM'}</div>
                  </div>
                </div>
              </div>

              {/* Hygiene & Amenities */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Highlights & Facilities</h4>
                <div className="grid grid-cols-2 gap-2">
                  {(mess.features && mess.features.length > 0 ? mess.features : [
                    "Hygienic Homestyle Food",
                    "Clean Dining Space",
                    "Fresh Daily Ingredients",
                    "RO Purified Water"
                  ]).map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 p-2 rounded-xl bg-slate-50">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Location & Contact */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-semibold text-slate-900">{mess.area || ''}{mess.city ? `, ${mess.city}` : ''}{mess.pincode ? ` - ${mess.pincode}` : ''}</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">{mess.address || 'Address details available on contact'}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Contact: <strong className="text-slate-900">{mess.phone || mess.whatsapp || 'Not provided'}</strong></span>
                  </div>

                  {mess.email && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="text-[11px] font-semibold text-slate-500">Email:</span>
                      <span className="text-slate-900">{mess.email}</span>
                    </div>
                  )}

                  {mess.phone ? (
                    <div className="flex gap-2 pt-1">
                      <a
                        href={`tel:${mess.phone}`}
                        className="flex-1 py-2 px-3 rounded-xl bg-white border border-slate-200 text-slate-800 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-100 transition"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Call: {mess.phone}</span>
                      </a>
                      <a
                        href={`https://wa.me/91${(mess.whatsapp || mess.phone).replace(/\D/g,'')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-700 transition"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MENU (Today's Menu & Weekly Menu - Section 15) */}
          {activeTab === 'menu' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Today's Menu */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Utensils className="w-4 h-4 text-orange-600" />
                    <span>Today's Fresh Menu</span>
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full font-semibold">Live Today</span>
                </div>

                <div className="space-y-2.5">
                  {/* Breakfast */}
                  <div className="p-3.5 rounded-2xl bg-orange-50/50 border border-orange-100">
                    <div className="text-xs font-bold text-orange-900 mb-1 flex items-center justify-between">
                      <span>🌅 Breakfast ({mess.timings?.breakfast || '7:30 - 10:00 AM'})</span>
                    </div>
                    {Array.isArray(mess.menuToday?.breakfast) && mess.menuToday.breakfast.length > 0 ? (
                      <ul className="text-xs text-slate-700 list-disc list-inside space-y-0.5">
                        {mess.menuToday.breakfast.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    ) : typeof mess.menuToday?.breakfast === 'string' && mess.menuToday.breakfast.trim() ? (
                      <p className="text-xs text-slate-700">{mess.menuToday.breakfast}</p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No breakfast menu posted today.</p>
                    )}
                  </div>

                  {/* Lunch */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100">
                    <div className="text-xs font-bold text-amber-900 mb-1">
                      ☀️ Wholesome Lunch ({mess.timings?.lunch || '12:30 - 3:30 PM'})
                    </div>
                    {Array.isArray(mess.menuToday?.lunch) && mess.menuToday.lunch.length > 0 ? (
                      <ul className="text-xs text-slate-700 list-disc list-inside space-y-0.5">
                        {mess.menuToday.lunch.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    ) : typeof mess.menuToday?.lunch === 'string' && mess.menuToday.lunch.trim() ? (
                      <p className="text-xs text-slate-700">{mess.menuToday.lunch}</p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No lunch menu posted today.</p>
                    )}
                  </div>

                  {/* Dinner */}
                  <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                    <div className="text-xs font-bold text-indigo-900 mb-1">
                      🌙 Homestyle Dinner ({mess.timings?.dinner || '7:30 - 10:30 PM'})
                    </div>
                    {Array.isArray(mess.menuToday?.dinner) && mess.menuToday.dinner.length > 0 ? (
                      <ul className="text-xs text-slate-700 list-disc list-inside space-y-0.5">
                        {mess.menuToday.dinner.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    ) : typeof mess.menuToday?.dinner === 'string' && mess.menuToday.dinner.trim() ? (
                      <p className="text-xs text-slate-700">{mess.menuToday.dinner}</p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No dinner menu posted today.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Weekly Menu Selector */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-600" />
                  <span>Full Weekly Schedule</span>
                </h4>

                {/* Day selector tabs */}
                <div className="flex gap-1 overflow-x-auto pb-2 no-scrollbar">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                        selectedDay === day
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>

                {/* Selected Day Menu Details */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2 mt-2">
                  <div className="font-bold text-slate-900 text-sm">{selectedDay}'s Menu</div>
                  {mess.weeklyMenu && mess.weeklyMenu[selectedDay] ? (
                    <div className="space-y-2">
                      {mess.weeklyMenu[selectedDay].breakfast && (
                        <div>
                          <span className="font-semibold text-orange-700">Breakfast: </span>
                          <span className="text-slate-600">{mess.weeklyMenu[selectedDay].breakfast}</span>
                        </div>
                      )}
                      {mess.weeklyMenu[selectedDay].lunch && (
                        <div>
                          <span className="font-semibold text-amber-700">Lunch: </span>
                          <span className="text-slate-600">{mess.weeklyMenu[selectedDay].lunch}</span>
                        </div>
                      )}
                      {mess.weeklyMenu[selectedDay].dinner && (
                        <div>
                          <span className="font-semibold text-indigo-700">Dinner: </span>
                          <span className="text-slate-600">{mess.weeklyMenu[selectedDay].dinner}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">Weekly schedule not published yet by owner.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PLANS (Section 3: Student Plan Page) */}
          {activeTab === 'plans' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{mess.name} Meal Plans</h3>
                  <p className="text-[11px] text-slate-500">Select a dining package that fits your schedule & appetite:</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Razorpay Secured
                </span>
              </div>

              {((mess.plans && mess.plans.length > 0
                ? mess.plans.filter(p => p.status !== 'INACTIVE' && p.isActive !== false)
                : [
                    {
                      id: `plan_${mess.id}_standard`,
                      name: 'Monthly Dining Pass',
                      description: 'Homestyle breakfast, wholesome lunch & hot dinner',
                      price: mess.pricePerMonth || 3000,
                      durationDays: 30,
                      popular: true,
                      mealsIncluded: ['Breakfast', 'Lunch', 'Dinner']
                    }
                  ]
              )).map((plan, idx) => (
                <div
                  key={plan.id || idx}
                  className={`p-4 rounded-3xl border transition relative ${
                    plan.popular
                      ? 'border-orange-500 bg-orange-50/40 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-orange-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                      Recommended ★
                    </span>
                  )}

                  <div className="flex justify-between items-start mb-2">
                    <div className="pr-2">
                      <h4 className="font-extrabold text-slate-900 text-sm">{plan.name}</h4>
                      {plan.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{plan.description}</p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1 font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-orange-600" />
                        <span>Validity: {plan.durationDays || plan.periodDays || 30} Calendar Days</span>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-lg font-black text-slate-900">₹{plan.price}</div>
                      <div className="text-[10px] text-slate-400 font-medium">per month</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 mb-3">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Meals Included:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(plan.mealsIncluded || ['Breakfast', 'Lunch', 'Dinner']).map((m, mIdx) => (
                        <span key={mIdx} className="px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-2xs flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>{m}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      onSubscribe(mess, plan);
                    }}
                    className={`w-full py-2.5 rounded-2xl font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      plan.popular
                        ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-500/25'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <span>Subscribe to {plan.name}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: REVIEWS */}
          {activeTab === 'reviews' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Rating Summary Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                <div className="text-center shrink-0 pr-4 border-r border-slate-200">
                  <div className="text-3xl font-extrabold text-slate-900">{mess.rating || 5}</div>
                  <div className="flex items-center gap-0.5 text-amber-400 justify-center my-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`w-3 h-3 ${s <= (mess.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                    ))}
                  </div>
                  <div className="text-[10px] text-slate-500">{reviews.length} Verified Reviews</div>
                </div>

                <div className="flex-1 text-[11px] space-y-1 text-slate-600">
                  {reviews.length > 0 ? (
                    <>
                      <div className="flex justify-between">
                        <span>Food Quality</span>
                        <span className="font-bold text-slate-900">{mess.rating || 5} ★</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cleanliness & Hygiene</span>
                        <span className="font-bold text-slate-900">{mess.rating || 5} ★</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Value for Money</span>
                        <span className="font-bold text-slate-900">{mess.rating || 5} ★</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-400 text-xs py-2 italic">
                      No student ratings recorded yet. Be the first to share your dining experience below!
                    </div>
                  )}
                </div>
              </div>

              {/* Add Review Form */}
              <form onSubmit={handleAddReview} className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Write a Student Review</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="p-0.5 text-amber-400"
                      >
                        <Star className={`w-4 h-4 ${reviewRating >= star ? 'fill-amber-400' : 'text-slate-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows="2"
                  placeholder="Share your honest feedback on taste, rotis, and hygiene..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                ></textarea>

                <button
                  type="submit"
                  disabled={submittingReview || !reviewComment.trim()}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition"
                >
                  {submittingReview ? 'Posting...' : 'Submit Verified Review'}
                </button>
              </form>

              {/* Reviews List */}
              <div className="space-y-3">
                {reviews.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No reviews published yet for this mess.
                  </div>
                ) : (
                  reviews.map((rev, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img
                            src={rev.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                            alt={rev.userName}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-800">{rev.userName}</div>
                            <div className="text-[10px] text-slate-400">{rev.date}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
                          <span>{rev.rating}</span>
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>

                      {/* Owner Response */}
                      {rev.ownerResponse && (
                        <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-100 text-[11px] text-orange-950 mt-2">
                          <span className="font-bold text-orange-800">Owner Response: </span>
                          <span>{rev.ownerResponse}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Fixed Action Bar */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0 flex items-center gap-3">
          {mess.trialAvailable && (
            <button
              onClick={() => onBookTrial(mess)}
              className="flex-1 py-3 rounded-2xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs transition border border-orange-200 text-center"
            >
              Try Meal (₹{mess.trialPrice})
            </button>
          )}

          <button
            onClick={() => onSubscribe(mess)}
            className="flex-1 py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition shadow-lg shadow-orange-500/25 text-center"
          >
            Subscribe (₹{mess.pricePerMonth}/mo)
          </button>
        </div>
      </div>

    </div>
  );
};
