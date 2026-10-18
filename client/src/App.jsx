import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import { api } from './services/api';

import { MobileShell } from './components/common/MobileShell';
import { ToastContainer } from './components/common/ToastContainer';
import { GlobalErrorAlert } from './components/common/GlobalErrorAlert';
import { MessDetailsModal } from './components/customer/MessDetailsModal';
import { TrialBookingModal } from './components/customer/TrialBookingModal';
import { MockPaymentModal } from './components/payments/MockPaymentModal';
import { LocationSelectorModal } from './components/permissions/LocationSelectorModal';
import { PermissionRationaleModal } from './components/permissions/PermissionRationaleModal';

// Dedicated Auth & Portal Views
import { LandingPortal } from './pages/LandingPortal';
import { StudentLogin } from './pages/auth/StudentLogin';
import { StudentSignup } from './pages/auth/StudentSignup';
import { OwnerLogin } from './pages/auth/OwnerLogin';
import { OwnerSignup } from './pages/auth/OwnerSignup';
import { AdminLogin } from './pages/auth/AdminLogin';
import { ForgotPasswordModal } from './pages/auth/ForgotPasswordModal';

// Authenticated Persona Views
import { CustomerView } from './pages/CustomerView';
import { OwnerView } from './pages/OwnerView';
import { AdminView } from './pages/AdminView';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Inner App with context access
const AppContent = () => {
  const { currentRole, currentUser, isAuthenticated } = useAuth();
  const { selectedMessId, setSelectedMessId, loadMesses } = useApp();
  const { showToast, loadNotifications } = useNotification();

  // Navigation state for unauthenticated flows: 'portal' | 'student-login' | 'student-signup' | 'owner-login' | 'owner-signup' | 'admin-login'
  const [authView, setAuthView] = useState(() => {
    if (typeof window !== 'undefined') {
      if (window.location.search.includes('admin') || window.location.hash === '#admin') {
        return 'admin-login';
      }
    }
    return 'portal';
  });

  // Forgot password modal state
  const [forgotPasswordState, setForgotPasswordState] = useState({
    isOpen: false,
    role: 'CUSTOMER',
    email: ''
  });

  // Modal States
  const [activeDetailsMessId, setActiveDetailsMessId] = useState(null);
  const [detailsInitialTab, setDetailsInitialTab] = useState('overview');
  const [trialModalMess, setTrialModalMess] = useState(null);
  const [pendingPayment, setPendingPayment] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [permissionRationale, setPermissionRationale] = useState(null);

  // Open Details Modal
  const handleOpenDetails = (messId, tab = 'overview') => {
    setActiveDetailsMessId(messId);
    setDetailsInitialTab(tab);
  };

  // Open Trial Modal
  const handleBookTrial = (mess) => {
    if (!isAuthenticated) {
      showToast('Please sign in or create a student account to book a trial meal.', 'info', '🎓 Student Sign In');
      setAuthView('student-login');
      return;
    }
    setTrialModalMess(mess);
  };

  // Trigger Subscribe directly to Razorpay Payment
  const handleSubscribe = (mess, plan = null, options = {}) => {
    if (!isAuthenticated) {
      showToast('Please sign in as a student to subscribe to a mess plan.', 'info', '🎓 Student Sign In');
      setAuthView('student-login');
      return;
    }

    const selectedPlan = plan || (mess.plans && mess.plans[0]) || {
      id: `p_${Date.now()}`,
      name: 'All Meals',
      price: mess.pricePerMonth || 3200
    };

    const isRenewal = Boolean(options.isRenewal);

    setPendingPayment({
      messId: mess.id,
      messName: mess.name,
      planId: selectedPlan.id,
      planName: selectedPlan.name,
      amount: selectedPlan.price,
      title: `${mess.name}`,
      subtitle: `${isRenewal ? 'Renewal' : 'Subscription'}: ${selectedPlan.name} (${selectedPlan.durationDays || selectedPlan.periodDays || 30} Days)`,
      actionType: 'SUBSCRIPTION',
      isRenewal,
      subscriptionId: options.subscriptionId || null
    });
  };

  // Proceed from Trial modal to payment
  const handleTrialPaymentProceed = (trialData) => {
    setTrialModalMess(null);
    setPendingPayment(trialData);
  };

  // When Razorpay Payment completes and verifies successfully
  const handlePaymentSuccess = async (result) => {
    if (!pendingPayment) return;

    try {
      if (pendingPayment.actionType === 'SUBSCRIPTION') {
        showToast(
          pendingPayment.isRenewal
            ? `Subscription to ${pendingPayment.messName} renewed! Validity extended.`
            : `Subscribed to ${pendingPayment.messName}! Receipts saved.`,
          'success',
          '🎉 Welcome to the Mess!'
        );
        loadNotifications();
        if (loadMesses) loadMesses();
        window.dispatchEvent(new CustomEvent('messconnect:payment-success', { detail: result }));
      } else if (pendingPayment.actionType === 'TRIAL') {
        const res = await api.bookTrial({
          userId: currentUser?.id,
          messId: pendingPayment.messId,
          mealType: pendingPayment.mealType,
          date: pendingPayment.date,
          paymentMethod: result.payment?.method || result.method || 'Razorpay'
        });

        if (res && res.success) {
          showToast(`Trial meal booked at ${pendingPayment.messName}! Sent for approval.`, 'success', '⌛ Trial Booked');
          loadNotifications();
        }
      }
    } catch (e) {
      showToast(e.message || 'Error completing booking', 'error');
    } finally {
      setPendingPayment(null);
    }
  };

  // Open Forgot Password helper
  const handleOpenForgotPassword = (role = 'CUSTOMER', email = '') => {
    setForgotPasswordState({
      isOpen: true,
      role,
      email
    });
  };

  return (
    <MobileShell
      onNavigateToStudentLogin={() => setAuthView('student-login')}
      onNavigateToOwnerLogin={() => setAuthView('owner-login')}
      onBackToHome={() => setAuthView('portal')}
    >
      <ToastContainer />
      <GlobalErrorAlert />

      {/* 1. AUTHENTICATED PERSONA VIEWS */}
      {isAuthenticated && currentRole === 'CUSTOMER' && (
        <ErrorBoundary>
          <CustomerView
            onOpenDetails={handleOpenDetails}
            onBookTrial={handleBookTrial}
            onSubscribe={handleSubscribe}
            onOpenLocationModal={() => setShowLocationModal(true)}
          />
        </ErrorBoundary>
      )}

      {isAuthenticated && currentRole === 'OWNER' && (
        <ErrorBoundary>
          <OwnerView />
        </ErrorBoundary>
      )}

      {isAuthenticated && currentRole === 'ADMIN' && (
        <ErrorBoundary>
          <AdminView />
        </ErrorBoundary>
      )}

      {/* 2. UNAUTHENTICATED PUBLIC & DEDICATED AUTH FLOWS */}
      {!isAuthenticated && (
        <>
          {authView === 'portal' && (
            <LandingPortal
              onOpenStudentLogin={() => setAuthView('student-login')}
              onOpenStudentSignup={() => setAuthView('student-signup')}
              onOpenOwnerLogin={() => setAuthView('owner-login')}
              onOpenOwnerSignup={() => setAuthView('owner-signup')}
              onOpenAdminLogin={() => setAuthView('admin-login')}
              onOpenDetails={handleOpenDetails}
              onBookTrial={handleBookTrial}
              onSubscribe={handleSubscribe}
              onOpenLocationModal={() => setShowLocationModal(true)}
            />
          )}

          {authView === 'student-login' && (
            <StudentLogin
              onNavigateToSignup={() => setAuthView('student-signup')}
              onNavigateToOwnerLogin={() => setAuthView('owner-login')}
              onOpenForgotPassword={handleOpenForgotPassword}
              onBackToHome={() => setAuthView('portal')}
              onLoginSuccess={() => setAuthView('portal')}
            />
          )}

          {authView === 'student-signup' && (
            <StudentSignup
              onNavigateToLogin={() => setAuthView('student-login')}
              onNavigateToOwnerSignup={() => setAuthView('owner-signup')}
              onBackToHome={() => setAuthView('portal')}
              onSignupSuccess={() => setAuthView('portal')}
            />
          )}

          {authView === 'owner-login' && (
            <OwnerLogin
              onNavigateToSignup={() => setAuthView('owner-signup')}
              onNavigateToStudentLogin={() => setAuthView('student-login')}
              onOpenForgotPassword={handleOpenForgotPassword}
              onBackToHome={() => setAuthView('portal')}
              onLoginSuccess={() => setAuthView('portal')}
            />
          )}

          {authView === 'owner-signup' && (
            <OwnerSignup
              onNavigateToLogin={() => setAuthView('owner-login')}
              onNavigateToStudentSignup={() => setAuthView('student-signup')}
              onBackToHome={() => setAuthView('portal')}
              onSignupSuccess={() => setAuthView('portal')}
            />
          )}

          {authView === 'admin-login' && (
            <AdminLogin
              onBackToHome={() => setAuthView('portal')}
              onLoginSuccess={() => setAuthView('portal')}
            />
          )}
        </>
      )}

      {/* Forgot Password Modal (Accessible across both student and mess owner flows) */}
      <ForgotPasswordModal
        isOpen={forgotPasswordState.isOpen}
        initialRole={forgotPasswordState.role}
        initialEmail={forgotPasswordState.email}
        onClose={() => setForgotPasswordState(prev => ({ ...prev, isOpen: false }))}
        onSuccessLogin={(email) => {
          if (forgotPasswordState.role === 'OWNER') {
            setAuthView('owner-login');
          } else {
            setAuthView('student-login');
          }
        }}
      />

      {/* Mess Details Screen Modal */}
      {activeDetailsMessId && (
        <MessDetailsModal
          messId={activeDetailsMessId}
          initialTab={detailsInitialTab}
          onClose={() => setActiveDetailsMessId(null)}
          onBookTrial={(mess) => {
            setActiveDetailsMessId(null);
            handleBookTrial(mess);
          }}
          onSubscribe={(mess, plan) => {
            setActiveDetailsMessId(null);
            handleSubscribe(mess, plan);
          }}
        />
      )}

      {/* Trial Booking Modal */}
      {trialModalMess && (
        <TrialBookingModal
          mess={trialModalMess}
          isOpen={Boolean(trialModalMess)}
          onClose={() => setTrialModalMess(null)}
          onProceedToPayment={handleTrialPaymentProceed}
        />
      )}

      {/* Razorpay Payment Gateway Modal */}
      {pendingPayment && (
        <MockPaymentModal
          isOpen={Boolean(pendingPayment)}
          onClose={() => setPendingPayment(null)}
          amount={pendingPayment.amount}
          itemTitle={pendingPayment.title}
          itemSubtitle={pendingPayment.subtitle}
          messId={pendingPayment.messId}
          planId={pendingPayment.planId}
          userId={currentUser?.id}
          subscriptionId={pendingPayment.subscriptionId}
          isRenewal={pendingPayment.isRenewal}
          actionType={pendingPayment.actionType}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Location Selector Modal */}
      {showLocationModal && (
        <LocationSelectorModal
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
        />
      )}

      {/* Permission Rationale Modal */}
      {permissionRationale && (
        <PermissionRationaleModal
          isOpen={Boolean(permissionRationale)}
          type={permissionRationale}
          onAccept={() => setPermissionRationale(null)}
          onDeny={() => setPermissionRationale(null)}
          onManualFallback={() => {
            setPermissionRationale(null);
            setShowLocationModal(true);
          }}
        />
      )}
    </MobileShell>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AppProvider>
    </AuthProvider>
  );
}
