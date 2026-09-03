/**
 * AniList GraphQL API Service
 * Docs: https://anilist.gitbook.io/anilist-apiv2-docs
 * Endpoint: https://graphql.anilist.co (no API key required)
 */

const ANILIST_URL = 'https://graphql.anilist.co';

// Generic GraphQL fetcher
async function anilistFetch(query, variables = {}, signal) {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AniList API error ${res.status}: ${text}`);
  }
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

// ─── Shared fragments ───────────────────────────────────────────────
const MEDIA_FIELDS = `
  id
  title { romaji english native }
  coverImage { large extraLarge }
  bannerImage
  description(asHtml: false)
  episodes
  status
  format
  season
  seasonYear
  averageScore
  popularity
  favourites
  rankings { rank type context allTime season year }
  genres
  studios(isMain: true) { nodes { name } }
  startDate { year month day }
  endDate { year month day }
  source
  duration
`;

// ─── Normalise AniList media → shape that matches existing component props ──
/**
 * Converts AniList media object into the shape the components expect.
 * All fields that used to come from Jikan are mapped here.
 */
export function normalizeAnime(media) {
  if (!media) return null;

  const title = media.title?.english || media.title?.romaji || media.title?.native || 'Unknown';

  // Score: AniList returns 0–100, convert to 0–10 (1 decimal)
  const score = media.averageScore ? (media.averageScore / 10).toFixed(1) : null;

  // Rank: use the #1 overall all-time ranking if available
  const rankObj = media.rankings?.find(r => r.type === 'RATED' && r.allTime);
  const popularityRankObj = media.rankings?.find(r => r.type === 'POPULAR' && r.allTime);
  const rank = rankObj?.rank ?? null;
  const popularity = popularityRankObj?.rank ?? media.popularity ?? null;

  // Images (mapped to same shape Jikan used)
  const largeImg = media.coverImage?.extraLarge || media.coverImage?.large || '';
  const images = {
    jpg: { large_image_url: largeImg, image_url: media.coverImage?.large || largeImg },
    webp: { large_image_url: largeImg, image_url: media.coverImage?.large || largeImg },
  };

  // Status mapping: AniList → Jikan-style strings
  const STATUS_MAP = {
    FINISHED: 'Finished Airing',
    RELEASING: 'Currently Airing',
    NOT_YET_RELEASED: 'Not Yet Aired',
    CANCELLED: 'Cancelled',
    HIATUS: 'On Hiatus',
  };

  // Format mapping: AniList format → Jikan type
  const FORMAT_MAP = {
    TV: 'TV',
    TV_SHORT: 'TV',
    MOVIE: 'Movie',
    SPECIAL: 'Special',
    OVA: 'OVA',
    ONA: 'ONA',
    MUSIC: 'Music',
    MANGA: 'Manga',
    NOVEL: 'Novel',
    ONE_SHOT: 'One-shot',
  };

  // Aired string
  const sd = media.startDate;
  const ed = media.endDate;
  const fmt = (d) => d?.year ? `${d.year}-${String(d.month ?? 1).padStart(2, '0')}-${String(d.day ?? 1).padStart(2, '0')}` : null;
  const airedString = [fmt(sd), fmt(ed)].filter(Boolean).join(' to ');

  return {
    // Core identity
    id: media.id,
    mal_id: media.idMal ?? media.id,   // keep mal_id for backward compat
    anilistId: media.id,

    // Display
    title,
    title_english: media.title?.english,
    title_japanese: media.title?.native,

    // Images
    images,
    bannerImage: media.bannerImage || largeImg,

    // Stats
    score: score ? parseFloat(score) : null,
    rank,
    popularity,
    members: media.popularity ?? 0,
    favourites: media.favourites ?? 0,
    favorites: media.favourites ?? 0,

    // Info
    type: FORMAT_MAP[media.format] ?? media.format ?? 'TV',
    format: media.format,
    status: STATUS_MAP[media.status] ?? media.status,
    episodes: media.episodes ?? null,
    duration: media.duration ? `${media.duration} min` : null,
    synopsis: media.description?.replace(/<[^>]+>/g, '') ?? '',
    background: null,
    source: media.source ?? null,

    // Genres
    genres: (media.genres ?? []).map(name => ({ name })),

    // Studios & producers
    studios: (media.studios?.nodes ?? []).map(s => ({ name: s.name })),
    producers: [],

    // Aired
    aired: { string: airedString },
    season: media.season,
    seasonYear: media.seasonYear,
  };
}

// ─── Normalise AniList character → shape components expect ──────────
export function normalizeCharacter(edge) {
  if (!edge) return null;
  const char = edge.node;
  const vas = (edge.voiceActors ?? []).map(va => ({
    language: va.languageV2 ?? va.language ?? 'Japanese',
    person: {
      name: va.name?.full ?? '',
      images: {
        jpg: { image_url: va.image?.large || va.image?.medium || '' },
      },
    },
  }));
  return {
    character: {
      mal_id: char.id,
      name: char.name?.full ?? '',
      images: {
        jpg: {
          image_url: char.image?.large || char.image?.medium || '',
          large_image_url: char.image?.large || char.image?.medium || '',
        },
      },
    },
    role: edge.role === 'MAIN' ? 'Main' : edge.role === 'SUPPORTING' ? 'Supporting' : 'Background',
    voice_actors: vas,
  };
}

// ─── Normalise AniList staff edge ───────────────────────────────────
export function normalizeStaff(edge) {
  if (!edge) return null;
  return {
    person: {
      name: edge.node?.name?.full ?? '',
      images: {
        jpg: {
          image_url: edge.node?.image?.large || edge.node?.image?.medium || '',
        },
      },
    },
    positions: [edge.role ?? 'Staff'],
  };
}

// ─── Normalise AniList relation ──────────────────────────────────────
export function normalizeRelation(edge) {
  if (!edge) return null;
  const REL_MAP = {
    SEQUEL: 'Sequel',
    PREQUEL: 'Prequel',
    ALTERNATIVE: 'Alternative version',
    SIDE_STORY: 'Side story',
    SUMMARY: 'Summary',
    SPIN_OFF: 'Spin-off',
    OTHER: 'Other',
    SOURCE: 'Source',
    ADAPTATION: 'Adaptation',
    CHARACTER: 'Character',
    CONTAINS: 'Contains',
    PARENT: 'Parent story',
  };
  return {
    relation: REL_MAP[edge.relationType] ?? edge.relationType,
    entry: [{
      mal_id: edge.node?.id,
      name: edge.node?.title?.english || edge.node?.title?.romaji || '',
      anilistId: edge.node?.id,
    }],
  };
}

// ─── Normalise AniList episode (from airingSchedule) ────────────────
export function normalizeEpisode(ep, index) {
  return {
    mal_id: ep.episode ?? index + 1,
    title: `Episode ${ep.episode ?? index + 1}`,
    synopsis: null,
    aired: ep.airingAt ? new Date(ep.airingAt * 1000).toISOString() : null,
    thumbnailUrl: null,
  };
}

// ════════════════════════════════════════════════════════════════════
// Public API functions
// ════════════════════════════════════════════════════════════════════

/**
 * Fetch top-ranked anime (replaces Jikan /top/anime)
 */
export async function getTopAnime(perPage = 25) {
  const query = `
    query ($perPage: Int) {
      Page(perPage: $perPage) {
        media(type: ANIME, sort: SCORE_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await anilistFetch(query, { perPage });
  return (data.Page?.media ?? []).map(normalizeAnime);
}

/**
 * Fetch currently airing anime (replaces Jikan /seasons/now)
 */
export async function getAiringAnime(perPage = 25) {
  const query = `
    query ($perPage: Int) {
      Page(perPage: $perPage) {
        media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await anilistFetch(query, { perPage });
  return (data.Page?.media ?? []).map(normalizeAnime);
}

/**
 * Fetch top movies (replaces Jikan /top/anime?type=movie)
 */
export async function getTopMovies(perPage = 25) {
  const query = `
    query ($perPage: Int) {
      Page(perPage: $perPage) {
        media(type: ANIME, format: MOVIE, sort: SCORE_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await anilistFetch(query, { perPage });
  return (data.Page?.media ?? []).map(normalizeAnime);
}

/**
 * Fetch trending / popular anime (replaces Jikan top/popularity)
 */
export async function getTrendingAnime(perPage = 25) {
  const query = `
    query ($perPage: Int) {
      Page(perPage: $perPage) {
        media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await anilistFetch(query, { perPage });
  return (data.Page?.media ?? []).map(normalizeAnime);
}

/**
 * Search anime by title (replaces Jikan /anime?q=...)
 */
export async function searchAnime(query, { format, status, perPage = 20 } = {}, signal) {
  const FORMAT_MAP = { tv: 'TV', movie: 'MOVIE' };
  const STATUS_MAP = { airing: 'RELEASING' };

  const gql = `
    query ($search: String, $format: MediaFormat, $status: MediaStatus, $perPage: Int) {
      Page(perPage: $perPage) {
        media(type: ANIME, search: $search, format: $format, status: $status, isAdult: false, sort: SEARCH_MATCH) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;

  const variables = {
    search: query,
    perPage,
    format: FORMAT_MAP[format] ?? undefined,
    status: STATUS_MAP[status] ?? undefined,
  };

  const data = await anilistFetch(gql, variables, signal);
  return (data.Page?.media ?? []).map(normalizeAnime);
}

/**
 * Fetch full anime details by AniList ID (replaces Jikan /anime/:id)
 */
export async function getAnimeDetails(anilistId) {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        ${MEDIA_FIELDS}
        idMal
        trailer { id site }
        tags { name rank isMediaSpoiler }
        relations {
          edges {
            relationType(version: 2)
            node { id title { romaji english } }
          }
        }
        characters(sort: [ROLE, RELEVANCE], perPage: 25) {
          edges {
            role
            node {
              id
              name { full }
              image { large medium }
            }
            voiceActors(language: JAPANESE) {
              name { full }
              languageV2
              image { large medium }
            }
          }
        }
        staff(sort: RELEVANCE, perPage: 20) {
          edges {
            role
            node {
              id
              name { full }
              image { large medium }
            }
          }
        }
        streamingEpisodes { title thumbnail url site }
        nextAiringEpisode { episode airingAt }
        airingSchedule(notYetAired: false, perPage: 50) {
          nodes { episode airingAt }
        }
      }
    }
  `;
  const data = await anilistFetch(query, { id: parseInt(anilistId, 10) });
  const media = data.Media;
  if (!media) return null;

  const base = normalizeAnime(media);

  // Characters
  const characters = (media.characters?.edges ?? []).map(normalizeCharacter).filter(Boolean);

  // Staff
  const staff = (media.staff?.edges ?? []).map(normalizeStaff).filter(Boolean);

  // Relations
  const relations = (media.relations?.edges ?? [])
    .filter(e => e.node?.title)
    .map(normalizeRelation)
    .filter(Boolean);

  // Episodes from airing schedule (historical episodes)
  const episodeNodes = media.airingSchedule?.nodes ?? [];
  const streamingEps = media.streamingEpisodes ?? [];

  // Build episode list: prefer streaming episodes (have thumbnails), fall back to airing schedule
  let episodes = [];
  if (streamingEps.length > 0) {
    episodes = streamingEps.map((ep, i) => ({
      mal_id: i + 1,
      title: ep.title || `Episode ${i + 1}`,
      synopsis: null,
      aired: null,
      thumbnailUrl: ep.thumbnail || null,
      watchUrl: ep.url || null,
      site: ep.site || null,
    }));
  } else if (episodeNodes.length > 0) {
    episodes = episodeNodes.map((ep, i) => normalizeEpisode(ep, i));
  }

  // Trailer
  const trailer = media.trailer
    ? (media.trailer.site === 'youtube'
        ? `https://www.youtube.com/watch?v=${media.trailer.id}`
        : null)
    : null;

  return {
    ...base,
    characters,
    staff,
    relations,
    episodeList: episodes,       // episode objects array — separate from episode count
    trailer,
    streamingEpisodes: streamingEps,
    nextAiringEpisode: media.nextAiringEpisode,
  };
}

/**
 * Search a single anime by name — used by the AI agent
 */
export async function searchAnimeByName(name) {
  const query = `
    query ($search: String) {
      Media(search: $search, type: ANIME, isAdult: false) {
        id idMal
        title { romaji english }
        coverImage { large extraLarge }
        averageScore episodes
        description(asHtml: false)
      }
    }
  `;
  try {
    const data = await anilistFetch(query, { search: name });
    const m = data.Media;
    if (!m) return null;
    const title = m.title?.english || m.title?.romaji || name;
    const img = m.coverImage?.extraLarge || m.coverImage?.large || '';
    const score = m.averageScore ? (m.averageScore / 10).toFixed(1) : 'N/A';
    return {
      id: m.id,
      mal_id: m.idMal ?? m.id,
      title,
      images: {
        jpg: { large_image_url: img },
        webp: { large_image_url: img },
      },
      score: parseFloat(score),
      episodes: m.episodes,
      synopsis: m.description?.replace(/<[^>]+>/g, '').substring(0, 300) ?? '',
    };
  } catch {
    return null;
  }
}

/**
 * Build the URL slug from an anime (matches existing slug format used in routing)
 * slug = sanitized-title-ID
 */
export function buildSlug(anime) {
  const id = anime.anilistId ?? anime.id;
  const title = anime.title ?? '';
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-') + '-' + id;
}

/**
 * Extract AniList ID from a slug (slug ends with -ID)
 */
export function idFromSlug(slug) {
  if (!slug) return null;
  return slug.split('-').pop();
}
