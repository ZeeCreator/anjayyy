/**
 * Otakudesu API - Vercel Serverless Function
 * 
 * Note: Puppeteer mungkin tidak berfungsi di Vercel Free Tier
 * karena ukuran bundle yang besar (~180MB) dan timeout 10 detik.
 * 
 * Untuk scraper dengan Puppeteer, disarankan menggunakan:
 * - Vercel Pro (timeout 60 detik)
 * - Railway.app (rekomendasi)
 * - Render.com
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { notFound, logger } = require('../middleware/logger');
const { errorHandler } = require('../middleware/errorHandler');
const { getStats } = require('../utils/cache');

// Load environment variables
const NODE_ENV = process.env.VERCEL_ENV || process.env.NODE_ENV || 'production';

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
    platform: 'Vercel Serverless',
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
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      platform: 'Vercel Serverless'
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

// Mount API routes (gunakan anime-vercel.js untuk Vercel)
app.use('/api', require('../routes/anime-vercel'));

// ============================================
// ERROR HANDLING
// ============================================

app.use(notFound);
app.use(errorHandler);

// ============================================
// VERCEL EXPORT
// ============================================

// Export sebagai Vercel serverless function
module.exports = app;

// Juga export default untuk kompatibilitas
module.exports.default = app;
