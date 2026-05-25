/**
 * Founder programme — cohort configuration.
 *
 * Single source of truth for the founder cohort size. The lead-gen bot funnel
 * stops offering a founder slot once `founderTier:true` users reach this cap;
 * the admin panel and the public /api/founders/status endpoint report against
 * the same number.
 */

const FOUNDER_COHORT_SIZE = 40;

module.exports = { FOUNDER_COHORT_SIZE };
