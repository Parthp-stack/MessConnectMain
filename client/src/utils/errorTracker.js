/**
 * MessConnect Production Error Tracker & Diagnostic Utility
 * Tracks runtime exceptions, unhandled rejections, and view-level failures,
 * persisting diagnostic logs and enabling 1-click email bug reporting.
 */

const STORAGE_KEY = 'messconnect_error_log';
const MAX_LOGS = 50;

export const SUPPORT_EMAIL = 'support@messconnect.in';
export const ADMIN_EMAIL = 'parthmhaske1234@gmail.com';

/**
 * Extract safe user session metadata from localStorage without throwing
 */
function getSafeUserData() {
  if (typeof window === 'undefined') return { id: 'N/A', name: 'Anonymous', role: 'GUEST' };
  try {
    const raw = localStorage.getItem('messconnect_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        id: parsed.id || 'N/A',
        name: parsed.name || 'Anonymous',
        role: parsed.role || 'GUEST',
        email: parsed.email || 'N/A',
        messId: parsed.messId || null
      };
    }
  } catch (_) {}
  return { id: 'N/A', name: 'Anonymous', role: 'GUEST' };
}

/**
 * Extract system environment details
 */
function getSystemContext() {
  if (typeof window === 'undefined') return {};
  return {
    url: window.location.href,
    pathname: window.location.pathname,
    hash: window.location.hash,
    search: window.location.search,
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    screen: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'Unknown'
  };
}

class ErrorTracker {
  constructor() {
    this.memoryLogs = [];
    this.initListeners();
  }

  initListeners() {
    if (typeof window === 'undefined') return;

    // Window global uncaught error handler
    window.addEventListener('error', (event) => {
      // Ignore normal resize observer noise
      if (event?.message?.includes('ResizeObserver')) return;
      this.trackError(event.error || event.message, {
        origin: 'window.onerror',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Unhandled Promise Rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(event.reason || 'Unhandled Promise Rejection', {
        origin: 'window.onunhandledrejection'
      });
    });
  }

  /**
   * Log and track an error with full diagnostic context
   */
  trackError(err, context = {}) {
    const timestamp = new Date().toISOString();
    const localTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const user = getSafeUserData();
    const system = getSystemContext();

    const message = err instanceof Error ? err.message : String(err || 'Unknown Error');
    const stack = err instanceof Error ? (err.stack || '') : '';
    const name = err instanceof Error ? (err.name || 'Error') : (context.origin || 'Error');

    const report = {
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp,
      localTime,
      name,
      message,
      stack,
      context,
      user,
      system
    };

    // 1. Keep in memory
    this.memoryLogs.unshift(report);
    if (this.memoryLogs.length > MAX_LOGS) {
      this.memoryLogs.pop();
    }

    // 2. Persist in localStorage
    try {
      if (typeof window !== 'undefined') {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        stored.unshift(report);
        if (stored.length > MAX_LOGS) stored.pop();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      }
    } catch (_) {}

    // 3. Emit custom event for UI alert integration
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('messconnect:error-occurred', { detail: report }));
      }
    } catch (_) {}

    // 4. Non-blocking silent telemetry dispatch to backend (if available)
    this.dispatchTelemetry(report);

    console.error(`[MessConnect ErrorTracker #${report.id}]:`, report.message, { context, user });
    return report;
  }

  /**
   * Post error telemetry to server /api/support/report-error
   */
  async dispatchTelemetry(report) {
    if (typeof window === 'undefined' || !navigator.onLine) return;
    try {
      await fetch('/api/support/report-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      }).catch(() => {});
    } catch (_) {
      // Telemetry failures must never break execution
    }
  }

  /**
   * Generate formatted text report suitable for copy-pasting or email bodies
   */
  formatReportText(report) {
    if (!report) return '';
    return [
      `================ MESSCONNECT INCIDENT REPORT ================`,
      `Ticket / Incident ID : ${report.id || 'N/A'}`,
      `Recorded At          : ${report.localTime || report.timestamp || new Date().toLocaleString()}`,
      `Error Name           : ${report.name || 'Error'}`,
      `Error Message        : ${report.message || 'No message provided'}`,
      `Component / Context  : ${JSON.stringify(report.context || {})}`,
      ``,
      `--- USER CONTEXT ---`,
      `User ID              : ${report.user?.id || 'N/A'}`,
      `User Name            : ${report.user?.name || 'Anonymous'}`,
      `User Role            : ${report.user?.role || 'GUEST'}`,
      `User Email           : ${report.user?.email || 'N/A'}`,
      ``,
      `--- SYSTEM CONTEXT ---`,
      `Page URL             : ${report.system?.url || (typeof window !== 'undefined' ? window.location.href : 'N/A')}`,
      `Screen Resolution    : ${report.system?.screen || 'N/A'}`,
      `Browser / UserAgent  : ${report.system?.userAgent || 'N/A'}`,
      `Network Status       : ${report.system?.online ? 'Online' : 'Offline'}`,
      ``,
      `--- STACK TRACE ---`,
      report.stack || 'No stack trace captured.',
      `============================================================`
    ].join('\n');
  }

  /**
   * Build pre-filled mailto URL with diagnostic payload
   */
  getMailtoUrl(report, targetEmail = SUPPORT_EMAIL) {
    const errorTitle = (report?.message || 'Unexpected Application Error').replace(/\r?\n.*/g, '').slice(0, 50);
    const subject = encodeURIComponent(`[MessConnect Incident #${report?.id || Date.now()}] ${errorTitle}`);
    
    const bodyText = [
      `Hi MessConnect Support Team,`,
      ``,
      `I encountered an unexpected issue while using MessConnect on Render/Web.`,
      ``,
      `Please investigate this issue and assist me.`,
      ``,
      `--- WHAT I WAS DOING ---`,
      `[ Please briefly describe what action you performed: e.g. logging in, booking a meal, editing menu ]`,
      ``,
      this.formatReportText(report)
    ].join('\n');

    const body = encodeURIComponent(bodyText);
    return `mailto:${targetEmail}?cc=${ADMIN_EMAIL}&subject=${subject}&body=${body}`;
  }

  /**
   * Copy formatted diagnostic report to clipboard
   */
  async copyReportToClipboard(report) {
    const text = this.formatReportText(report);
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (_) {}
    }

    // Fallback using textarea execCommand
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch (_) {
      return false;
    }
  }

  /**
   * Retrieve all recorded errors from localStorage
   */
  getRecentErrors() {
    if (typeof window === 'undefined') return this.memoryLogs;
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return stored;
    } catch (_) {
      return this.memoryLogs;
    }
  }

  /**
   * Clear error logs
   */
  clearLogs() {
    this.memoryLogs = [];
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (_) {}
  }
}

export const errorTracker = new ErrorTracker();
