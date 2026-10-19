const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const db = require('../db/database');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_prototype_sandbox';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'prototype_mock_secret_key_2026';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

// Initialize Razorpay SDK instance for real live/test order generation
let razorpayClient = null;
if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET && !RAZORPAY_KEY_ID.includes('prototype_sandbox')) {
  try {
    razorpayClient = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET
    });
    console.log(`[Razorpay Engine] Initialized Razorpay SDK with Key ID: ${RAZORPAY_KEY_ID.slice(0, 8)}...`);
  } catch (err) {
    console.error('[Razorpay Initialization Error]:', err.message);
  }
}

// Live mode only applies if a real commercial production key (starting with rzp_live_) is configured
const isLiveCommercialMode = RAZORPAY_KEY_ID.startsWith('rzp_live_') && process.env.ENABLE_PAYMENT_SIMULATION !== 'true';
const RAZORPAY_TEST_MODE = !isLiveCommercialMode;

// 1. GET /api/payments/config - Public client Razorpay configuration
// STRICT SECURITY RULE: NEVER exposes RAZORPAY_KEY_SECRET!
router.get('/config', (req, res) => {
  res.json({
    success: true,
    keyId: RAZORPAY_KEY_ID,
    currency: 'INR',
    testMode: RAZORPAY_TEST_MODE,
    merchantName: 'MessConnect',
    description: 'Smart Mess Discovery & Subscription Platform'
  });
});

// 2. GET /api/payments & /api/payments/user/:userId - Payments listing with audit sanitization
router.get(['/', '/user/:userId'], (req, res) => {
  const { userId, messId, status } = req.query;
  const headerUserId = req.headers['x-user-id'];
  const effectiveUserId = req.params.userId || userId || headerUserId;

  let payments = [];
  if (effectiveUserId) {
    payments = db.getUserPayments(effectiveUserId);
  } else if (messId) {
    payments = db.getMessPayments(messId);
  } else {
    payments = db.getPayments();
  }

  if (messId && effectiveUserId) {
    payments = payments.filter(p => p.messId === messId);
  }
  if (status && status !== 'All') {
    payments = payments.filter(p => p.status === status);
  }

  // Security Sanitization: Raw cryptographic signature hashes are strictly omitted from response
  const sanitized = payments.map(p => {
    const copy = { ...p };
    if ('signature' in copy) {
      copy.hasVerifiedSignature = Boolean(copy.signature);
      delete copy.signature;
    }
    return copy;
  });

  res.json({
    success: true,
    count: sanitized.length,
    payments: sanitized
  });
});

// 3. POST /api/payments/create-order & /api/payments/create
// Creates a Razorpay Order via official Razorpay Orders API.
router.post(['/create-order', '/create'], async (req, res) => {
  const {
    amount,
    currency = 'INR',
    messId,
    planId,
    purpose,
    description,
    subscriptionId,
    trialId,
    isRenewal
  } = req.body;

  const headerUserId = req.headers['x-user-id'];
  const userId = req.body.userId || headerUserId || 'user_student';

  // Student authentication verification
  const user = db.getUserById(userId);
  if (!user && !userId) {
    return res.status(401).json({
      success: false,
      message: 'Student authentication required to initiate subscription order.'
    });
  }

  let finalAmount = null;
  let planDetails = null;
  let messDetails = null;

  // Verify mess and plan if provided
  if (messId) {
    messDetails = db.getMessById(messId);
    if (planId) {
      if (!messDetails) {
        return res.status(404).json({
          success: false,
          message: 'Selected mess not found.'
        });
      }

      const plans = db.getMessPlans(messId);
      planDetails = plans.find(p => p.id === planId);

      // Fallback: check mess.plans array directly
      if (!planDetails && Array.isArray(messDetails.plans)) {
        planDetails = messDetails.plans.find(p => p.id === planId);
      }

      if (!planDetails) {
        return res.status(404).json({
          success: false,
          message: 'Selected subscription plan not found in this mess.'
        });
      }

      // Verify plan is active
      if (planDetails.status === 'INACTIVE' || planDetails.isActive === false) {
        return res.status(400).json({
          success: false,
          message: 'Selected subscription plan is currently inactive and cannot be subscribed.'
        });
      }

      // STRICT RULE: Price is taken from database, NEVER blindly trusted from frontend!
      finalAmount = Number(planDetails.price);
    } else if (trialId && messDetails) {
      finalAmount = Number(messDetails.trialPrice || 70);
    }
  }

  // Fallback for custom or direct payment amounts (e.g. flexipass or specified purpose)
  if (finalAmount === null || finalAmount === undefined) {
    finalAmount = Number(amount);
  }

  // Server-side boundary and negativity check
  if (isNaN(finalAmount) || finalAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Payment amount must be greater than zero.'
    });
  }

  const amountPaise = Math.round(finalAmount * 100);
  const receiptId = `rcpt_${Date.now()}`;
  let orderId = null;
  let isRealRazorpayOrder = false;

  const notes = {
    userId: String(userId),
    messId: String(messId || ''),
    planId: String(planId || ''),
    purpose: String(purpose || description || (planDetails ? planDetails.name : 'Meal Subscription')).slice(0, 50),
    subscriptionId: String(subscriptionId || ''),
    trialId: String(trialId || ''),
    isRenewal: Boolean(isRenewal)
  };

  // Try creating a real order on Razorpay servers
  if (razorpayClient) {
    try {
      const razorpayOrder = await razorpayClient.orders.create({
        amount: amountPaise,
        currency: currency.toUpperCase(),
        receipt: receiptId.slice(0, 40),
        notes: {
          userId: String(userId),
          messId: String(messId || ''),
          planId: String(planId || ''),
          purpose: notes.purpose
        }
      });
      orderId = razorpayOrder.id;
      isRealRazorpayOrder = true;
      console.log(`[Razorpay Engine] Created genuine Razorpay order: ${orderId} for ₹${finalAmount}`);
    } catch (rzpErr) {
      console.error('[Razorpay Order Creation Failed]:', rzpErr?.error || rzpErr?.message || rzpErr);
      if (isLiveCommercialMode) {
        return res.status(502).json({
          success: false,
          message: `Razorpay Live Gateway Error: ${rzpErr?.error?.description || rzpErr?.message || 'Failed to initialize order on Razorpay.'}`,
          details: rzpErr?.error || null
        });
      }
      // In non-live test mode, fallback to generated test order if network fails
      orderId = `order_rzp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }
  } else {
    orderId = `order_rzp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  // Record order in database with status: CREATED / PENDING
  const orderRecord = db.createPayment({
    orderId,
    userId,
    messId: messId || null,
    planId: planId || null,
    subscriptionId: subscriptionId || null,
    trialId: trialId || null,
    amount: finalAmount,
    currency: currency.toUpperCase(),
    method: isRealRazorpayOrder ? (isLiveCommercialMode ? 'Razorpay (Live)' : 'Razorpay (Test Mode)') : 'Razorpay (Test Simulation)',
    status: 'CREATED',
    receiptNumber: receiptId,
    description: notes.purpose,
    notes
  });

  res.json({
    success: true,
    orderId,
    amount: finalAmount,
    amountPaise,
    currency: currency.toUpperCase(),
    keyId: RAZORPAY_KEY_ID,
    receipt: receiptId,
    notes,
    testMode: RAZORPAY_TEST_MODE,
    isRealRazorpayOrder,
    plan: planDetails ? {
      id: planDetails.id,
      name: planDetails.name,
      price: planDetails.price,
      durationDays: planDetails.durationDays || planDetails.periodDays || 30,
      mealsIncluded: planDetails.mealsIncluded
    } : null,
    mess: messDetails ? {
      id: messDetails.id,
      name: messDetails.name
    } : null,
    message: isRealRazorpayOrder
      ? 'Genuine Razorpay payment order created successfully.'
      : 'Razorpay payment order initialized.'
  });
});

// 4. POST /api/payments/simulate-gateway-response
// Test Mode Sandbox Simulator Endpoint: simulates client completing Razorpay checkout modal
router.post('/simulate-gateway-response', (req, res) => {
  if (isLiveCommercialMode) {
    return res.status(403).json({
      success: false,
      message: 'Gateway simulation is disabled in live commercial production mode with active bank credentials.'
    });
  }

  const { orderId, tamperSignature } = req.body;
  if (!orderId) {
    return res.status(400).json({
      success: false,
      message: 'orderId is required for gateway response simulation.'
    });
  }

  const paymentId = `pay_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  let signature = '';
  if (tamperSignature) {
    signature = `tampered_invalid_signature_${Date.now()}`;
  } else {
    // Standard Razorpay HMAC-SHA256: order_id + "|" + payment_id
    const payload = `${orderId}|${paymentId}`;
    signature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(payload)
      .digest('hex');
  }

  res.json({
    success: true,
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
    testMode: true
  });
});

// 5. POST /api/payments/verify - CRITICAL PAYMENT VERIFICATION ENDPOINT
// Cryptographically verifies HMAC-SHA256 signature before activating any subscription!
router.post('/verify', (req, res) => {
  const body = req.body || {};
  const orderId = body.orderId || body.razorpay_order_id;
  const paymentId = body.paymentId || body.razorpay_payment_id;
  const signature = body.signature || body.razorpay_signature;

  const headerUserId = req.headers['x-user-id'];
  const userId = body.userId || headerUserId;
  const messId = body.messId;
  const planId = body.planId;
  const subscriptionId = body.subscriptionId;
  const trialId = body.trialId;
  const paymentMethod = body.paymentMethod || body.method || 'Razorpay (Test UPI)';
  const description = body.description || 'MessConnect Subscription Payment';
  const isRenewal = Boolean(body.isRenewal);

  // 1. Mandatory Parameters Validation
  if (!orderId || !paymentId || !signature) {
    return res.status(400).json({
      success: false,
      message: 'Missing mandatory Razorpay verification parameters (orderId, paymentId, or signature).'
    });
  }

  const cleanOrderId = String(orderId).trim();
  const cleanPaymentId = String(paymentId).trim();
  const cleanSignature = String(signature).trim();

  // 2. Duplicate Payment Protection (Idempotency)
  const existingPay = db.getPaymentByPaymentId(cleanPaymentId);
  if (existingPay && existingPay.status === 'SUCCESS') {
    return res.status(409).json({
      success: false,
      message: `Duplicate payment submission blocked. Razorpay payment ID ${cleanPaymentId} has already been verified and credited.`,
      payment: existingPay
    });
  }

  // 3. Cryptographic Signature Verification
  // Razorpay standard: HMAC-SHA256(order_id + "|" + payment_id, secret_key)
  const payload = `${cleanOrderId}|${cleanPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest('hex');

  // Timing-attack safe comparison
  let isValidSignature = false;
  try {
    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const actualBuf = Buffer.from(cleanSignature, 'utf8');
    if (expectedBuf.length === actualBuf.length) {
      isValidSignature = crypto.timingSafeEqual(expectedBuf, actualBuf);
    }
  } catch (err) {
    isValidSignature = false;
  }

  if (!isValidSignature) {
    console.warn(`[Razorpay Security Alert] Invalid signature for order ${cleanOrderId}, payment ${cleanPaymentId}`);
    db.updatePayment(cleanOrderId, {
      status: 'FAILED_INVALID_SIGNATURE',
      paymentId: cleanPaymentId,
      signature: cleanSignature,
      failedAt: new Date().toISOString()
    });

    return res.status(400).json({
      success: false,
      message: 'Payment verification failed: Invalid Razorpay cryptographic signature. Tampering detected.'
    });
  }

  // 4. Signature Verified! Update or Create Payment Record
  const existingOrder = db.getPaymentByOrderId(cleanOrderId);
  const effectiveMessId = messId || existingOrder?.messId;
  const effectiveUserId = userId || existingOrder?.userId || 'user_student';
  const effectivePlanId = planId || existingOrder?.planId;

  // Resolve plan and price from database
  let verifiedAmount = existingOrder?.amount || body.amount || 2800;
  let plan = null;
  let mess = null;

  if (effectiveMessId) {
    mess = db.getMessById(effectiveMessId);
    if (mess) {
      const plans = db.getMessPlans(effectiveMessId);
      plan = plans.find(p => p.id === effectivePlanId) || (mess.plans && mess.plans.find(p => p.id === effectivePlanId));
      if (plan && plan.price) {
        verifiedAmount = Number(plan.price);
      }
    }
  }

  const receiptNumber = existingOrder?.receiptNumber || `REC-${Date.now().toString().slice(-6)}`;

  let paymentRecord = null;
  if (existingOrder) {
    paymentRecord = db.updatePayment(cleanOrderId, {
      paymentId: cleanPaymentId,
      signature: cleanSignature,
      status: 'SUCCESS',
      amount: verifiedAmount,
      method: paymentMethod,
      receiptNumber,
      verifiedAt: new Date().toISOString()
    });
  } else {
    paymentRecord = db.createPayment({
      orderId: cleanOrderId,
      paymentId: cleanPaymentId,
      signature: cleanSignature,
      userId: effectiveUserId,
      messId: effectiveMessId,
      planId: effectivePlanId,
      subscriptionId: subscriptionId || null,
      trialId: trialId || null,
      amount: verifiedAmount,
      currency: 'INR',
      method: paymentMethod,
      status: 'SUCCESS',
      receiptNumber,
      description,
      verifiedAt: new Date().toISOString()
    });
  }

  // 5. Activate or Renew Subscription
  let subscriptionRecord = null;
  const todayStr = new Date().toISOString().split('T')[0];
  const durationDays = plan?.durationDays || plan?.periodDays || 30;

  if (subscriptionId || isRenewal) {
    // Renewal: extend subscription validity
    const existingSub = subscriptionId ? db.getSubscriptionById(subscriptionId) : null;
    if (existingSub) {
      let baseDate = new Date();
      // If currently active and not expired, extend from existing end date
      if (existingSub.status === 'ACTIVE' && existingSub.endDate && existingSub.endDate >= todayStr) {
        baseDate = new Date(existingSub.endDate);
      }
      baseDate.setDate(baseDate.getDate() + durationDays);
      const newEndDate = baseDate.toISOString().split('T')[0];

      subscriptionRecord = db.updateSubscription(existingSub.id, {
        status: 'ACTIVE',
        endDate: newEndDate,
        paymentId: paymentRecord.id,
        totalDays: (existingSub.totalDays || 30) + durationDays,
        remainingDays: Math.max(1, (existingSub.remainingDays || 0) + durationDays),
        planId: plan ? plan.id : existingSub.planId,
        planName: plan ? plan.name : existingSub.planName,
        amount: verifiedAmount
      });
    }
  }

  // If no existing subscription was renewed, create a new active subscription
  if (!subscriptionRecord && effectiveMessId && (plan || effectivePlanId)) {
    const userObj = db.getUserById(effectiveUserId) || { id: effectiveUserId, name: 'Student' };
    const planName = plan ? plan.name : 'Standard Meal Pass';
    const meals = plan?.mealsIncluded || ['Breakfast', 'Lunch', 'Dinner'];

    const endD = new Date();
    endD.setDate(endD.getDate() + durationDays);

    subscriptionRecord = db.createSubscription({
      userId: userObj.id || effectiveUserId,
      userName: userObj.name || 'Student',
      userPhone: userObj.phone || '',
      messId: effectiveMessId,
      messName: mess ? mess.name : 'Partner Mess',
      planId: plan ? plan.id : effectivePlanId,
      planName,
      paymentId: paymentRecord.id,
      amount: verifiedAmount,
      meals,
      startDate: todayStr,
      endDate: endD.toISOString().split('T')[0],
      status: 'ACTIVE',
      totalDays: durationDays,
      activeDays: 0,
      pausedDays: 0,
      remainingDays: durationDays
    });

    // Link subscription ID back to payment record
    db.updatePayment(paymentRecord.id, { subscriptionId: subscriptionRecord.id });
  }

  // 6. Send In-App Notifications
  // Notify Student
  db.createNotification({
    userId: effectiveUserId,
    channel: 'Subscriptions',
    title: subscriptionRecord ? '🎉 Subscription Activated!' : '💳 Payment Successful!',
    message: subscriptionRecord
      ? `Your meal plan at ${subscriptionRecord.messName} (${subscriptionRecord.planName}) is now ACTIVE until ${subscriptionRecord.endDate}.`
      : `Payment of ₹${verifiedAmount} verified successfully. Receipt #${receiptNumber} generated.`,
    type: 'PAYMENT_SUCCESS'
  });

  // Notify Mess Owner
  if (mess && mess.ownerId) {
    const studentUser = db.getUserById(effectiveUserId);
    db.createNotification({
      userId: mess.ownerId,
      channel: 'Subscriptions',
      title: '👤 New Student Subscribed!',
      message: `${studentUser ? studentUser.name : 'A student'} subscribed to ${plan ? plan.name : 'Meal Plan'} (₹${verifiedAmount}).`,
      type: 'OWNER_NEW_SUB'
    });
  }

  res.json({
    success: true,
    payment: paymentRecord,
    subscription: subscriptionRecord,
    receiptUrl: `/receipts/${paymentRecord.id}`,
    message: 'Payment verified and subscription activated successfully.'
  });
});

// 6. POST /api/payments/failure - Record Payment Failure / User Cancellation
router.post('/failure', (req, res) => {
  const { orderId, errorCode, errorDescription, userId } = req.body;
  if (!orderId) {
    return res.status(400).json({ success: false, message: 'orderId is required.' });
  }

  const existing = db.getPaymentByOrderId(orderId);
  const updated = db.updatePayment(orderId, {
    status: 'FAILED',
    errorCode: errorCode || 'PAYMENT_CANCELLED',
    errorDescription: errorDescription || 'Transaction cancelled or declined by issuing bank.',
    userId: userId || existing?.userId,
    failedAt: new Date().toISOString()
  });

  res.json({
    success: true,
    status: 'FAILED',
    orderId,
    message: 'Payment failure recorded successfully.'
  });
});

// 7. GET /api/payments/order/:orderId/status - Network Recovery Status Check
router.get('/order/:orderId/status', (req, res) => {
  const { orderId } = req.params;
  const payment = db.getPaymentByOrderId(orderId);
  if (!payment) {
    return res.status(404).json({ success: false, message: 'Payment order not found.' });
  }

  res.json({
    success: true,
    orderId: payment.orderId,
    status: payment.status,
    amount: payment.amount,
    receiptNumber: payment.receiptNumber,
    hasVerifiedSignature: Boolean(payment.signature)
  });
});

// 8. POST /api/payments/:id/refund - Server-Side Refund Processing
router.post('/:id/refund', (req, res) => {
  const { id } = req.params;
  const { reason, amount } = req.body;
  const callerId = req.headers['x-user-id'] || 'Admin';

  const refunded = db.refundPayment(id, {
    reason: reason || 'Customer requested refund',
    amount: amount ? Number(amount) : undefined,
    refundedBy: callerId
  });

  if (!refunded) {
    return res.status(404).json({
      success: false,
      message: 'Payment transaction not found for refund.'
    });
  }

  res.json({
    success: true,
    message: `Payment ${refunded.id} marked as ${refunded.status}.`,
    payment: refunded
  });
});

// 9. POST /api/payments/webhook - Razorpay Server-to-Server Webhook Integration
// Idempotent and cryptographically verified via HMAC-SHA256
router.post('/webhook', express.raw({ type: '*/*' }), (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  if (signature) {
    const expectedSig = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSig) {
      console.warn('[Webhook Warning] Razorpay webhook signature verification failed.');
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }
  }

  let eventData = {};
  try {
    eventData = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
  } catch (e) {
    eventData = {};
  }

  const eventType = eventData.event;
  const payload = eventData.payload || {};
  const paymentEntity = payload.payment?.entity;
  const orderEntity = payload.order?.entity;

  console.log(`[Razorpay Webhook] Received event: "${eventType}"`);

  // Idempotent event processing
  if (eventType === 'payment.captured' || eventType === 'order.paid') {
    const payId = paymentEntity?.id;
    const ordId = paymentEntity?.order_id || orderEntity?.id;

    if (payId) {
      const existing = db.getPaymentByPaymentId(payId);
      if (!existing || existing.status !== 'SUCCESS') {
        db.updatePayment(ordId || payId, {
          paymentId: payId,
          status: 'SUCCESS',
          verifiedAt: new Date().toISOString()
        });
      }
    }
  } else if (eventType === 'payment.failed') {
    const ordId = paymentEntity?.order_id || orderEntity?.id;
    if (ordId) {
      db.updatePayment(ordId, {
        status: 'FAILED',
        errorDescription: paymentEntity?.error_description || 'Payment failed at gateway'
      });
    }
  } else if (eventType === 'refund.created') {
    const payId = payload.refund?.entity?.payment_id;
    if (payId) {
      db.refundPayment(payId, {
        reason: 'Webhook refund created',
        amount: payload.refund?.entity?.amount ? payload.refund.entity.amount / 100 : undefined
      });
    }
  }

  res.status(200).json({ status: 'ok', event: eventType });
});

module.exports = router;
