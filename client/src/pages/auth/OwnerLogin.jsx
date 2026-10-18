import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  ChefHat, Mail, Lock, ArrowRight, Sparkles,
  AlertCircle, ChevronLeft, GraduationCap, Store,
  Clock, ShieldCheck, RefreshCw, Key
} from 'lucide-react';

export const OwnerLogin = ({
  onNavigateToSignup,
  onNavigateToStudentLogin,
  onOpenForgotPassword,
  onBackToHome,
  onLoginSuccess
}) => {
  const { login, ownerRequestLoginOtp, ownerVerifyLoginOtp } = useAuth();
  const { showToast } = useNotification();

  // Mode: 'OTP' (Anytime Login) | 'PASSWORD'
  const [loginMode, setLoginMode] = useState('OTP');

  // For OTP Mode: 'INPUT' (email/phone) | 'VERIFY' (6-digit code)
  const [otpStep, setOtpStep] = useState('INPUT');
  const [otp, setOtp] = useState('');
  const [resolvedEmail, setResolvedEmail] = useState('');
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes = 180 seconds

  // Credentials
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 3-Minute Countdown Timer for OTP Login
  useEffect(() => {
    let timer;
    if (loginMode === 'OTP' && otpStep === 'VERIFY' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [loginMode, otpStep, timeLeft]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Step 1: Request 3-Minute Login OTP
  const handleRequestLoginOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Please enter your mess owner email or registered mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await ownerRequestLoginOtp(identifier.trim());
      if (res && res.success) {
        setResolvedEmail(res.email || identifier.trim());
        setTimeLeft(180);
        setOtpStep('VERIFY');
        if (res.otp) {
          setOtp(res.otp);
        }
        showToast(
          res.message || `Login code sent to ${res.email}! Valid for 3 minutes.`,
          'success',
          '✉️ Code Sent'
        );
      }
    } catch (err) {
      setErrorMessage(err.message || 'No registered Mess Owner found with this email or mobile number.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify 6-Digit OTP within 3 Minutes & Log In
  const handleVerifyLoginOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!otp || otp.trim().length < 4) {
      setErrorMessage('Please enter the 6-digit login code received on your email.');
      return;
    }

    if (timeLeft <= 0) {
      setErrorMessage('Login code has expired (3-minute limit). Please click Resend Code.');
      return;
    }

    setLoading(true);
    try {
      const targetEmail = resolvedEmail || identifier.trim();
      const res = await ownerVerifyLoginOtp(targetEmail, otp.trim());
      if (res && res.success) {
        showToast(`Welcome back, ${res.user?.name || 'Partner'}!`, 'success', '👨‍🍳 Mess Portal');
        if (onLoginSuccess) onLoginSuccess(res.user);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid or expired login code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend Login OTP
  const handleResendLoginOtp = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const targetEmail = resolvedEmail || identifier.trim();
      const res = await ownerRequestLoginOtp(targetEmail);
      if (res && res.success) {
        setTimeLeft(180);
        setOtp(res.otp || '');
        showToast('New 6-digit login code sent! Valid for 3 minutes.', 'success', '🔄 Code Resent');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  // Standard Password Login
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Please enter your mess owner email or mobile number.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login({
        identifier: identifier.trim(),
        password,
        role: 'OWNER'
      });
      if (res && res.success) {
        showToast(`Welcome back, ${res.user?.name || 'Partner'}!`, 'success', '👨‍🍳 Mess Portal');
        if (onLoginSuccess) onLoginSuccess(res.user);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/70 via-white to-slate-50 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 text-slate-800">
      
      {/* Top Bar Navigation */}
      <div className="max-w-md sm:max-w-xl lg:max-w-4xl mx-auto w-full flex items-center justify-between mb-4">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-2xs cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Home / Explore</span>
        </button>

        <button
          onClick={onNavigateToStudentLogin}
          className="flex items-center gap-1.5 text-xs font-semibold text-orange-700 hover:text-orange-800 bg-orange-100/70 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-full transition cursor-pointer"
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Student Portal</span>
        </button>
      </div>

      {/* Main Card */}
      <div className="max-w-md w-full mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden my-auto">
        
        {/* Banner */}
        <div className="bg-gradient-to-br from-amber-600 via-orange-500 to-amber-700 p-7 text-white relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs shadow-inner">
              <ChefHat className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-extrabold text-[10px] tracking-wider uppercase">
                Mess Partner Portal
              </span>
              <h1 className="text-xl font-black tracking-tight mt-0.5">Mess Owner Sign In</h1>
            </div>
          </div>
          <p className="text-orange-100 text-xs mt-3 leading-relaxed">
            Manage your daily subscribers, publish live breakfast, lunch & dinner menus, and scan QR meal passes.
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

          {/* Login Mode Switcher: Anytime OTP vs Password */}
          <div className="flex p-1 bg-slate-100 border border-slate-200 rounded-2xl mb-4">
            <button
              type="button"
              onClick={() => { setLoginMode('OTP'); setErrorMessage(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                loginMode === 'OTP'
                  ? 'bg-white text-orange-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Login with OTP (Anytime)</span>
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('PASSWORD'); setErrorMessage(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                loginMode === 'PASSWORD'
                  ? 'bg-white text-orange-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Password</span>
            </button>
          </div>

          {/* MODE 1: OTP ANYTIME LOGIN */}
          {loginMode === 'OTP' && (
            <div>
              {/* OTP Step 1: Input Email / Mobile */}
              {otpStep === 'INPUT' && (
                <form onSubmit={handleRequestLoginOtp} className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Anytime Partner Access:</strong> Enter your registered mess email or phone number. We'll send a 6-digit authentication code to your registered email, valid for <strong>3 minutes</strong>.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Owner Email or Registered Mobile Number
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="e.g. owner@example.com or 9423490512"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
                  >
                    <span>{loading ? 'Sending Login Code...' : 'Send Login OTP (Valid 3 Mins)'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* OTP Step 2: Enter 6-Digit Code */}
              {otpStep === 'VERIFY' && (
                <form onSubmit={handleVerifyLoginOtp} className="space-y-4 animate-in fade-in duration-200">
                  {/* Delivery Notice & 3-Min Timer */}
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5 text-amber-800">
                        <Mail className="w-4 h-4 text-orange-600" />
                        Login Code Sent to Email
                      </span>
                      <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-mono font-bold text-[11px] ${
                        timeLeft <= 30 ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-amber-100 text-amber-800'
                      }`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatTimer(timeLeft)}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-amber-700 mt-1.5">
                      A 6-digit code has been sent to <strong>{resolvedEmail}</strong>. Strictly valid for <strong>3 minutes</strong>.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 text-center">
                      Enter 6-Digit Login Code
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

                  <button
                    type="submit"
                    disabled={loading || timeLeft <= 0 || otp.length < 4}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{loading ? 'Verifying...' : 'Verify OTP & Open Mess Hub'}</span>
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setOtpStep('INPUT')}
                      className="text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Use Different Email / Mobile</span>
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleResendLoginOtp}
                      className="text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 disabled:opacity-50 hover:underline cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resend Code</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* MODE 2: PASSWORD LOGIN */}
          {loginMode === 'PASSWORD' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Owner Email or Registered Mobile Number
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. owner@example.com or 9423490512"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => onOpenForgotPassword('OWNER', identifier)}
                    className="text-[11px] font-bold text-orange-600 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter partner password"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
              >
                <span>{loading ? 'Authenticating...' : 'Open Mess Owner Hub'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Switch to Signup */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Own a mess or tiffin service?{' '}
              <button
                type="button"
                onClick={onNavigateToSignup}
                className="font-extrabold text-orange-600 hover:underline cursor-pointer"
              >
                Register Your Mess Here
              </button>
            </p>
          </div>

        </div>
      </div>

      <div className="text-center text-[11px] text-slate-400 mt-6">
        MessConnect Business Portal • Growth & Digital Tools for Food Entrepreneurs
      </div>

    </div>
  );
};
