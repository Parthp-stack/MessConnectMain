import React, { useState, useEffect } from 'react';
import { AlertCircle, Mail, Copy, Check, X } from 'lucide-react';
import { errorTracker, SUPPORT_EMAIL } from '../../utils/errorTracker';

export const GlobalErrorAlert = () => {
  const [activeError, setActiveError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleEvent = (e) => {
      if (e?.detail) {
        setActiveError(e.detail);
      }
    };

    window.addEventListener('messconnect:error-occurred', handleEvent);
    return () => window.removeEventListener('messconnect:error-occurred', handleEvent);
  }, []);

  if (!activeError) return null;

  const mailtoUrl = errorTracker.getMailtoUrl(activeError);

  const handleCopy = async () => {
    const success = await errorTracker.copyReportToClipboard(activeError);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-4 duration-200">
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-700/80 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Notice: An Issue Was Detected</h4>
              <p className="text-[11px] text-slate-300 line-clamp-1">
                {activeError.message || 'Unexpected application runtime issue'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveError(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-[10px] text-slate-400">
          If this issue prevents you from proceeding, report it to our engineering team at <strong className="text-orange-400">{SUPPORT_EMAIL}</strong>.
        </div>

        <div className="flex items-center gap-2 pt-1">
          <a
            href={mailtoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Report via Mail</span>
          </a>

          <button
            onClick={handleCopy}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 transition flex items-center justify-center gap-1"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            onClick={() => setActiveError(null)}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[11px] transition"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
