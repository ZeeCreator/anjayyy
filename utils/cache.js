const NodeCache = require('node-cache');

// Inisialisasi cache dengan TTL default 60 detik
const cache = new NodeCache({
  stdTTL: 60,
  checkperiod: 120,
  useClones: true,
  maxKeys: 1000
});

/**
 * Mendapatkan data dari cache
 * @param {string} key - Cache key
 * @returns {any|null} Data dari cache atau null jika tidak ada
 */
const getCache = (key) => {
  return cache.get(key);
};

/**
 * Menyimpan data ke cache
 * @param {string} key - Cache key
 * @param {any} value - Data yang akan disimpan
 * @param {number} [ttl] - TTL dalam detik (opsional)
 * @returns {boolean} True jika berhasil
 */
const setCache = (key, value, ttl = null) => {
  if (ttl) {
    return cache.set(key, value, ttl);
  }
  return cache.set(key, value);
};

/**
 * Mengecek apakah key ada di cache
 * @param {string} key - Cache key
 * @returns {boolean} True jika ada
 */
const hasCache = (key) => {
  return cache.has(key);
};

/**
 * Menghapus data dari cache
 * @param {string} key - Cache key
 * @returns {boolean} True jika berhasil dihapus
 */
const delCache = (key) => {
  return cache.del(key);
};

/**
 * Membersihkan semua cache
 * @returns {boolean} True jika berhasil
 */
const flushCache = () => {
  return cache.flushAll();
};

/**
 * Mendapatkan statistik cache
 * @returns {object} Statistik cache
 */
const getStats = () => {
  return cache.getStats();
};

module.exports = {
  getCache,
  setCache,
  hasCache,
  delCache,
  flushCache,
  getStats,
  cache
};
