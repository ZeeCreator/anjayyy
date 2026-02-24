/**
 * Vercel Serverless Function Entry Point
 */
const app = require('./vercel');

// Export untuk Vercel
module.exports = app;
module.exports.default = app;
