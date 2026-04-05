/**
 * Ad Delivery Service — Publishes campaign content to platform channels.
 *
 * Features:
 * - Dispatches to correct platform via publishAdToChannel
 * - Retry with exponential backoff (3 attempts)
 * - Tracks delivery status, attempts, and platform response on Campaign model
 */

const Campaign = require('../models/Campaign');
const Canal = require('../models/Canal');
const { publishAdToChannel } = require('../lib/platformConnectors');

const MAX_RETRIES = 3;
const RETRY_DELAYS = [5000, 15000, 45000]; // 5s, 15s, 45s

/**
 * Attempt to deliver a campaign's ad content to its channel.
 * Called when a campaign transitions to PUBLISHED.
 * @param {string} campaignId
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deliverAd(campaignId) {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) return { success: false, error: 'Campaign not found' };

  const channel = await Canal.findById(campaign.channel);
  if (!channel) {
    campaign.delivery = {
      ...campaign.delivery,
      status: 'failed',
      error: 'Channel not found',
      attempts: (campaign.delivery?.attempts || 0) + 1,
      lastAttemptAt: new Date(),
    };
    await campaign.save();
    return { success: false, error: 'Channel not found' };
  }

  // Skip delivery for platforms that don't support auto-publishing
  const platform = String(channel.plataforma || '').toLowerCase();
  const autoPublishPlatforms = ['telegram', 'discord', 'whatsapp', 'facebook', 'linkedin'];
  if (!autoPublishPlatforms.includes(platform)) {
    campaign.delivery = {
      status: 'skipped',
      platformResponse: `Auto-publish not supported for ${platform}`,
      attempts: 0,
      lastAttemptAt: new Date(),
    };
    await campaign.save();
    return { success: true, skipped: true };
  }

  // Retry loop with exponential backoff
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await publishAdToChannel(channel, campaign.content, campaign.targetUrl);

      // Success
      const messageId = result?.result?.message_id || result?.id || result?.messageId || '';
      campaign.delivery = {
        status: 'sent',
        platformResponse: JSON.stringify(result).substring(0, 500),
        platformMessageId: String(messageId),
        attempts: attempt + 1,
        lastAttemptAt: new Date(),
        deliveredAt: new Date(),
        error: '',
      };
      await campaign.save();
      return { success: true, messageId };
    } catch (err) {
      const errorMsg = err?.message || String(err);
      console.error(`Ad delivery attempt ${attempt + 1}/${MAX_RETRIES} failed for campaign ${campaignId}:`, errorMsg);

      campaign.delivery = {
        status: attempt + 1 >= MAX_RETRIES ? 'failed' : 'pending',
        attempts: attempt + 1,
        lastAttemptAt: new Date(),
        error: errorMsg.substring(0, 500),
        platformResponse: campaign.delivery?.platformResponse || '',
        platformMessageId: campaign.delivery?.platformMessageId || '',
        deliveredAt: campaign.delivery?.deliveredAt || null,
      };
      await campaign.save();

      // Wait before retry (except on last attempt)
      if (attempt + 1 < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt] || 5000));
      }
    }
  }

  return { success: false, error: campaign.delivery?.error || 'Max retries exceeded' };
}

/**
 * Retry failed deliveries — can be called from cron.
 */
async function retryFailedDeliveries() {
  const failedCampaigns = await Campaign.find({
    status: 'PUBLISHED',
    'delivery.status': 'failed',
    'delivery.attempts': { $lt: MAX_RETRIES + 2 }, // allow 2 extra cron retries
  }).limit(20);

  const results = [];
  for (const campaign of failedCampaigns) {
    const result = await deliverAd(campaign._id);
    results.push({ campaignId: campaign._id, ...result });
  }
  return results;
}

module.exports = { deliverAd, retryFailedDeliveries };
