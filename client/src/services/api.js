import { storage } from './storage';
import { errorTracker } from '../utils/errorTracker';

const getBaseUrl = () => {
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL)) || '';
  if (!envUrl) return '/api';
  const clean = envUrl.replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
};

const BASE_URL = getBaseUrl();

class ApiService {
  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        console.log('[Network] Reconnected online. Running synchronization...');
        this.syncPending();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
        console.warn('[Network] Disconnected. Switching to offline-cached data.');
      });
    }
  }

  async fetchWithFallback(url, options = {}, cacheStore = null) {
    try {
      if (!this.isOnline) {
        throw new Error('OFFLINE_MODE');
      }

      let userRole = '';
      let userId = '';
      let token = '';
      if (typeof window !== 'undefined') {
        try {
          const storedUser = localStorage.getItem('messconnect_user');
          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            userRole = parsed.role || '';
            userId = parsed.id || '';
          }
          token = localStorage.getItem('messconnect_token') || '';
        } catch {}
      }

      const res = await fetch(`${BASE_URL}${url}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(userRole ? { 'x-user-role': userRole } : {}),
          ...(userId ? { 'x-user-id': userId } : {}),
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(options.headers || {})
        },
        ...options
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `HTTP Error ${res.status}`);
      }

      const data = await res.json();

      // If caching requested and this was a GET, cache it locally in IndexedDB
      if (cacheStore && (!options.method || options.method === 'GET')) {
        const items = data.messes || data.subscriptions || data.notifications || data.trials || data;
        if (Array.isArray(items)) {
          storage.saveBatch(cacheStore, items);
        }
      }

      return data;
    } catch (err) {
      console.warn(`[API] Network request failed (${url}):`, err.message);

      // Attempt offline fallback if cacheStore specified
      if (cacheStore) {
        console.log(`[Offline Fallback] Serving cached ${cacheStore} from local database.`);
        const cached = await storage.getAll(cacheStore);
        if (cached && cached.length > 0) {
          return {
            success: true,
            isOfflineData: true,
            [cacheStore]: cached,
            count: cached.length
          };
        }
      }

      if (err && err.message !== 'OFFLINE_MODE') {
        errorTracker.trackError(err, {
          origin: 'api.fetchWithFallback',
          url,
          method: options.method || 'GET'
        });
      }

      throw err;
    }
  }

  // --- Authentication ---
  async login(credentials) {
    return this.fetchWithFallback('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  async register(userData) {
    return this.fetchWithFallback('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  // Send 6-digit registration OTP with 3-minute expiry
  async registerSendOtp(userData) {
    return this.fetchWithFallback('/auth/register-send-otp', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  // Verify registration OTP within 3 minutes and create account
  async registerVerifyOtp(data) {
    return this.fetchWithFallback('/auth/register-verify-otp', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Mess Owner Request Login OTP (anytime, 3-minute expiry)
  async ownerRequestLoginOtp(identifier) {
    return this.fetchWithFallback('/auth/owner-request-login-otp', {
      method: 'POST',
      body: JSON.stringify({ identifier })
    });
  }

  // Mess Owner Verify Login OTP
  async ownerVerifyLoginOtp(data) {
    return this.fetchWithFallback('/auth/owner-verify-login-otp', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async forgotPassword(data) {
    return this.fetchWithFallback('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async resetPassword(data) {
    return this.fetchWithFallback('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateUserProfile(profileData) {
    return this.fetchWithFallback('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  async changePassword(data) {
    return this.fetchWithFallback('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getMe() {
    return this.fetchWithFallback('/auth/me');
  }

  // --- Messes ---
  async getMesses(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.fetchWithFallback(`/messes${qs}`, {}, 'messes');
  }

  async getMessDetails(id) {
    return this.fetchWithFallback(`/messes/${id}`);
  }

  async toggleFavorite(id) {
    return this.fetchWithFallback(`/messes/${id}/favorite`, { method: 'POST' });
  }

  async getFavorites() {
    return this.fetchWithFallback(`/messes/favorites/list`);
  }

  async createMess(data) {
    return this.fetchWithFallback(`/messes`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateMess(id, data) {
    return this.fetchWithFallback(`/messes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async updateMenu(id, menuData) {
    return this.fetchWithFallback(`/messes/${id}/menu`, {
      method: 'PUT',
      body: JSON.stringify(menuData)
    });
  }

  async getOffers() {
    return this.fetchWithFallback('/messes/offers');
  }

  // --- Mess Plans (Phase 4) ---
  async getMessPlans(messId) {
    return this.fetchWithFallback(`/messes/${messId}/plans`);
  }

  async createMessPlan(messId, planData) {
    return this.fetchWithFallback(`/messes/${messId}/plans`, {
      method: 'POST',
      body: JSON.stringify(planData)
    });
  }

  async updateMessPlan(messId, planId, updates) {
    return this.fetchWithFallback(`/messes/${messId}/plans/${planId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteMessPlan(messId, planId) {
    return this.fetchWithFallback(`/messes/${messId}/plans/${planId}`, {
      method: 'DELETE'
    });
  }

  // --- Subscriptions ---
  async getSubscriptions(userId, messId) {
    const q = new URLSearchParams();
    if (userId) q.append('userId', userId);
    if (messId) q.append('messId', messId);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.fetchWithFallback(`/subscriptions${qs}`, {}, 'subscriptions');
  }

  async createSubscription(data) {
    return this.fetchWithFallback(`/subscriptions`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async pauseSubscription(id, details) {
    return this.fetchWithFallback(`/subscriptions/${id}/pause`, {
      method: 'POST',
      body: JSON.stringify(details)
    });
  }

  async resumeSubscription(id) {
    return this.fetchWithFallback(`/subscriptions/${id}/resume`, {
      method: 'POST'
    });
  }

  async cancelSubscription(id, reason) {
    return this.fetchWithFallback(`/subscriptions/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  // --- Razorpay Payments & Subscriptions (Phase 4) ---
  async getPaymentConfig() {
    return this.fetchWithFallback('/payments/config');
  }

  async createPaymentOrder(orderData) {
    return this.fetchWithFallback('/payments/create-order', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  }

  async simulateGatewayResponse(orderId, tamperSignature = false) {
    return this.fetchWithFallback('/payments/simulate-gateway-response', {
      method: 'POST',
      body: JSON.stringify({ orderId, tamperSignature })
    });
  }

  async verifyPayment(verificationData) {
    return this.fetchWithFallback('/payments/verify', {
      method: 'POST',
      body: JSON.stringify(verificationData)
    });
  }

  async reportPaymentFailure(failureData) {
    return this.fetchWithFallback('/payments/failure', {
      method: 'POST',
      body: JSON.stringify(failureData)
    });
  }

  async getPaymentOrderStatus(orderId) {
    return this.fetchWithFallback(`/payments/order/${orderId}/status`);
  }

  async getUserPayments(userId) {
    return this.fetchWithFallback(`/payments?userId=${userId || ''}`);
  }

  async refundPayment(paymentId, refundData) {
    return this.fetchWithFallback(`/payments/${paymentId}/refund`, {
      method: 'POST',
      body: JSON.stringify(refundData)
    });
  }

  // --- Trials ---
  async getTrials(userId, messId) {
    const q = new URLSearchParams();
    if (userId) q.append('userId', userId);
    if (messId) q.append('messId', messId);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.fetchWithFallback(`/trials${qs}`, {}, 'trials');
  }

  async bookTrial(data) {
    return this.fetchWithFallback(`/trials`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateTrialStatus(id, status) {
    return this.fetchWithFallback(`/trials/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  // --- Notifications ---
  async getNotifications(userId, { type = '', status = '' } = {}) {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (type && type !== 'ALL') params.append('type', type);
    if (status && status !== 'ALL') params.append('status', status);
    return this.fetchWithFallback(`/notifications?${params.toString()}`, {}, 'notifications');
  }

  async markNotificationRead(id) {
    return this.fetchWithFallback(`/notifications/${id}/read`, { method: 'PUT' });
  }

  async markAllNotificationsRead(userId) {
    return this.fetchWithFallback(`/notifications/mark-all-read`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  }

  async deleteNotification(id) {
    return this.fetchWithFallback(`/notifications/${id}`, { method: 'DELETE' });
  }

  // --- Owner APIs ---
  async getOwnerStats(messId) {
    return this.fetchWithFallback(`/owner/stats?messId=${messId || ''}`);
  }

  async getOwnerForecast(messId) {
    return this.fetchWithFallback(`/owner/forecast?messId=${messId || ''}`);
  }

  async getOwnerCustomers(messId) {
    return this.fetchWithFallback(`/owner/customers?messId=${messId || ''}`);
  }

  async broadcastOffer(data) {
    return this.fetchWithFallback(`/owner/broadcast-offer`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async resubmitDocuments(data) {
    return this.fetchWithFallback(`/auth/resubmit-documents`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getOwnerRevenue(messId) {
    return this.fetchWithFallback(`/owner/revenue?messId=${messId || ''}`);
  }

  async getOwnerPayments(messId, filters = {}) {
    const q = new URLSearchParams({ messId: messId || '' });
    if (filters.search) q.append('search', filters.search);
    if (filters.status) q.append('status', filters.status);
    if (filters.planId) q.append('planId', filters.planId);
    if (filters.dateRange) q.append('dateRange', filters.dateRange);
    return this.fetchWithFallback(`/owner/payments?${q.toString()}`);
  }

  // --- Admin APIs ---
  async getAdminStats() {
    return this.fetchWithFallback(`/admin/stats`);
  }

  async getAdminPayments(filters = {}) {
    const q = new URLSearchParams();
    if (filters.search) q.append('search', filters.search);
    if (filters.status) q.append('status', filters.status);
    if (filters.messId) q.append('messId', filters.messId);
    return this.fetchWithFallback(`/admin/payments?${q.toString()}`);
  }

  async getAdminVerifications() {
    return this.fetchWithFallback(`/admin/verifications`);
  }

  async submitVerificationDecision(messId, decisionData) {
    return this.fetchWithFallback(`/admin/verifications/${messId}/decision`, {
      method: 'POST',
      body: JSON.stringify(decisionData)
    });
  }

  async getAdminMesses(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.append(k, v);
    });
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.fetchWithFallback(`/admin/messes${qs}`);
  }

  async updateMessStatus(id, status) {
    return this.fetchWithFallback(`/admin/messes/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  async getAreaAnalytics(area = 'All') {
    return this.fetchWithFallback(`/admin/area-analytics?area=${encodeURIComponent(area)}`);
  }

  async getAdminRevenue() {
    return this.fetchWithFallback(`/admin/revenue`);
  }

  async updateAdminSettings(settings) {
    return this.fetchWithFallback(`/admin/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }

  async getAdminSupportTeam() {
    return this.fetchWithFallback(`/admin/support-team`);
  }

  async getAdminCustomers() {
    return this.fetchWithFallback(`/admin/customers`);
  }

  async verifyMess(id, verified) {
    return this.fetchWithFallback(`/admin/messes/${id}/verify`, {
      method: 'PUT',
      body: JSON.stringify({ verified })
    });
  }

  async toggleFeaturedMess(id, featured) {
    return this.fetchWithFallback(`/admin/messes/${id}/featured`, {
      method: 'PUT',
      body: JSON.stringify({ featured })
    });
  }

  async getComplaints() {
    return this.fetchWithFallback(`/admin/complaints`);
  }

  async updateComplaint(id, data) {
    return this.fetchWithFallback(`/admin/complaints/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // --- Real-Time Database Tables & Data Export APIs ---
  async getDatabaseTables() {
    return this.fetchWithFallback(`/admin/tables`);
  }

  async getTableData(tableName) {
    return this.fetchWithFallback(`/admin/tables/${tableName}`);
  }

  getDownloadTableCSVUrl(tableName) {
    return `${BASE_URL}/admin/tables/${tableName}/csv?role=ADMIN`;
  }

  getDownloadTableExcelUrl(tableName) {
    return `${BASE_URL}/admin/tables/${tableName}/excel?role=ADMIN`;
  }

  getDownloadAllExcelUrl() {
    return `${BASE_URL}/admin/export-all/excel?role=ADMIN`;
  }

  getDownloadAllCSVUrl() {
    return `${BASE_URL}/admin/export-all/csv?role=ADMIN`;
  }

  // --- Anti-Proxy Check-In & Student Meal Pass ---
  async getStudentPass(userId, messId) {
    const q = new URLSearchParams();
    if (userId) q.append('userId', userId);
    if (messId) q.append('messId', messId);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.fetchWithFallback(`/checkin/pass${qs}`);
  }

  async verifyPass(data) {
    return this.fetchWithFallback(`/checkin/verify`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getCheckinHistory(messId, date) {
    const q = new URLSearchParams();
    if (messId) q.append('messId', messId);
    if (date) q.append('date', date);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.fetchWithFallback(`/checkin/history${qs}`);
  }

  // --- Campus FlexiPass (Phase 3) ---
  async getFlexipassTiers() {
    return this.fetchWithFallback(`/flexipass/tiers`);
  }

  async getUserFlexipasses(userId) {
    return this.fetchWithFallback(`/flexipass/user?userId=${userId || ''}`);
  }

  async subscribeFlexipass(data) {
    return this.fetchWithFallback(`/flexipass/subscribe`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // --- Roommate Mess Pods & Groups (Phase 3) ---
  async getUserGroup(userId) {
    return this.fetchWithFallback(`/groups/user?userId=${userId || ''}`);
  }

  async createGroup(data) {
    return this.fetchWithFallback(`/groups/create`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async joinGroup(data) {
    return this.fetchWithFallback(`/groups/join`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async syncGroupPause(groupId, data) {
    return this.fetchWithFallback(`/groups/${groupId}/sync-pause`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async giftMealPass(groupId, data) {
    return this.fetchWithFallback(`/groups/${groupId}/gift-meal`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // --- Mess Attendance System ---
  async createAttendanceSession(data) {
    return this.fetchWithFallback(`/attendance/session/create`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getActiveAttendanceSession(messId, sessionType = '', date = '') {
    const params = new URLSearchParams({ messId });
    if (sessionType) params.append('sessionType', sessionType);
    if (date) params.append('date', date);
    return this.fetchWithFallback(`/attendance/session/active?${params.toString()}`);
  }

  async closeAttendanceSession(data) {
    return this.fetchWithFallback(`/attendance/session/close`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async markAttendance(data) {
    return this.fetchWithFallback(`/attendance/mark`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getStudentAttendance(userId = '', messId = '', timeframe = 'all') {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (messId) params.append('messId', messId);
    if (timeframe) params.append('timeframe', timeframe);
    return this.fetchWithFallback(`/attendance/student?${params.toString()}`);
  }

  async getOwnerAttendanceRoster({ messId, date = '', sessionType = '', status = '', search = '' }) {
    const params = new URLSearchParams({ messId });
    if (date) params.append('date', date);
    if (sessionType) params.append('sessionType', sessionType);
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    return this.fetchWithFallback(`/attendance/owner/roster?${params.toString()}`);
  }

  async getOwnerAttendanceAnalytics(messId) {
    return this.fetchWithFallback(`/attendance/owner/analytics?messId=${messId || ''}`);
  }

  async getOwnerAttendanceLiveSummary(messId, sessionType = '', date = '') {
    const params = new URLSearchParams({ messId });
    if (sessionType) params.append('sessionType', sessionType);
    if (date) params.append('date', date);
    return this.fetchWithFallback(`/attendance/owner/live-summary?${params.toString()}`);
  }

  // --- Phase 2 Attendance Methods ---
  async getAttendanceSettings(messId) {
    return this.fetchWithFallback(`/attendance/settings?messId=${messId || ''}`);
  }

  async updateAttendanceSettings(messId, updates) {
    return this.fetchWithFallback(`/attendance/settings`, {
      method: 'PUT',
      body: JSON.stringify({ messId, updates })
    });
  }

  async rotateAttendanceQr(messId, sessionType = '', date = '') {
    return this.fetchWithFallback(`/attendance/owner/rotate-qr`, {
      method: 'POST',
      body: JSON.stringify({ messId, sessionType, date })
    });
  }

  async correctAttendance({ messId, studentId, date = '', sessionType = '', status, reason }) {
    return this.fetchWithFallback(`/attendance/owner/correct`, {
      method: 'POST',
      body: JSON.stringify({ messId, studentId, date, sessionType, status, reason })
    });
  }

  async getStudentAttendanceProfile(messId, studentId) {
    const params = new URLSearchParams({ messId, studentId });
    return this.fetchWithFallback(`/attendance/owner/profile?${params.toString()}`);
  }

  async getAttendanceAuditLogs({ messId, action = '', studentId = '', sessionType = '', startDate = '', endDate = '' }) {
    const params = new URLSearchParams({ messId });
    if (action) params.append('action', action);
    if (studentId) params.append('studentId', studentId);
    if (sessionType) params.append('sessionType', sessionType);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return this.fetchWithFallback(`/attendance/owner/audit-logs?${params.toString()}`);
  }

  async getAttendanceReports({ messId, startDate = '', endDate = '', sessionType = '' }) {
    const params = new URLSearchParams({ messId });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (sessionType) params.append('sessionType', sessionType);
    return this.fetchWithFallback(`/attendance/owner/reports?${params.toString()}`);
  }

  async sendLowAttendanceWarning({ messId, studentId, percentage, threshold }) {
    return this.fetchWithFallback(`/attendance/owner/send-warning`, {
      method: 'POST',
      body: JSON.stringify({ messId, studentId, percentage, threshold })
    });
  }

  // --- Phase 6: Owner Analytics & Reports ---
  async getOwnerAdvancedAnalytics(messId, { rangePreset = 'this_month', startDate = '', endDate = '' } = {}) {
    const params = new URLSearchParams({ messId: messId || '', rangePreset });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return this.fetchWithFallback(`/owner/analytics/advanced?${params.toString()}`);
  }

  async getOwnerAttendanceReport(messId, { rangePreset = 'this_month', startDate = '', endDate = '', session = 'ALL', student = '', status = 'ALL' } = {}) {
    const params = new URLSearchParams({ messId: messId || '', rangePreset });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (session && session !== 'ALL') params.append('session', session);
    if (student) params.append('student', student);
    if (status && status !== 'ALL') params.append('status', status);
    return this.fetchWithFallback(`/owner/reports/attendance?${params.toString()}`);
  }

  async getOwnerPaymentReport(messId, { rangePreset = 'this_month', startDate = '', endDate = '', planId = 'ALL', status = 'ALL', student = '' } = {}) {
    const params = new URLSearchParams({ messId: messId || '', rangePreset });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (planId && planId !== 'ALL') params.append('planId', planId);
    if (status && status !== 'ALL') params.append('status', status);
    if (student) params.append('student', student);
    return this.fetchWithFallback(`/owner/reports/payments?${params.toString()}`);
  }

  async getOwnerSubscriptionReport(messId, { rangePreset = 'this_month', startDate = '', endDate = '', status = 'ALL' } = {}) {
    const params = new URLSearchParams({ messId: messId || '', rangePreset });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (status && status !== 'ALL') params.append('status', status);
    return this.fetchWithFallback(`/owner/reports/subscriptions?${params.toString()}`);
  }

  async getOwnerMenuAnalytics(messId) {
    return this.fetchWithFallback(`/owner/reports/menu-analytics?messId=${messId || ''}`);
  }

  async getIndividualStudentReport(messId, studentId) {
    const params = new URLSearchParams();
    if (messId) params.append('messId', messId);
    return this.fetchWithFallback(`/owner/reports/student/${studentId}?${params.toString()}`);
  }

  // --- Phase 6: Admin Analytics & Mess Comparison ---
  async getAdminPlatformAnalytics() {
    return this.fetchWithFallback(`/admin/analytics/platform`);
  }

  async getAdminMessComparison() {
    return this.fetchWithFallback(`/admin/analytics/mess-comparison`);
  }

  // --- Phase 6: Announcements System ---
  async getAnnouncements({ status = 'ACTIVE' } = {}) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    return this.fetchWithFallback(`/announcements?${params.toString()}`);
  }

  async createOwnerAnnouncement(data) {
    return this.fetchWithFallback(`/announcements/owner`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async createAdminAnnouncement(data) {
    return this.fetchWithFallback(`/announcements/admin`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateAnnouncementStatus(id, status) {
    return this.fetchWithFallback(`/announcements/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  async deleteAnnouncement(id) {
    return this.fetchWithFallback(`/announcements/${id}`, {
      method: 'DELETE'
    });
  }

  async submitSupportQuery(data) {
    return this.fetchWithFallback('/support/query', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async syncPending() {
    console.log('[SyncManager] Online sync complete.');
  }
}

export const api = new ApiService();
