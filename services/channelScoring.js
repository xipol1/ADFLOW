/**
 * Pure function to score a channel based on various metrics
 * @param {Object} input - Channel data
 * @returns {Object} Scoring result including score, level, status, breakdown, and flags
 */
const scoreChannel = (input) => {
  const {
    subscribers = 0,
    postsPerWeek = 0,
    topic = '',
    avgViews = 0,
    isVerified = false,
    pricePerPost = 0,
    flags = []
  } = input;

  const breakdown = {
    quality: 0,
    engagement: 0,
    credibility: 0,
    commercial: 0
  };

  // 1. QUALITY (0–30)
  // subscribers: <1k=2, 1k–10k=5, 10k–50k=8, >50k=10
  if (subscribers < 1000) breakdown.quality += 2;
  else if (subscribers <= 10000) breakdown.quality += 5;
  else if (subscribers <= 50000) breakdown.quality += 8;
  else breakdown.quality += 10;

  // postsPerWeek: <1=2, 1–3=6, >3=10
  if (postsPerWeek < 1) breakdown.quality += 2;
  else if (postsPerWeek <= 3) breakdown.quality += 6;
  else breakdown.quality += 10;

  // topic present = +10
  if (topic && topic.trim().length > 0) breakdown.quality += 10;

  // 2. ENGAGEMENT (0–30)
  if (avgViews > 0 && subscribers > 0) {
    const ratio = avgViews / subscribers;
    let engagementPoints = 0;
    
    // ratio: 0.2=10, 0.1–0.2=7, 0.05–0.1=4, <0.05=1
    if (ratio >= 0.2) engagementPoints = 10;
    else if (ratio >= 0.1) engagementPoints = 7;
    else if (ratio >= 0.05) engagementPoints = 4;
    else engagementPoints = 1;
    
    breakdown.engagement = engagementPoints * 3;
  } else {
    breakdown.engagement = 5 * 3;
  }

  // 3. CREDIBILITY (0–25)
  if (isVerified) breakdown.credibility += 10;
  if (subscribers > 5000) breakdown.credibility += 5;
  if (!flags || flags.length === 0) breakdown.credibility += 10;

  // 4. COMMERCIAL (0–15)
  // pricePerPost between 5–500 → +10 else +3
  if (pricePerPost >= 5 && pricePerPost <= 500) breakdown.commercial += 10;
  else breakdown.commercial += 3;

  // postsPerWeek >=1 → +5
  if (postsPerWeek >= 1) breakdown.commercial += 5;

  // Total Score
  const score = breakdown.quality + breakdown.engagement + breakdown.credibility + breakdown.commercial;

  // LEVEL
  let level = 'BRONZE';
  if (score >= 80) level = 'ELITE';
  else if (score >= 65) level = 'GOLD';
  else if (score >= 50) level = 'SILVER';

  // STATUS
  let status = 'PENDING_REVIEW';
  if (score >= 65) status = 'ACTIVE';
  else if (score >= 50) status = 'ACTIVE';

  // FLAGS
  const resultFlags = [...(flags || [])];
  if (subscribers > 100000 && avgViews < 1000) {
    if (!resultFlags.includes('low_engagement_suspect')) {
      resultFlags.push('low_engagement_suspect');
    }
  }

  return {
    score,
    level,
    status,
    breakdown,
    flags: resultFlags
  };
};

module.exports = {
  scoreChannel
};
