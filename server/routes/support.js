const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { sendSupportQueryEmail } = require('../services/emailService');

// POST /api/support/query or /api/contact/query
router.post(['/query', '/ticket', '/contact', '/'], async (req, res) => {
  try {
    const {
      name,
      contact,
      email,
      phone,
      category = 'General Support',
      message,
      userId,
      userRole
    } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Query message cannot be empty.'
      });
    }

    const effectiveContact = contact || phone || email || 'Not provided';
    const effectiveName = name || (userId ? db.getUserById(userId)?.name : 'MessConnect User');
    const effectiveEmail = email || (contact && contact.includes('@') ? contact : null);

    // Dispatch inquiry email to admin / support mailbox
    let emailResult = { success: false };
    try {
      emailResult = await sendSupportQueryEmail({
        name: effectiveName,
        contact: effectiveContact,
        email: effectiveEmail,
        category,
        message: message.trim(),
        userId,
        userRole
      });
    } catch (mailErr) {
      console.error('⚠️ [Support Query] Failed to deliver email via Resend API:', mailErr.message);
    }

    // Also record an in-app notification if userId is provided
    if (userId) {
      try {
        db.createNotification({
          userId,
          title: 'Query Submitted to Admin',
          message: `Your query regarding "${category}" has been sent to our campus support team. We will contact you at ${effectiveContact}.`,
          type: 'SYSTEM',
          channel: 'Support'
        });
      } catch (_) {}
    }

    const ticketId = 'MC-TKT-' + Date.now().toString().slice(-6);

    res.status(200).json({
      success: true,
      ticketId,
      message: 'Support query received successfully and dispatched to support team.',
      emailDelivered: Boolean(emailResult?.messageId)
    });
  } catch (error) {
    console.error('Error handling support query:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process support query. Please try calling the admin helpline directly.'
    });
  }
});

// POST /api/support/report-error
router.post('/report-error', (req, res) => {
  try {
    const report = req.body || {};
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    console.warn(`⚠️ [Client Incident Telemetry] ID: ${report.id || 'N/A'} | User: ${report.user?.name || 'Anon'} (${report.user?.role || 'Guest'}) | Error: ${report.message || 'No message'} | URL: ${report.system?.url || 'N/A'} | IP: ${clientIp}`);

    if (db && db.data) {
      if (!db.data.errorLogs) db.data.errorLogs = [];
      db.data.errorLogs.unshift({
        ...report,
        clientIp,
        receivedAt: new Date().toISOString()
      });
      if (db.data.errorLogs.length > 100) {
        db.data.errorLogs.pop();
      }
    }

    res.status(200).json({
      success: true,
      trackingId: report.id || 'MC-LOG-' + Date.now().toString().slice(-6),
      supportEmail: 'support@messconnect.in',
      adminEmail: 'parthmhaske1234@gmail.com'
    });
  } catch (err) {
    console.error('Error recording client error telemetry:', err);
    res.status(200).json({ success: false, message: 'Telemetry acknowledged' });
  }
});

module.exports = router;

