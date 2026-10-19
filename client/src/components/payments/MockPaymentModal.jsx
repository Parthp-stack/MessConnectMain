import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  CreditCard, Smartphone, ShieldCheck, CheckCircle2, Lock, X,
  ArrowRight, Loader2, AlertCircle, Building2, Calendar, Receipt,
  Zap, Check, Shield
} from 'lucide-react';

export const MockPaymentModal = ({
  isOpen,
  onClose,
  amount,
  itemTitle,
  itemSubtitle,
  messId,
  planId,
  userId,
  subscriptionId,
  isRenewal = false,
  actionType = 'SUBSCRIPTION',
  onSuccess
}) => {
  const { currentUser } = useAuth();
  const [config, setConfig] = useState(null);
  const [order, setOrder] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const [successData, setSuccessData] = useState(null);
  const [rzpLoaded, setRzpLoaded] = useState(false);

  // 1. Ensure Razorpay checkout.js script is loaded dynamically in browser
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      setRzpLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      console.log('[Razorpay SDK] Loaded checkout.js successfully.');
      setRzpLoaded(true);
    };
    script.onerror = () => {
      console.warn('[Razorpay SDK] Failed to load official checkout.js.');
      setRzpLoaded(false);
    };
    document.body.appendChild(script);

    return () => {
      // Keep script in document for reuse
    };
  }, []);

  // 2. Initialize genuine order on modal open
  useEffect(() => {
    if (!isOpen) {
      setOrder(null);
      setOrderError(null);
      setSuccessData(null);
      setVerifyError(null);
      return;
    }

    let isMounted = true;
    const initializeOrder = async () => {
      setOrderLoading(true);
      setOrderError(null);
      try {
        // Fetch public Razorpay config (keyId, testMode, currency)
        const cfg = await api.getPaymentConfig();
        if (isMounted && cfg) {
          setConfig(cfg);
        }

        // Request backend to create Order on Razorpay
        const orderRes = await api.createPaymentOrder({
          amount,
          messId,
          planId,
          userId: currentUser?.id || userId,
          subscriptionId,
          isRenewal,
          purpose: `${itemTitle || 'Meal Subscription'} - ${itemSubtitle || ''}`
        });

        if (isMounted) {
          if (orderRes && orderRes.success) {
            setOrder(orderRes);
          } else {
            setOrderError(orderRes?.message || 'Failed to initialize payment session with Razorpay.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setOrderError(err.message || 'Error connecting to payment gateway.');
        }
      } finally {
        if (isMounted) setOrderLoading(false);
      }
    };

    initializeOrder();

    return () => {
      isMounted = false;
    };
  }, [isOpen, messId, planId, amount, currentUser]);

  if (!isOpen) return null;

  // 3. Launch Real Razorpay Standard Checkout
  const handleLaunchRazorpay = () => {
    if (!order?.orderId) {
      setVerifyError('No active payment order session found. Please try again.');
      return;
    }

    const keyId = config?.keyId || order.keyId;
    if (!keyId) {
      setVerifyError('Razorpay Merchant Key is not configured on the server.');
      return;
    }

    setProcessing(true);
    setVerifyError(null);

    // If Razorpay SDK is present
    if (typeof window !== 'undefined' && window.Razorpay) {
      const options = {
        key: keyId,
        amount: order.amountPaise || Math.round((order.amount || amount) * 100),
        currency: order.currency || 'INR',
        name: 'MessConnect',
        description: order.notes?.purpose || `${itemTitle || 'Meal Subscription'}`,
        image: '/logo.jpeg',
        order_id: order.orderId,
        handler: async function (response) {
          console.log('[Razorpay Client Success] Payment received:', response.razorpay_payment_id);
          try {
            // Cryptographic HMAC-SHA256 signature verification on backend
            const verifyRes = await api.verifyPayment({
              orderId: response.razorpay_order_id || order.orderId,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              amount: order.amount,
              userId: currentUser?.id || userId,
              messId,
              planId,
              subscriptionId,
              isRenewal,
              paymentMethod: 'Razorpay UPI / Cards',
              description: `${itemTitle} - ${itemSubtitle}`
            });

            if (!verifyRes || !verifyRes.success) {
              throw new Error(verifyRes?.message || 'Payment signature verification failed.');
            }

            const paymentResult = {
              paymentId: verifyRes.payment?.paymentId || response.razorpay_payment_id,
              orderId: response.razorpay_order_id || order.orderId,
              receiptNumber: verifyRes.payment?.receiptNumber || `REC-${Date.now().toString().slice(-6)}`,
              amount: verifyRes.payment?.amount || order.amount,
              method: verifyRes.payment?.method || 'Razorpay Verified',
              status: 'SUCCESS',
              subscription: verifyRes.subscription,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            };

            setSuccessData(paymentResult);

            try {
              confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
            } catch (e) {}

            if (onSuccess) onSuccess(verifyRes);
          } catch (verErr) {
            console.error('[Payment Verification Failed]:', verErr);
            setVerifyError(verErr.message || 'Payment verification failed on server.');
          } finally {
            setProcessing(false);
          }
        },
        prefill: {
          name: currentUser?.name || 'Student',
          contact: currentUser?.phone || '9423490513',
          email: currentUser?.email || 'student@mitpune.edu'
        },
        notes: {
          messId: String(messId || ''),
          planId: String(planId || ''),
          platform: 'MessConnect Web'
        },
        theme: {
          color: '#ea580c' // MessConnect brand color
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
            console.log('[Razorpay Modal] Dismissed by customer.');
          }
        }
      };

      try {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          console.error('[Razorpay Payment Failed]', resp.error);
          setVerifyError(resp.error?.description || 'Payment was declined by issuing bank.');
          setProcessing(false);

          api.reportPaymentFailure({
            orderId: order.orderId,
            errorCode: resp.error?.code || 'PAYMENT_FAILED',
            errorDescription: resp.error?.description || 'Payment failed at gateway.',
            userId: currentUser?.id || userId
          }).catch(() => {});
        });

        rzp.open();
      } catch (e) {
        console.error('[Razorpay Open Error]', e);
        setVerifyError('Failed to open Razorpay modal: ' + e.message);
        setProcessing(false);
      }
    } else {
      setVerifyError('Razorpay Checkout SDK is still loading. Please check your internet connection.');
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (!successData && order?.orderId) {
      api.reportPaymentFailure({
        orderId: order.orderId,
        errorCode: 'USER_CANCELLED',
        errorDescription: 'User closed checkout dialog.',
        userId: currentUser?.id || userId
      }).catch(() => {});
    }
    setSuccessData(null);
    onClose();
  };

  const effectiveAmount = order?.amount ?? amount ?? 0;
  const isLive = config?.testMode === false;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md overflow-hidden shadow-2xl p-5 sm:p-6 text-slate-800 max-h-[92vh] overflow-y-auto">

        {/* 1. SUCCESS VIEW */}
        {successData ? (
          <div className="text-center py-2 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-[11px] font-extrabold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Razorpay Verified ✓</span>
            </div>

            <h3 className="text-xl font-black text-slate-900 mb-0.5">Payment Successful!</h3>
            <p className="text-xs text-slate-500 mb-4">
              {successData.subscription ? 'Subscription activated & meal pass generated.' : 'Transaction verified and credited.'}
            </p>

            {/* Receipt Summary Card */}
            <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-200/80 text-xs space-y-2 mb-4">
              <div className="flex justify-between items-center text-slate-500 pb-2 border-b border-slate-200/60">
                <span>Amount Paid</span>
                <span className="font-extrabold text-slate-900 text-base">₹{successData.amount}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Plan / Service</span>
                <span className="font-semibold text-slate-800 text-right truncate max-w-[200px]">{itemTitle}</span>
              </div>
              {successData.subscription && (
                <>
                  <div className="flex justify-between text-slate-500">
                    <span>Valid From</span>
                    <span className="font-semibold text-slate-800">{successData.subscription.startDate}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Valid Until</span>
                    <span className="font-bold text-emerald-700">{successData.subscription.endDate}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Subscription Status</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>ACTIVE</span>
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-slate-500">
                <span>Payment Mode</span>
                <span className="font-medium text-slate-800">{successData.method}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Payment ID</span>
                <span className="font-mono text-slate-700 text-[11px] font-bold">{successData.paymentId}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Receipt #</span>
                <span className="font-mono text-emerald-700 font-bold">{successData.receiptNumber}</span>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition shadow-md cursor-pointer"
            >
              Done & View Subscription Pass
            </button>
          </div>
        ) : (
          /* 2. REAL RAZORPAY CHECKOUT SCREEN */
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                  ₹
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-slate-900 text-sm">Razorpay Secure Checkout</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      isLive ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {isLive ? 'Live Mode' : 'Test Mode'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-0.5">
                    <Lock className="w-3 h-3 text-emerald-600" />
                    <span>256-Bit SSL Encrypted • RBI Compliant</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Notice */}
            {orderError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs mb-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold">Gateway Notice:</div>
                  <div>{orderError}</div>
                </div>
              </div>
            )}

            {/* Bill Summary Card */}
            <div className="bg-gradient-to-br from-orange-50/80 to-amber-50/60 border border-orange-200/70 rounded-2xl p-4 mb-4">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold text-orange-700 uppercase tracking-wider">
                    {isRenewal ? 'Subscription Renewal' : 'Subscription Plan'}
                  </span>
                  <div className="text-sm font-black text-slate-900 truncate mt-0.5">{itemTitle}</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">{itemSubtitle}</div>
                  {order?.orderId && (
                    <div className="font-mono text-[10px] text-slate-500 mt-1 truncate">
                      Order: {order.orderId}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xl font-black text-orange-600">
                    ₹{effectiveAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">All meals included</div>
                </div>
              </div>
            </div>

            {/* Supported Payment Options Badge Grid */}
            <div className="mb-4">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Accepted Payment Methods
              </label>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-orange-600" />
                  <div>
                    <div className="font-bold text-slate-800 text-[11px]">UPI / QR Code</div>
                    <div className="text-[9px] text-slate-500">GPay, PhonePe, Paytm, Cred</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="font-bold text-slate-800 text-[11px]">Debit & Credit Cards</div>
                    <div className="text-[9px] text-slate-500">Visa, Mastercard, RuPay</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="font-bold text-slate-800 text-[11px]">Net Banking</div>
                    <div className="text-[9px] text-slate-500">SBI, HDFC, ICICI & 50+ Banks</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <div>
                    <div className="font-bold text-slate-800 text-[11px]">Pay Later / Wallets</div>
                    <div className="text-[9px] text-slate-500">Simpl, LazyPay, Amazon Pay</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Student Prefill Info */}
            <div className="p-2.5 rounded-xl bg-slate-100/70 border border-slate-200/60 text-[11px] text-slate-600 flex items-center justify-between mb-4">
              <span>Billing To:</span>
              <span className="font-bold text-slate-800 truncate max-w-[200px]">
                {currentUser?.name || 'Rahul Sharma'} ({currentUser?.phone || '9423490513'})
              </span>
            </div>

            {/* Verification Error Notice */}
            {verifyError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs mb-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold">Transaction Notice:</div>
                  <div>{verifyError}</div>
                </div>
              </div>
            )}

            {/* Pay Button: Triggers Real Razorpay Checkout */}
            <button
              onClick={handleLaunchRazorpay}
              disabled={processing || orderLoading || !order?.orderId}
              className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-70 text-white font-black text-sm rounded-2xl transition shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Waiting for Razorpay Payment...</span>
                </>
              ) : orderLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Razorpay Order...</span>
                </>
              ) : (
                <>
                  <span>Pay ₹{effectiveAmount.toLocaleString('en-IN')} with Razorpay</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center mt-3 text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <Shield className="w-3 h-3 text-slate-400" />
              <span>Payments are processed securely via Razorpay Payment Gateway</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
