const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');

// Gunakan scraper-vercel.js untuk Vercel (tanpa Puppeteer)
const scraper = require('../services/scraper-vercel');

/**
 * @route   GET /api/latest
 */
router.get('/latest', asyncHandler(async (req, res) => {
  const result = await scraper.getLatestAnime();
  res.json(result);
}));

/**
 * @route   GET /api/anime/:slug
 */
router.get('/anime/:slug', asyncHandler(async (req, res) => {
  const { slug } = req.params;
  
  if (!slug) {
    return res.status(400).json({
      status: 'error',
      message: 'Slug anime diperlukan'
    });
  }

  const result = await scraper.getAnimeDetail(slug);
  res.json(result);
}));

/**
 * @route   GET /api/anime/:slug/episodes
 */
router.get('/anime/:slug/episodes', asyncHandler(async (req, res) => {
  const { slug } = req.params;
  
  if (!slug) {
    return res.status(400).json({
      status: 'error',
      message: 'Slug anime diperlukan'
    });
  }

  const result = await scraper.getAnimeEpisodes(slug);
  res.json(result);
}));

/**
 * @route   GET /api/episode
 */
router.get('/episode', asyncHandler(async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({
      status: 'error',
      message: 'URL episode diperlukan. Gunakan query ?url='
    });
  }

  const result = await scraper.getEpisodeLinks(url);
  res.json(result);
}));

/**
 * @route   GET /api/episode/slug
 */
router.get('/episode/slug', asyncHandler(async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({
      status: 'error',
      message: 'URL episode diperlukan. Gunakan query ?url=https://otakudesu.best/episode/...'
    });
  }

  const result = await scraper.getAnimeSlugFromEpisode(url);
  res.json(result);
}));

/**
 * @route   GET /api/search
 */
router.get('/search', asyncHandler(async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.trim().length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Query pencarian diperlukan. Gunakan query ?q='
    });
  }

  const result = await scraper.searchAnime(q);
  res.json(result);
}));

/**
 * @route   GET /api/health
 */
router.get('/health', asyncHandler(async (req, res) => {
  const result = await scraper.healthCheck();
  res.json(result);
}));

module.exports = router;
