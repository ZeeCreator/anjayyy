/**
 * Otakudesu API - Vercel Serverless Function
 * Menggunakan Undici (tanpa Puppeteer) untuk kompatibilitas Vercel
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { notFound } = require('../middleware/logger');
const { errorHandler } = require('../middleware/errorHandler');
const { getStats } = require('../utils/cache');
const animeRoutes = require('../routes/anime-vercel');

// Inisialisasi Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));

// Parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Otakudesu API - Vercel Serverless',
    version: '1.0.0',
    platform: process.env.VERCEL ? 'Vercel' : 'Local',
    endpoints: {
      'GET /api/latest': 'Latest anime',
      'GET /api/anime/:slug': 'Anime detail',
      'GET /api/anime/:slug/episodes': 'Episodes list',
      'GET /api/episode?url=': 'Episode links',
      'GET /api/episode/slug?url=': 'Get slug from episode',
      'GET /api/search?q=': 'Search anime',
      'GET /api/health': 'Health check'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'success',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      platform: process.env.VERCEL ? 'Vercel' : 'Local'
    }
  });
});

// Cache stats
app.get('/api/cache/stats', (req, res) => {
  res.json({
    status: 'success',
    data: {
      ...getStats(),
      timestamp: new Date().toISOString()
    }
  });
});

// API routes
app.use('/api', animeRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Export untuk Vercel
module.exports = app;
module.exports.default = app;
module.exports.handler = app;
