/**
 * Scraper untuk Vercel (tanpa Puppeteer)
 * Menggunakan Axios/Undici untuk scraping sederhana
 * 
 * Note: Ini adalah fallback untuk Vercel Free Tier
 * Untuk scraping penuh dengan Puppeteer, gunakan server tradisional
 */

const undici = require('undici');
const cheerio = require('cheerio');
const { setCache, getCache, hasCache } = require('../utils/cache');

const BASE_URL = process.env.BASE_URL || 'https://otakudesu.best';

// Cache TTL dari environment
const CACHE_TTL_LATEST = parseInt(process.env.CACHE_TTL_LATEST) || 300;
const CACHE_TTL_ANIME = parseInt(process.env.CACHE_TTL_ANIME) || 600;
const CACHE_TTL_SEARCH = parseInt(process.env.CACHE_TTL_SEARCH) || 180;

// Headers realistis
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml',
  'Connection': 'keep-alive'
};

/**
 * Custom error untuk scraper
 */
class ScraperError extends Error {
  constructor(message, type = 'SCRAPER_ERROR', statusCode = 503) {
    super(message);
    this.name = 'ScraperError';
    this.type = type;
    this.statusCode = statusCode;
  }
}

/**
 * Custom error untuk not found
 */
class NotFoundError extends Error {
  constructor(message = 'Data tidak ditemukan') {
    super(message);
    this.name = 'NotFoundError';
    this.type = 'NOT_FOUND';
    this.statusCode = 404;
  }
}

/**
 * Fetch HTML dengan undici (tanpa Puppeteer)
 * @param {string} url - URL yang akan di-fetch
 * @returns {Promise<string>}
 */
const fetchHtml = async (url) => {
  try {
    const response = await undici.fetch(url, {
      headers: HEADERS,
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    throw new ScraperError(`Gagal mengambil data dari ${url}: ${error.message}`);
  }
};

/**
 * Parse HTML dengan Cheerio
 */
const load = (html) => {
  return cheerio.load(html);
};

/**
 * Mendapatkan daftar anime terbaru
 */
const getLatestAnime = async () => {
  const cacheKey = 'latest_anime';
  
  if (hasCache(cacheKey)) {
    return {
      status: 'success',
      source: 'cache',
      data: getCache(cacheKey)
    };
  }

  const url = `${BASE_URL}/ongoing-anime/`;
  const html = await fetchHtml(url);
  const $ = load(html);

  const animeList = [];

  $('.venz ul li').each((_, el) => {
    try {
      const title = $(el).find('.detpost .jdlflm').text().trim();
      const link = $(el).find('.detpost .thumb a').attr('href') || '';
      const slug = link.split('/anime/')[1]?.replace('/', '') || '';
      const thumbnail = $(el).find('.detpost .thumb img').attr('src') || '';
      const episode = $(el).find('.detpost .epz').text().trim();
      const day = $(el).find('.detpost .epztipe').text().trim();
      const releaseDate = $(el).find('.detpost .newnime').text().trim();

      if (title && slug) {
        animeList.push({
          title,
          slug,
          thumbnail,
          episode,
          releaseDate: day ? `${day}, ${releaseDate}` : releaseDate
        });
      }
    } catch (error) {
      console.error('[Parse Error] getLatestAnime:', error.message);
    }
  });

  if (animeList.length === 0) {
    throw new ScraperError('Tidak dapat memparse data anime terbaru');
  }

  setCache(cacheKey, animeList, CACHE_TTL_LATEST);

  return {
    status: 'success',
    source: 'scrape',
    data: animeList
  };
};

/**
 * Mendapatkan detail anime
 */
const getAnimeDetail = async (slug) => {
  const cacheKey = `anime_detail_${slug}`;
  
  if (hasCache(cacheKey)) {
    return {
      status: 'success',
      source: 'cache',
      data: getCache(cacheKey)
    };
  }

  const url = `${BASE_URL}/anime/${slug}`;
  const html = await fetchHtml(url);
  const $ = load(html);

  const info = {};
  $('.infozingle p').each((_, el) => {
    const text = $(el).text().trim();
    const parts = text.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim().toLowerCase().replace(/\s+/g, '_');
      const value = parts.slice(1).join(':').trim();
      info[key] = value;
    }
  });

  const thumbnail = $('.fotoanime img').attr('src') || '';
  const sinopsis = $('.sinopc').text().trim() || '';
  
  const genres = [];
  $('.infozingle a[rel="genre"]').each((_, el) => {
    const genre = $(el).text().trim();
    if (genre) genres.push(genre);
  });

  const episodes = [];
  $('.episodelist ul li').each((_, el) => {
    const title = $(el).find('a').text().trim();
    const episodeUrl = $(el).find('a').attr('href') || '';
    const date = $(el).find('span').text().trim();

    if (title && episodeUrl) {
      const episodeSlug = episodeUrl.split('/episode/')[1]?.replace('/', '') || '';
      episodes.push({
        title,
        url: episodeUrl,
        date,
        slug: episodeSlug || slug
      });
    }
  });

  const animeData = {
    title: info.judul || info.title || $('h1').first().text().trim() || slug,
    slug,
    thumbnail,
    sinopsis,
    genres,
    info: {
      japanese: info.jepang || info.japanese || '',
      english: info.inggris || info.english || '',
      type: info.tipe || info.type || '',
      status: info.status || '',
      duration: info.durasi || info.duration || '',
      totalEpisode: info.total_episode || info.total_episodes || '',
      aired: info.tanggal_rilis || info.aired || '',
      studio: info.studio || '',
      score: info.skor || info.score || ''
    },
    episodes: episodes.slice(0, 50)
  };

  if (!animeData.title || animeData.title === slug) {
    throw new NotFoundError(`Anime dengan slug "${slug}" tidak ditemukan`);
  }

  setCache(cacheKey, animeData, CACHE_TTL_ANIME);

  return {
    status: 'success',
    source: 'scrape',
    data: animeData
  };
};

/**
 * Mendapatkan daftar episode
 */
const getAnimeEpisodes = async (slug) => {
  const cacheKey = `anime_episodes_${slug}`;
  
  if (hasCache(cacheKey)) {
    return {
      status: 'success',
      source: 'cache',
      data: getCache(cacheKey)
    };
  }

  const result = await getAnimeDetail(slug);
  setCache(cacheKey, result.data.episodes, CACHE_TTL_ANIME);

  return {
    status: 'success',
    source: 'scrape',
    data: result.data.episodes
  };
};

/**
 * Mendapatkan link episode
 */
const getEpisodeLinks = async (episodeUrl) => {
  let url = episodeUrl;
  if (!url.startsWith('http')) {
    url = `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  const cacheKey = `episode_${Buffer.from(url).toString('base64').substring(0, 32)}`;
  
  if (hasCache(cacheKey)) {
    return {
      status: 'success',
      source: 'cache',
      data: getCache(cacheKey)
    };
  }

  const html = await fetchHtml(url);
  const $ = load(html);

  const title = $('.post-title').text().trim() || $('h1').first().text().trim() || 'Unknown';
  const thumbnail = $('.post-thumb img').attr('src') || '';
  const sinopsis = $('.sinopc').text().trim() || '';

  const downloadLinks = [];
  $('.download-episode, .batch-download, .download ul').each((_, el) => {
    const qualityTitle = $(el).find('strong').first().text().trim() || 'Unknown Quality';
    const links = [];
    $(el).find('a').each((_, a) => {
      const linkText = $(a).text().trim();
      const linkUrl = $(a).attr('href');
      if (linkText && linkUrl) {
        links.push({ name: linkText, url: linkUrl });
      }
    });
    if (links.length > 0) {
      downloadLinks.push({ quality: qualityTitle, links });
    }
  });

  const episodeData = {
    title,
    thumbnail,
    sinopsis,
    downloadLinks,
    streamingLinks: [],
    url
  };

  setCache(cacheKey, episodeData, CACHE_TTL_SEARCH);

  return {
    status: 'success',
    source: 'scrape',
    data: episodeData
  };
};

/**
 * Search anime
 */
const searchAnime = async (query) => {
  if (!query || query.trim().length === 0) {
    throw new Error('Query pencarian tidak boleh kosong');
  }

  const searchQuery = query.trim();
  const cacheKey = `search_${searchQuery.toLowerCase()}`;
  
  if (hasCache(cacheKey)) {
    return {
      status: 'success',
      source: 'cache',
      data: getCache(cacheKey)
    };
  }

  const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
  const html = await fetchHtml(url);
  const $ = load(html);

  const results = [];

  $('.chivsrc li').each((_, el) => {
    try {
      const title = $(el).find('h2 a').first().text().trim();
      const link = $(el).find('h2 a').first().attr('href') || '';
      const slug = link.split('/anime/')[1]?.replace('/', '') || '';
      const thumbnail = $(el).find('img').first().attr('src') || '';
      
      const infoItems = [];
      $(el).find('.set').each((_, setEl) => {
        infoItems.push($(setEl).text().trim());
      });

      if (title && slug) {
        results.push({
          title,
          slug,
          thumbnail,
          info: infoItems,
          episode: '',
          releaseDate: ''
        });
      }
    } catch (error) {
      console.error('[Parse Error] searchAnime:', error.message);
    }
  });

  const searchData = {
    query: searchQuery,
    total: results.length,
    results
  };

  setCache(cacheKey, searchData, CACHE_TTL_SEARCH);

  return {
    status: 'success',
    source: 'scrape',
    data: searchData
  };
};

/**
 * Health check
 */
const healthCheck = async () => {
  try {
    const url = BASE_URL;
    const html = await fetchHtml(url);
    const $ = load(html);
    
    return {
      status: 'success',
      data: {
        baseUrl: BASE_URL,
        isUp: $('body').length > 0,
        timestamp: new Date().toISOString(),
        platform: 'Vercel (Undici)'
      }
    };
  } catch (error) {
    return {
      status: 'error',
      data: {
        baseUrl: BASE_URL,
        isUp: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        platform: 'Vercel (Undici)'
      }
    };
  }
};

/**
 * Get slug dari episode URL
 */
const getAnimeSlugFromEpisode = async (episodeUrl) => {
  let url = episodeUrl;
  if (!url.startsWith('http')) {
    url = `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  const cacheKey = `episode_slug_${Buffer.from(url).toString('base64').substring(0, 32)}`;
  
  if (hasCache(cacheKey)) {
    return {
      status: 'success',
      source: 'cache',
      data: getCache(cacheKey)
    };
  }

  const html = await fetchHtml(url);
  const $ = load(html);

  let animeSlug = '';
  let animeTitle = '';
  
  $('.breadcrumb a, .breadcrumbs a, .path a').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (href.includes('/anime/')) {
      animeSlug = href.split('/anime/')[1]?.replace('/', '') || '';
      animeTitle = $(el).text().trim();
    }
  });

  if (!animeSlug) {
    const episodeSlug = url.split('/episode/')[1]?.replace('/', '') || '';
    if (episodeSlug) {
      const parts = episodeSlug.split('-');
      const episodeIndex = parts.findIndex(p => p.toLowerCase() === 'episode');
      if (episodeIndex > 0) {
        animeSlug = parts.slice(0, episodeIndex).join('-');
      }
    }
  }

  if (!animeSlug) {
    throw new NotFoundError('Tidak dapat menemukan slug anime dari URL episode');
  }

  const result = {
    episodeUrl: url,
    animeSlug,
    animeTitle: animeTitle || 'Unknown',
    animeUrl: `${BASE_URL}/anime/${animeSlug}`
  };

  setCache(cacheKey, result, CACHE_TTL_SEARCH);

  return {
    status: 'success',
    source: 'scrape',
    data: result
  };
};

module.exports = {
  getLatestAnime,
  getAnimeDetail,
  getAnimeEpisodes,
  getEpisodeLinks,
  searchAnime,
  healthCheck,
  getAnimeSlugFromEpisode,
  ScraperError,
  NotFoundError
};
