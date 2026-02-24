/**
 * Middleware untuk logging request
 */
const logger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';

  console.log(`[${timestamp}] ${method} ${url} - IP: ${ip} - UA: ${userAgent.substring(0, 50)}...`);

  // Override res.json untuk logging response
  const originalJson = res.json;
  res.json = function (data) {
    const status = res.statusCode;
    console.log(`[${timestamp}] Response: ${status} - ${method} ${url}`);
    return originalJson.call(this, data);
  };

  next();
};

/**
 * Middleware untuk not found 404
 */
const notFound = (req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Endpoint ${req.method} ${req.url} tidak ditemukan`
  });
};

module.exports = {
  logger,
  notFound
};
