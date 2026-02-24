# Otakudesu API

REST API scraper untuk mengambil data anime dari **Otakudesu** dengan sistem anti-Cloudflare bypass yang stabil dan natural.

## 🚀 Fitur Utama

- ✅ **Cloudflare Bypass** - Menggunakan Puppeteer dengan konfigurasi anti-deteksi
- ✅ **Caching System** - Mengurangi load server dengan Node-cache
- ✅ **Rate Limiting** - Maksimal 60 request per IP per 15 menit
- ✅ **Request Delay** - Delay 1-3 detik random antar request
- ✅ **Security Headers** - Helmet untuk keamanan optimal
- ✅ **Docker Support** - Siap deploy dengan Docker & Docker Compose
- ✅ **Error Handling** - Global error handling yang robust
- ✅ **Logging** - Request/response logging untuk debugging

## 📋 Prerequisites

- Node.js >= 18.x
- npm atau yarn
- Docker (opsional, untuk deployment)

## 🛠️ Instalasi

### Cara 1: Manual Installation

```bash
# Clone atau download repository
cd api-anime2

# Install dependencies
npm install

# Copy .env.example ke .env (jika ada)
# Atau edit .env sesuai kebutuhan

# Jalankan server
npm start

# Development mode (auto-reload)
npm run dev
```

### Cara 2: Docker Installation

```bash
# Build dan run dengan Docker Compose
docker-compose up -d

# Atau build manual
docker build -t otaku-api .
docker run -p 3000:3000 otaku-api
```

## 📁 Struktur Project

```
api-anime2/
│
├── server.js              # Main server file
├── package.json           # Dependencies
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose
├── .env                   # Environment variables
├── .gitignore
│
├── routes/
│   └── anime.js           # API routes
│
├── services/
│   ├── scraper.js         # Scraping logic
│   └── browser.js         # Puppeteer browser service
│
├── utils/
│   ├── cache.js           # Caching utility
│   └── delay.js           # Delay utility
│
└── middleware/
    ├── errorHandler.js    # Error handling
    └── logger.js          # Request logging
```

## 🔌 API Endpoints

### Base URL
```
http://localhost:3000
```

### 1. Get Latest Anime
```http
GET /api/latest
```

**Response:**
```json
{
  "status": "success",
  "source": "scrape",
  "data": [
    {
      "title": "One Piece",
      "slug": "one-piece",
      "thumbnail": "https://...",
      "episode": "Episode 1090",
      "releaseDate": "Senin, 20 Feb 2024"
    }
  ]
}
```

### 2. Get Anime Detail
```http
GET /api/anime/:slug
```

**Response:**
```json
{
  "status": "success",
  "source": "scrape",
  "data": {
    "title": "One Piece",
    "slug": "one-piece",
    "thumbnail": "https://...",
    "sinopsis": "...",
    "genres": ["Action", "Adventure", "Comedy"],
    "info": {
      "japanese": "ワンピース",
      "english": "One Piece",
      "type": "TV Series",
      "status": "Ongoing",
      "studio": "Toei Animation",
      "score": "8.7"
    },
    "episodes": [
      {
        "title": "One Piece Episode 1090",
        "url": "https://otakudesu.best/episode/one-piece-episode-1090-sub-indo/",
        "date": "Senin, 20 Feb 2024",
        "slug": "one-piece"
      }
    ]
  }
}
```

**Note:** Field `slug` di setiap episode adalah **slug lengkap anime** (bukan dipotong dari URL episode), sehingga bisa langsung digunakan untuk mengakses endpoint `/api/anime/:slug`.

### 3. Get Anime Episodes
```http
GET /api/anime/:slug/episodes
```

**Response:**
```json
{
  "status": "success",
  "source": "scrape",
  "data": [
    {
      "title": "One Piece Episode 1090",
      "url": "https://otakudesu.best/episode/one-piece-episode-1090-sub-indo/",
      "date": "Senin, 20 Feb 2024",
      "slug": "one-piece"
    }
  ]
}
```

**Note:** Field `slug` adalah **slug lengkap anime**, bukan dipotong dari URL episode.

### 4. Get Episode Links
```http
GET /api/episode?url=https://otakudesu.best/episode/...
```

**Response:**
```json
{
  "status": "success",
  "source": "scrape",
  "data": {
    "title": "One Piece Episode 1090",
    "thumbnail": "https://...",
    "sinopsis": "...",
    "downloadLinks": [
      {
        "quality": "480p MKV",
        "links": [
          { "name": "Download", "url": "https://..." }
        ]
      },
      {
        "quality": "720p MKV",
        "links": [...]
      }
    ],
    "streamingLinks": [...]
  }
}
```

### 5. Get Anime Slug from Episode URL (BARU)
```http
GET /api/episode/slug?url=https://otakudesu.best/episode/kmygold-s5-episode-8-sub-indo/
```

**Response:**
```json
{
  "status": "success",
  "source": "scrape",
  "data": {
    "episodeUrl": "https://otakudesu.best/episode/kmygold-s5-episode-8-sub-indo/",
    "animeSlug": "kamuy-golden-season-5-sub-indo",
    "animeTitle": "Golden Kamuy Season 5",
    "animeUrl": "https://otakudesu.best/anime/kamuy-golden-season-5-sub-indo/"
  }
}
```

**Use Case:**
- Mendapatkan slug anime dari URL episode
- Bisa langsung digunakan untuk memanggil `/api/anime/:slug`

**Contoh Flow:**
```javascript
// 1. Dapatkan slug dari episode URL
const slugRes = await fetch('http://localhost:3000/api/episode/slug?url=https://otakudesu.best/episode/kmygold-s5-episode-8-sub-indo/');
const slugData = await slugRes.json();
const slug = slugData.data.animeSlug;

// 2. Gunakan slug untuk mendapatkan detail anime
const animeRes = await fetch(`http://localhost:3000/api/anime/${slug}`);
const animeData = await animeRes.json();
```

### 6. Search Anime
```http
GET /api/search?q=naruto
```

**Response:**
```json
{
  "status": "success",
  "source": "scrape",
  "data": {
    "query": "naruto",
    "total": 5,
    "results": [
      {
        "title": "Naruto Shippuden",
        "slug": "naruto-shippuden",
        "thumbnail": "https://...",
        "episode": "Episode 500",
        "releaseDate": "..."
      }
    ]
  }
}
```

### 7. Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "baseUrl": "https://otakudesu.best",
    "isUp": true,
    "timestamp": "2024-02-20T10:00:00.000Z"
  }
}
```

### 8. Cache Statistics
```http
GET /api/cache/stats
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "hits": 150,
    "misses": 50,
    "keys": 25,
    "ksize": 1024000,
    "vsize": 5120000,
    "timestamp": "2024-02-20T10:00:00.000Z"
  }
}
```

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port server |
| `NODE_ENV` | `development` | Environment (development/production) |
| `BASE_URL` | `https://otakudesu.best` | URL target scraping |
| `CACHE_TTL_LATEST` | `300` | Cache TTL untuk latest (detik) |
| `CACHE_TTL_ANIME` | `600` | Cache TTL untuk detail anime (detik) |
| `CACHE_TTL_SEARCH` | `180` | Cache TTL untuk search (detik) |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX_REQUESTS` | `60` | Max request per window |
| `REQUEST_DELAY_MIN` | `1000` | Minimum delay (ms) |
| `REQUEST_DELAY_MAX` | `3000` | Maximum delay (ms) |
| `PUPPETEER_HEADLESS` | `true` | Puppeteer headless mode |
| `PUPPETEER_TIMEOUT` | `30000` | Puppeteer timeout (ms) |

## 🐳 Docker Commands

```bash
# Build image
docker-compose build

# Start container
docker-compose up -d

# Stop container
docker-compose down

# View logs
docker-compose logs -f

# Restart container
docker-compose restart

# Scale (jika perlu)
docker-compose up -d --scale otaku-api=2
```

## 📝 Usage Examples

### cURL
```bash
# Get latest anime
curl http://localhost:3000/api/latest

# Get anime detail
curl http://localhost:3000/api/anime/one-piece

# Search anime
curl "http://localhost:3000/api/search?q=naruto"

# Get episode links
curl "http://localhost:3000/api/episode?url=https://otakudesu.best/episode/..."
```

### JavaScript/Fetch
```javascript
// Get latest anime
const response = await fetch('http://localhost:3000/api/latest');
const data = await response.json();
console.log(data);

// Search anime
const search = await fetch('http://localhost:3000/api/search?q=naruto');
const results = await search.json();
console.log(results);
```

### Python/Requests
```python
import requests

# Get latest anime
response = requests.get('http://localhost:3000/api/latest')
data = response.json()
print(data)

# Search anime
search = requests.get('http://localhost:3000/api/search?q=naruto')
results = search.json()
print(results)
```

## 🔒 Security Features

1. **Helmet** - Security headers (CSP, X-Frame-Options, dll)
2. **Rate Limiting** - Mencegah abuse dan DDoS
3. **CORS** - Cross-Origin Resource Sharing configuration
4. **Input Validation** - Validasi parameter input
5. **Error Handling** - Tidak expose sensitive information

## ⚡ Performance Optimization

1. **Caching** - Data di-cache untuk mengurangi request ke server target
2. **Request Queue** - Mengontrol concurrency request
3. **Delay Random** - Menghindari deteksi bot
4. **Browser Singleton** - Reuse Puppeteer browser instance
5. **Graceful Shutdown** - Cleanup resource saat shutdown

## 🛠️ Troubleshooting

### Port sudah digunakan
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

### Puppeteer error
```bash
# Install dependencies tambahan (Linux)
sudo apt-get install -y chromium-browser

# Atau set skip download
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

### Cloudflare block
- Increase delay antara request
- Gunakan rotating user agents
- Pastikan Puppeteer headless mode aktif

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## ⚠️ Disclaimer

Project ini dibuat untuk tujuan edukasi. Penggunaan scraper ini harus mematuhi:
- Terms of Service dari website target
- Robots.txt dari website target
- Hukum yang berlaku di wilayah Anda

Pengembang tidak bertanggung jawab atas penyalahgunaan project ini.

## 🤝 Contributing

Contributions are welcome! Silakan submit:
1. Issues untuk bug report
2. Pull requests untuk fitur baru
3. Suggestions untuk improvement

---

**Happy Coding! 🎉**
