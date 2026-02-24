require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { logger, notFound } = require('../middleware/logger');
const { errorHandler } = require('../middleware/errorHandler');
const { cleanup } = require('../services/browser');
const { getStats } = require('../utils/cache');
const animeRoutes = require('../routes/anime');

// Load environment variables
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'production';
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000;
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 60;

// Inisialisasi Express app
const app = express();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
}));

// Rate limiting (opsional untuk Vercel)
if (process.env.VERCEL !== '1') {
  const limiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX_REQUESTS,
    message: {
      status: 'error',
      message: 'Terlalu banyak request. Silakan tunggu beberapa saat.',
      retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use('/api', limiter);
}

// ============================================
// PARSING MIDDLEWARE
// ============================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// LOGGING MIDDLEWARE
// ============================================

if (NODE_ENV === 'development') {
  app.use(logger);
}

// ============================================
// API ROUTES
// ============================================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Otakudesu API - REST API untuk scraping data anime dari Otakudesu',
    version: '1.0.0',
    platform: process.env.VERCEL === '1' ? 'Vercel' : 'Self-hosted',
    endpoints: {
      'GET /api/latest': 'Mendapatkan daftar anime terbaru',
      'GET /api/anime/:slug': 'Mendapatkan detail anime',
      'GET /api/anime/:slug/episodes': 'Mendapatkan daftar episode',
      'GET /api/episode?url=': 'Mendapatkan link download episode',
      'GET /api/episode/slug?url=': 'Mendapatkan slug anime dari URL episode',
      'GET /api/search?q=': 'Mencari anime',
      'GET /api/health': 'Health check',
      'GET /api/cache/stats': 'Statistik cache'
    },
    documentation: 'https://github.com/yourusername/otaku-api#readme'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'success',
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      platform: process.env.VERCEL === '1' ? 'Vercel' : 'Self-hosted',
      memory: process.memoryUsage()
    }
  });
});

// Cache stats endpoint
app.get('/api/cache/stats', (req, res) => {
  const stats = getStats();
  res.json({
    status: 'success',
    data: {
      ...stats,
      timestamp: new Date().toISOString()
    }
  });
});

// Mount API routes
app.use('/api', animeRoutes);

// ============================================
// ERROR HANDLING
// ============================================

app.use(notFound);
app.use(errorHandler);

// ============================================
// GRACEFUL SHUTDOWN (hanya untuk non-Vercel)
// ============================================

if (process.env.VERCEL !== '1') {
  const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} diterima. Memulai graceful shutdown...`);
    try {
      await cleanup();
      console.log('Browser ditutup.');
      process.exit(0);
    } catch (error) {
      console.error('Error saat shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });
}

// Export untuk Vercel serverless
module.exports = app;

// Start server hanya jika bukan Vercel
if (process.env.VERCEL !== '1') {
  const server = app.listen(PORT, () => {
    console.log('============================================');
    console.log('   OTAKUDESU API SERVER');
    console.log('============================================');
    console.log(`Environment: ${NODE_ENV}`);
    console.log(`Port: ${PORT}`);
    console.log(`Platform: Self-hosted`);
    console.log('============================================');
    console.log('Server berjalan. Tekan Ctrl+C untuk stop.');
    console.log('============================================');
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} sudah digunakan.`);
    } else {
      console.error('Server error:', error);
    }
    process.exit(1);
  });

  module.exports.server = server;
}
