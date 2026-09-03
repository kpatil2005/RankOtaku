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

        // Fetch top anime from AniList GraphQL for sitemap URLs
        try {
            const anilistRes = await axios.post('https://graphql.anilist.co', {
                query: `query { Page(perPage: 50) { media(type: ANIME, sort: SCORE_DESC, isAdult: false) { id title { romaji english } } } }`
            }, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });

            const animeList = anilistRes.data?.data?.Page?.media ?? [];
            animeList.forEach(anime => {
                const title = anime.title?.english || anime.title?.romaji || '';
                const slug = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-') + '-' + anime.id;
                urls.push(`
        <url>
            <loc>${baseUrl}/anime/${slug}</loc>
            <priority>0.7</priority>
            <changefreq>weekly</changefreq>
        </url>`);
            });
        } catch (error) {
            console.error('Error fetching anime for sitemap:', error.message);
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
