const express = require("express");
const axios = require("axios");

const router = express.Router();

router.get("/sitemap.xml", async (req, res) => {
    try {
        let urls = [];

        // Static pages
        const baseUrl = "https://rankotaku-frontend.onrender.com";

        urls.push(`
        <url>
            <loc>${baseUrl}/</loc>
            <priority>1.0</priority>
            <changefreq>daily</changefreq>
        </url>`);

        urls.push(`
        <url>
            <loc>${baseUrl}/leaderboard</loc>
            <priority>0.8</priority>
            <changefreq>daily</changefreq>
        </url>`);

        urls.push(`
        <url>
            <loc>${baseUrl}/quiz</loc>
            <priority>0.9</priority>
            <changefreq>daily</changefreq>
        </url>`);

        urls.push(`
        <url>
            <loc>${baseUrl}/profile</loc>
            <priority>0.7</priority>
            <changefreq>weekly</changefreq>
        </url>`);

        // 🔥 Fetch top anime from Jikan API (multiple pages for more URLs)
        const pages = Array.from({length: 10}, (_, i) => i + 1); // Fetch 250 anime (25 per page)
        
        for (const page of pages) {
            try {
                const response = await axios.get(`https://api.jikan.moe/v4/top/anime?page=${page}&limit=25`);
                const animeList = response.data.data;

                animeList.forEach(anime => {
                    const slug = anime.title
                        .toLowerCase()
                        .replace(/[^a-z0-9\s-]/g, '')
                        .replace(/\s+/g, '-')
                        + '-' + anime.mal_id;

                    urls.push(`
        <url>
            <loc>${baseUrl}/anime/${slug}</loc>
            <priority>0.7</priority>
            <changefreq>weekly</changefreq>
        </url>`);
                });

                // Delay to respect API rate limits
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`Error fetching page ${page}:`, error.message);
            }
        }

        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("")}
</urlset>`;

        res.header("Content-Type", "application/xml");
        res.send(sitemap);

    } catch (error) {
        console.error("Sitemap generation error:", error);
        res.status(500).send("Error generating sitemap");
    }
});

module.exports = router;
