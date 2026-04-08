/**
 * Stripe Connect Express Service
 *
 * Manages Express connected accounts for creators:
 * - Account creation & onboarding
 * - Status verification (charges_enabled, payouts_enabled)
 * - Transfers after campaign completion
 * - Dashboard login links
 */

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !key.startsWith('sk_')) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return require('stripe')(key);
};

/**
 * Create a Stripe Express connected account for a creator.
 * Returns the account object.
 */
const createExpressAccount = async (user) => {
  const stripe = getStripe();
  const account = await stripe.accounts.create({
    type: 'express',
    email: user.email,
    metadata: {
      userId: String(user._id || user.id),
      platform: 'channelad'
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true }
    },
    business_type: 'individual',
    settings: {
      payouts: {
        schedule: { interval: 'daily' }
      }
    }
  });
  return account;
};

/**
 * Generate an Account Link for Stripe Express onboarding.
 * The creator is redirected to this URL to complete KYC & bank setup.
 */
const createOnboardingLink = async (accountId) => {
  const stripe = getStripe();
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${frontendUrl}/creator/settings?stripe=refresh`,
    return_url: `${frontendUrl}/creator/settings?stripe=complete`,
    type: 'account_onboarding'
  });
  return accountLink;
};

/**
 * Check the status of a connected account.
 * Returns whether the account can receive charges and payouts.
 */
const getAccountStatus = async (accountId) => {
  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(accountId);
  return {
    id: account.id,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
    requirements: account.requirements?.currently_due || [],
    email: account.email
  };
};

/**
 * Create a login link for the Express dashboard.
 * Only works if the account has completed onboarding.
 */
const createDashboardLink = async (accountId) => {
  const stripe = getStripe();
  const loginLink = await stripe.accounts.createLoginLink(accountId);
  return loginLink;
};

/**
 * Transfer funds to a creator's connected account after campaign completion.
 * This is called automatically when a campaign moves to COMPLETED.
 *
 * @param {number} amount - Amount in EUR (not cents)
 * @param {string} destinationAccountId - Creator's Stripe account ID
 * @param {object} metadata - Campaign/transaction metadata
 * @returns {object} Stripe Transfer object
 */
const transferToCreator = async (amount, destinationAccountId, metadata = {}) => {
  const stripe = getStripe();
  const transfer = await stripe.transfers.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: (process.env.STRIPE_CURRENCY || 'eur').toLowerCase(),
    destination: destinationAccountId,
    metadata: {
      ...metadata,
      platform: 'channelad',
      type: 'creator_payout'
    },
    description: `ChannelAd Creator Payout — Campaign ${metadata.campaignId || 'N/A'}`
  });
  return transfer;
};

module.exports = {
  createExpressAccount,
  createOnboardingLink,
  getAccountStatus,
  createDashboardLink,
  transferToCreator
};
