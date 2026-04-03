import fs from 'fs';

const BASE_URL = "https://rankotaku-frontend.onrender.com";

async function generateSitemap() {
    console.log("🚀 Starting sitemap generation...");
    
    let urls = [];
    
    // Add static pages
    const staticPages = [
        { path: '', priority: '1.0', changefreq: 'daily' },  // Homepage
        { path: '/leaderboard', priority: '0.8', changefreq: 'daily' },
        { path: '/auth', priority: '0.5', changefreq: 'monthly' }
    ];
    
    staticPages.forEach(page => {
        urls.push({
            url: `${BASE_URL}${page.path}`,
            changefreq: page.changefreq,
            priority: page.priority
        });
    });

    console.log("📄 Added static pages:", staticPages.length);

    try {
        // Fetch top anime (multiple pages for better coverage)
        console.log("🎌 Fetching anime data...");
        
        for (let page = 1; page <= 10; page++) {
            console.log(`   Fetching page ${page}/10...`);
            
            try {
                const response = await fetch(`https://api.jikan.moe/v4/top/anime?page=${page}&limit=25`);
                
                if (!response.ok) {
                    console.warn(`   ⚠️  API returned ${response.status} for page ${page}`);
                    continue;
                }
                
                const data = await response.json();
                
                if (!data.data || !Array.isArray(data.data)) {
                    console.warn(`   ⚠️  Invalid data structure for page ${page}`);
                    continue;
                }
                
                const animeList = data.data;
                console.log(`   ✅ Got ${animeList.length} anime from page ${page}`);

                animeList.forEach(anime => {
                    if (!anime.title || !anime.mal_id) return;
                    
                    // Create slug similar to your routing logic
                    const slug = anime.title
                        .toLowerCase()
                        .replace(/[^a-z0-9\s-]/g, '')
                        .replace(/\s+/g, '-')
                        .replace(/-+/g, '-')
                        .replace(/^-|-$/g, '');
                    
                    urls.push({
                        url: `${BASE_URL}/anime/${slug}-${anime.mal_id}`,
                        changefreq: 'weekly',
                        priority: '0.8'
                    });
                });

                // Add delay to respect API rate limits
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.warn(`⚠️  Failed to fetch page ${page}:`, error.message);
                continue;
            }
        }

        console.log(`📊 Current total URLs: ${urls.length}`);

        // Fetch trending anime
        console.log("🔥 Fetching trending anime...");
        try {
            const response = await fetch('https://api.jikan.moe/v4/seasons/now?limit=25');
            if (response.ok) {
                const data = await response.json();
                if (data.data && Array.isArray(data.data)) {
                    data.data.forEach(anime => {
                        if (!anime.title || !anime.mal_id) return;
                        
                        const slug = anime.title
                            .toLowerCase()
                            .replace(/[^a-z0-9\s-]/g, '')
                            .replace(/\s+/g, '-')
                            .replace(/-+/g, '-')
                            .replace(/^-|-$/g, '');
                        
                        // Check if URL already exists to avoid duplicates
                        const urlExists = urls.some(item => item.url === `${BASE_URL}/anime/${slug}-${anime.mal_id}`);
                        if (!urlExists) {
                            urls.push({
                                url: `${BASE_URL}/anime/${slug}-${anime.mal_id}`,
                                changefreq: 'weekly',
                                priority: '0.9'
                            });
                        }
                    });
                    console.log(`   ✅ Added ${data.data.length} trending anime`);
                }
            }
        } catch (error) {
            console.warn("⚠️  Failed to fetch trending anime:", error.message);
        }

        // Fetch popular movies
        console.log("🎬 Fetching anime movies...");
        try {
            const response = await fetch('https://api.jikan.moe/v4/top/anime?type=movie&limit=25');
            if (response.ok) {
                const data = await response.json();
                if (data.data && Array.isArray(data.data)) {
                    data.data.forEach(anime => {
                        if (!anime.title || !anime.mal_id) return;
                        
                        const slug = anime.title
                            .toLowerCase()
                            .replace(/[^a-z0-9\s-]/g, '')
                            .replace(/\s+/g, '-')
                            .replace(/-+/g, '-')
                            .replace(/^-|-$/g, '');
                        
                        // Check if URL already exists to avoid duplicates
                        const urlExists = urls.some(item => item.url === `${BASE_URL}/anime/${slug}-${anime.mal_id}`);
                        if (!urlExists) {
                            urls.push({
                                url: `${BASE_URL}/anime/${slug}-${anime.mal_id}`,
                                changefreq: 'weekly',
                                priority: '0.8'
                            });
                        }
                    });
                    console.log(`   ✅ Added ${data.data.length} anime movies`);
                }
            }
        } catch (error) {
            console.warn("⚠️  Failed to fetch anime movies:", error.message);
        }

        console.log(`📊 Final total URLs collected: ${urls.length}`);

        // Generate XML sitemap
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(item => `  <url>
    <loc>${item.url}</loc>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>`).join('\n')}
</urlset>`;

        // Write sitemap to public directory
        const publicDir = './frontend/public';
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }

        fs.writeFileSync(`${publicDir}/sitemap.xml`, sitemap, 'utf8');
        
        console.log("✅ Sitemap generated successfully!");
        console.log(`📁 Location: ${publicDir}/sitemap.xml`);
        console.log(`🔗 URLs included: ${urls.length}`);
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

        // Verify the file was written correctly
        const fileStats = fs.statSync(`${publicDir}/sitemap.xml`);
        console.log(`📄 File size: ${Math.round(fileStats.size / 1024)}KB`);

    } catch (error) {
        console.error("❌ Error generating sitemap:", error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the sitemap generation
generateSitemap().catch(console.error);