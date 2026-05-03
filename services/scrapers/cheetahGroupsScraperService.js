/**
 * CheetahGroups Scraper — WhatsApp group discovery via cheetahgroups.com.
 *
 * Site moved from per-category landing pages (e.g. /whatsapp-channel-links-business/,
 * deprecated and 404) to a 2-level WordPress structure:
 *   /category/{slug}/                              — index of articles
 *   /{topic}-whatsapp-group-links/                 — article with the actual links
 *
 * Article pages render a <table class="cheetah-tables"> where each row has:
 *   td.grp-name        — group name
 *   a[href*="chat.whatsapp.com"] — invite link (followed by tracking #fragment)
 *
 * Note: despite the original code expecting whatsapp.com/channel/ (Channels),
 * this site lists chat.whatsapp.com/ (Groups). source = 'cheetah_groups'.
 *
 * Rate limiting: 4s between requests.
 */

const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://cheetahgroups.com';
const RATE_LIMIT_MS = 4000;
const MAX_ARTICLES_PER_CATEGORY = 8;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36';

const CATEGORIES = [
  { slug: 'business', label: 'business' },
  { slug: 'entertainment', label: 'entertainment' },
  { slug: 'sports', label: 'sports' },
  { slug: 'education', label: 'education' },
  { slug: 'gaming', label: 'gaming' },
  { slug: 'creativity', label: 'creativity' },
  { slug: 'literature', label: 'literature' },
  { slug: 'religious', label: 'religious' },
  { slug: 'politics', label: 'politics' },
  { slug: 'blogs', label: 'blogs' },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const HEADERS = {
  'User-Agent': USER_AGENT,
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  Referer: BASE_URL,
};

/**
 * Extract WhatsApp invite code from a chat.whatsapp.com link.
 * Strips the tracking fragment cheetah appends (#CopiedFrom...).
 */
function extractInviteCode(href) {
  if (!href) return null;
  const m = href.match(/chat\.whatsapp\.com\/(?:invite\/)?([\w-]+)/i);
  return m ? m[1] : null;
}

/**
 * Step 1 — fetch a category index, return the article URLs that hold groups.
 * Filters out non-article links (menu items, share buttons, ads).
 */
async function scrapeCategoryIndex(categorySlug) {
  const url = `${BASE_URL}/category/${categorySlug}/`;
  try {
    const { data: html } = await axios.get(url, {
      timeout: 20000,
      headers: HEADERS,
      maxRedirects: 3,
    });

    const $ = cheerio.load(html);
    const articles = [];
    const seen = new Set();

    // Article cards expose .entry-title > a as the canonical post link
    $('.entry-title a, h2.entry-title a, article a').each((_, el) => {
      const href = $(el).attr('href') || '';
      // Article slugs always end in "-whatsapp-group-links" or "-whatsapp-channel-links"
      if (!/whatsapp-(?:group|channel)-links\/?$/.test(href)) return;
      if (seen.has(href)) return;
      seen.add(href);

      const title = $(el).text().trim();
      articles.push({ url: href, title: title.slice(0, 120) });
    });

    return articles;
  } catch (err) {
    const status = err.response?.status;
    if (status !== 404) {
      console.warn(`[CheetahGroups] Index ${categorySlug} failed: ${err.message}`);
    }
    return [];
  }
}

/**
 * Step 2 — fetch an article, extract the WhatsApp group rows from the table.
 */
async function scrapeArticle(articleUrl, categoryLabel) {
  try {
    const { data: html } = await axios.get(articleUrl, {
      timeout: 20000,
      headers: HEADERS,
      maxRedirects: 3,
    });

    const $ = cheerio.load(html);
    const groups = [];
    const seen = new Set();

    // Modern table layout
    $('table.cheetah-tables tr').each((_, row) => {
      const $row = $(row);
      const link = $row.find('a[href*="chat.whatsapp.com"]').first();
      if (!link.length) return;

      const href = link.attr('href') || '';
      const inviteCode = extractInviteCode(href);
      if (!inviteCode) return;
      if (seen.has(inviteCode)) return;
      seen.add(inviteCode);

      const name =
        $row.find('td.grp-name').text().trim() ||
        $row.find('td').eq(1).text().trim() ||
        '';
      if (!name || name.length < 2) return;

      groups.push({
        channelCode: inviteCode,
        name: name.slice(0, 120),
        followers: 0,
        description: '',
        inviteLink: href.split('#')[0],
        category: categoryLabel,
      });
    });

    // Fallback: any chat.whatsapp.com link inside the article body
    if (groups.length === 0) {
      $('article a[href*="chat.whatsapp.com"], .entry-content a[href*="chat.whatsapp.com"]').each((_, el) => {
        const $a = $(el);
        const href = $a.attr('href') || '';
        const inviteCode = extractInviteCode(href);
        if (!inviteCode || seen.has(inviteCode)) return;
        seen.add(inviteCode);

        const container = $a.closest('tr, li, p, div');
        const name =
          container.find('strong, b, td').first().text().trim() ||
          $a.text().trim() ||
          '';
        if (!name || name.length < 2) return;

        groups.push({
          channelCode: inviteCode,
          name: name.slice(0, 120),
          followers: 0,
          description: '',
          inviteLink: href.split('#')[0],
          category: categoryLabel,
        });
      });
    }

    return groups;
  } catch (err) {
    if (err.response?.status !== 404) {
      console.warn(`[CheetahGroups] Article ${articleUrl}: ${err.message}`);
    }
    return [];
  }
}

/**
 * Run the full 2-level scrape across all categories.
 * @returns {{ results: Array, errors: string[] }}
 */
async function scrapeAll() {
  const seen = new Map();
  const errors = [];

  for (const cat of CATEGORIES) {
    try {
      const articles = await scrapeCategoryIndex(cat.slug);
      const trimmed = articles.slice(0, MAX_ARTICLES_PER_CATEGORY);
      console.log(`[CheetahGroups] ${cat.slug}: ${articles.length} articles found, scraping ${trimmed.length}`);

      let catGroups = 0;
      for (const article of trimmed) {
        await sleep(RATE_LIMIT_MS);
        const groups = await scrapeArticle(article.url, cat.label);
        for (const g of groups) {
          if (!seen.has(g.channelCode)) {
            seen.set(g.channelCode, g);
            catGroups++;
          }
        }
      }
      if (catGroups > 0) {
        console.log(`[CheetahGroups] ${cat.slug}: +${catGroups} groups`);
      }
    } catch (err) {
      errors.push(`CheetahGroups ${cat.slug}: ${err.message}`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  return { results: Array.from(seen.values()), errors };
}

module.exports = {
  scrapeCategoryIndex,
  scrapeArticle,
  scrapeAll,
  CATEGORIES,
  extractInviteCode,
};
