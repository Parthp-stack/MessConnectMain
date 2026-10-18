import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  Mail, KeyRound, Lock, ArrowLeft, CheckCircle2,
  AlertCircle, ShieldCheck, X
} from 'lucide-react';
import { validatePassword } from '../../utils/passwordValidator';
import { PasswordStrengthIndicator } from '../../components/common/PasswordStrengthIndicator';

export const ForgotPasswordModal = ({
  isOpen,
  onClose,
  initialRole = 'CUSTOMER',
  initialEmail = '',
  onSuccessLogin
}) => {
  const { forgotPassword, resetPassword } = useAuth();
  const { showToast } = useNotification();

  // Steps: 'EMAIL' -> 'OTP' -> 'SUCCESS'
  const [step, setStep] = useState('EMAIL');
  const [email, setEmail] = useState(initialEmail);
  const [role, setRole] = useState(initialRole);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  if (!isOpen) return null;

  // Step 1: Request OTP via email
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid registered email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPassword(email.trim().toLowerCase(), role);
      if (res && res.success) {
        showToast(`Reset code sent to ${email}`, 'success', '🔑 Check Your Email');
        if (res.otp) setOtp(res.otp);
        setStep('OTP');
      } else {
        setErrorMessage(res?.message || 'Could not find an account with this email.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to send reset code. Please verify your email.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and save new password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!otp || otp.trim().length < 4) {
      setErrorMessage('Please enter the 6-digit code received on your email.');
      return;
    }

    setAttemptedSubmit(true);
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.isValid) {
      const msg = `Please satisfy all password rules before proceeding:\n• ${pwCheck.failedRules.map(r => r.label).join('\n• ')}`;
      setErrorMessage(msg);
      showToast('Please satisfy all password rules!', 'error', '⚠️ Weak Password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-type your new password.');
      showToast('Passwords do not match!', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(email.trim().toLowerCase(), otp.trim(), newPassword);
      if (res && res.success) {
        showToast('Password reset successfully! You can now log in.', 'success', '✅ Success');
        setStep('SUCCESS');
      } else {
        setErrorMessage(res?.message || 'Invalid or expired reset code.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-3 backdrop-blur-xs">
            <KeyRound className="w-6 h-6 text-white" />
          </div>

          <h3 className="text-xl font-black tracking-tight">Reset Password</h3>
          <p className="text-orange-100 text-xs mt-1">
            {step === 'EMAIL' && `Enter your registered email for ${role === 'OWNER' ? 'Mess Owner' : 'Student'} account`}
            {step === 'OTP' && 'Verify the 6-digit code & set your new password'}
            {step === 'SUCCESS' && 'Password updated successfully!'}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Enter Email */}
          {step === 'EMAIL' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rahul.student@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  We'll send a 6-digit verification code to reset your password.
                </p>
              </div>

              {/* Account role toggle */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-semibold text-slate-600">Account Type:</span>
                <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setRole('CUSTOMER')}
                    className={`px-3 py-1 rounded-lg font-bold text-[11px] transition ${
                      role === 'CUSTOMER' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('OWNER')}
                    className={`px-3 py-1 rounded-lg font-bold text-[11px] transition ${
                      role === 'OWNER' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Mess Owner
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Sending Code...' : 'Send Verification Code'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Enter OTP & New Password */}
          {step === 'OTP' && (
            <form onSubmit={handleResetPassword} className="space-y-4">

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter code (e.g. 482190)"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                  <span>Sent to {email}</span>
                  <button
                    type="button"
                    onClick={() => setStep('EMAIL')}
                    className="text-orange-600 hover:underline font-semibold"
                  >
                    Change Email
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="e.g. Pass@1234 (8+ chars)"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Password Strength & Rules Checklist */}
              <PasswordStrengthIndicator
                password={newPassword}
                hasAttemptedSubmit={attemptedSubmit}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Resetting Password...' : 'Save New Password & Log In'}
              </button>
            </form>
          )}

          {/* STEP 3: SUCCESS */}
          {step === 'SUCCESS' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">Password Updated!</h4>
                <p className="text-slate-500 text-xs mt-1">
                  Your new password is now active in the database. You can log in securely.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  if (onSuccessLogin) onSuccessLogin(email);
                }}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-orange-500/20 transition"
              >
                Proceed to Login
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
