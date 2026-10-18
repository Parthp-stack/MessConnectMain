import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  CreditCard, Smartphone, ShieldCheck, CheckCircle2, Lock, X,
  ArrowRight, Loader2, AlertCircle, RefreshCw, Sparkles, Building2,
  Calendar, Check, Receipt, ExternalLink, Phone, QrCode
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

  const [method, setMethod] = useState('UPI'); // 'UPI', 'CARD', 'NETBANKING'
  const [upiMode, setUpiMode] = useState('NUMBER'); // 'NUMBER' | 'VPA'
  const [upiNumber, setUpiNumber] = useState(currentUser?.phone || '9423490513');
  const [upiId, setUpiId] = useState('student@oksbi');
  const [upiApp, setUpiApp] = useState('phonepe');
  const [processing, setProcessing] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const [successData, setSuccessData] = useState(null);

  // Initialize Razorpay order on modal open
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
        // 1. Fetch public Razorpay config (keyId, testMode, currency)
        const cfg = await api.getPaymentConfig();
        if (isMounted && cfg) {
          setConfig(cfg);
        }

        // 2. Request backend to create Razorpay Order
        const orderRes = await api.createPaymentOrder({
          amount,
          messId,
          planId,
          userId,
          subscriptionId,
          isRenewal,
          purpose: `${itemTitle || 'Meal Subscription'} - ${itemSubtitle || ''}`
        });

        if (isMounted) {
          if (orderRes && orderRes.success) {
            setOrder(orderRes);
          } else {
            setOrderError(orderRes?.message || 'Failed to initialize payment session.');
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
  }, [isOpen, messId, planId, amount]);

  if (!isOpen) return null;

  // Handle Razorpay Checkout Payment & Backend Verification
  const handlePay = async () => {
    if (!order?.orderId) {
      setVerifyError('No active payment order session found. Please try again.');
      return;
    }

    setProcessing(true);
    setVerifyError(null);

    try {
      // Step A: Simulate Razorpay client checkout modal return (orderId + paymentId + signature)
      // Generates cryptographic signature on the backend sandbox simulator (secret is NEVER in client!)
      const simRes = await api.simulateGatewayResponse(order.orderId);
      if (!simRes || !simRes.success) {
        throw new Error(simRes?.message || 'Gateway response simulation failed.');
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = simRes;

      // Step B: Send payment response to backend for cryptographic verification & subscription activation
      const verifyRes = await api.verifyPayment({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        amount: order.amount,
        userId,
        messId,
        planId,
        subscriptionId,
        isRenewal,
        paymentMethod: method === 'UPI'
          ? (upiMode === 'NUMBER' ? `UPI (${upiNumber || '9423490513'} • ${upiApp.toUpperCase()})` : `UPI (${upiId} • ${upiApp.toUpperCase()})`)
          : method === 'CARD' ? 'Razorpay Debit Card' : 'Razorpay NetBanking',
        description: `${itemTitle} - ${itemSubtitle}`
      });

      if (!verifyRes || !verifyRes.success) {
        throw new Error(verifyRes?.message || 'Payment signature verification failed.');
      }

      // Step C: Payment verified & subscription activated by backend!
      const paymentResult = {
        paymentId: verifyRes.payment?.paymentId || razorpay_payment_id,
        orderId: razorpay_order_id,
        receiptNumber: verifyRes.payment?.receiptNumber || `REC-${Date.now().toString().slice(-6)}`,
        amount: verifyRes.payment?.amount || order.amount,
        method: verifyRes.payment?.method || method,
        status: verifyRes.payment?.status || 'SUCCESS',
        subscription: verifyRes.subscription,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      };

      setSuccessData(paymentResult);

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      if (onSuccess) {
        onSuccess(verifyRes);
      }
    } catch (err) {
      console.error('[Payment Error]', err);
      setVerifyError(err.message || 'Payment verification failed. Please try again.');

      // Report failure to backend
      if (order?.orderId) {
        api.reportPaymentFailure({
          orderId: order.orderId,
          errorCode: 'PAYMENT_FAILED',
          errorDescription: err.message,
          userId
        }).catch(() => {});
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (!successData && order?.orderId) {
      // Record cancellation
      api.reportPaymentFailure({
        orderId: order.orderId,
        errorCode: 'USER_CANCELLED',
        errorDescription: 'User closed checkout dialog.',
        userId
      }).catch(() => {});
    }
    setSuccessData(null);
    onClose();
  };

  const effectiveAmount = order?.amount ?? amount ?? 0;

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
              {successData.subscription ? 'Subscription activated & receipt generated.' : 'Transaction verified and credited.'}
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
          /* 2. RAZORPAY CHECKOUT VIEW */
          <div>
            {/* Header with Razorpay Branding */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                  ₹
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-slate-900 text-sm">Razorpay Checkout</h3>
                    <span className="px-2 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[9px] font-black uppercase tracking-wider">
                      Test Mode
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-0.5">
                    <Lock className="w-3 h-3 text-emerald-600" />
                    <span>256-Bit SSL Backend Verified</span>
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

            {/* Error Message if initialization failed */}
            {orderError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs mb-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold">Order Initialization Notice:</div>
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

            {/* Payment Method Tabs */}
            <div className="space-y-3 mb-4">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Select Payment Mode
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod('UPI')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    method === 'UPI'
                      ? 'border-orange-500 bg-orange-50/80 text-orange-700 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>UPI FastPay</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('CARD')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    method === 'CARD'
                      ? 'border-orange-500 bg-orange-50/80 text-orange-700 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Debit / Card</span>
                </button>
              </div>
            </div>

            {/* UPI Option */}
            {method === 'UPI' && (
              <div className="space-y-3 mb-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                {/* Sub-toggle: UPI Mobile Number vs UPI ID */}
                <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs font-bold gap-1">
                  <button
                    type="button"
                    onClick={() => setUpiMode('NUMBER')}
                    className={`flex-1 py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      upiMode === 'NUMBER'
                        ? 'bg-white text-orange-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>UPI Mobile Number</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUpiMode('VPA')}
                    className={`flex-1 py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      upiMode === 'VPA'
                        ? 'bg-white text-orange-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>UPI ID / VPA</span>
                  </button>
                </div>

                {/* Sub-mode 1: UPI Mobile Number */}
                {upiMode === 'NUMBER' ? (
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-700">
                          10-Digit UPI Mobile Number
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setUpiNumber(currentUser?.phone || '9423490513');
                            setUpiApp('phonepe');
                          }}
                          className="text-[10px] font-bold text-orange-600 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Use My Number ({currentUser?.phone || '9423490513'})</span>
                        </button>
                      </div>

                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-xs font-bold text-slate-400 select-none">+91</span>
                        <input
                          type="tel"
                          maxLength={10}
                          value={upiNumber}
                          onChange={(e) => setUpiNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="e.g. 9423490513"
                          className="w-full pl-11 pr-3 py-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    {/* App Selector */}
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                        Select Linked UPI App:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'phonepe', label: 'PhonePe', handle: 'ybl' },
                          { id: 'gpay', label: 'Google Pay', handle: 'okaxis' },
                          { id: 'paytm', label: 'Paytm UPI', handle: 'paytm' }
                        ].map(app => (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => setUpiApp(app.id)}
                            className={`p-2 rounded-xl border text-[11px] font-bold text-center transition cursor-pointer ${
                              upiApp === app.id
                                ? 'border-orange-600 bg-orange-50 text-orange-900 shadow-xs ring-1 ring-orange-500/30'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {app.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-orange-50/60 border border-orange-200/60 text-[10px] text-orange-800 flex items-center justify-between">
                      <span className="font-semibold">Linked UPI Address:</span>
                      <span className="font-mono font-bold">
                        {upiNumber || '9XXXXXXXXX'}@{upiApp === 'gpay' ? 'okaxis' : upiApp === 'phonepe' ? 'ybl' : 'paytm'}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Sub-mode 2: UPI ID / VPA */
                  <div className="space-y-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Virtual Payment Address (UPI ID)
                      </label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="e.g. name@upi or success@razorpay"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-slate-800"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[10px] text-slate-400 font-semibold">Test VPAs:</span>
                      <button
                        type="button"
                        onClick={() => setUpiId('success@razorpay')}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                      >
                        ⚡ success@razorpay
                      </button>
                      <button
                        type="button"
                        onClick={() => setUpiId(`${currentUser?.phone || '9423490513'}@upi`)}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200 hover:bg-slate-200 cursor-pointer"
                      >
                        {currentUser?.phone || '9423490513'}@upi
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Card Option */}
            {method === 'CARD' && (
              <div className="space-y-2.5 mb-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Test Card Number</label>
                  <input
                    type="text"
                    value="4111 •••• •••• 1111 (Razorpay Test Card)"
                    readOnly
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono text-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Expiry</label>
                    <input
                      type="text"
                      value="12/28"
                      readOnly
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">CVV</label>
                    <input
                      type="text"
                      value="•••"
                      readOnly
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono text-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Verification Error Notice */}
            {verifyError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs mb-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold">Payment Verification Failed:</div>
                  <div>{verifyError}</div>
                </div>
              </div>
            )}

            {/* Test Mode Security Info */}
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200/80 text-[10px] text-slate-600 flex items-start gap-2 mb-4 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Razorpay Test Mode:</strong> Cryptographic HMAC-SHA256 signature is verified on the backend before subscription activation. Real bank accounts are never debited.
              </div>
            </div>

            {/* Pay Button */}
            <button
              onClick={handlePay}
              disabled={processing || orderLoading}
              className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-70 text-white font-black text-sm rounded-2xl transition shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Payment Signature...</span>
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
          </div>
        )}
      </div>
    </div>
  );
};
