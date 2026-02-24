/**
 * Vercel Serverless Function Entry Point
 * 
 * @type {import('@vercel/node/types/helpers').NowHandler}
 */

const app = require('./vercel');

// Export default untuk Vercel
module.exports = app;
module.exports.default = app;

// Named export untuk kompatibilitas
module.exports.handler = app;
