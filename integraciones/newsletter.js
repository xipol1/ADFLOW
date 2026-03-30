const axios = require('axios');

const TIMEOUT = 10000;

class NewsletterAPI {
  /**
   * Estimate metrics based on subscriber count and industry averages
   */
  estimateMetrics(subscriberCount) {
    const subs = Number(subscriberCount) || 0;

    // Industry-average open/click rates vary by list size
    let openRate, clickRate;
    if (subs < 1000) {
      openRate = 0.45;
      clickRate = 0.06;
    } else if (subs < 5000) {
      openRate = 0.38;
      clickRate = 0.045;
    } else if (subs < 20000) {
      openRate = 0.30;
      clickRate = 0.035;
    } else if (subs < 100000) {
      openRate = 0.25;
      clickRate = 0.025;
    } else {
      openRate = 0.20;
      clickRate = 0.02;
    }

    const estimatedOpens = Math.round(subs * openRate);
    const estimatedClicks = Math.round(subs * clickRate);
    const engagementRate = openRate * clickRate * 10; // combined engagement score

    return {
      subscribers: subs,
      openRate,
      clickRate,
      estimatedOpens,
      estimatedClicks,
      engagementRate: Math.min(1, engagementRate),
    };
  }

  /**
   * Verify API key for common newsletter providers
   * Supports: mailchimp, substack, beehiiv
   */
  async verifyAccess(apiKey, provider) {
    try {
      if (!apiKey) return { valid: false, error: 'API key no proporcionada' };

      const prov = String(provider || '').toLowerCase().trim();

      if (prov === 'mailchimp') {
        // Mailchimp API keys have the datacenter suffix: abc123-us10
        const dc = apiKey.includes('-') ? apiKey.split('-').pop() : 'us10';
        const url = `https://${dc}.api.mailchimp.com/3.0/ping`;
        const res = await axios.get(url, {
          headers: { Authorization: `apikey ${apiKey}` },
          timeout: TIMEOUT,
        });
        if (res.data && res.data.health_status) {
          return { valid: true, provider: 'mailchimp', status: res.data.health_status };
        }
        return { valid: false, error: 'Mailchimp no respondio correctamente' };
      }

      if (prov === 'beehiiv') {
        const url = 'https://api.beehiiv.com/v2/publications';
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${apiKey}` },
          timeout: TIMEOUT,
        });
        if (res.data && res.data.data) {
          return { valid: true, provider: 'beehiiv', publications: res.data.data.length };
        }
        return { valid: false, error: 'Beehiiv no respondio correctamente' };
      }

      if (prov === 'substack') {
        // Substack does not have a public API with key auth — mark as unverifiable
        return { valid: true, provider: 'substack', note: 'Substack no tiene API de verificaci\u00f3n p\u00fablica' };
      }

      return { valid: false, error: `Proveedor "${provider}" no soportado. Use: mailchimp, substack, beehiiv` };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  /**
   * Return estimated stats for a newsletter channel
   * @param {Object} channel - Canal document
   */
  getEstimatedStats(channel) {
    const subs = channel.estadisticas?.seguidores || 0;
    const metrics = this.estimateMetrics(subs);

    return {
      followers: subs,
      viewsAvg: metrics.estimatedOpens,
      engagementRate: metrics.engagementRate,
      scrollDepth: 0.55,
      postsTotal: 0,
      avgReactionsPerPost: metrics.estimatedClicks,
      avgSharesPerPost: Math.round(metrics.estimatedClicks * 0.1),
      avgViewsPerPost: metrics.estimatedOpens,
      growthRate30d: 0,
      raw: {
        estimated: true,
        source: 'newsletter_estimation',
        openRate: metrics.openRate,
        clickRate: metrics.clickRate,
      },
    };
  }
}

module.exports = NewsletterAPI;
