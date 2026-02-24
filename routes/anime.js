const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const scraper = require('../services/scraper');

/**
 * @route   GET /api/latest
 * @desc    Mendapatkan daftar anime terbaru
 * @access  Public
 */
router.get('/latest', asyncHandler(async (req, res) => {
  const result = await scraper.getLatestAnime();
  res.json(result);
}));

/**
 * @route   GET /api/anime/:slug
 * @desc    Mendapatkan detail anime berdasarkan slug
 * @access  Public
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
 * @desc    Mendapatkan daftar episode dari anime
 * @access  Public
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
 * @desc    Mendapatkan link download/streaming episode
 * @access  Public
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
 * @desc    Mendapatkan slug anime dari URL episode
 * @access  Public
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
 * @desc    Mencari anime berdasarkan query
 * @access  Public
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
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', asyncHandler(async (req, res) => {
  const result = await scraper.healthCheck();
  res.json(result);
}));

module.exports = router;
