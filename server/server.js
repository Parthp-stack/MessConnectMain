const path = require('path');
const dotenv = require('dotenv');

// Load environment variables immediately before any other module loads
dotenv.config();
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env') });
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: path.join(rootDir, '.env.production') });
}
dotenv.config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const messesRoutes = require('./routes/messes');
const subscriptionsRoutes = require('./routes/subscriptions');
const trialsRoutes = require('./routes/trials');
const paymentsRoutes = require('./routes/payments');
const notificationsRoutes = require('./routes/notifications');
const ownerRoutes = require('./routes/owner');
const adminRoutes = require('./routes/admin');
const checkinRoutes = require('./routes/checkin');
const flexipassRoutes = require('./routes/flexipass');
const groupsRoutes = require('./routes/groups');
const attendanceRoutes = require('./routes/attendance');
const announcementsRoutes = require('./routes/announcements');
const supportRoutes = require('./routes/support');

const db = require('./db/database');
const { DB_CONFIG } = require('./db/mysql');
const { SENDER, checkResendHealth } = require('./services/emailService');
const { createPhase6Tables } = require('./db/createPhase6Tables');

// Ensure Phase 6 MySQL tables exist
createPhase6Tables().catch(e => console.warn('[Phase 6 Schema]', e.message));

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.originalUrl}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/messes', messesRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/trials', trialsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/flexipass', flexipassRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/contact', supportRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  const emailHealth = await checkResendHealth();
  res.json({
    status: 'online',
    appName: 'MessConnect API',
    database: {
      type: 'MySQL',
      schema: DB_CONFIG.database,
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      connected: db.mysqlConnected
    },
    emailGateway: {
      provider: emailHealth.provider || 'Resend HTTPS API',
      sender: SENDER.email,
      connected: emailHealth.connected,
      isConfigured: emailHealth.isConfigured
    },
    tagline: 'Find. Subscribe. Eat. Simplify.',
    timestamp: new Date().toISOString()
  });
});

// Serve Flutter Web if built
const flutterDist = path.resolve(__dirname, '..', 'flutter_app', 'build', 'web');
if (fs.existsSync(flutterDist)) {
  app.use('/flutter', express.static(flutterDist));
  app.get('/flutter/*', (req, res, next) => {
    const flutterIndex = path.resolve(flutterDist, 'index.html');
    if (fs.existsSync(flutterIndex)) {
      return res.sendFile(flutterIndex);
    }
    next();
  });
}

// Serve client in production if built
const clientDist = path.resolve(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

// SPA Fallback: serve index.html for all non-API GET routes to support client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/flutter')) return next();
  const indexHtml = path.resolve(clientDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  next();
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const http = require('http');
const { execSync } = require('child_process');

// Helper to free port if occupied by a stale process (prevents EADDRINUSE)
function freePort(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const currentPid = process.pid;
      const lines = output.trim().split(/\r?\n/);
      const pids = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5 && parts[3] === 'LISTENING' && parts[1].endsWith(`:${port}`)) {
          const pid = parseInt(parts[parts.length - 1], 10);
          if (pid && pid !== currentPid) {
            pids.add(pid);
          }
        }
      }
      for (const pid of pids) {
        console.log(`⚠️ [Port Manager] Port ${port} is occupied by PID ${pid}. Freeing port...`);
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        } catch (_) {}
      }
    }
  } catch (_) {
    // Port is free or findstr returned no matches
  }
}

// Start Server with EADDRINUSE protection
function startServer() {
  freePort(PORT);

  const server = http.createServer(app);

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ [Port Manager] Port ${PORT} occupied (EADDRINUSE). Auto-releasing port and retrying...`);
      freePort(PORT);
      setTimeout(() => {
        try {
          server.close();
        } catch (_) {}
        server.listen(PORT);
      }, 1000);
    } else {
      console.error('[Server Error]', err);
    }
  });

  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 MessConnect Backend Server Running on http://localhost:${PORT}`);
    const activeSender = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    const emailGatewayDesc = `Resend HTTPS API (api.resend.com) - Sender: ${activeSender}`;
    console.log(`✉️ Email Gateway: ${emailGatewayDesc}`);
    console.log(`   Healthcheck: http://localhost:${PORT}/api/health`);
    console.log(`   Tagline: "Find. Subscribe. Eat. Simplify."`);
    console.log(`======================================================\n`);
  });
}

startServer();
