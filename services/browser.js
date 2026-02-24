const puppeteer = require('puppeteer');
const { defaultDelay } = require('../utils/delay');

// Request queue untuk mengontrol concurrency
const requestQueue = [];
let isProcessing = false;
const MAX_CONCURRENT = 2;
let activeRequests = 0;

/**
 * Browser singleton untuk efisiensi
 */
let browserInstance = null;

/**
 * User agents realistis untuk rotasi
 */
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
];

/**
 * Headers realistis untuk request
 */
const DEFAULT_HEADERS = {
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1'
};

/**
 * Mendapatkan user agent random
 * @returns {string}
 */
const getRandomUserAgent = () => {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
};

/**
 * Mendapatkan browser instance (singleton)
 * @returns {Promise<import('puppeteer').Browser>}
 */
const getBrowser = async () => {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  const headless = process.env.PUPPETEER_HEADLESS !== 'false';
  const timeout = parseInt(process.env.PUPPETEER_TIMEOUT) || 30000;

  browserInstance = await puppeteer.launch({
    headless: headless ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check'
    ],
    ignoreHTTPSErrors: true,
    timeout: timeout
  });

  return browserInstance;
};

/**
 * Menutup browser instance
 */
const closeBrowser = async () => {
  if (browserInstance && browserInstance.connected) {
    await browserInstance.close();
    browserInstance = null;
  }
};

/**
 * Membuat page dengan konfigurasi anti-deteksi
 * @param {import('puppeteer').Browser} browser
 * @returns {Promise<import('puppeteer').Page>}
 */
const createPage = async (browser) => {
  const page = await browser.newPage();
  
  // Set viewport realistis
  await page.setViewport({
    width: 1920 + Math.floor(Math.random() * 100),
    height: 1080 + Math.floor(Math.random() * 100),
    deviceScaleFactor: 1
  });

  // Set user agent random
  const userAgent = getRandomUserAgent();
  await page.setUserAgent(userAgent);

  // Set headers
  const headers = {
    ...DEFAULT_HEADERS,
    'User-Agent': userAgent
  };
  await page.setExtraHTTPHeaders(headers);

  // Inject script untuk bypass deteksi automation
  await page.evaluateOnNewDocument(() => {
    // Override navigator.webdriver
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false
    });

    // Override navigator.plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5]
    });

    // Override navigator.languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en']
    });

    // Override permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );

    // Remove automation flags
    delete navigator.__proto__.webdriver;
  });

  return page;
};

/**
 * Fetch halaman dengan Puppeteer untuk bypass Cloudflare
 * @param {string} url - URL yang akan di-fetch
 * @param {object} options - Opsi tambahan
 * @returns {Promise<{html: string, url: string, status: number}>}
 */
const fetchWithPuppeteer = async (url, options = {}) => {
  const {
    waitForSelector = null,
    waitForTimeout = 5000,
    useDelay = true
  } = options;

  // Delay sebelum request
  if (useDelay) {
    await defaultDelay();
  }

  // Tunggu jika queue penuh
  while (activeRequests >= MAX_CONCURRENT) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  activeRequests++;

  try {
    const browser = await getBrowser();
    const page = await createPage(browser);

    // Set navigation timeout
    const timeout = parseInt(process.env.PUPPETEER_TIMEOUT) || 30000;
    page.setDefaultNavigationTimeout(timeout);
    page.setDefaultTimeout(timeout);

    // Navigate ke URL
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: timeout
    });

    // Tunggu selector jika ditentukan
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: waitForTimeout });
    }

    // Tunggu sebentar untuk memastikan halaman fully loaded
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    // Dapatkan HTML dan URL
    const html = await page.content();
    const currentUrl = page.url();

    // Tutup page
    await page.close();

    return {
      html,
      url: currentUrl,
      status: 200
    };
  } catch (error) {
    console.error(`[Puppeteer Error] ${url}: ${error.message}`);
    throw error;
  } finally {
    activeRequests--;
  }
};

/**
 * Fetch dengan request queue untuk kontrol concurrency
 * @param {string} url - URL yang akan di-fetch
 * @param {object} options - Opsi
 * @returns {Promise<{html: string, url: string, status: number}>}
 */
const fetchWithQueue = async (url, options = {}) => {
  return new Promise((resolve, reject) => {
    requestQueue.push({ url, options, resolve, reject });
    processQueue();
  });
};

/**
 * Memproses request queue
 */
const processQueue = async () => {
  if (isProcessing || requestQueue.length === 0) {
    return;
  }

  isProcessing = true;

  while (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT) {
    const { url, options, resolve, reject } = requestQueue.shift();
    
    activeRequests++;
    
    fetchWithPuppeteer(url, options)
      .then(resolve)
      .catch(reject)
      .finally(() => {
        activeRequests--;
        processQueue();
      });
  }

  isProcessing = false;
};

/**
 * Cleanup saat shutdown
 */
const cleanup = async () => {
  await closeBrowser();
};

module.exports = {
  getBrowser,
  closeBrowser,
  createPage,
  fetchWithPuppeteer,
  fetchWithQueue,
  getRandomUserAgent,
  cleanup,
  USER_AGENTS,
  DEFAULT_HEADERS
};
