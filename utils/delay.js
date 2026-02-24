/**
 * Delay dengan durasi random antara min dan max
 * @param {number} min - Minimum delay dalam ms
 * @param {number} max - Maximum delay dalam ms
 * @returns {Promise<void>}
 */
const delay = (min, max) => {
  const randomDelay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, randomDelay));
};

/**
 * Delay default 1-3 detik sesuai konfigurasi
 * @returns {Promise<void>}
 */
const defaultDelay = () => {
  const min = parseInt(process.env.REQUEST_DELAY_MIN) || 1000;
  const max = parseInt(process.env.REQUEST_DELAY_MAX) || 3000;
  return delay(min, max);
};

/**
 * Sleep dengan durasi tetap
 * @param {number} ms - Durasi dalam ms
 * @returns {Promise<void>}
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

module.exports = {
  delay,
  defaultDelay,
  sleep
};
