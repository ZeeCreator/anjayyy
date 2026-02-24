require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { logger, notFound } = require('./middleware/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { cleanup } = require('./services/browser');
const { getStats } = require('./utils/cache');
const animeRoutes = require('./routes/anime');

// Load environment variables
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000; // 15 menit
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 60;

// Inisialisasi Express app
const app = express();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet untuk security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable untuk API
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false
}));

// CORS configuration
app.use(cors({
  origin: '*', // Bisa disesuaikan untuk production
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  message: {
    status: 'error',
    message: 'Terlalu banyak request. Silakan tunggu beberapa saat.',
    retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  }
});

app.use('/api', limiter);

// ============================================
// PARSING MIDDLEWARE
// ============================================

// Parse JSON body
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded body
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
    endpoints: {
      'GET /api/latest': 'Mendapatkan daftar anime terbaru',
      'GET /api/anime/:slug': 'Mendapatkan detail anime',
      'GET /api/anime/:slug/episodes': 'Mendapatkan daftar episode',
      'GET /api/episode?url=': 'Mendapatkan link download episode',
      'GET /api/episode/slug?url=': 'Mendapatkan slug anime dari URL episode (BARU)',
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

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} diterima. Memulai graceful shutdown...`);
  
  try {
    // Cleanup browser
    await cleanup();
    console.log('Browser ditutup.');
    
    // Tutup server
    server.close(() => {
      console.log('Server HTTP ditutup.');
      process.exit(0);
    });
    
    // Force exit setelah timeout
    setTimeout(() => {
      console.error('Shutdown timeout. Force exit.');
      process.exit(1);
    }, 10000);
  } catch (error) {
    console.error('Error saat shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// ============================================
// START SERVER
// ============================================

const server = app.listen(PORT, () => {
  console.log('============================================');
  console.log('   OTAKUDESU API SERVER');
  console.log('============================================');
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Port: ${PORT}`);
  console.log(`Rate Limit: ${RATE_LIMIT_MAX_REQUESTS} requests per ${RATE_LIMIT_WINDOW_MS / 60000} minutes`);
  console.log('============================================');
  console.log('Available Endpoints:');
  console.log(`  GET http://localhost:${PORT}/`);
  console.log(`  GET http://localhost:${PORT}/api/latest`);
  console.log(`  GET http://localhost:${PORT}/api/anime/:slug`);
  console.log(`  GET http://localhost:${PORT}/api/anime/:slug/episodes`);
  console.log(`  GET http://localhost:${PORT}/api/episode?url=`);
  console.log(`  GET http://localhost:${PORT}/api/search?q=`);
  console.log(`  GET http://localhost:${PORT}/api/health`);
  console.log('============================================');
  console.log('Server berjalan. Tekan Ctrl+C untuk stop.');
  console.log('============================================');
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} sudah digunakan. Gunakan port lain atau tunggu beberapa saat.`);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});

module.exports = { app, server };
