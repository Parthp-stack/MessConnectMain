import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  QrCode, Users, CheckCircle2, XCircle, Clock, Calendar,
  RefreshCw, Search, SlidersHorizontal, Download, TrendingUp,
  AlertTriangle, StopCircle, BarChart3, Sparkles, Check, Zap,
  Eye, RotateCw, MapPin, Shield, ShieldCheck, Settings, FileText, Send,
  UserCheck, ChevronRight, X, AlertCircle, Printer
} from 'lucide-react';

export const OwnerAttendanceManager = () => {
  const { currentUser } = useAuth();
  const { showToast } = useNotification();

  // Active mess ID & name
  const messId = currentUser?.messId;
  const messName = currentUser?.messName || 'Partner Mess';

  // Navigation tab state
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'roster' | 'analytics' | 'reports' | 'audit' | 'settings'

  // State: QR Generation & Active Session
  const [selectedSessionType, setSelectedSessionType] = useState(() => {
    const hr = new Date().getHours();
    if (hr < 11) return 'Breakfast';
    if (hr < 16) return 'Lunch';
    return 'Dinner';
  });
  const [expiryMinutes, setExpiryMinutes] = useState(15);
  const [activeSession, setActiveSession] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [closing, setClosing] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // QR Mode: 'lifetime' (permanent counter standee) or 'session' (timed dynamic QR)
  const [qrMode, setQrMode] = useState('lifetime');

  // Canvas refs for drawing QR codes
  const canvasRef = useRef(null);
  const lifetimeCanvasRef = useRef(null);

  // State: Roster & Filters
  const [rosterData, setRosterData] = useState({
    totalStudents: 0,
    presentCount: 0,
    absentCount: 0,
    attendancePercentage: 0,
    lowAttendanceCount: 0,
    records: []
  });
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterSession, setFilterSession] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // State: Analytics
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // State: Settings
  const [settings, setSettings] = useState({
    breakfastStart: "07:30",
    breakfastEnd: "10:30",
    lunchStart: "12:00",
    lunchEnd: "15:30",
    dinnerStart: "19:30",
    dinnerEnd: "22:30",
    enforceSessionTiming: false,
    locationVerificationEnabled: false,
    allowedRadiusMeters: 150,
    autoRotateQr: true,
    qrRotationIntervalMinutes: 5,
    lowAttendanceThreshold: 75
  });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // State: Audit Logs
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');

  // State: Reports
  const [reportDateRange, setReportDateRange] = useState('week'); // 'today' | 'week' | 'month' | 'custom'
  const [reportStartDate, setReportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reportSession, setReportSession] = useState('ALL');
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // State: Modals
  const [selectedStudentProfile, setSelectedStudentProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [correctionTarget, setCorrectionTarget] = useState(null); // student row
  const [correctionStatus, setCorrectionStatus] = useState('PRESENT');
  const [correctionReason, setCorrectionReason] = useState('');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);

  // Polling ref
  const pollTimerRef = useRef(null);

  // 1. Fetch current active session
  const checkActiveSession = async () => {
    if (!messId) return;
    try {
      const res = await api.getActiveAttendanceSession(messId);
      if (res && res.active && res.session) {
        setActiveSession(res.session);
        setRemainingSeconds(res.session.remainingSeconds || 0);
      } else {
        setActiveSession(null);
        setRemainingSeconds(0);
      }
    } catch (e) {
      console.warn('[OwnerAttendanceManager] Error checking active session:', e);
    }
  };

  // 2. Fetch Roster
  const fetchRoster = async (isBackgroundPoll = false) => {
    if (!messId) return;
    if (!isBackgroundPoll) setLoadingRoster(true);
    try {
      const res = await api.getOwnerAttendanceRoster({
        messId,
        date: filterDate,
        sessionType: filterSession,
        status: filterStatus,
        search: searchQuery
      });
      if (res && res.success) {
        setRosterData({
          totalStudents: res.totalStudents || 0,
          presentCount: res.presentCount || 0,
          absentCount: res.absentCount || 0,
          attendancePercentage: res.attendancePercentage || 0,
          lowAttendanceCount: res.lowAttendanceCount || 0,
          records: res.records || []
        });
      }
    } catch (e) {
      console.warn('[OwnerAttendanceManager] Error loading roster:', e);
    } finally {
      if (!isBackgroundPoll) setLoadingRoster(false);
    }
  };

  // 3. Fetch Analytics
  const fetchAnalytics = async () => {
    if (!messId) return;
    setLoadingAnalytics(true);
    try {
      const res = await api.getOwnerAttendanceAnalytics(messId);
      if (res && res.success) {
        setAnalytics(res);
      }
    } catch (e) {
      console.warn('[OwnerAttendanceManager] Error loading analytics:', e);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // 4. Fetch Settings
  const fetchSettings = async () => {
    if (!messId) return;
    setLoadingSettings(true);
    try {
      const res = await api.getAttendanceSettings(messId);
      if (res && res.success && res.settings) {
        setSettings(res.settings);
      }
    } catch (e) {
      console.warn('[OwnerAttendanceManager] Error loading settings:', e);
    } finally {
      setLoadingSettings(false);
    }
  };

  // 5. Fetch Audit Logs
  const fetchAuditLogs = async () => {
    if (!messId) return;
    setLoadingAudit(true);
    try {
      const res = await api.getAttendanceAuditLogs({
        messId,
        action: auditActionFilter !== 'ALL' ? auditActionFilter : ''
      });
      if (res && res.success) {
        setAuditLogs(res.logs || []);
      }
    } catch (e) {
      console.warn('[OwnerAttendanceManager] Error loading audit logs:', e);
    } finally {
      setLoadingAudit(false);
    }
  };

  // 6. Fetch Reports
  const fetchReports = async () => {
    if (!messId) return;
    setLoadingReport(true);
    try {
      const res = await api.getAttendanceReports({
        messId,
        startDate: reportStartDate,
        endDate: reportEndDate,
        sessionType: reportSession !== 'ALL' ? reportSession : ''
      });
      if (res && res.success) {
        setReportData(res);
      }
    } catch (e) {
      console.warn('[OwnerAttendanceManager] Error loading reports:', e);
    } finally {
      setLoadingReport(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (messId) {
      checkActiveSession();
      fetchRoster();
      fetchAnalytics();
      fetchSettings();
    }
  }, [messId, filterDate, filterSession, filterStatus]);

  // Tab switch effect
  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    } else if (activeTab === 'reports') {
      fetchReports();
    } else if (activeTab === 'settings') {
      fetchSettings();
    }
  }, [activeTab, auditActionFilter, reportStartDate, reportEndDate, reportSession]);

  // Handle Search Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchRoster();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Countdown timer for active session
  useEffect(() => {
    if (!activeSession) return;

    const timer = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          checkActiveSession();
          fetchRoster(true);
          fetchAnalytics();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSession]);

  // Real-time Polling: updates present count and roster every 3.5 seconds
  useEffect(() => {
    if (!messId) return;

    pollTimerRef.current = setInterval(async () => {
      try {
        const live = await api.getOwnerAttendanceLiveSummary(
          messId,
          filterSession !== 'ALL' ? filterSession : '',
          filterDate
        );

        if (live && live.success) {
          setRosterData(prev => ({
            ...prev,
            totalStudents: live.totalStudents,
            presentCount: live.presentCount,
            absentCount: live.absentCount,
            attendancePercentage: live.attendancePercentage
          }));

          if (live.activeSession && !activeSession) {
            checkActiveSession();
          } else if (!live.activeSession && activeSession) {
            setActiveSession(null);
            fetchRoster(true);
          }
        }
      } catch (err) {
        // Polling silent
      }
    }, 3500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [messId, filterDate, filterSession, activeSession]);

  // Render QR Code to canvas whenever activeSession changes
  useEffect(() => {
    if (activeSession && canvasRef.current && activeSession.qrPayload) {
      QRCode.toCanvas(
        canvasRef.current,
        activeSession.qrPayload,
        {
          width: 240,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          }
        },
        (error) => {
          if (error) console.error('[OwnerAttendanceManager] QR generation error:', error);
        }
      );
    }
  }, [activeSession]);

  // Render Lifetime Permanent Counter QR
  useEffect(() => {
    if (messId && lifetimeCanvasRef.current) {
      QRCode.toCanvas(
        lifetimeCanvasRef.current,
        `MESS_LIFETIME:${messId}`,
        {
          width: 240,
          margin: 2,
          color: {
            dark: '#ea580c',
            light: '#ffffff'
          }
        },
        (error) => {
          if (error) console.error('[OwnerAttendanceManager] Lifetime QR error:', error);
        }
      );
    }
  }, [messId, qrMode]);

  // Handler: Print Lifetime Acrylic Standee
  const handlePrintLifetimeStandee = () => {
    const canvas = lifetimeCanvasRef.current;
    if (!canvas) return;
    const qrDataUrl = canvas.toDataURL();
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Popup blocked. Please allow popups to print standee.', 'error');
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${messName} - Lifetime Attendance Standee</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 40px; margin: 0; background: #fff; }
            .card { border: 4px solid #ea580c; border-radius: 28px; padding: 36px 28px; max-width: 440px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
            .badge { display: inline-block; background: #ea580c; color: #fff; font-weight: 800; padding: 6px 16px; border-radius: 9999px; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px; }
            h1 { margin: 6px 0; font-size: 26px; font-weight: 900; color: #0f172a; }
            p { margin: 4px 0 20px; font-size: 13px; color: #64748b; }
            img { width: 230px; height: 230px; border-radius: 20px; border: 2px solid #fed7aa; padding: 8px; background: #fff; }
            .timings { background: #fff7ed; border: 1.5px dashed #fdba74; border-radius: 18px; padding: 14px; margin-top: 22px; font-size: 12px; color: #9a3412; font-weight: 700; line-height: 1.7; }
            .footer { margin-top: 22px; font-size: 11px; color: #94a3b8; font-weight: 600; line-height: 1.4; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">Official Counter Standee</div>
            <h1>${messName}</h1>
            <p>Scan with MessConnect App to mark your daily meal attendance</p>
            <img src="${qrDataUrl}" alt="Lifetime Mess QR Standee" />
            <div class="timings">
              <div>🍳 Breakfast: 07:30 AM – 10:30 AM</div>
              <div>🍛 Lunch: 12:00 PM – 03:30 PM</div>
              <div>🍲 Dinner: 07:30 PM – 10:30 PM</div>
            </div>
            <div class="footer">
              MessConnect • MITAOE Alandi Flagship Edition<br/>
              Automated Session Recognition • Duplicate Scans Blocked
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Handler: Generate Attendance QR
  const handleGenerateQR = async () => {
    if (!messId) {
      showToast('Mess profile not found', 'error');
      return;
    }

    setGenerating(true);
    try {
      const res = await api.createAttendanceSession({
        messId,
        sessionType: selectedSessionType,
        expiryMinutes
      });

      if (res && res.success) {
        setActiveSession(res.session);
        setRemainingSeconds(res.session.durationMinutes * 60);
        showToast(
          `${selectedSessionType} Attendance QR generated! Valid for ${expiryMinutes} minutes.`,
          'success',
          '⚡ Live QR Generated'
        );
        fetchRoster();
        fetchAnalytics();
      }
    } catch (err) {
      showToast(err.message || 'Failed to generate QR code', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Handler: Rotate QR Token
  const handleRotateQR = async () => {
    if (!messId || !activeSession) return;
    setRotating(true);
    try {
      const res = await api.rotateAttendanceQr(messId, activeSession.sessionType, activeSession.date);
      if (res && res.success) {
        setActiveSession(res.session);
        setRemainingSeconds(res.session.remainingSeconds || 300);
        showToast('QR Token rotated successfully. Old QR immediately invalidated.', 'success', '🔄 QR Rotated');
      }
    } catch (err) {
      showToast(err.message || 'Failed to rotate QR', 'error');
    } finally {
      setRotating(false);
    }
  };

  // Handler: Close Session Early
  const handleCloseSession = async () => {
    if (!activeSession) return;
    setClosing(true);
    try {
      const res = await api.closeAttendanceSession({
        sessionId: activeSession.id,
        messId
      });

      if (res && res.success) {
        setActiveSession(null);
        setRemainingSeconds(0);
        showToast(
          'Session closed. Students who did not mark attendance are now recorded as ABSENT.',
          'info',
          '🛑 Session Ended'
        );
        fetchRoster();
        fetchAnalytics();
      }
    } catch (err) {
      showToast(err.message || 'Failed to close session', 'error');
    } finally {
      setClosing(false);
    }
  };

  // Handler: Save Settings
  const handleSaveSettings = async (e) => {
    e?.preventDefault();
    if (!messId) return;
    setSavingSettings(true);
    try {
      const res = await api.updateAttendanceSettings(messId, settings);
      if (res && res.success) {
        showToast('Attendance configuration saved successfully!', 'success', '⚙️ Settings Updated');
        setSettings(res.settings);
      }
    } catch (err) {
      showToast(err.message || 'Failed to update settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Handler: Open Student Profile Modal
  const handleOpenStudentProfile = async (studentId) => {
    if (!messId || !studentId) return;
    setLoadingProfile(true);
    setShowProfileModal(true);
    try {
      const res = await api.getStudentAttendanceProfile(messId, studentId);
      if (res && res.success) {
        setSelectedStudentProfile(res.profile);
      }
    } catch (err) {
      showToast('Failed to load student attendance profile', 'error');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Handler: Open Manual Correction Modal
  const handleOpenCorrection = (studentRow) => {
    setCorrectionTarget(studentRow);
    setCorrectionStatus(studentRow.status === 'PRESENT' ? 'ABSENT' : 'PRESENT');
    setCorrectionReason('');
    setShowCorrectionModal(true);
  };

  // Handler: Submit Manual Correction
  const handleSubmitCorrection = async () => {
    if (!correctionReason.trim()) {
      showToast('Mandatory reason is required to correct attendance.', 'error', '⚠️ Reason Required');
      return;
    }
    if (!correctionTarget) return;

    setSubmittingCorrection(true);
    try {
      const res = await api.correctAttendance({
        messId,
        studentId: correctionTarget.studentId,
        date: correctionTarget.date || filterDate,
        sessionType: correctionTarget.sessionType || (filterSession !== 'ALL' ? filterSession : 'Lunch'),
        status: correctionStatus,
        reason: correctionReason.trim()
      });

      if (res && res.success) {
        showToast(`Attendance marked as ${correctionStatus} for ${correctionTarget.studentName}`, 'success', '✅ Corrected');
        setShowCorrectionModal(false);
        fetchRoster();
        fetchAnalytics();
        if (selectedStudentProfile && selectedStudentProfile.studentId === correctionTarget.studentId) {
          handleOpenStudentProfile(correctionTarget.studentId);
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to correct attendance', 'error');
    } finally {
      setSubmittingCorrection(false);
    }
  };

  // Handler: Send Low Attendance Warning Notice
  const handleSendWarning = async (studentId, studentName, percentage) => {
    if (!messId || !studentId) return;
    try {
      const res = await api.sendLowAttendanceWarning({
        messId,
        studentId,
        percentage,
        threshold: settings.lowAttendanceThreshold || 75
      });
      if (res && res.success) {
        showToast(`Warning notice sent to ${studentName}`, 'success', '📨 Notice Sent');
      }
    } catch (err) {
      showToast('Failed to send notice', 'error');
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper to determine if a session window is active
  const isSessionTimingActive = (sessionType) => {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const parseM = (tStr) => {
      if (!tStr) return 0;
      const [h, m] = tStr.split(':').map(Number);
      return h * 60 + m;
    };

    let start = 0, end = 0;
    if (sessionType === 'Breakfast') {
      start = parseM(settings.breakfastStart);
      end = parseM(settings.breakfastEnd);
    } else if (sessionType === 'Lunch') {
      start = parseM(settings.lunchStart);
      end = parseM(settings.lunchEnd);
    } else {
      start = parseM(settings.dinnerStart);
      end = parseM(settings.dinnerEnd);
    }

    return currentMins >= start && currentMins <= end;
  };

  // Export Roster as CSV
  const handleExportCSV = (rowsToExport = null) => {
    const targetRows = rowsToExport || rosterData.records;
    if (!targetRows || targetRows.length === 0) {
      showToast('No roster records to export', 'info');
      return;
    }

    const headers = ['Student Name', 'Student ID', 'Session', 'Date', 'Status', 'Time', 'Overall Attendance %'];
    const rows = targetRows.map(r => [
      `"${r.studentName}"`,
      `"${r.displayId || r.studentId}"`,
      `"${r.sessionType || filterSession}"`,
      `"${r.date || filterDate}"`,
      `"${r.status}"`,
      `"${r.time || '-'}"`,
      `"${r.overallAttendancePct || 100}%"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Report_${messName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Attendance CSV downloaded successfully!', 'success', '📄 Roster Exported');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">

      {/* ========================================================= */}
      {/* 1. TOP HEADER & TABS BAR                                  */}
      {/* ========================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-600" />
            <span>Attendance Center</span>
            <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-extrabold">
              Phase 2
            </span>
          </h3>
          <p className="text-xs text-slate-500">
            Live QR generator, biometric/GPS security, student profiles, audit trails & reports
          </p>
        </div>

        {/* Live sync badge & refresh */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>● LIVE SYNC</span>
          </span>

          <button
            onClick={() => {
              checkActiveSession();
              fetchRoster();
              fetchAnalytics();
              if (activeTab === 'audit') fetchAuditLogs();
              if (activeTab === 'reports') fetchReports();
            }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="Manual Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl overflow-x-auto text-xs font-bold scrollbar-none">
        {[
          { id: 'live', label: '⚡ Live & QR', icon: QrCode },
          { id: 'roster', label: `📋 Student Roster (${rosterData.totalStudents})`, icon: Users },
          { id: 'analytics', label: '📈 Analytics & Watchlist', icon: TrendingUp },
          { id: 'reports', label: '📊 Reports & Export', icon: FileText },
          { id: 'audit', label: '🛡️ Audit Trail', icon: Shield },
          { id: 'settings', label: '⚙️ Settings', icon: Settings }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap transition ${
                isActive
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4 KPI Cards (Always visible for quick glance) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-xs">
          <div className="text-xs font-semibold text-slate-400">Total Students</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            {rosterData.totalStudents}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Subscribed Members</div>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-xs">
          <div className="text-xs font-semibold text-slate-400">Present Today</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1 flex items-baseline gap-1.5">
            <span>{rosterData.presentCount}</span>
            <span className="text-xs font-semibold text-emerald-700">Verified</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Marked attendance</div>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-xs">
          <div className="text-xs font-semibold text-slate-400">Absent / Unmarked</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 mt-1">
            {rosterData.absentCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Yet to dine / missed</div>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-xs">
          <div className="text-xs font-semibold text-slate-400">Attendance Rate</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-orange-600 mt-1">
            {rosterData.attendancePercentage}%
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>{rosterData.attendancePercentage >= (settings.lowAttendanceThreshold || 75) ? 'Healthy Turnout' : 'Lower Turnout'}</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: LIVE QR GENERATION & ACTIVE SESSION                */}
      {/* ========================================================= */}
      {activeTab === 'live' && (
        <div className="space-y-4">
          
          {/* Meal Timing Window Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { type: 'Breakfast', time: `${settings.breakfastStart} — ${settings.breakfastEnd}` },
              { type: 'Lunch', time: `${settings.lunchStart} — ${settings.lunchEnd}` },
              { type: 'Dinner', time: `${settings.dinnerStart} — ${settings.dinnerEnd}` }
            ].map(m => {
              const isActive = isSessionTimingActive(m.type);
              const isSelected = selectedSessionType === m.type;
              return (
                <div
                  key={m.type}
                  onClick={() => !activeSession && setSelectedSessionType(m.type)}
                  className={`p-4 rounded-3xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-orange-50/70 border-orange-300 ring-2 ring-orange-400/20'
                      : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900">{m.type}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {isActive ? '🟢 Active Window' : '⚪ Not Active'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-1">{m.time}</div>
                </div>
              );
            })}
          </div>

          {/* ATTENDANCE QR GENERATOR & LIFETIME STANDEE */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-orange-600" />
                  <span>ENTRANCE ATTENDANCE QR</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {qrMode === 'lifetime'
                    ? 'Permanent Counter Standee • Automatically recognizes Breakfast, Lunch & Dinner by clock time'
                    : 'Rotates automatically with one-time cryptographically secure tokens'}
                </p>
              </div>

              {/* QR Mode Switcher */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs">
                <button
                  onClick={() => setQrMode('lifetime')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                    qrMode === 'lifetime'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Permanent Lifetime Standee</span>
                  <span className="text-[9px] px-1 py-0.2 rounded-full bg-white/20 text-white uppercase font-black">Recommended</span>
                </button>
                <button
                  onClick={() => setQrMode('session')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                    qrMode === 'session'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Timed Session QR</span>
                </button>
              </div>
            </div>

            {/* IF LIFETIME QR MODE */}
            {qrMode === 'lifetime' ? (
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200 shadow-inner flex flex-col md:flex-row items-center justify-between gap-6">
                
                {/* Canvas Lifetime Standee QR */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="p-3 bg-white rounded-2xl shadow-md border border-orange-200 inline-block">
                    <canvas ref={lifetimeCanvasRef} className="rounded-xl"></canvas>
                  </div>
                  <span className="text-[10px] font-bold text-orange-800 tracking-wider uppercase mt-2 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
                    <span>Lifetime Permanent Counter Standee</span>
                  </span>
                </div>

                {/* Lifetime Standee Info & Print CTA */}
                <div className="flex-1 space-y-3.5 text-center md:text-left">
                  <div>
                    <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                      <span>Never Expires • Lifetime Standee</span>
                    </span>
                    <h4 className="text-lg font-black text-slate-900 mt-2">
                      Print Once, Keep at Your Counter For Life
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Place this QR code on an acrylic standee or laminated card at your entrance. Students scan it from their MessConnect app to check in. You never need to regenerate or touch the scanner again.
                    </p>
                  </div>

                  {/* Meal Timings Auto-Detection Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-white/90 border border-orange-200/80">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Breakfast Window</div>
                      <div className="font-extrabold text-slate-800 text-xs mt-0.5">07:30 AM – 10:30 AM</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/90 border border-orange-200/80">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Lunch Window</div>
                      <div className="font-extrabold text-slate-800 text-xs mt-0.5">12:00 PM – 03:30 PM</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/90 border border-orange-200/80">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Dinner Window</div>
                      <div className="font-extrabold text-slate-800 text-xs mt-0.5">07:30 PM – 10:30 PM</div>
                    </div>
                  </div>

                  {/* Anti-Fraud & Realtime Alert Note */}
                  <div className="flex items-center gap-2 text-[11px] text-orange-950 font-medium">
                    <span>🛡️ Duplicate scans for the same meal session are blocked automatically.</span>
                  </div>

                  {/* Print Button */}
                  <div className="pt-1">
                    <button
                      onClick={handlePrintLifetimeStandee}
                      className="px-5 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center md:justify-start gap-2 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Official Counter Standee</span>
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              /* DYNAMIC TIMED SESSION QR */
              activeSession ? (
                <div className="p-5 rounded-3xl bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200 shadow-inner flex flex-col md:flex-row items-center justify-between gap-6">
                
                {/* Canvas QR Code Display */}
                <div className="flex flex-col items-center">
                  <div className="p-3 bg-white rounded-2xl shadow-md border border-orange-200 inline-block">
                    <canvas ref={canvasRef} className="rounded-xl"></canvas>
                  </div>
                  <span className="text-[10px] font-bold text-orange-700 tracking-wider uppercase mt-2 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-orange-600" />
                    <span>Cryptographic Dynamic QR</span>
                  </span>
                </div>

                {/* Session Info & Controls */}
                <div className="flex-1 space-y-3 text-center md:text-left">
                  <div>
                    <span className="px-3 py-1 rounded-full bg-orange-600 text-white font-extrabold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                      <span>{activeSession.sessionType} Session Active</span>
                    </span>
                    <h4 className="text-lg font-extrabold text-slate-900 mt-2">
                      Ready for Student Check-In
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Display this QR at your mess entrance or counter. Old tokens are rejected upon rotation.
                    </p>
                  </div>

                  {/* Countdown Timer & Expiry */}
                  <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
                    <div className="p-3 rounded-2xl bg-white/90 border border-orange-200/80 inline-flex items-center gap-3 shadow-2xs">
                      <Clock className="w-5 h-5 text-orange-600 shrink-0" />
                      <div className="text-left">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Expires In</div>
                        <div className="text-lg font-mono font-extrabold text-slate-900 leading-tight">
                          {formatTime(remainingSeconds)}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/90 border border-orange-200/80 inline-flex items-center gap-3 shadow-2xs">
                      <Users className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div className="text-left">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Scanned Count</div>
                        <div className="text-lg font-extrabold text-emerald-800 leading-tight">
                          {rosterData.presentCount} / {rosterData.totalStudents}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 justify-center md:justify-start">
                    <button
                      onClick={handleRotateQR}
                      disabled={rotating}
                      className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${rotating ? 'animate-spin' : ''}`} />
                      <span>{rotating ? 'Rotating Token...' : 'Rotate QR Token Now'}</span>
                    </button>

                    <button
                      onClick={handleCloseSession}
                      disabled={closing}
                      className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                      <span>{closing ? 'Ending...' : 'End / Close Session'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Generate Session Controls */
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  
                  {/* Session Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      1. Meal Session:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {['Breakfast', 'Lunch', 'Dinner'].map(s => (
                        <button
                          key={s}
                          onClick={() => setSelectedSessionType(s)}
                          className={`py-2 px-2 rounded-xl text-xs font-extrabold transition border ${
                            selectedSessionType === s
                              ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Expiry Duration */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      2. QR Rotation Duration:
                    </label>
                    <select
                      value={expiryMinutes}
                      onChange={(e) => setExpiryMinutes(parseInt(e.target.value, 10))}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                      <option value={2}>2 Minutes (High Security)</option>
                      <option value={5}>5 Minutes (Recommended)</option>
                      <option value={10}>10 Minutes</option>
                      <option value={15}>15 Minutes</option>
                      <option value={30}>30 Minutes</option>
                    </select>
                  </div>

                  {/* Generate Button */}
                  <div className="md:pt-5">
                    <button
                      onClick={handleGenerateQR}
                      disabled={generating}
                      className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      <span>{generating ? 'Generating Token...' : `Generate ${selectedSessionType} QR`}</span>
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 text-center">
                  🔒 The generated QR contains a dynamic temporary token valid only for this session. Geofencing is {settings.locationVerificationEnabled ? 'active (' + settings.allowedRadiusMeters + 'm radius)' : 'optional'}.
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: STUDENT ROSTER (WITH PROFILE MODAL & CORRECTION)   */}
      {/* ========================================================= */}
      {activeTab === 'roster' && (
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-600" />
                <span>Student Attendance Roster</span>
              </h3>
              <p className="text-xs text-slate-500">
                Click any student row to view complete profile, historical matrix, or perform manual correction
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportCSV()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Filter Controls Bar */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Filter Date
              </label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Session
              </label>
              <select
                value={filterSession}
                onChange={(e) => setFilterSession(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
              >
                <option value="ALL">All Sessions</option>
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Status / Flag
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
              >
                <option value="ALL">All (Present + Absent)</option>
                <option value="PRESENT">✅ Present Only</option>
                <option value="ABSENT">❌ Absent Only</option>
                <option value="LOW_ATTENDANCE">⚠️ Low Attendance (&lt;{settings.lowAttendanceThreshold || 75}%)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Search Student
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Student name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          {/* Roster Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-3 sm:px-4">Student Name</th>
                  <th className="p-3 sm:px-4">Student ID</th>
                  <th className="p-3 sm:px-4">Session</th>
                  <th className="p-3 sm:px-4">Overall %</th>
                  <th className="p-3 sm:px-4">Status</th>
                  <th className="p-3 sm:px-4">Time</th>
                  <th className="p-3 sm:px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loadingRoster ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange-500 mb-2" />
                      <span>Loading attendance records...</span>
                    </td>
                  </tr>
                ) : rosterData.records.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      No attendance records match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  rosterData.records.map((row) => {
                    const isPresent = row.status === 'PRESENT';
                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50/70 transition cursor-pointer"
                        onClick={() => handleOpenStudentProfile(row.studentId)}
                      >
                        <td className="p-3 sm:px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{row.studentName}</span>
                            {row.isLowAttendance && (
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[9px] font-extrabold" title="Attendance below threshold">
                                ⚠️ Low
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 sm:px-4 font-mono text-[11px] text-slate-500">
                          {row.displayId || row.studentId}
                        </td>
                        <td className="p-3 sm:px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {row.sessionType}
                          </span>
                        </td>
                        <td className="p-3 sm:px-4">
                          <span className={`font-bold ${
                            row.overallAttendancePct < (settings.lowAttendanceThreshold || 75)
                              ? 'text-rose-600'
                              : 'text-emerald-700'
                          }`}>
                            {row.overallAttendancePct}%
                          </span>
                        </td>
                        <td className="p-3 sm:px-4">
                          {isPresent ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Present</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-200">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Absent</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 sm:px-4 font-mono text-slate-500">
                          {isPresent ? (row.time || '12:30 PM') : '—'}
                        </td>
                        <td className="p-3 sm:px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCorrection(row);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600 text-[11px] font-bold transition"
                            title="Manually Correct Status"
                          >
                            Correct
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between text-xs text-slate-500">
            <span>Showing {rosterData.records.length} student entries</span>
            <span className="font-semibold text-slate-700">
              Low Attendance Watchlist: {rosterData.lowAttendanceCount} students
            </span>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: ADVANCED ANALYTICS & LOW ATTENDANCE WATCHLIST      */}
      {/* ========================================================= */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            
            {/* Rate Highlights */}
            <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-xs space-y-3">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
                Periodical Turnout
              </h4>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Today's Attendance:</span>
                  <span className="font-extrabold text-slate-900">{analytics.todayAttendancePct}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-orange-500 h-1.5 rounded-full"
                    style={{ width: `${Math.min(100, analytics.todayAttendancePct)}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-600">Weekly Average:</span>
                  <span className="font-extrabold text-emerald-700">{analytics.weekAttendancePct}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full"
                    style={{ width: `${Math.min(100, analytics.weekAttendancePct)}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-600">Monthly Average:</span>
                  <span className="font-extrabold text-indigo-700">{analytics.monthAttendancePct}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-1.5 rounded-full"
                    style={{ width: `${Math.min(100, analytics.monthAttendancePct)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Session Breakdown */}
            <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-xs space-y-3">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
                Meal Turnout Breakdown
              </h4>
              <div className="space-y-3 text-xs">
                {['Breakfast', 'Lunch', 'Dinner'].map(s => {
                  const b = analytics.sessionBreakdown?.[s] || { present: 0, absent: 0, total: 1, pct: 0 };
                  return (
                    <div key={s} className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>{s}</span>
                        <span className="text-orange-600">{b.present} Present ({b.pct}%)</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex justify-between">
                        <span>Absent: {b.absent}</span>
                        <span>Total: {b.total}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 7-Day Trend */}
            <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
                  7-Day Attendance Trend
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Daily attendance % over the past week</p>
              </div>

              <div className="flex items-end justify-between gap-1.5 h-28 pt-2">
                {analytics.recentDays?.map(d => (
                  <div key={d.fullDate} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-[9px] font-bold text-slate-500">{d.pct}%</div>
                    <div className="w-full bg-slate-100 rounded-t-md h-20 flex items-end overflow-hidden">
                      <div
                        className="w-full bg-gradient-to-t from-orange-600 to-amber-500 rounded-t-md transition-all duration-500"
                        style={{ height: `${Math.max(5, d.pct)}%` }}
                        title={`${d.date}: ${d.present}/${d.total} (${d.pct}%)`}
                      ></div>
                    </div>
                    <span className="text-[9px] font-semibold text-slate-400 truncate w-full text-center">
                      {d.date.split(' ')[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Low Attendance Watchlist Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Low Attendance Watchlist (&lt;{analytics.lowAttendanceThreshold || 75}%)</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Students identified as at-risk of attendance deficiency. Click 'Send Notice' to alert them.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                {analytics.lowAttendanceCount} Students Flagged
              </span>
            </div>

            {analytics.lowAttendanceWatchlist?.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                🎉 Excellent! All subscribed students have attendance above the {analytics.lowAttendanceThreshold || 75}% threshold.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Student ID</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Attendance Rate</th>
                      <th className="p-3">Attended / Total</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analytics.lowAttendanceWatchlist?.map(st => (
                      <tr key={st.studentId} className="hover:bg-slate-50/70 transition">
                        <td className="p-3 font-bold text-slate-900">{st.studentName}</td>
                        <td className="p-3 font-mono text-slate-500">{st.displayId}</td>
                        <td className="p-3 text-slate-600">{st.userPhone || '—'}</td>
                        <td className="p-3 font-bold text-rose-600">{st.percentage}%</td>
                        <td className="p-3 text-slate-600">{st.presentCount} / {st.totalSessions}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleSendWarning(st.studentId, st.studentName, st.percentage)}
                            className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] transition inline-flex items-center gap-1 shadow-2xs"
                          >
                            <Send className="w-3 h-3" />
                            <span>Send Warning</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: REPORTS & CSV EXPORT                               */}
      {/* ========================================================= */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-600" />
                <span>Attendance Reports & CSV Export</span>
              </h3>
              <p className="text-xs text-slate-500">
                Filter by custom date range, view daily aggregates, and download complete reports
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>

              <button
                onClick={() => handleExportCSV(reportData?.exportRows)}
                className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={reportStartDate}
                onChange={(e) => setReportStartDate(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                End Date
              </label>
              <input
                type="date"
                value={reportEndDate}
                onChange={(e) => setReportEndDate(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Session Type
              </label>
              <select
                value={reportSession}
                onChange={(e) => setReportSession(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
              >
                <option value="ALL">All Sessions</option>
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
              </select>
            </div>
          </div>

          {/* Report Summary Cards */}
          {reportData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-center">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Total Records</div>
                <div className="text-xl font-extrabold text-slate-900 mt-0.5">{reportData.totalRecords}</div>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                <div className="text-[10px] font-bold text-emerald-700 uppercase">Total Present</div>
                <div className="text-xl font-extrabold text-emerald-900 mt-0.5">{reportData.totalPresent}</div>
              </div>
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100">
                <div className="text-[10px] font-bold text-rose-700 uppercase">Total Absent</div>
                <div className="text-xl font-extrabold text-rose-900 mt-0.5">{reportData.totalAbsent}</div>
              </div>
              <div className="p-3 rounded-2xl bg-orange-50 border border-orange-100">
                <div className="text-[10px] font-bold text-orange-700 uppercase">Average Turnout</div>
                <div className="text-xl font-extrabold text-orange-950 mt-0.5">{reportData.overallPercentage}%</div>
              </div>
            </div>
          )}

          {/* Daily Breakdown Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Present</th>
                  <th className="p-3">Absent</th>
                  <th className="p-3">Turnout %</th>
                  <th className="p-3 text-center">Breakfast</th>
                  <th className="p-3 text-center">Lunch</th>
                  <th className="p-3 text-center">Dinner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingReport ? (
                  <tr>
                    <td colSpan="7" className="p-6 text-center text-slate-400">Loading reports...</td>
                  </tr>
                ) : !reportData?.dailyBreakdown?.length ? (
                  <tr>
                    <td colSpan="7" className="p-6 text-center text-slate-400">No records found for selected range.</td>
                  </tr>
                ) : (
                  reportData.dailyBreakdown.map(d => (
                    <tr key={d.date} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold text-slate-900">{d.date}</td>
                      <td className="p-3 text-emerald-700 font-bold">{d.present}</td>
                      <td className="p-3 text-rose-700 font-bold">{d.absent}</td>
                      <td className="p-3 font-bold text-slate-900">{d.percentage}%</td>
                      <td className="p-3 text-center">{d.breakfastPresent}</td>
                      <td className="p-3 text-center">{d.lunchPresent}</td>
                      <td className="p-3 text-center">{d.dinnerPresent}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: AUDIT TRAIL                                        */}
      {/* ========================================================= */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-orange-600" />
                <span>Attendance Audit Trail</span>
              </h3>
              <p className="text-xs text-slate-500">
                Immutable activity logs of QR generations, attendance marks, manual corrections & settings
              </p>
            </div>

            {/* Action filter */}
            <div className="flex items-center gap-2 text-xs">
              <label className="font-bold text-slate-500">Action Filter:</label>
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value="ALL">All Actions</option>
                <option value="ATTENDANCE_MARKED">ATTENDANCE_MARKED</option>
                <option value="ATTENDANCE_REJECTED">ATTENDANCE_REJECTED</option>
                <option value="MANUAL_CORRECTION">MANUAL_CORRECTION</option>
                <option value="QR_ROTATED">QR_ROTATED</option>
                <option value="SETTINGS_UPDATED">SETTINGS_UPDATED</option>
                <option value="WARNING_SENT">WARNING_SENT</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="p-3">Action</th>
                  <th className="p-3">Student</th>
                  <th className="p-3">Performed By</th>
                  <th className="p-3">Session / Date</th>
                  <th className="p-3">Location / Notes</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingAudit ? (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-slate-400">Loading audit trail...</td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-slate-400">No audit logs logged yet.</td>
                  </tr>
                ) : (
                  auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          log.action === 'ATTENDANCE_MARKED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.action === 'ATTENDANCE_REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : log.action === 'MANUAL_CORRECTION'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        {log.studentName || log.studentId || '—'}
                      </td>
                      <td className="p-3 text-slate-600">
                        {log.performedBy || 'SYSTEM'} <span className="text-[10px] text-slate-400">({log.role})</span>
                      </td>
                      <td className="p-3 text-slate-600">
                        {log.sessionType || 'Session'} • {log.attendanceDate}
                      </td>
                      <td className="p-3 text-slate-500 max-w-xs truncate">
                        {log.reason || log.locationStatus || log.details || '—'}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-400">
                        {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: SETTINGS (GEOFENCING, TIMINGS & THRESHOLDS)        */}
      {/* ========================================================= */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-orange-600" />
              <span>Attendance & Security Configuration</span>
            </h3>
            <p className="text-xs text-slate-500">
              Configure session timings, geofencing verification, QR auto-rotation, and student thresholds
            </p>
          </div>

          {/* 1. Meal Session Timings */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
              1. Meal Session Operating Windows
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                <span className="font-bold text-slate-800">Breakfast Window</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold">Start Time</label>
                    <input
                      type="time"
                      value={settings.breakfastStart}
                      onChange={(e) => setSettings({ ...settings, breakfastStart: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold">End Time</label>
                    <input
                      type="time"
                      value={settings.breakfastEnd}
                      onChange={(e) => setSettings({ ...settings, breakfastEnd: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                <span className="font-bold text-slate-800">Lunch Window</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold">Start Time</label>
                    <input
                      type="time"
                      value={settings.lunchStart}
                      onChange={(e) => setSettings({ ...settings, lunchStart: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold">End Time</label>
                    <input
                      type="time"
                      value={settings.lunchEnd}
                      onChange={(e) => setSettings({ ...settings, lunchEnd: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                <span className="font-bold text-slate-800">Dinner Window</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold">Start Time</label>
                    <input
                      type="time"
                      value={settings.dinnerStart}
                      onChange={(e) => setSettings({ ...settings, dinnerStart: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold">End Time</label>
                    <input
                      type="time"
                      value={settings.dinnerEnd}
                      onChange={(e) => setSettings({ ...settings, dinnerEnd: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={settings.enforceSessionTiming}
                onChange={(e) => setSettings({ ...settings, enforceSessionTiming: e.target.checked })}
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
              />
              <span className="text-xs text-slate-700 font-semibold">
                Strict Window Enforcement (Reject student scans outside active operating hours)
              </span>
            </label>
          </div>

          {/* 2. Geofencing Security */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-orange-600" />
              <span>2. Geofencing & Location Verification</span>
            </h4>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.locationVerificationEnabled}
                  onChange={(e) => setSettings({ ...settings, locationVerificationEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                />
                <span className="font-bold text-slate-800">
                  Enable GPS Location Verification (Anti-Proxy)
                </span>
              </label>

              {settings.locationVerificationEnabled && (
                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Allowed Geofence Radius:
                  </label>
                  <select
                    value={settings.allowedRadiusMeters}
                    onChange={(e) => setSettings({ ...settings, allowedRadiusMeters: parseInt(e.target.value, 10) })}
                    className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value={50}>50 Meters (Strict Dining Hall Only)</option>
                    <option value={100}>100 Meters</option>
                    <option value={150}>150 Meters (Recommended)</option>
                    <option value={200}>200 Meters</option>
                    <option value={500}>500 Meters (Campus Premises)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Uses the Haversine formula against verified mess coordinates. Scans from outside this perimeter will be rejected.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 3. QR Rotation & Low Attendance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Default QR Rotation Interval:
              </label>
              <select
                value={settings.qrRotationIntervalMinutes}
                onChange={(e) => setSettings({ ...settings, qrRotationIntervalMinutes: parseInt(e.target.value, 10) })}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
              >
                <option value={2}>Every 2 Minutes</option>
                <option value={5}>Every 5 Minutes (Standard)</option>
                <option value={10}>Every 10 Minutes</option>
                <option value={15}>Every 15 Minutes</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Low Attendance Threshold (%):
              </label>
              <input
                type="number"
                min="50"
                max="95"
                value={settings.lowAttendanceThreshold}
                onChange={(e) => setSettings({ ...settings, lowAttendanceThreshold: parseInt(e.target.value, 10) })}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
              />
              <span className="text-[10px] text-slate-400">Students below this rate are flagged on your dashboard</span>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-md transition flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{savingSettings ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: STUDENT ATTENDANCE PROFILE                       */}
      {/* ========================================================= */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-orange-600" />
                  <span>Student Attendance Profile</span>
                </h4>
                <p className="text-xs text-slate-500">Detailed subscription & dining attendance history</p>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingProfile || !selectedStudentProfile ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange-500 mb-2" />
                <span>Loading student attendance profile...</span>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Profile Header */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <h5 className="font-extrabold text-slate-900 text-sm">
                      {selectedStudentProfile.studentName}
                    </h5>
                    <div className="text-[11px] text-slate-500 mt-0.5 space-y-0.5">
                      <div>ID: <span className="font-mono font-bold text-slate-700">{selectedStudentProfile.displayId}</span></div>
                      <div>Plan: <span className="font-bold text-orange-700">{selectedStudentProfile.planName}</span></div>
                      <div>Joined: <span className="text-slate-600">{selectedStudentProfile.joiningDate?.split('T')[0] || 'Active'}</span></div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Overall Rate</div>
                    <div className={`text-2xl font-extrabold ${
                      selectedStudentProfile.isLowAttendance ? 'text-rose-600' : 'text-emerald-700'
                    }`}>
                      {selectedStudentProfile.overallPercentage}%
                    </div>
                    {selectedStudentProfile.isLowAttendance && (
                      <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[9px] font-extrabold">
                        ⚠️ Low Turnout
                      </span>
                    )}
                  </div>
                </div>

                {/* Session Breakdown Mini Cards */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-2xl bg-orange-50 border border-orange-100">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Breakfast</div>
                    <div className="font-extrabold text-sm text-orange-950 mt-0.5">
                      {selectedStudentProfile.breakfastPercentage}%
                    </div>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-100">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Lunch</div>
                    <div className="font-extrabold text-sm text-amber-950 mt-0.5">
                      {selectedStudentProfile.lunchPercentage}%
                    </div>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-100">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Dinner</div>
                    <div className="font-extrabold text-sm text-indigo-950 mt-0.5">
                      {selectedStudentProfile.dinnerPercentage}%
                    </div>
                  </div>
                </div>

                {/* Recent Attendance Logs */}
                <div className="space-y-2">
                  <h6 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                    Recent Attendance Logs
                  </h6>
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100">
                    {selectedStudentProfile.recentAttendance?.map(r => (
                      <div key={r.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                        <div>
                          <span className="font-bold text-slate-800">{r.attendanceDate}</span>
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                            {r.sessionType}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            r.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {r.status}
                          </span>
                          <span className="text-slate-400 text-[10px]">{r.markedAt || '—'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Profile Modal Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleSendWarning(selectedStudentProfile.studentId, selectedStudentProfile.studentName, selectedStudentProfile.overallPercentage)}
                    className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs transition flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Warning Notice</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileModal(false);
                      handleOpenCorrection({
                        studentId: selectedStudentProfile.studentId,
                        studentName: selectedStudentProfile.studentName,
                        date: filterDate,
                        sessionType: filterSession !== 'ALL' ? filterSession : 'Lunch',
                        status: 'ABSENT'
                      });
                    }}
                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition"
                  >
                    Correct Attendance
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: MANUAL ATTENDANCE CORRECTION                     */}
      {/* ========================================================= */}
      {showCorrectionModal && correctionTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-orange-600" />
                  <span>Manual Attendance Correction</span>
                </h4>
                <p className="text-xs text-slate-500">Correct student status with mandatory audit explanation</p>
              </div>
              <button
                onClick={() => setShowCorrectionModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="font-extrabold text-slate-900">{correctionTarget.studentName}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Date: <strong className="text-slate-700">{correctionTarget.date || filterDate}</strong> • Session: <strong className="text-slate-700">{correctionTarget.sessionType || (filterSession !== 'ALL' ? filterSession : 'Lunch')}</strong>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  New Status:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCorrectionStatus('PRESENT')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs transition border flex items-center justify-center gap-1.5 ${
                      correctionStatus === 'PRESENT'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>PRESENT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCorrectionStatus('ABSENT')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs transition border flex items-center justify-center gap-1.5 ${
                      correctionStatus === 'ABSENT'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>ABSENT</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Reason for Manual Correction <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows="3"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g. Student camera failed to scan, verified in dining hall manually..."
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                ></textarea>
                <span className="text-[10px] text-slate-400">
                  Mandatory. Recorded in the tamper-proof audit trail with your owner ID.
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCorrectionModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitCorrection}
                disabled={submittingCorrection}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-xs transition"
              >
                {submittingCorrection ? 'Saving...' : 'Apply Correction'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
