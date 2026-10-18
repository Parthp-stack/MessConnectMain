import React from 'react';
import { AlertTriangle, RefreshCw, Home, Mail, Copy, Check, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';
import { errorTracker, SUPPORT_EMAIL, ADMIN_EMAIL } from '../../utils/errorTracker';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      report: null,
      copied: false,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[MessConnect ErrorBoundary Caught]:', error, errorInfo);
    const report = errorTracker.trackError(error, {
      boundaryName: this.props.name || 'ViewErrorBoundary',
      componentStack: errorInfo?.componentStack || ''
    });
    this.setState({ errorInfo, report });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, report: null });
    window.location.href = '/';
  };

  handleCopy = async () => {
    const report = this.state.report || {
      message: this.state.error?.message || 'Unknown error',
      stack: this.state.error?.stack || '',
      context: { componentStack: this.state.errorInfo?.componentStack }
    };

    const success = await errorTracker.copyReportToClipboard(report);
    if (success) {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 3000);
    }
  };

  render() {
    if (this.state.hasError) {
      const report = this.state.report;
      const mailtoUrl = errorTracker.getMailtoUrl(report || {
        message: this.state.error?.message,
        stack: this.state.error?.stack,
        context: { componentStack: this.state.errorInfo?.componentStack }
      });

      return (
        <div className="min-h-[80vh] bg-slate-50 flex items-center justify-center p-4 text-slate-800 animate-in fade-in">
          <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-5 text-center">
            
            {/* Alert Icon & Heading */}
            <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 font-extrabold text-[11px] uppercase tracking-wider border border-rose-200">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Notice: Some Issue Occurred</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                An Unexpected Error Was Detected
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                MessConnect encountered an issue loading this section. Please report this incident to our engineering team via email so we can investigate and fix it promptly.
              </p>
            </div>

            {/* Incident Summary Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-500">Incident Ticket:</span>
                <span className="font-mono font-bold text-slate-800">{report?.id || 'MC-LOG-' + Date.now().toString().slice(-6)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-500">Support Mail:</span>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="font-bold text-orange-600 hover:underline">
                  {SUPPORT_EMAIL}
                </a>
              </div>
              {this.state.error?.message && (
                <div className="pt-1 border-t border-slate-200/80">
                  <span className="font-bold text-rose-700 block text-[11px] mb-0.5">Error Message:</span>
                  <p className="font-mono text-[11px] text-slate-700 break-all bg-white p-2 rounded-xl border border-slate-200">
                    {this.state.error.message}
                  </p>
                </div>
              )}
            </div>

            {/* Primary Action Buttons */}
            <div className="space-y-2.5 pt-1">
              {/* Report to Mail Button */}
              <a
                href={mailtoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-500/25 transition flex items-center justify-center gap-2 cursor-pointer select-none"
              >
                <Mail className="w-4 h-4 shrink-0" />
                <span>Report to Support Mail ({SUPPORT_EMAIL})</span>
              </a>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Copy Error Details Button */}
                <button
                  type="button"
                  onClick={this.handleCopy}
                  className="py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {this.state.copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-600" />
                      <span>Copy Error Details</span>
                    </>
                  )}
                </button>

                {/* Reload Page Button */}
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-slate-600" />
                  <span>Reload View</span>
                </button>
              </div>

              {/* Return to Home Portal */}
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-2.5 px-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 font-semibold text-xs border border-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return to Home Portal</span>
              </button>
            </div>

            {/* Technical Stack Disclosure */}
            <div className="pt-2 border-t border-slate-100 text-left">
              <button
                type="button"
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer mx-auto"
              >
                <span>{this.state.showDetails ? 'Hide' : 'Show'} Technical Diagnostic Log</span>
                {this.state.showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {this.state.showDetails && (
                <div className="mt-2.5 p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[10px] leading-relaxed max-h-48 overflow-y-auto space-y-1">
                  <div><strong>Timestamp:</strong> {report?.localTime || new Date().toISOString()}</div>
                  <div><strong>URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</div>
                  {this.state.error?.stack && (
                    <div className="mt-2 text-rose-300 whitespace-pre-wrap break-all">
                      {this.state.error.stack}
                    </div>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div className="mt-2 text-amber-200 whitespace-pre-wrap break-all border-t border-slate-800 pt-1">
                      {this.state.errorInfo.componentStack}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
