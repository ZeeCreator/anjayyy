# 🚀 Deploy Otakudesu API ke Vercel

## ⚠️ Penting: Limitasi Vercel untuk Scraper

Sebelum deploy ke Vercel, perhatikan hal berikut:

### Free Tier Limitations
- **Bundle Size**: Max 50MB (Puppeteer ~180MB) ❌
- **Timeout**: Max 10 detik ❌
- **Memory**: Max 1024MB ✅
- **Serverless Functions**: Cold start bisa lambat ⚠️

### Pro Tier ($20/bulan)
- **Bundle Size**: Max 50MB (masih sama) ❌
- **Timeout**: Max 60 detik ✅
- **Memory**: Max 3008MB ✅

## 📋 Persiapan

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login ke Vercel
```bash
vercel login
```

### 3. Update package.json
Pastikan scripts Vercel sudah ada:
```json
{
  "scripts": {
    "vercel:dev": "vercel dev",
    "vercel:build": "vercel build",
    "vercel:deploy": "vercel --prod"
  }
}
```

## 🔧 Deployment Steps

### Step 1: Inisialisasi Project
```bash
vercel
```

Jawab pertanyaan:
- Set up and deploy? **Y**
- Which scope? (pilih akun kamu)
- Link to existing project? **N**
- What's your project's name? **otaku-api**
- In which directory is your code? **.**
- Want to override settings? **N**

### Step 2: Set Environment Variables

Di Vercel Dashboard:
1. Buka project **otaku-api**
2. Pergi ke **Settings** > **Environment Variables**
3. Tambahkan variabel berikut:

```
BASE_URL=https://otakudesu.best
CACHE_TTL_LATEST=300
CACHE_TTL_ANIME=600
CACHE_TTL_SEARCH=180
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=60
REQUEST_DELAY_MIN=1000
REQUEST_DELAY_MAX=3000
PUPPETEER_HEADLESS=true
PUPPETEER_TIMEOUT=30000
NODE_ENV=production
```

### Step 3: Deploy
```bash
# Development (local testing)
vercel dev

# Production
vercel --prod
```

## ⚡ Alternatif untuk Vercel

Karena limitasi Puppeteer di Vercel, pertimbangkan alternatif:

### 1. Railway (Rekomendasi) ⭐
```bash
# Push ke GitHub
git init
git add .
git commit -m "Initial commit"
git push origin main

# Deploy di Railway.app
# - Connect GitHub
# - Set environment variables
# - Auto deploy
```

**Keuntungan:**
- ✅ Full Node.js support
- ✅ Timeout lebih lama (500 jam/bulan)
- ✅ Puppeteer works perfectly
- ✅ Free tier cukup untuk testing

### 2. Render.com
```bash
# Sama seperti Railway
# Deploy di render.com
```

**Keuntungan:**
- ✅ Free tier available
- ✅ Auto SSL
- ✅ Auto deploy dari GitHub

### 3. Fly.io
```bash
# Install flyctl
npm install -g @flyio/flyctl

# Deploy
fly launch
fly deploy
```

## 🔍 Testing Deployment

Setelah deploy, test endpoint:

```bash
# Health check
curl https://your-app.vercel.app/health

# Get latest anime
curl https://your-app.vercel.app/api/latest

# Search anime
curl https://your-app.vercel.app/api/search?q=naruto
```

## 🐛 Troubleshooting

### Error: Function response size exceeded
**Solusi:**
- Puppeteer terlalu besar untuk Vercel free tier
- Gunakan Railway/Render sebagai alternatif

### Error: Function invocation timed out
**Solusi:**
- Timeout 10 detik terlalu cepat untuk scraping
- Increase timeout di Vercel Pro
- Atau gunakan Railway/Render

### Error: Cannot find module
**Solusi:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
vercel --prod
```

## 📊 Perbandingan Platform

| Platform | Free Tier | Timeout | Memory | Puppeteer | Rekomendasi |
|----------|-----------|---------|--------|-----------|-------------|
| Vercel   | ✅        | 10s     | 1GB    | ❌        | ⭐⭐         |
| Railway  | ✅        | 500h/mo | 512MB  | ✅        | ⭐⭐⭐⭐⭐      |
| Render   | ✅        | 15m     | 512MB  | ✅        | ⭐⭐⭐⭐       |
| Fly.io   | ✅        | 3000s   | 256MB  | ✅        | ⭐⭐⭐⭐       |
| Heroku   | ❌        | 30s     | 512MB  | ✅        | ⭐⭐⭐        |

## 💡 Tips

1. **Gunakan Caching**: Aktifkan caching untuk mengurangi request
2. **Optimize Puppeteer**: Gunakan headless mode
3. **Rate Limiting**: Jangan spam request
4. **Monitor Logs**: Cek Vercel logs untuk debugging
5. **Consider Alternatives**: Railway/Render lebih cocok untuk scraper

## 📞 Support

Jika ada masalah:
1. Cek Vercel logs: `vercel logs`
2. Test locally: `vercel dev`
3. Baca dokumentasi: https://vercel.com/docs

---

**Happy Deploying! 🎉**
