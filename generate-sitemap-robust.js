import fs from 'fs';

const BASE_URL = "https://rankotaku-frontend.onrender.com";

// Add delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`      Attempting fetch (${i + 1}/${retries}): ${url}`);
            const response = await fetch(url);
            
            if (response.status === 429) {
                console.log(`      Rate limited, waiting 5 seconds...`);
                await delay(5000);
                continue;
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`      ✅ Success: Got ${data.data?.length || 0} items`);
            return data;
            
        } catch (error) {
            console.log(`      ❌ Attempt ${i + 1} failed: ${error.message}`);
            if (i === retries - 1) throw error;
            await delay(2000);
        }
    }
}

async function generateSitemap() {
    console.log("🚀 Starting sitemap generation...");
    
    let urls = [];
    let totalAnimeAdded = 0;
    
    // Add static pages
    const staticPages = [
        { path: '', priority: '1.0', changefreq: 'daily' },
        { path: '/leaderboard', priority: '0.8', changefreq: 'daily' },
        { path: '/about', priority: '0.7', changefreq: 'monthly' },
        { path: '/contact', priority: '0.6', changefreq: 'monthly' },
        { path: '/auth', priority: '0.5', changefreq: 'monthly' }
    ];
    
    staticPages.forEach(page => {
        urls.push({
            url: `${BASE_URL}${page.path}`,
            changefreq: page.changefreq,
            priority: page.priority
        });
    });

    console.log(`📄 Added ${staticPages.length} static pages`);

    try {
        // Fetch top anime with better error handling
        console.log("🎌 Fetching top anime data...");
        
        for (let page = 1; page <= 10; page++) {
            console.log(`   📖 Processing page ${page}/10...`);
            
            try {
                const data = await fetchWithRetry(`https://api.jikan.moe/v4/top/anime?page=${page}&limit=25`);
                
                if (!data.data || !Array.isArray(data.data)) {
                    console.log(`   ⚠️  Invalid data structure for page ${page}`);
                    continue;
                }
                
                let pageAnimeCount = 0;
                data.data.forEach(anime => {
                    if (!anime.title || !anime.mal_id) return;
                    
                    const slug = anime.title
                        .toLowerCase()
                        .replace(/[^a-z0-9\\s-]/g, '')
                        .replace(/\\s+/g, '-')
                        .replace(/-+/g, '-')
                        .replace(/^-|-$/g, '');
                    
                    urls.push({
                        url: `${BASE_URL}/anime/${slug}-${anime.mal_id}`,
                        changefreq: 'weekly',
                        priority: '0.8'
                    });
                    
                    pageAnimeCount++;
                    totalAnimeAdded++;
                });
                
                console.log(`   ✅ Added ${pageAnimeCount} anime from page ${page} (Total: ${totalAnimeAdded})`);
                
                // Longer delay between pages to respect rate limits
                await delay(2000);
                
            } catch (error) {
                console.log(`   ❌ Failed to fetch page ${page}: ${error.message}`);
                continue;
            }
        }

        console.log(`📊 Total anime from top pages: ${totalAnimeAdded}`);
        console.log(`📊 Current total URLs: ${urls.length}`);

        // Fetch trending anime
        console.log("🔥 Fetching trending anime...");
        try {
            const data = await fetchWithRetry('https://api.jikan.moe/v4/seasons/now?limit=25');
            
            if (data.data && Array.isArray(data.data)) {
                let trendingCount = 0;
                data.data.forEach(anime => {
                    if (!anime.title || !anime.mal_id) return;
                    
                    const slug = anime.title
                        .toLowerCase()
                        .replace(/[^a-z0-9\\s-]/g, '')
                        .replace(/\\s+/g, '-')
                        .replace(/-+/g, '-')
                        .replace(/^-|-$/g, '');
                    
                    const urlExists = urls.some(item => item.url === `${BASE_URL}/anime/${slug}-${anime.mal_id}`);
                    if (!urlExists) {
                        urls.push({
                            url: `${BASE_URL}/anime/${slug}-${anime.mal_id}`,
                            changefreq: 'weekly',
                            priority: '0.9'
                        });
                        trendingCount++;
                    }
                });
                console.log(`   ✅ Added ${trendingCount} new trending anime`);
            }
        } catch (error) {
            console.log(`   ❌ Failed to fetch trending anime: ${error.message}`);
        }

        // Fetch anime movies
        console.log("🎬 Fetching anime movies...");
        try {
            const data = await fetchWithRetry('https://api.jikan.moe/v4/top/anime?type=movie&limit=25');
            
            if (data.data && Array.isArray(data.data)) {
                let moviesCount = 0;
                data.data.forEach(anime => {
                    if (!anime.title || !anime.mal_id) return;
                    
                    const slug = anime.title
                        .toLowerCase()
                        .replace(/[^a-z0-9\\s-]/g, '')
                        .replace(/\\s+/g, '-')
                        .replace(/-+/g, '-')
                        .replace(/^-|-$/g, '');
                    
                    const urlExists = urls.some(item => item.url === `${BASE_URL}/anime/${slug}-${anime.mal_id}`);
                    if (!urlExists) {
                        urls.push({
                            url: `${BASE_URL}/anime/${slug}-${anime.mal_id}`,
                            changefreq: 'weekly',
                            priority: '0.8'
                        });
                        moviesCount++;
                    }
                });
                console.log(`   ✅ Added ${moviesCount} new anime movies`);
            }
        } catch (error) {
            console.log(`   ❌ Failed to fetch anime movies: ${error.message}`);
        }

        console.log(`🎯 FINAL TOTAL URLs collected: ${urls.length}`);

        // Generate XML sitemap
        console.log("📝 Generating XML sitemap...");
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(item => `  <url>
    <loc>${item.url}</loc>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>`).join('\\n')}
</urlset>`;

        // Write sitemap
        const publicDir = './frontend/public';
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }

        fs.writeFileSync(`${publicDir}/sitemap.xml`, sitemap, 'utf8');
        
        // Verify file was written
        const fileStats = fs.statSync(`${publicDir}/sitemap.xml`);
        const fileSizeKB = Math.round(fileStats.size / 1024);
        
        console.log("✅ Sitemap generated successfully!");
        console.log(`📁 Location: ${publicDir}/sitemap.xml`);
        console.log(`🔗 URLs included: ${urls.length}`);
        console.log(`📄 File size: ${fileSizeKB}KB`);
        console.log(`🌐 Access at: ${BASE_URL}/sitemap.xml`);

        // Generate robots.txt
        const robotsTxt = `User-agent: *
Allow: /

# Sitemap
Sitemap: ${BASE_URL}/sitemap.xml

# Disallow admin/auth pages
Disallow: /auth
Disallow: /admin
Disallow: /api

# Allow important pages
Allow: /
Allow: /anime/
Allow: /leaderboard
`;

        fs.writeFileSync(`${publicDir}/robots.txt`, robotsTxt, 'utf8');
        console.log("🤖 robots.txt generated!");

        // Show sample URLs
        console.log("\\n📋 Sample URLs generated:");
        urls.slice(0, 10).forEach((url, index) => {
            console.log(`   ${index + 1}. ${url.url}`);
        });
        if (urls.length > 10) {
            console.log(`   ... and ${urls.length - 10} more URLs`);
        }

    } catch (error) {
        console.error("❌ Error generating sitemap:", error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the sitemap generation
generateSitemap().catch(console.error);