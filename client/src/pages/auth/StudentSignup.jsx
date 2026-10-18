import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  GraduationCap, Mail, Phone, Lock, User, Building,
  ArrowRight, AlertCircle, ChevronLeft, ChefHat, CheckCircle2,
  Clock, ShieldCheck, RefreshCw
} from 'lucide-react';
import { validatePassword } from '../../utils/passwordValidator';
import { PasswordStrengthIndicator } from '../../components/common/PasswordStrengthIndicator';

export const StudentSignup = ({
  onNavigateToLogin,
  onNavigateToOwnerSignup,
  onBackToHome,
  onSignupSuccess
}) => {
  const { registerSendOtp, registerVerifyOtp } = useAuth();
  const { showToast } = useNotification();

  // Steps: 'FORM' -> 'OTP'
  const [step, setStep] = useState('FORM');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    college: 'MIT World Peace University, Pune',
    diet: 'Veg & Non-Veg',
    password: '',
    confirmPassword: ''
  });

  const [otp, setOtp] = useState('');
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes = 180 seconds
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

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

  const handleChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  // Step 1: Submit Details & Request 3-Min Registration OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!formData.email || !formData.email.includes('@')) {
      setErrorMessage('Please provide a valid email address.');
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
      setErrorMessage('Passwords do not match. Please recheck.');
      showToast('Passwords do not match!', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await registerSendOtp({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: 'CUSTOMER',
        college: formData.college.trim(),
        diet: formData.diet
      });

      if (res && res.success) {
        showToast(`Verification code sent to ${formData.email}! Valid for 3 minutes.`, 'success', '✉️ Check Your Inbox');
        setTimeLeft(180); // 3 minutes strictly
        if (res.otp) setOtp(res.otp);
        setStep('OTP');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to send verification code. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP within 3 Minutes & Complete Registration (One-time login)
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!otp || otp.trim().length < 4) {
      setErrorMessage('Please enter the 6-digit code received on your email.');
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
        showToast('Student registration verified! You are now logged in.', 'success', '🎉 Welcome to MessConnect');
        if (onSignupSuccess) onSignupSuccess(res.user);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await registerSendOtp({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: 'CUSTOMER',
        college: formData.college.trim(),
        diet: formData.diet
      });

      if (res && res.success) {
        showToast('New 6-digit verification code sent! Valid for 3 minutes.', 'success', '🔄 Code Resent');
        setTimeLeft(180);
        setOtp(res.otp || '');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-slate-50 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8">
      
      {/* Top Bar Navigation */}
      <div className="max-w-lg sm:max-w-xl mx-auto w-full flex items-center justify-between mb-4">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-2xs"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Home / Explore</span>
        </button>

        <button
          onClick={onNavigateToOwnerSignup}
          className="flex items-center gap-1.5 text-xs font-semibold text-orange-700 hover:text-orange-800 bg-orange-100/70 hover:bg-orange-100 px-3 py-1.5 rounded-full transition"
        >
          <ChefHat className="w-3.5 h-3.5" />
          <span>Register Mess / Kitchen</span>
        </button>
      </div>

      {/* Main Card Container */}
      <div className="max-w-lg sm:max-w-xl w-full mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden my-auto">
        
        {/* Banner */}
        <div className="bg-gradient-to-br from-orange-600 via-orange-500 to-amber-600 p-6 sm:p-7 text-white relative">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full border border-white/30 backdrop-blur-xs">
              Student Registration
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black mt-4">
            {step === 'FORM' ? 'Create Student Account' : 'Verify Your Email OTP'}
          </h1>
          <p className="text-orange-100 text-xs mt-1">
            {step === 'FORM'
              ? 'Join 4,500+ students finding verified messes with flexible vacation pauses.'
              : `Enter the 6-digit code sent to ${formData.email}. Valid for 3 minutes.`}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8">
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Registration Form */}
          {step === 'FORM' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="e.g. rahul@example.com"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">We'll send a 3-minute OTP verification code here.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    College / Institute
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formData.college}
                      onChange={(e) => handleChange('college', e.target.value)}
                      placeholder="e.g. MIT-WPU, COEP, Symbiosis"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Food Preference
                  </label>
                  <select
                    value={formData.diet}
                    onChange={(e) => handleChange('diet', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium cursor-pointer"
                  >
                    <option value="Both Veg & Non-Veg">Both Veg & Non-Veg</option>
                    <option value="Separate Veg & Non-Veg">Separate Veg & Non-Veg Kitchens</option>
                    <option value="Pure Veg">Pure Veg Only (100% Vegetarian)</option>
                    <option value="Non-Veg Only">Non-Veg Only</option>
                    <option value="Jain Food">Jain Food (No Onion/Garlic)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
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
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Password Strength & Rules Checklist */}
              <PasswordStrengthIndicator
                password={formData.password}
                hasAttemptedSubmit={attemptedSubmit}
              />

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-orange-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-4 cursor-pointer"
              >
                <span>{loading ? 'Sending Verification Code...' : 'Verify Email & Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* STEP 2: Enter 6-Digit OTP with 3-Minute Limit */}
          {step === 'OTP' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in fade-in duration-200">
              
              {/* Verification Notice */}
              <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 text-orange-900 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5">
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
                <p className="text-[11px] text-orange-700 mt-1.5">
                  We've sent a 6-digit authentication code to <strong>{formData.email}</strong>. This code strictly expires in <strong>3 minutes</strong>.
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
                    ⏰ Time has expired! Please click Resend Code below.
                  </p>
                )}
              </div>

              {/* Verify & Login Button */}
              <button
                type="submit"
                disabled={loading || timeLeft <= 0 || otp.length < 4}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-orange-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{loading ? 'Verifying...' : 'Verify OTP & Complete One-Time Login'}</span>
              </button>

              {/* Resend & Back buttons */}
              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setStep('FORM')}
                  className="text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleResendOtp}
                  className="text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 disabled:opacity-50 hover:underline"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Resend Code</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 text-[11px] text-slate-500 text-center">
                ✨ <strong>Note:</strong> After this one-time verification, you will log in with your password directly without needing an OTP!
              </div>

            </form>
          )}

          {/* Switch to Login */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already have a verified student account?{' '}
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="font-extrabold text-orange-600 hover:underline"
              >
                Log In (No OTP required)
              </button>
            </p>
          </div>

        </div>
      </div>

      <div className="text-center text-[11px] text-slate-400 mt-6">
        MessConnect • Designed for College Students & Bachelor Life
      </div>

    </div>
  );
};
