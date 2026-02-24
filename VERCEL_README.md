# 🚀 Deploy ke Vercel - Quick Guide

## ✅ Sudah Siap untuk Vercel!

Project ini sudah dikonfigurasi untuk Vercel dengan **scraper tanpa Puppeteer** (menggunakan Undici).

## 📋 Langkah Deployment

### 1. Push ke GitHub
```bash
git init
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### 2. Deploy ke Vercel

**Cara A: Via Vercel Dashboard**
1. Buka https://vercel.com/new
2. Import GitHub repository
3. Pilih project `api-anime2`
4. Klik **Deploy**

**Cara B: Via CLI**
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### 3. Set Environment Variables

Di Vercel Dashboard > Settings > Environment Variables:

```bash
BASE_URL=https://otakudesu.best
CACHE_TTL_LATEST=300
CACHE_TTL_ANIME=600
CACHE_TTL_SEARCH=180
NODE_ENV=production
```

## 📁 Struktur File Vercel

```
api-anime2/
├── api/
│   ├── index.js          # Entry point Vercel
│   └── vercel.js         # Express app untuk Vercel
├── routes/
│   └── anime-vercel.js   # Routes (tanpa Puppeteer)
├── services/
│   └── scraper-vercel.js # Scraper dengan Undici
├── vercel.json           # Konfigurasi Vercel
└── ...
```

## 🔧 Konfigurasi

### vercel.json
```json
{
  "version": 2,
  "entrypoint": "api/index.js",
  "builds": [{"src": "api/index.js", "use": "@vercel/node"}],
  "functions": {
    "api/index.js": {
      "maxDuration": 60
    }
  }
}
```

## 🧪 Testing

Setelah deploy, test endpoint:

```bash
# Health check
curl https://your-app.vercel.app/health

# Get latest anime
curl https://your-app.vercel.app/api/latest

# Search
curl https://your-app.vercel.app/api/search?q=naruto
```

## ⚠️ Troubleshooting

### Error: Function response size exceeded
✅ **Sudah diatasi** - Project menggunakan scraper-vercel.js tanpa Puppeteer

### Error: Function invocation timed out
- Increase timeout di Vercel Pro (60 detik)
- Atau kurangi CACHE_TTL untuk mengurangi waktu scraping

### Error: Cannot find module
```bash
# Pastikan semua dependencies terinstall
npm install

# Deploy ulang
vercel --prod --force
```

## 📊 Perbandingan: Vercel vs Railway

| Feature | Vercel | Railway |
|---------|--------|---------|
| Free Tier | ✅ 100GB-hr/bln | ✅ $5 credit/bln |
| Puppeteer | ❌ (terlalu besar) | ✅ Works |
| Timeout | 10s (Free) / 60s (Pro) | 500 jam/bln |
| Setup | ⭐⭐⭐⭐⭐ Sangat mudah | ⭐⭐⭐⭐ Mudah |
| Scraper | ⭐⭐⭐ (Undici) | ⭐⭐⭐⭐⭐ (Puppeteer) |

**Rekomendasi:**
- Untuk testing/prototype: **Vercel** ✅
- Untuk production scraper: **Railway** ✅

## 💡 Tips

1. **Enable Caching** - Cache sudah enabled untuk mengurangi request
2. **Monitor Logs** - Cek Vercel logs untuk debugging
3. **Use Health Check** - Test `/health` endpoint secara berkala
4. **Consider Railway** - Untuk scraping berat dengan Puppeteer

## 🔗 Links

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Functions](https://vercel.com/docs/functions)
- [Railway Deployment](https://railway.app/)

---

**Happy Deploying! 🎉**
