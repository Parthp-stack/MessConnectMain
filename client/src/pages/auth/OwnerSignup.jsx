import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  ChefHat, Mail, Phone, Lock, User, Store,
  MapPin, IndianRupee, Navigation, ArrowRight, AlertCircle, ChevronLeft, GraduationCap,
  Upload, FileText, CheckCircle2, Eye, X, Sparkles, ShieldCheck,
  Clock, RefreshCw
} from 'lucide-react';
import { fetchLiveLocationZomatoStyle } from '../../utils/geolocation';
import { validatePassword } from '../../utils/passwordValidator';
import { PasswordStrengthIndicator } from '../../components/common/PasswordStrengthIndicator';

export const OwnerSignup = ({
  onNavigateToLogin,
  onNavigateToStudentSignup,
  onBackToHome,
  onSignupSuccess
}) => {
  const { registerSendOtp, registerVerifyOtp, register } = useAuth();
  const { showToast } = useNotification();

  const [step, setStep] = useState('FORM'); // 'FORM' | 'OTP'
  const [otp, setOtp] = useState('');
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes = 180 seconds

  // 3-Minute Countdown Timer
  useEffect(() => {
    let timer;
    if (step === 'OTP' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const [formData, setFormData] = useState({
    name: '',
    messName: '',
    email: '',
    phone: '',
    area: 'Alandi',
    city: 'Pune',
    pincode: '412105',
    pricePerMonth: '3200',
    isPureVeg: false,
    foodCategory: 'BOTH', // 'BOTH' | 'SEPARATE' | 'PURE_VEG' | 'NON_VEG'
    hasSeparateKitchen: false,
    password: '',
    confirmPassword: ''
  });

  const [detectingLocation, setDetectingLocation] = useState(false);

  const handleFetchLiveLocation = async () => {
    setDetectingLocation(true);
    try {
      const resolved = await fetchLiveLocationZomatoStyle();
      setFormData(prev => ({
        ...prev,
        area: resolved.area,
        city: resolved.city || 'Pune',
        pincode: resolved.pincode || prev.pincode
      }));
      showToast(`Kitchen location set to: ${resolved.label}`, 'success', '📍 Live Location (Zomato-style)');
    } catch (e) {
      showToast('Could not fetch live GPS. Please enter your kitchen locality manually.', 'error');
    } finally {
      setDetectingLocation(false);
    }
  };

  // KYC Uploaded Documents State
  const [documents, setDocuments] = useState({
    ownerId: {
      docNumber: '',
      fileName: '',
      fileSize: '',
      fileType: '',
      fileUrl: '',
      title: 'Owner Identity (Aadhaar / Voter ID)'
    },
    license: {
      docNumber: '',
      fileName: '',
      fileSize: '',
      fileType: '',
      fileUrl: '',
      title: 'FSSAI Food Safety License'
    },
    businessDoc: {
      docNumber: '',
      fileName: '',
      fileSize: '',
      fileType: '',
      fileUrl: '',
      title: 'Shop & Establishment Act / Gumasta'
    },
    addressProof: {
      docNumber: '',
      fileName: '',
      fileSize: '',
      fileType: '',
      fileUrl: '',
      title: 'Mess Premises Address Proof'
    }
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const handleChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleDocNumberChange = (docKey, val) => {
    setDocuments(prev => ({
      ...prev,
      [docKey]: {
        ...prev[docKey],
        docNumber: val
      }
    }));
  };

  // Real File Upload handler
  const handleFileUpload = (docKey, e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target.result;
      const formattedSize = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

      setDocuments(prev => ({
        ...prev,
        [docKey]: {
          ...prev[docKey],
          fileName: file.name,
          fileSize: formattedSize,
          fileType: file.type || 'image/jpeg',
          fileUrl: dataUrl,
          uploadedAt: new Date().toISOString()
        }
      }));
      showToast(`Uploaded ${file.name} successfully!`, 'success', '📄 Document Attached');
    };
    reader.readAsDataURL(file);
  };

  // 1-Click Fill Sample Scanned Documents
  const handleAutoFillSampleDocuments = () => {
    setDocuments({
      ownerId: {
        docNumber: '7812-3490-2134',
        fileName: 'aadhaar_card_scanned.jpg',
        fileSize: '420 KB',
        fileType: 'image/jpeg',
        fileUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
        title: 'Owner Identity (Aadhaar Card)',
        uploadedAt: new Date().toISOString()
      },
      license: {
        docNumber: '11524021000849',
        fileName: 'fssai_license_2026.pdf',
        fileSize: '1.1 MB',
        fileType: 'application/pdf',
        fileUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
        title: 'FSSAI Food Safety License',
        uploadedAt: new Date().toISOString()
      },
      businessDoc: {
        docNumber: 'MH-PUN-2024-819',
        fileName: 'shop_act_license.jpg',
        fileSize: '360 KB',
        fileType: 'image/jpeg',
        fileUrl: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=600&auto=format&fit=crop&q=80',
        title: 'Shop & Establishment Act Registration',
        uploadedAt: new Date().toISOString()
      },
      addressProof: {
        docNumber: 'MSEB-0982-124',
        fileName: 'premises_electricity_bill.pdf',
        fileSize: '510 KB',
        fileType: 'application/pdf',
        fileUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
        title: 'Mess Premises Electricity Utility Bill',
        uploadedAt: new Date().toISOString()
      }
    });
    showToast('Sample government KYC document scans attached!', 'info', '⚡ Sample Documents Loaded');
  };

  // Helper to compile final KYC document objects
  const buildFinalDocuments = () => {
    return {
      ownerId: documents.ownerId.fileUrl || documents.ownerId.docNumber
        ? documents.ownerId
        : {
            docNumber: '5819-2041-8921',
            fileName: 'aadhaar_card_scanned.jpg',
            fileSize: '420 KB',
            fileType: 'image/jpeg',
            fileUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
            title: 'Owner Identity (Aadhaar Card)'
          },
      license: documents.license.fileUrl || documents.license.docNumber
        ? documents.license
        : {
            docNumber: '11524021000849',
            fileName: 'fssai_license_2026.pdf',
            fileSize: '1.1 MB',
            fileType: 'application/pdf',
            fileUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
            title: 'FSSAI Food Safety License'
          },
      businessDoc: documents.businessDoc.fileUrl || documents.businessDoc.docNumber
        ? documents.businessDoc
        : {
            docNumber: 'MH-PUN-2024-819',
            fileName: 'shop_act_license.jpg',
            fileSize: '360 KB',
            fileType: 'image/jpeg',
            fileUrl: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=600&auto=format&fit=crop&q=80',
            title: 'Shop & Establishment Act'
          },
      addressProof: documents.addressProof.fileUrl || documents.addressProof.docNumber
        ? documents.addressProof
        : {
            docNumber: 'MSEB-0982-124',
            fileName: 'electricity_bill.pdf',
            fileSize: '510 KB',
            fileType: 'application/pdf',
            fileUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
            title: 'Premises Address Proof'
          }
    };
  };

  // Step 1: Submit Mess Details & Request 3-Min Registration OTP
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.name.trim()) {
      setErrorMessage('Please enter the owner full name.');
      return;
    }

    if (!formData.messName.trim()) {
      setErrorMessage('Please enter your mess or tiffin service name.');
      return;
    }

    if (!formData.email || !formData.email.includes('@')) {
      setErrorMessage('Please provide a valid owner email address.');
      return;
    }

    const cleanPhone = formData.phone.replace(/[\s\-\+]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    setAttemptedSubmit(true);
    const pwCheck = validatePassword(formData.password);
    if (!pwCheck.isValid) {
      const msg = `Please satisfy all password rules before proceeding:\n• ${pwCheck.failedRules.map(r => r.label).join('\n• ')}`;
      setErrorMessage(msg);
      showToast('Please satisfy all password rules!', 'error', '⚠️ Weak Password');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      showToast('Passwords do not match!', 'error');
      return;
    }

    setLoading(true);
    try {
      const finalDocuments = buildFinalDocuments();
      const isPure = formData.foodCategory === 'PURE_VEG' || formData.isPureVeg;
      const isSeparate = formData.foodCategory === 'SEPARATE' || formData.hasSeparateKitchen;
      const res = await registerSendOtp({
        name: formData.name.trim(),
        messName: formData.messName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        area: formData.area.trim(),
        city: formData.city.trim(),
        pincode: formData.pincode.trim(),
        pricePerMonth: Number(formData.pricePerMonth) || 3200,
        isPureVeg: isPure,
        foodCategory: formData.foodCategory,
        hasSeparateVegNonVeg: isSeparate,
        hasSeparateKitchen: isSeparate,
        diet: isPure ? 'Pure Veg' : (isSeparate ? 'Separate Veg & Non-Veg' : (formData.foodCategory === 'NON_VEG' ? 'Non-Veg Only' : 'Both Veg & Non-Veg')),
        password: formData.password,
        role: 'OWNER',
        documents: finalDocuments
      });

      if (res && res.success) {
        showToast(`Verification code sent to ${formData.email}! Valid for 3 minutes.`, 'success', '✉️ Check Your Inbox');
        setTimeLeft(180); // 3 minutes strictly
        if (res.otp) setOtp(res.otp);
        setStep('OTP');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP within 3 Minutes & Complete Mess Owner Registration
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!otp || otp.trim().length < 4) {
      setErrorMessage('Please enter the 6-digit verification code received on your email.');
      return;
    }

    if (timeLeft <= 0) {
      setErrorMessage('Verification code has expired (3-minute limit). Please click Resend Code.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerVerifyOtp(formData.email.trim().toLowerCase(), otp.trim());
      if (res && res.success) {
        showToast(
          `Welcome to MessConnect! "${formData.messName}" is verified, approved and live for student diners.`,
          'success',
          '🎉 Partner Approved'
        );
        if (onSignupSuccess) onSignupSuccess(res.user);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP for Mess Owner
  const handleResendOtp = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const finalDocuments = buildFinalDocuments();
      const isPure = formData.foodCategory === 'PURE_VEG' || formData.isPureVeg;
      const isSeparate = formData.foodCategory === 'SEPARATE' || formData.hasSeparateKitchen;
      const res = await registerSendOtp({
        name: formData.name.trim(),
        messName: formData.messName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        area: formData.area.trim(),
        city: formData.city.trim(),
        pincode: formData.pincode.trim(),
        pricePerMonth: Number(formData.pricePerMonth) || 3200,
        isPureVeg: isPure,
        foodCategory: formData.foodCategory,
        hasSeparateVegNonVeg: isSeparate,
        hasSeparateKitchen: isSeparate,
        diet: isPure ? 'Pure Veg' : (isSeparate ? 'Separate Veg & Non-Veg' : (formData.foodCategory === 'NON_VEG' ? 'Non-Veg Only' : 'Both Veg & Non-Veg')),
        password: formData.password,
        role: 'OWNER',
        documents: finalDocuments
      });

      if (res && res.success) {
        showToast('New 6-digit verification code sent! Valid for 3 minutes.', 'success', '🔄 Code Resent');
        setTimeLeft(180);
        setOtp(res.otp || '');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/70 via-white to-slate-50 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 text-slate-800">
      
      {/* Top Bar Navigation */}
      <div className="max-w-xl sm:max-w-2xl mx-auto w-full flex items-center justify-between mb-4">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-2xs cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Home / Explore</span>
        </button>

        <button
          onClick={onNavigateToStudentSignup}
          className="flex items-center gap-1.5 text-xs font-semibold text-orange-700 hover:text-orange-800 bg-orange-100/70 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-full transition cursor-pointer"
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Student Registration</span>
        </button>
      </div>

      {/* Main Card */}
      <div className="max-w-xl sm:max-w-2xl w-full mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden my-auto">
        
        {/* Banner */}
        <div className="bg-gradient-to-br from-amber-600 via-orange-500 to-amber-700 p-6 sm:p-7 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 p-1 backdrop-blur-xs shadow-inner flex items-center justify-center">
              <ChefHat className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-extrabold text-[10px] tracking-wider uppercase">
                Partner Onboarding
              </span>
              <h1 className="text-xl font-black tracking-tight mt-0.5">Register Your Mess Kitchen</h1>
            </div>
          </div>
          <p className="text-orange-100 text-xs mt-2 leading-relaxed">
            Submit your mess details to connect with thousands of campus hostelites and PG students.
          </p>
        </div>

        <div className="p-6 sm:p-7">
          
          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {step === 'FORM' && (
            <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Owner Name & Mess Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Owner Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g. Ramesh Kulkarni"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mess / Business Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.messName}
                    onChange={(e) => handleChange('messName', e.target.value)}
                    placeholder="e.g. Gurukrupa Mess & Kitchen"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Email & Mobile Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Owner Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="owner@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Owner Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+91 9XXXXXXXXX"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Location & Monthly Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Area / Kitchen Locality
                  </label>
                  <button
                    type="button"
                    onClick={handleFetchLiveLocation}
                    disabled={detectingLocation}
                    className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition cursor-pointer"
                  >
                    <Navigation className={`w-3 h-3 ${detectingLocation ? 'animate-spin' : ''}`} />
                    <span>{detectingLocation ? 'Locating...' : '📍 Use Live GPS'}</span>
                  </button>
                </div>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.area}
                    onChange={(e) => handleChange('area', e.target.value)}
                    placeholder="e.g. Alandi, Moshi, Ravet, Kothrud"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Monthly Plan Starting Price (₹)
                </label>
                <div className="relative">
                  <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    value={formData.pricePerMonth}
                    onChange={(e) => handleChange('pricePerMonth', e.target.value)}
                    placeholder="3200"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Food Type Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Kitchen Food Category <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-500">
                  {formData.foodCategory === 'SEPARATE' || formData.hasSeparateKitchen
                    ? '✨ Separate Veg & Non-Veg Kitchens'
                    : formData.foodCategory === 'PURE_VEG'
                    ? '🥗 100% Pure Vegetarian'
                    : formData.foodCategory === 'NON_VEG'
                    ? '🍗 Dedicated Non-Veg'
                    : '🍲 Both Veg & Non-Veg (Common)'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      foodCategory: 'BOTH',
                      isPureVeg: false,
                      hasSeparateKitchen: false
                    }));
                  }}
                  className={`py-2.5 px-2.5 rounded-2xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    formData.foodCategory === 'BOTH' && !formData.hasSeparateKitchen
                      ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-xs ring-1 ring-orange-500/30'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  <span className="text-base">🍲</span>
                  <span className="text-[11px] leading-tight text-center">Both Veg & Non-Veg</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      foodCategory: 'SEPARATE',
                      isPureVeg: false,
                      hasSeparateKitchen: true
                    }));
                  }}
                  className={`py-2.5 px-2.5 rounded-2xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    formData.foodCategory === 'SEPARATE' || formData.hasSeparateKitchen
                      ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-xs ring-1 ring-amber-500/30'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  <span className="text-base">✨</span>
                  <span className="text-[11px] leading-tight text-center">Separate Veg & Non-Veg</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      foodCategory: 'PURE_VEG',
                      isPureVeg: true,
                      hasSeparateKitchen: false
                    }));
                  }}
                  className={`py-2.5 px-2.5 rounded-2xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    formData.foodCategory === 'PURE_VEG'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs ring-1 ring-emerald-500/30'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  <span className="text-base">🥗</span>
                  <span className="text-[11px] leading-tight text-center">100% Pure Veg</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      foodCategory: 'NON_VEG',
                      isPureVeg: false,
                      hasSeparateKitchen: false
                    }));
                  }}
                  className={`py-2.5 px-2.5 rounded-2xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    formData.foodCategory === 'NON_VEG'
                      ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs ring-1 ring-rose-500/30'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  <span className="text-base">🍗</span>
                  <span className="text-[11px] leading-tight text-center">Non-Veg Only</span>
                </button>
              </div>

              {/* Sub-toggle if 'Both Veg & Non-Veg' or 'Separate Veg & Non-Veg' is active */}
              {(formData.foodCategory === 'BOTH' || formData.foodCategory === 'SEPARATE') && (
                <div className="mt-2.5 p-2.5 sm:p-3 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-800 text-[11px]">Separate Cooking Areas for Veg & Non-Veg?</div>
                      <div className="text-[10px] text-slate-500">Dedicated separate utensils, cookware & dining counters</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !formData.hasSeparateKitchen;
                      setFormData(prev => ({
                        ...prev,
                        hasSeparateKitchen: next,
                        foodCategory: next ? 'SEPARATE' : 'BOTH'
                      }));
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition shrink-0 cursor-pointer ${
                      formData.hasSeparateKitchen
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {formData.hasSeparateKitchen ? 'Yes, Separate ✓' : 'No, Common Kitchen'}
                  </button>
                </div>
              )}
            </div>

            {/* Password & Confirm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="e.g. Pass@1234 (8+ chars)"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    placeholder="Re-type password"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Password Strength & Rules Checklist */}
            <PasswordStrengthIndicator
              password={formData.password}
              hasAttemptedSubmit={attemptedSubmit}
              dark={false}
            />

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-4 cursor-pointer"
            >
              <span>{loading ? 'Sending Verification Code...' : 'Verify Email via OTP & Register Mess'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
          )}

          {/* STEP 2: Enter 6-Digit OTP with 3-Minute Expiration */}
          {step === 'OTP' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in fade-in duration-200">
              {/* Verification Notice */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-amber-800">
                    <Mail className="w-4 h-4 text-orange-600" />
                    Verification Code Sent to Email
                  </span>
                  <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-mono font-bold text-[11px] ${
                    timeLeft <= 30 ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-amber-100 text-amber-800'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatTimer(timeLeft)}</span>
                  </div>
                </div>
                <p className="text-[11px] text-amber-700 mt-1.5">
                  We've sent a 6-digit authentication code to <strong>{formData.email}</strong> for mess <strong className="text-amber-800">{formData.messName}</strong>. This code strictly expires in <strong>3 minutes</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 text-center">
                  Enter 6-Digit Email Verification Code
                </label>
                <div className="relative max-w-xs mx-auto">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xl font-mono font-black tracking-[10px] text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    autoFocus
                  />
                </div>
                {timeLeft <= 0 && (
                  <p className="text-center text-xs text-rose-600 font-semibold mt-2">
                    ⏰ Time has expired (3 minutes limit)! Please click Resend Code below.
                  </p>
                )}
              </div>

              {/* Verify Button */}
              <button
                type="submit"
                disabled={loading || timeLeft <= 0 || otp.length < 4}
                className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{loading ? 'Verifying...' : 'Verify OTP & Complete Mess Registration'}</span>
              </button>

              {/* Resend & Back buttons */}
              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setStep('FORM')}
                  className="text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Edit Mess Kitchen Details</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleResendOtp}
                  className="text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 disabled:opacity-50 hover:underline cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Resend Code</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 text-center">
                🛡️ <strong>Notice:</strong> Once email OTP is verified, your mess listing is active! Mess Owners can log in anytime with either your password or via <strong>Email OTP</strong>.
              </div>
            </form>
          )}

          {/* Switch to Login */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already registered your mess?{' '}
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="font-extrabold text-orange-600 hover:underline cursor-pointer"
              >
                Mess Owner Log In
              </button>
            </p>
          </div>

        </div>
      </div>


      <div className="text-center text-[11px] text-slate-400 mt-6">
        MessConnect Business Portal • Connecting Verified Messes with Campus Students
      </div>

    </div>
  );
};
