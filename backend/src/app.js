require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes     = require('./routes/auth');
const clientRoutes   = require('./routes/clients');
const invoiceRoutes  = require('./routes/invoices');
const quoteRoutes    = require('./routes/quotes');
const settingsRoutes = require('./routes/settings');
const projectRoutes         = require('./routes/projects');
const onboardingRoutes      = require('./routes/onboarding');
const serviceTemplateRoutes = require('./routes/service-templates');
const intakeRoutes   = require('./routes/intake');
const deliveryRoutes = require('./routes/delivery');
const legalRoutes    = require('./routes/legal');
const areasRoutes    = require('./routes/areas');
const workflowRoutes = require('./routes/workflow');
const teamRoutes     = require('./routes/team');
const timeRoutes     = require('./routes/time');
const calendarRoutes = require('./routes/calendar');
const salesRoutes    = require('./routes/sales');
const webhookRoutes  = require('./routes/webhook');
const planningRoutes = require('./routes/planning');
const financeRoutes  = require('./routes/finance');
const partnerRoutes     = require('./routes/partner');
const partnerMailRoutes = require('./routes/partnerMail');

const app = express();

// Trust Render's reverse proxy so express-rate-limit gets the real client IP
// (without this, all requests appear to come from the same IP → authLimiter blocks everyone)
app.set('trust proxy', 1);

// ─── SECURITY HEADERS ─────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow fonts/images from frontend
}));

// Health check — before rate limiter so UptimeRobot/Render never gets a 429
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
const allowedOrigins = [
  ...(process.env.FRONTEND_URL || '').split(',').map(o => o.trim()).filter(Boolean),
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://partner-app-tawny.vercel.app',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);
    // Allow explicitly listed origins only
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
}));

// Rate limiting — 200 req/15min per IP for API, stricter for auth
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen, bitte warte kurz.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Login-Versuche, bitte warte kurz.' },
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use(express.json({ limit: '5mb' })); // 5mb to allow base64 logo uploads
app.use(express.urlencoded({ extended: true }));

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/clients',  clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/quotes',   quoteRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/projects',          projectRoutes);
app.use('/api/onboarding',        onboardingRoutes);
app.use('/api/service-templates', serviceTemplateRoutes);
app.use('/api/intake',   intakeRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/legal',    legalRoutes);
app.use('/api/areas',    areasRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/team',     teamRoutes);
app.use('/api/time',     timeRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/sales',    salesRoutes);
app.use('/api/webhook',  webhookRoutes);
app.use('/api/planning', planningRoutes);
app.use('/api/finance',  financeRoutes);
app.use('/api/partner',      partnerRoutes);
app.use('/api/partner/mail', partnerMailRoutes);


// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
