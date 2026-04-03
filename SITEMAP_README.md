# 🗺️ Sitemap Generator for RankOtaku

## 🚀 How to Generate Sitemap

### Method 1: Direct Node Command
```bash
node generate-sitemap.js
```

### Method 2: Using npm script (from frontend folder)
```bash
cd frontend
npm run generate-sitemap
```

## 📋 What Gets Generated

### ✅ Sitemap.xml includes:
- **Static Pages**: Homepage, Leaderboard, Auth
- **Top Anime**: 250+ anime pages (10 pages × 25 anime)
- **Trending Anime**: Currently airing anime
- **Anime Movies**: Popular anime movies
- **Total**: 300+ URLs

### ✅ Robots.txt includes:
- Sitemap location
- Allow/Disallow rules
- SEO optimization

## 📁 Output Files
- `frontend/public/sitemap.xml`
- `frontend/public/robots.txt`

## 🌐 Access URLs
- Sitemap: https://rankotaku-frontend.onrender.com/sitemap.xml
- Robots: https://rankotaku-frontend.onrender.com/robots.txt

## 🔄 When to Run
- **Before deployment**: Always generate fresh sitemap
- **Weekly**: Update with new anime
- **After major changes**: New pages or routes

## 📊 Features
- ✅ Automatic anime slug generation
- ✅ Duplicate URL prevention
- ✅ API rate limiting respect
- ✅ Error handling
- ✅ Priority and changefreq optimization
- ✅ Last modified dates

## 🛠️ Customization
Edit `generate-sitemap.js` to:
- Change number of pages fetched
- Modify URL priorities
- Add more static pages
- Adjust changefreq values