/**
 * Middleware untuk error handling global
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${new Date().toISOString()}`, {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  // Error dari Axios (network errors)
  if (err.code === 'ECONNABORTED') {
    return res.status(504).json({
      status: 'error',
      message: 'Request timeout. Server target terlalu lama merespons.'
    });
  }

  if (err.code === 'ENOTFOUND') {
    return res.status(502).json({
      status: 'error',
      message: 'Tidak dapat terhubung ke server target.'
    });
  }

  // Error dari Puppeteer
  if (err.name === 'TimeoutError') {
    return res.status(504).json({
      status: 'error',
      message: 'Timeout saat memuat halaman. Silakan coba lagi.'
    });
  }

  // Error custom dari scraper
  if (err.type === 'SCRAPER_ERROR') {
    return res.status(503).json({
      status: 'error',
      message: err.message || 'Gagal mengambil data dari sumber.'
    });
  }

  // Error custom untuk not found
  if (err.type === 'NOT_FOUND') {
    return res.status(404).json({
      status: 'error',
      message: err.message || 'Data tidak ditemukan.'
    });
  }

  // Error custom untuk rate limit
  if (err.type === 'RATE_LIMIT') {
    return res.status(429).json({
      status: 'error',
      message: err.message || 'Terlalu banyak request. Silakan tunggu beberapa saat.'
    });
  }

  // Default error (500)
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'development' 
    ? err.message 
    : 'Terjadi kesalahan pada server.';

  res.status(statusCode).json({
    status: 'error',
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * Async handler wrapper untuk error handling yang lebih clean
 * @param {Function} fn - Async function to wrap
 * @returns {Function}
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  asyncHandler
};
