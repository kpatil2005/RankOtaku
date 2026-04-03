import { Helmet } from 'react-helmet-async';

export function SEOHead({ 
  title = "RankOtaku - Ultimate Anime Quiz & Ranking Platform",
  description = "Test your anime knowledge with thousands of quizzes! Compete on global leaderboards, discover top anime rankings, and join the ultimate otaku community.",
  keywords = "anime quiz, anime trivia, otaku games, anime leaderboard, anime ranking, anime player, anime knowledge test, otaku quiz, anime challenge, RankOtaku, anime competition, manga quiz",
  url = "https://rankotaku-frontend.onrender.com/",
  image = "https://rankotaku-frontend.onrender.com/favicon.svg",
  type = "website"
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://rankotaku-frontend.onrender.com/#website",
        "url": "https://rankotaku-frontend.onrender.com/",
        "name": "RankOtaku",
        "description": "Ultimate anime quiz and ranking platform for otaku worldwide",
        "publisher": {
          "@id": "https://rankotaku-frontend.onrender.com/#organization"
        },
        "potentialAction": [
          {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": "https://rankotaku-frontend.onrender.com/search?q={search_term_string}"
            },
            "query-input": "required name=search_term_string"
          }
        ],
        "inLanguage": "en-US"
      },
      {
        "@type": "Organization",
        "@id": "https://rankotaku-frontend.onrender.com/#organization",
        "name": "RankOtaku",
        "url": "https://rankotaku-frontend.onrender.com/",
        "logo": {
          "@type": "ImageObject",
          "inLanguage": "en-US",
          "@id": "https://rankotaku-frontend.onrender.com/#/schema/logo/image/",
          "url": "https://rankotaku-frontend.onrender.com/favicon.svg",
          "contentUrl": "https://rankotaku-frontend.onrender.com/favicon.svg",
          "width": 512,
          "height": 512,
          "caption": "RankOtaku"
        },
        "image": {
          "@id": "https://rankotaku-frontend.onrender.com/#/schema/logo/image/"
        },
        "sameAs": []
      },
      {
        "@type": "WebPage",
        "@id": url + "#webpage",
        "url": url,
        "name": title,
        "isPartOf": {
          "@id": "https://rankotaku-frontend.onrender.com/#website"
        },
        "about": {
          "@id": "https://rankotaku-frontend.onrender.com/#organization"
        },
        "description": description,
        "breadcrumb": {
          "@id": url + "#breadcrumb"
        },
        "inLanguage": "en-US",
        "potentialAction": [
          {
            "@type": "ReadAction",
            "target": [url]
          }
        ]
      },
      {
        "@type": "Game",
        "name": "RankOtaku Anime Quiz",
        "description": "Test your anime knowledge with challenging quizzes and compete on global leaderboards",
        "genre": ["Quiz", "Trivia", "Anime", "Educational"],
        "gamePlatform": "Web Browser",
        "operatingSystem": "Any",
        "applicationCategory": "Game",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        }
      }
    ]
  };

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="RankOtaku" />
      
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={url} />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
}