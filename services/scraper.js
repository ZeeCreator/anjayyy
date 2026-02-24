const cheerio = require('cheerio');
const { fetchWithPuppeteer } = require('./browser');
const { setCache, getCache, hasCache } = require('../utils/cache');
const { defaultDelay } = require('../utils/delay');

const BASE_URL = process.env.BASE_URL || 'https://otakudesu.best';

// Cache TTL dari environment
const CACHE_TTL_LATEST = parseInt(process.env.CACHE_TTL_LATEST) || 300;
const CACHE_TTL_ANIME = parseInt(process.env.CACHE_TTL_ANIME) || 600;
const CACHE_TTL_SEARCH = parseInt(process.env.CACHE_TTL_SEARCH) || 180;

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
 * Fetch HTML dari URL dengan retry
 * @param {string} url - URL yang akan di-fetch
 * @param {number} retries - Jumlah retry
 * @returns {Promise<string>}
 */
const fetchHtml = async (url, retries = 2) => {
  for (let i = 0; i <= retries; i++) {
    try {
      const result = await fetchWithPuppeteer(url, { useDelay: true });
      return result.html;
    } catch (error) {
      if (i === retries) {
        throw new ScraperError(`Gagal mengambil data dari ${url}: ${error.message}`);
      }
      console.log(`[Retry ${i + 1}/${retries}] ${url}`);
      await defaultDelay();
    }
  }
};

/**
 * Parse HTML dengan Cheerio
 * @param {string} html - HTML string
 * @returns {import('cheerio').CheerioAPI}
 */
const load = (html) => {
  return cheerio.load(html);
};

/**
 * Mendapatkan daftar anime terbaru
 * @returns {Promise<object>}
 */
const getLatestAnime = async () => {
  const cacheKey = 'latest_anime';
  
  // Cek cache
  if (hasCache(cacheKey)) {
    const cached = getCache(cacheKey);
    console.log('[Cache Hit] Latest Anime');
    return {
      status: 'success',
      source: 'cache',
      data: cached
    };
  }

  // Gunakan halaman ongoing anime untuk latest update
  const url = `${BASE_URL}/ongoing-anime/`;
  console.log(`[Scraping] ${url}`);

  const html = await fetchHtml(url);
  
  const $ = load(html);

  const animeList = [];

  // Parse anime dari .venz ul li (struktur Otakudesu yang benar)
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

  // Fallback: coba selector alternatif jika tidak ada hasil
  if (animeList.length === 0) {
    $('.detpost').each((_, el) => {
      try {
        const title = $(el).find('.jdlflm').text().trim();
        const link = $(el).find('.thumb a').attr('href') || '';
        const slug = link.split('/anime/')[1]?.replace('/', '') || '';
        const thumbnail = $(el).find('.thumb img').attr('src') || '';
        const episode = $(el).find('.epz').text().trim();
        const day = $(el).find('.epztipe').text().trim();
        const releaseDate = $(el).find('.newnime').text().trim();

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
        console.error('[Parse Error] getLatestAnime fallback:', error.message);
      }
    });
  }

  if (animeList.length === 0) {
    throw new ScraperError('Tidak dapat memparse data anime terbaru');
  }

  // Simpan ke cache
  setCache(cacheKey, animeList, CACHE_TTL_LATEST);

  return {
    status: 'success',
    source: 'scrape',
    data: animeList
  };
};

/**
 * Mendapatkan detail anime berdasarkan slug
 * @param {string} slug - Slug anime
 * @returns {Promise<object>}
 */
const getAnimeDetail = async (slug) => {
  const cacheKey = `anime_detail_${slug}`;
  
  // Cek cache
  if (hasCache(cacheKey)) {
    const cached = getCache(cacheKey);
    console.log(`[Cache Hit] Anime Detail: ${slug}`);
    return {
      status: 'success',
      source: 'cache',
      data: cached
    };
  }

  const url = `${BASE_URL}/anime/${slug}`;
  console.log(`[Scraping] ${url}`);

  const html = await fetchHtml(url);
  const $ = load(html);

  const info = {};

  // Parse info dari .infozingle (struktur Otakudesu)
  $('.infozingle p').each((_, el) => {
    const text = $(el).text().trim();
    const parts = text.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim().toLowerCase().replace(/\s+/g, '_');
      const value = parts.slice(1).join(':').trim();
      info[key] = value;
    }
  });

  // Parse thumbnail - beberapa selector fallback
  const thumbnail = $('.fotoanime img').attr('src') ||
                    $('.thumb img').attr('src') ||
                    $('img[src*="wp-content"]').first().attr('src') || '';

  // Parse sinopsis - beberapa selector fallback
  const sinopsis = $('.sinopc').text().trim() ||
                   $('.sinope').text().trim() ||
                   $('.entry-content p').first().text().trim() || '';

  // Parse genre - selector yang benar untuk Otakudesu
  const genres = [];
  $('.infozingle a[rel="genre"]').each((_, el) => {
    const genre = $(el).text().trim();
    if (genre) {
      genres.push(genre);
    }
  });
  
  // Fallback: coba selector alternatif untuk genre
  if (genres.length === 0) {
    $('.genres a, .genre a').each((_, el) => {
      const genre = $(el).text().trim();
      if (genre) {
        genres.push(genre);
      }
    });
  }

  // Parse episode list
  const episodes = [];
  $('.episodelist ul li').each((_, el) => {
    const title = $(el).find('a').text().trim();
    const episodeUrl = $(el).find('a').attr('href') || '';
    const date = $(el).find('span').text().trim();

    if (title && episodeUrl) {
      // Ambil slug lengkap dari URL episode tanpa dipotong
      // Contoh: https://otakudesu.best/episode/olcn-episode-8-sub-indo/ -> olcn-episode-8-sub-indo
      const episodeSlug = episodeUrl.split('/episode/')[1]?.replace('/', '') || '';

      episodes.push({
        title,
        url: episodeUrl,
        date,
        slug: episodeSlug || slug
      });
    }
  });

  // Fallback untuk episode list
  if (episodes.length === 0) {
    $('.episodelist li, .episode-list li').each((_, el) => {
      const title = $(el).find('a').text().trim();
      const episodeUrl = $(el).find('a').attr('href') || '';
      const date = $(el).text().trim();

      if (title && episodeUrl) {
        // Ambil slug lengkap dari URL episode tanpa dipotong
        const episodeSlug = episodeUrl.split('/episode/')[1]?.replace('/', '') || '';

        episodes.push({
          title,
          url: episodeUrl,
          date,
          slug: episodeSlug || slug
        });
      }
    });
  }

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
    episodes: episodes.slice(0, 50) // Limit 50 episodes
  };

  if (!animeData.title || animeData.title === slug) {
    throw new NotFoundError(`Anime dengan slug "${slug}" tidak ditemukan`);
  }

  // Simpan ke cache
  setCache(cacheKey, animeData, CACHE_TTL_ANIME);

  return {
    status: 'success',
    source: 'scrape',
    data: animeData
  };
};

/**
 * Mendapatkan daftar episode dari anime
 * @param {string} slug - Slug anime
 * @returns {Promise<object>}
 */
const getAnimeEpisodes = async (slug) => {
  const cacheKey = `anime_episodes_${slug}`;
  
  // Cek cache
  if (hasCache(cacheKey)) {
    const cached = getCache(cacheKey);
    console.log(`[Cache Hit] Anime Episodes: ${slug}`);
    return {
      status: 'success',
      source: 'cache',
      data: cached
    };
  }

  // Gunakan data dari getAnimeDetail
  const result = await getAnimeDetail(slug);
  const episodes = result.data.episodes;

  // Simpan ke cache dengan key terpisah
  setCache(cacheKey, episodes, CACHE_TTL_ANIME);

  return {
    status: 'success',
    source: 'scrape',
    data: episodes
  };
};

/**
 * Mendapatkan link download/streaming dari episode
 * @param {string} episodeUrl - URL episode
 * @returns {Promise<object>}
 */
const getEpisodeLinks = async (episodeUrl) => {
  // Normalize URL
  let url = episodeUrl;
  if (!url.startsWith('http')) {
    url = `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  const cacheKey = `episode_${Buffer.from(url).toString('base64').substring(0, 32)}`;
  
  // Cek cache
  if (hasCache(cacheKey)) {
    const cached = getCache(cacheKey);
    console.log(`[Cache Hit] Episode: ${url}`);
    return {
      status: 'success',
      source: 'cache',
      data: cached
    };
  }

  console.log(`[Scraping] ${url}`);

  const html = await fetchHtml(url);
  const $ = load(html);

  // Parse title
  const title = $('.post-title').text().trim() || 
                $('h1').first().text().trim() || 
                'Unknown Episode';

  // Parse thumbnail
  const thumbnail = $('.post-thumb img').attr('src') || 
                    $('.thumbnail img').attr('src') || '';

  // Parse sinopsis
  const sinopsis = $('.sinopc p').text().trim() || 
                   $('.entry p').first().text().trim() || '';

  // Parse download links
  const downloadLinks = [];
  
  // Cari semua batch download atau episode download
  $('.download-episode, .batch-download, .download ul').each((_, el) => {
    const qualityTitle = $(el).find('strong').first().text().trim() || 
                         $(el).find('b').first().text().trim() || 'Unknown Quality';
    
    const links = [];
    $(el).find('a').each((_, a) => {
      const linkText = $(a).text().trim();
      const linkUrl = $(a).attr('href');
      if (linkText && linkUrl) {
        links.push({
          name: linkText,
          url: linkUrl
        });
      }
    });

    if (links.length > 0) {
      downloadLinks.push({
        quality: qualityTitle,
        links: links
      });
    }
  });

  // Alternatif: cari di .download ul
  if (downloadLinks.length === 0) {
    $('.download ul li').each((_, el) => {
      const quality = $(el).find('strong').text().trim() || 'Unknown';
      const links = [];
      $(el).find('a').each((_, a) => {
        links.push({
          name: $(a).text().trim(),
          url: $(a).attr('href')
        });
      });
      if (links.length > 0) {
        downloadLinks.push({ quality, links });
      }
    });
  }

  // Parse streaming links jika ada
  const streamingLinks = [];
  $('a[href*="drive.google.com"], a[href*="youtube.com"], a[href*="mp4upload"], a[href*="filemoon"]').each((_, el) => {
    streamingLinks.push({
      name: $(el).text().trim() || 'Stream',
      url: $(el).attr('href')
    });
  });

  const episodeData = {
    title,
    thumbnail,
    sinopsis,
    downloadLinks,
    streamingLinks: streamingLinks.slice(0, 10),
    url: url
  };

  // Simpan ke cache
  setCache(cacheKey, episodeData, CACHE_TTL_SEARCH);

  return {
    status: 'success',
    source: 'scrape',
    data: episodeData
  };
};

/**
 * Mencari anime berdasarkan query
 * @param {string} query - Kata kunci pencarian
 * @returns {Promise<object>}
 */
const searchAnime = async (query) => {
  if (!query || query.trim().length === 0) {
    throw new Error('Query pencarian tidak boleh kosong');
  }

  const searchQuery = query.trim().toLowerCase();
  const cacheKey = `search_${searchQuery}`;
  
  // Cek cache
  if (hasCache(cacheKey)) {
    const cached = getCache(cacheKey);
    console.log(`[Cache Hit] Search: ${searchQuery}`);
    return {
      status: 'success',
      source: 'cache',
      data: cached
    };
  }

  const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
  console.log(`[Scraping] ${url}`);

  const html = await fetchHtml(url);
  const $ = load(html);

  const results = [];

  // Parse dari .chivsrc (struktur search Otakudesu yang benar)
  $('.chivsrc li').each((_, el) => {
    try {
      const title = $(el).find('h2 a').first().text().trim();
      const link = $(el).find('h2 a').first().attr('href') || '';
      const slug = link.split('/anime/')[1]?.replace('/', '') || '';
      const thumbnail = $(el).find('img').first().attr('src') || '';
      
      // Parse info tambahan
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

  // Fallback: coba selector alternatif jika tidak ada hasil
  if (results.length === 0) {
    $('.venz ul li').each((_, el) => {
      try {
        const title = $(el).find('.jdlflm').text().trim();
        const link = $(el).find('.thumb a').attr('href') || '';
        const slug = link.split('/anime/')[1]?.replace('/', '') || '';
        const thumbnail = $(el).find('.thumb img').attr('src') || '';
        
        if (title && slug) {
          results.push({
            title,
            slug,
            thumbnail,
            info: [],
            episode: '',
            releaseDate: ''
          });
        }
      } catch (error) {
        console.error('[Parse Error] searchAnime fallback:', error.message);
      }
    });
  }

  // Fallback terakhir: cari semua link anime
  if (results.length === 0) {
    $('a[href*="/anime/"]').each((_, el) => {
      try {
        const title = $(el).text().trim();
        const link = $(el).attr('href') || '';
        const slug = link.split('/anime/')[1]?.replace('/', '') || '';
        
        if (title && slug && (title.toLowerCase().includes(searchQuery) || slug.toLowerCase().includes(searchQuery))) {
          results.push({
            title,
            slug,
            thumbnail: '',
            info: [],
            episode: '',
            releaseDate: ''
          });
        }
      } catch (error) {
        // Ignore
      }
    });
  }

  if (results.length === 0) {
    return {
      status: 'success',
      source: 'scrape',
      data: {
        query,
        total: 0,
        results: []
      }
    };
  }

  const searchData = {
    query,
    total: results.length,
    results: results
  };

  // Simpan ke cache
  setCache(cacheKey, searchData, CACHE_TTL_SEARCH);

  return {
    status: 'success',
    source: 'scrape',
    data: searchData
  };
};

/**
 * Health check untuk scraper
 * @returns {Promise<object>}
 */
const healthCheck = async () => {
  try {
    const url = BASE_URL;
    const html = await fetchHtml(url, 1);
    const $ = load(html);
    
    const isUp = $('body').length > 0;
    
    return {
      status: 'success',
      data: {
        baseUrl: BASE_URL,
        isUp: isUp,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      status: 'error',
      data: {
        baseUrl: BASE_URL,
        isUp: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
};

/**
 * Mendapatkan slug anime dari URL episode
 * @param {string} episodeUrl - URL episode
 * @returns {Promise<object>}
 */
const getAnimeSlugFromEpisode = async (episodeUrl) => {
  // Normalize URL
  let url = episodeUrl;
  if (!url.startsWith('http')) {
    url = `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  const cacheKey = `episode_slug_${Buffer.from(url).toString('base64').substring(0, 32)}`;
  
  // Cek cache
  if (hasCache(cacheKey)) {
    const cached = getCache(cacheKey);
    console.log(`[Cache Hit] Episode Slug: ${url}`);
    return {
      status: 'success',
      source: 'cache',
      data: cached
    };
  }

  console.log(`[Scraping] ${url}`);

  const html = await fetchHtml(url);
  const $ = load(html);

  // Cari link ke halaman anime dari breadcrumb atau navigasi
  let animeSlug = '';
  let animeTitle = '';
  
  // Method 1: Cari dari breadcrumb navigation
  $('.breadcrumb a, .breadcrumbs a, .path a').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (href.includes('/anime/')) {
      animeSlug = href.split('/anime/')[1]?.replace('/', '') || '';
      animeTitle = $(el).text().trim();
    }
  });

  // Method 2: Cari dari link "Kembali ke anime" atau similar
  if (!animeSlug) {
    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim().toLowerCase();
      
      if (href.includes('/anime/') && 
          (text.includes('kembali') || text.includes('anime') || text.includes('detail'))) {
        animeSlug = href.split('/anime/')[1]?.replace('/', '') || '';
        animeTitle = $(el).text().trim();
      }
    });
  }

  // Method 3: Extract dari URL episode itu sendiri
  // Contoh: https://otakudesu.best/episode/kmygold-s5-episode-8-sub-indo/
  // Biasanya slug anime ada di awal slug episode
  if (!animeSlug) {
    const episodeSlug = url.split('/episode/')[1]?.replace('/', '') || '';
    if (episodeSlug) {
      // Coba extract bagian awal sebagai slug anime
      // Contoh: "kmygold-s5-episode-8-sub-indo" -> "kmygold-s5"
      const parts = episodeSlug.split('-');
      if (parts.length > 2) {
        // Ambil bagian sebelum "episode"
        const episodeIndex = parts.findIndex(p => p.toLowerCase() === 'episode');
        if (episodeIndex > 0) {
          animeSlug = parts.slice(0, episodeIndex).join('-');
        } else {
          // Atau ambil 2-3 bagian pertama
          animeSlug = parts.slice(0, Math.min(3, parts.length - 2)).join('-');
        }
      }
    }
  }

  // Method 4: Cari dari tag/link related
  if (!animeSlug) {
    $('a[href*="/anime/"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const slug = href.split('/anime/')[1]?.replace('/', '') || '';
      
      // Verifikasi dengan mengecek apakah slug valid
      if (slug && slug.length > 3) {
        animeSlug = slug;
        animeTitle = $(el).text().trim() || 'Unknown Anime';
        return false; // Break loop
      }
    });
  }

  if (!animeSlug) {
    throw new NotFoundError('Tidak dapat menemukan slug anime dari URL episode');
  }

  const result = {
    episodeUrl: url,
    animeSlug: animeSlug,
    animeTitle: animeTitle || 'Unknown',
    animeUrl: `${BASE_URL}/anime/${animeSlug}`
  };

  // Simpan ke cache
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
