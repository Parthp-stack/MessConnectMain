import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  ShieldAlert, Lock, Mail, ArrowRight,
  AlertCircle, ChevronLeft, ShieldCheck, KeyRound
} from 'lucide-react';

export const AdminLogin = ({
  onBackToHome,
  onLoginSuccess
}) => {
  const { login } = useAuth();
  const { showToast } = useNotification();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Please enter your admin email or authorization ID.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your admin password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login({
        identifier: identifier.trim(),
        password,
        role: 'ADMIN'
      });
      if (res && res.success) {
        showToast('SuperAdmin session authorized.', 'success', '🔐 Access Granted');
        if (onLoginSuccess) onLoginSuccess(res.user);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Admin authorization failed. Unauthorized access prohibited.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 text-slate-800">
      
      {/* Top Navigation */}
      <div className="max-w-md sm:max-w-lg mx-auto w-full flex items-center justify-between mb-4">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-2xs cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Exit to Public Portal</span>
        </button>

        <span className="flex items-center gap-1.5 text-[11px] font-mono text-indigo-700 font-bold px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200">
          <ShieldAlert className="w-3.5 h-3.5 text-indigo-600" />
          <span>Restricted Portal</span>
        </span>
      </div>

      {/* Main Admin Login Card */}
      <div className="max-w-md w-full mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden my-auto">
        
        {/* Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-7 text-white relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner backdrop-blur-xs">
              <KeyRound className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 font-extrabold text-[10px] tracking-wider uppercase border border-indigo-400/30">
                SuperAdmin Gateway
              </span>
              <h1 className="text-xl font-black tracking-tight mt-0.5">Control Center Sign In</h1>
            </div>
          </div>
          <p className="text-slate-300 text-xs mt-3 leading-relaxed">
            Platform governance, owner verification, FSSAI compliance checks, and platform revenue management.
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Admin Email or Mobile Number
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@messconnect.in or 9423490513"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Security Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter security password"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-indigo-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loading ? 'Verifying Authorization...' : 'Authenticate & Enter Admin Console'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials Helper */}
          <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Admin Support & Lead:</span>
              <span className="font-mono text-indigo-600 font-bold">Parth (9423490513)</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Helpline Representatives:</span>
              <span>Rohit (8766793139) • Shreyash (9309294400)</span>
            </div>
          </div>

        </div>
      </div>

      <div className="text-center text-[11px] text-slate-400 mt-6 font-mono">
        MessConnect Internal Infrastructure • TLS 1.3 Role Guard Enforced
      </div>

    </div>
  );
};
