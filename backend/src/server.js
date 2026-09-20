const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config();

const healthRouter = require('./routes/health');
const certificatesRouter = require('./routes/certificates');
const institutionsRouter = require('./routes/institutions');
const studentsRouter = require('./routes/students');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:5001',
];

if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(',').forEach(url => {
    const trimmed = url.trim().replace(/\/+$/, '');
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(',').forEach(url => {
    const trimmed = url.trim().replace(/\/+$/, '');
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server, health probes)
    if (!origin) return callback(null, true);

    // Allow explicitly listed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Automatically allow any Vercel deployment (*.vercel.app)
    try {
      const hostname = new URL(origin).hostname;
      if (hostname === 'vercel.app' || hostname.endsWith('.vercel.app')) {
        return callback(null, true);
      }
    } catch (_) {}

    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/health', healthRouter);
app.use('/health', healthRouter);
app.use('/api/certificates', certificatesRouter);
app.use('/api/institutions', institutionsRouter);
app.use('/api/students', studentsRouter);

app.get('/', (req, res) => {
  res.json({
    name: 'Certificate Verification Platform API',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      certificatesUpload: '/api/certificates/upload',
    },
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start Server
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on http://0.0.0.0:${PORT}`);
    console.log(`Health check available at http://0.0.0.0:${PORT}/api/health`);
  });
}

module.exports = app;
