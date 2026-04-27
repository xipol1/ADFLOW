# Adflow — Onboarding & Activation System Design

**Goal:** Visitor → Signup → Channel created → Channel verified → Ready for campaigns in < 3 minutes
**Source:** Creators arriving pre-qualified from Getalink
**Date:** 2026-03-31

---

## 1. Current State vs. Proposed

### Current Pain Points

| Problem | Impact |
|---------|--------|
| Registration asks for Name + Role selection | Extra friction for Getalink creators who are always "creator" |
| Channel setup (`RegisterChannelPage.jsx`) is a monolithic 500+ line component with Bot Tokens, API keys, categories, pricing | Massive drop-off — creators see "Bot Token" and abandon |
| Verification flow is buried inside channel registration | No clear mental model, no progress feedback |
| After verification, user lands on empty dashboard | No perceived value, no next step |
| No dedicated Getalink entry point | Generic flow for a qualified audience |

### Proposed: 7-Screen Wizard

Strip the flow to its minimum viable path. Everything else (pricing, categories, credentials) becomes post-activation progressive disclosure.

```
Getalink referral link
  → /onboarding/register        (Screen 1: Email + Password)
  → /onboarding/channel         (Screen 2: Platform + Name)
  → /onboarding/verify-intro    (Screen 3: Expectation setting)
  → /onboarding/verify-action   (Screen 4: Copy link + post)
  → /onboarding/verify-progress (Screen 5: Live 0/3 counter)
  → /onboarding/success         (Screen 6: Activation confirmation)
  → /onboarding/waiting         (Screen 7: Smart waiting state)
  → /creator (dashboard)
```

---

## 2. Screen-by-Screen UX Design

### Screen 1 — Registration (`/onboarding/register`)

**Purpose:** Create account with minimum friction.

```
┌─────────────────────────────┐
│        Ad[flow] logo        │
│                             │
│   Start earning with your   │
│        community            │
│                             │
│  ┌───────────────────────┐  │
│  │ Email                 │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ Password              │  │
│  └───────────────────────┘  │
│                             │
│  [ Continue ████████████ ]  │
│                             │
│  Already have an account?   │
│  Log in                     │
└─────────────────────────────┘
```

**Key decisions:**
- **No name field.** Name is not required for activation. Collect later in profile settings.
- **No role selector.** Getalink traffic defaults to `role: 'creator'`. The API already accepts role in the body.
- **No email verification gate.** JWT returned immediately. Email verification can happen asynchronously post-activation.
- **Password validation inline** — show requirements as the user types (strength meter), not as error messages after submit.

**API call:** `POST /api/auth/registro` with `{ email, password, role: 'creator' }`
**On success:** Store JWT + refreshToken, auto-advance to Screen 2.

**Optimization:** If Getalink passes `?ref=getalink&email=user@example.com` as URL params, pre-fill email field.

---

### Screen 2 — Channel Setup (`/onboarding/channel`)

**Purpose:** Create the channel record with platform + name only. No credentials, no pricing.

```
┌─────────────────────────────┐
│  Step 2 of 4  ●●○○          │
│                             │
│  What platform is your      │
│       channel on?           │
│                             │
│  ┌──────────┐ ┌──────────┐  │
│  │    ✈️    │ │    💬    │  │
│  │ Telegram │ │ WhatsApp │  │
│  └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐  │
│  │    🎮    │ │    📸    │  │
│  │ Discord  │ │Instagram │  │
│  └──────────┘ └──────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │ Channel name          │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ Channel link (opt.)   │  │
│  └───────────────────────┘  │
│                             │
│  [ Continue ████████████ ]  │
└─────────────────────────────┘
```

**Key decisions:**
- **Platform = large tap targets**, not a dropdown. Mobile-first.
- **Only 2 inputs:** `nombreCanal` (required), channel link/username (optional).
- **No Bot Token, no API keys, no pricing, no categories.** These are post-activation concerns. The channel is created in `pendiente_verificacion` state regardless.
- **Channel link is optional** but if provided, we store it as `identificadorCanal`.

**API call:** `POST /api/canales` with `{ plataforma, nombreCanal, identificadorCanal? }`
**On success:** Store `channelId` in onboarding state, advance to Screen 3.

**Trade-off:** We skip credential collection here. This means the platform can't auto-fetch metrics at this stage. Acceptable because: (a) verification via tracking link doesn't need credentials, (b) creators can add credentials later, (c) reducing fields from ~5 to ~2 eliminates the biggest drop-off point.

---

### Screen 3 — Verification Intro (`/onboarding/verify-intro`)

**Purpose:** Set expectations before the verification action. Without this, creators don't understand what the link is for.

```
┌─────────────────────────────┐
│  Step 3 of 4  ●●●○          │
│                             │
│  Verify your channel        │
│                             │
│  ┌─────────────────────┐    │
│  │  1. We generate a   │    │
│  │     unique link      │    │
│  │                      │    │
│  │  2. You post it in   │    │
│  │     your channel     │    │
│  │                      │    │
│  │  3. 3 people click   │    │
│  │     → you're in!     │    │
│  └─────────────────────┘    │
│                             │
│  ⏱ Takes about 60 seconds   │
│                             │
│  [ Generate my link ██████ ]│
└─────────────────────────────┘
```

**Key decisions:**
- **3-step visual** (numbered, not bulleted) makes it concrete.
- **Time anchor** ("about 60 seconds") reduces anxiety. Under-promise, over-deliver.
- **Single CTA** triggers the API call to generate the verification link.

**API call on CTA click:** `POST /api/tracking/verify-link` with `{ channelId }`
**On success:** Store verification link data, advance to Screen 4.

---

### Screen 4 — Verification Action (`/onboarding/verify-action`)

**Purpose:** Get the creator to copy the link and post it in their channel.

```
┌─────────────────────────────┐
│  Step 3 of 4  ●●●○          │
│                             │
│  Post this link in your     │
│       channel               │
│                             │
│  ┌───────────────────────┐  │
│  │ https://adflow.com/t/ │  │
│  │ aB3xK9               │  │
│  │              [ Copy ] │  │
│  └───────────────────────┘  │
│                             │
│  📋 Copied!  (toast)        │
│                             │
│  Write something like:      │
│  "Check this out 👀"        │
│                             │
│  [ I've posted it ████████ ]│
│                             │
│  This link expires in 48h   │
└─────────────────────────────┘
```

**Key decisions:**
- **Copy button with instant "Copied!" feedback.** Use `navigator.clipboard.writeText()`.
- **Suggested message** reduces cognitive load ("what do I write?").
- **"I've posted it" is NOT a gate.** Clicking it just advances to the progress screen and updates link status to `posted`. Verification happens via clicks regardless.
- **48h expiry** shown as low-key info, not a warning.

**API call on CTA:** `PATCH` the tracking link status to `posted` (optional — the existing controller handles this via the `createVerificationLink` response which already returns the link). Then navigate to Screen 5.

**Mobile UX:** On mobile, after copying, offer a deep-link button: "Open Telegram" / "Open WhatsApp" that opens the platform's app directly.

---

### Screen 5 — Real-Time Progress (`/onboarding/verify-progress`)

**Purpose:** Show live verification progress. This is the highest-anxiety screen — the creator is waiting.

```
┌─────────────────────────────┐
│  Step 4 of 4  ●●●●          │
│                             │
│  Waiting for clicks...      │
│                             │
│       ┌───┐                 │
│       │ 1 │ / 3             │
│       └───┘                 │
│  ████████░░░░░░░░  33%      │
│                             │
│  ✅ Click 1 — 2 sec ago     │
│  ○  Click 2 — waiting...    │
│  ○  Click 3 — waiting...    │
│                             │
│  Link: adflow.com/t/aB3xK9 │
│                    [ Copy ] │
│                             │
│  Checking every 5 seconds   │
└─────────────────────────────┘
```

**Key decisions:**
- **Poll `GET /api/tracking/verify-status/:channelId` every 5 seconds.** The endpoint already returns `uniqueClicks`, `status`, and recent click data.
- **Show individual clicks** as they arrive (timestamp, maybe device icon). Creates excitement.
- **Auto-advance to Screen 6** when `status === 'verified'` or `uniqueClicks >= 3`.
- **Keep the copy button** visible — in case the creator needs to re-share.
- **Progress bar animation** — smooth CSS transitions between states.
- **No timeout anxiety** — don't show countdown. Just "Checking every 5 seconds."

**Polling implementation:**
```javascript
useEffect(() => {
  const interval = setInterval(async () => {
    const res = await apiService.checkVerificationStatus(channelId)
    if (res.data.status === 'verified') {
      clearInterval(interval)
      navigate('/onboarding/success')
    }
    setVerificationData(res.data)
  }, 5000)
  return () => clearInterval(interval)
}, [channelId])
```

**Trade-off:** Polling vs. WebSockets. Polling wins here because: (a) simpler to implement and debug, (b) verification happens in <2 minutes so 5s polling = max ~24 requests, (c) the existing API endpoint is built for this, (d) no persistent connection to manage.

---

### Screen 6 — Activation Success (`/onboarding/success`)

**Purpose:** Dopamine hit. Reinforce the creator made the right decision.

```
┌─────────────────────────────┐
│                             │
│          ✅                 │
│                             │
│   Your channel is active!   │
│                             │
│   You can now receive       │
│   paid campaigns from       │
│   advertisers               │
│                             │
│  ┌─────────────────────┐    │
│  │  🎯 Channel: My Ch  │    │
│  │  📱 Platform: TG     │    │
│  │  ✅ Status: Active   │    │
│  └─────────────────────┘    │
│                             │
│  [ Go to dashboard ██████ ] │
└─────────────────────────────┘
```

**Key decisions:**
- **Celebration moment** — confetti animation (framer-motion is already installed).
- **Recap card** shows what was just accomplished.
- **Single CTA** leads to dashboard.
- **Auto-advance after 5 seconds** if user doesn't click (with visual countdown).

---

### Screen 7 — Smart Waiting State (Dashboard First View)

**Purpose:** Prevent empty-state disappointment. This is where most marketplaces lose creators.

This is NOT a separate onboarding screen but rather the **first thing the creator sees on their dashboard** after activation.

```
┌─────────────────────────────┐
│  Dashboard                  │
│                             │
│  ┌─────────────────────┐    │
│  │ 🎯 We're matching   │    │
│  │ campaigns for you    │    │
│  │                      │    │
│  │ First opportunities  │    │
│  │ arrive in 24-72h     │    │
│  │                      │    │
│  │ ┌─────────────────┐  │    │
│  │ │ 🏷 Early access │  │    │
│  │ │ You're among the│  │    │
│  │ │ first creators   │  │    │
│  │ │ on Adflow!       │  │    │
│  │ └─────────────────┘  │    │
│  │                      │    │
│  │ While you wait:      │    │
│  │ • Complete profile   │    │
│  │ • Set your pricing   │    │
│  │ • Add another channel│    │
│  └─────────────────────┘    │
│                             │
│  ── Incoming campaigns ──   │
│  ┌───────────────────────┐  │
│  │ 🔒 Tech Product       │  │
│  │    $15-25 per post    │  │
│  │    Matching: 87%      │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ 🔒 SaaS Launch        │  │
│  │    $10-20 per post    │  │
│  │    Matching: 72%      │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

**Key decisions:**
- **"Incoming campaigns" section** shows blurred/locked campaign previews. These can be real campaigns from the marketplace or seed data.
- **Match percentage** creates perceived personalization.
- **Action items** ("Complete profile", "Set pricing") give the creator something productive to do.
- **"Early access" badge** leverages scarcity.

**Implementation:** The backend `GET /api/campaigns` endpoint (or a new lightweight endpoint) returns campaigns marked as available/seeking creators. Show them as "incoming" with match scores. If no real campaigns exist yet, show seed campaigns with a `featured` flag.

---

## 3. Component Architecture

```
src/
  ui/
    pages/
      onboarding/
        OnboardingLayout.jsx        # Shared wrapper (progress bar, logo, back button)
        RegisterStep.jsx            # Screen 1
        ChannelStep.jsx             # Screen 2
        VerifyIntroStep.jsx         # Screen 3
        VerifyActionStep.jsx        # Screen 4
        VerifyProgressStep.jsx      # Screen 5
        SuccessStep.jsx             # Screen 6
    components/
      onboarding/
        ProgressIndicator.jsx       # Step dots / progress bar
        PlatformSelector.jsx        # Large platform buttons (reusable)
        VerificationCounter.jsx     # Live click counter with animation
        CopyButton.jsx              # Copy-to-clipboard with feedback
        ConfettiOverlay.jsx         # Success celebration
```

### OnboardingLayout

Shared layout for all onboarding screens:

```jsx
function OnboardingLayout({ step, totalSteps, children }) {
  return (
    <div className="onboarding-layout">
      <header>
        <Logo />
        {step > 1 && <BackButton />}
        <ProgressIndicator current={step} total={totalSteps} />
      </header>
      <main>{children}</main>
    </div>
  )
}
```

**Design:** Full-viewport, centered content, max-width 480px. No sidebar, no nav. Pure focus on the task.

---

## 4. State Management

### Onboarding State (React Context)

```javascript
const OnboardingContext = createContext()

const initialState = {
  step: 1,                    // Current screen (1-6)
  // Screen 1 outputs
  userId: null,
  token: null,
  // Screen 2 outputs
  channelId: null,
  platform: null,
  channelName: '',
  // Screen 3-5 outputs
  verificationLinkId: null,
  trackingUrl: '',
  verificationStatus: 'pending', // pending | posted | verified
  uniqueClicks: 0,
  clicks: [],
}
```

**Why a separate context (not just AuthContext)?**
- Onboarding state is ephemeral — it exists only during the wizard flow.
- AuthContext handles tokens and user identity (long-lived).
- Separation prevents onboarding concerns from polluting the auth layer.
- On completion, onboarding context is discarded; auth context persists.

### Persistence

Store onboarding progress in `sessionStorage` (not `localStorage`):
- If the user refreshes mid-flow, they resume where they left off.
- If they close the tab and come back, they start fresh (which is fine — the flow is <3 min).
- Session storage avoids stale state from abandoned attempts.

### State Transitions

```
Step 1 (Register)
  └─ onSuccess → set userId, token → advance to Step 2
Step 2 (Channel)
  └─ onSuccess → set channelId, platform → advance to Step 3
Step 3 (Verify Intro)
  └─ onClick → generate verify link → set trackingUrl → advance to Step 4
Step 4 (Verify Action)
  └─ onClick "I've posted it" → advance to Step 5
Step 5 (Verify Progress)
  └─ onPollSuccess (status=verified) → advance to Step 6
Step 6 (Success)
  └─ onClick → navigate to /creator (exit onboarding)
```

---

## 5. API Interaction Flow

```
                    ┌──────────────────────────────────┐
                    │         FRONTEND (React)          │
                    └──────────────────────────────────┘
                                    │
    Screen 1 ──────────────────────►│
    POST /api/auth/registro         │──► { email, password, role:'creator' }
    ◄── { token, refreshToken,      │
         user: { id, email, rol } } │
                                    │
    Screen 2 ──────────────────────►│
    POST /api/canales               │──► { plataforma, nombreCanal,
    ◄── { data: { _id, estado:      │      identificadorCanal? }
         'pendiente_verificacion' }}│      + Authorization: Bearer <token>
                                    │
    Screen 3 ──────────────────────►│
    POST /api/tracking/verify-link  │──► { channelId }
    ◄── { data: { trackingUrl,      │      + Authorization: Bearer <token>
         verification: { status,    │
         minClicks, expiresAt } } } │
                                    │
    Screen 5 (polling) ────────────►│
    GET /api/tracking/              │      + Authorization: Bearer <token>
        verify-status/:channelId    │
    ◄── { data: { status,          │
         uniqueClicks, clicks[] } } │
         (repeat every 5s)          │
                                    │
    When status === 'verified':     │
    Channel.estado → 'activo'       │
    Channel.verificado → true       │
    (done server-side by controller)│
```

**No new API endpoints required.** The existing backend fully supports this flow. The changes are 100% frontend.

---

## 6. Routing Changes

Add to `AppRoutes.jsx`:

```jsx
import OnboardingLayout from '../ui/pages/onboarding/OnboardingLayout'
import RegisterStep from '../ui/pages/onboarding/RegisterStep'
import ChannelStep from '../ui/pages/onboarding/ChannelStep'
import VerifyIntroStep from '../ui/pages/onboarding/VerifyIntroStep'
import VerifyActionStep from '../ui/pages/onboarding/VerifyActionStep'
import VerifyProgressStep from '../ui/pages/onboarding/VerifyProgressStep'
import SuccessStep from '../ui/pages/onboarding/SuccessStep'

// Inside <Routes>:
<Route path="/onboarding" element={<OnboardingLayout />}>
  <Route index element={<Navigate to="register" replace />} />
  <Route path="register" element={<RegisterStep />} />
  <Route path="channel" element={<ChannelStep />} />
  <Route path="verify-intro" element={<VerifyIntroStep />} />
  <Route path="verify-action" element={<VerifyActionStep />} />
  <Route path="verify-progress" element={<VerifyProgressStep />} />
  <Route path="success" element={<SuccessStep />} />
</Route>
```

**Getalink entry URL:** `https://adflow.com/onboarding/register?ref=getalink`

The existing `/auth/register` route remains for organic traffic (both roles). The `/onboarding/*` route is the optimized creator-only funnel.

---

## 7. Activation Optimization — Drop-off Reduction

### Biggest Drop-off Points (Predicted)

| Transition | Risk | Mitigation |
|-----------|------|------------|
| Landing → Register | Password requirements | Inline strength meter, not post-submit errors |
| Register → Channel | "Why do I need this?" | Headline: "Add your channel to start receiving campaigns" |
| Channel → Verify | Confusion about verification | Screen 3 sets expectations with 3-step visual |
| Verify Action → Progress | "Did I do it right?" | Show first click within seconds if audience is active |
| Progress → Success | Waiting anxiety | Live counter + click details make it engaging |

### Progressive Disclosure Strategy

**During onboarding (Screens 1-6):** Collect only 3 data points:
1. Email + password
2. Platform + channel name
3. Verification (automated)

**Post-activation (Dashboard):** Prompt for:
- Channel description (improves campaign matching)
- Category tags (improves discovery)
- Pricing (required before accepting campaigns)
- Platform credentials (enables auto-metrics)
- Profile name + avatar

Each of these becomes a "completion task" card on the dashboard, not a gate.

### Optimistic UI Patterns

- **Registration:** Show success state immediately on submit, don't wait for API response. If it fails, show error.
- **Channel creation:** Navigate to Screen 3 immediately on submit with a loading state for the button, auto-advance when API confirms.
- **Copy button:** Show "Copied!" instantly via clipboard API, no server round-trip.

---

## 8. Early Liquidity Design

### Problem
New marketplace = no campaigns. Creators activate and see an empty dashboard.

### Solution: Seed Campaign System

**Backend approach** (minimal API change):

Add a `seed` or `featured` flag to existing campaigns, or create a new lightweight endpoint:

```
GET /api/campaigns/incoming?channelId=xxx
```

Returns a mix of:
1. Real campaigns seeking creators on this platform
2. Seed/sample campaigns marked as `seed: true`

**Frontend approach:**

Display "incoming" campaigns on the dashboard with:
- Blurred/locked appearance (can't accept yet → "Complete your profile to unlock")
- Match percentage based on platform + category overlap
- Price ranges (not exact, to set expectations)

**Seed data strategy:**
- Pre-create 5-10 realistic campaign templates in the database
- Rotate them so the dashboard never looks empty
- As real campaigns arrive, phase out seeds

---

## 9. Metrics & Tracking

### Funnel Events

Emit these events (via a simple analytics wrapper — can be `console.log` initially, swap for Mixpanel/Amplitude later):

| Event | Screen | Data |
|-------|--------|------|
| `onboarding.started` | 1 | `{ ref, source }` |
| `onboarding.registered` | 1 | `{ userId, timeOnStep }` |
| `onboarding.channel_created` | 2 | `{ channelId, platform, timeOnStep }` |
| `onboarding.verify_link_generated` | 3 | `{ channelId, timeOnStep }` |
| `onboarding.verify_link_copied` | 4 | `{ channelId }` |
| `onboarding.verify_posted` | 4 | `{ channelId, timeOnStep }` |
| `onboarding.verify_click` | 5 | `{ channelId, clickNumber }` |
| `onboarding.verified` | 5 | `{ channelId, timeOnStep, totalTime }` |
| `onboarding.completed` | 6 | `{ channelId, totalTime }` |
| `onboarding.abandoned` | any | `{ lastStep, timeOnStep }` |

### Key Metrics Dashboard

| Metric | Target | Calculation |
|--------|--------|-------------|
| **Activation rate** | >60% | `completed / started` |
| **Time to activation** | <3 min | `median(completed.totalTime - started.timestamp)` |
| **Step 1→2 conversion** | >85% | `registered / started` |
| **Step 2→3 conversion** | >80% | `channel_created / registered` |
| **Step 3→5 conversion** | >75% | `verify_posted / channel_created` |
| **Step 5→6 conversion** | >90% | `verified / verify_posted` |
| **Abandonment by step** | — | Distribution of `abandoned.lastStep` |

### Tracking Implementation

```javascript
// src/services/analytics.js
const track = (event, data = {}) => {
  const payload = {
    event,
    timestamp: Date.now(),
    sessionId: sessionStorage.getItem('onboarding_session'),
    ...data,
  }
  // Phase 1: console + send to own API
  console.log('[analytics]', payload)
  // Phase 2: send to analytics service
  // mixpanel.track(event, payload)
}
```

---

## 10. Key Trade-offs & Decisions

| Decision | Alternative | Why this way |
|----------|-------------|-------------|
| **Separate `/onboarding` route** vs. modifying existing auth flow | Modify `AuthPage.jsx` | Keeps existing flow intact for organic/advertiser traffic. Clean separation. |
| **No credentials during onboarding** | Ask for Bot Token in Step 2 | Bot tokens are the #1 drop-off. Verification via tracking link doesn't need them. Collect post-activation. |
| **Polling** vs. WebSockets for verification | WebSockets | Simpler, existing endpoint, <24 requests total, no connection management. |
| **sessionStorage** vs. localStorage for onboarding state | localStorage | Prevents stale abandoned-flow state. Flow is <3 min, no need to persist across tabs. |
| **Separate OnboardingContext** vs. extending AuthContext | Single context | Separation of concerns. Onboarding is ephemeral, auth is persistent. |
| **7 screens** vs. fewer combined screens | 3-4 combined screens | One action per screen = higher completion per step. Total time is the same. |
| **No email verification gate** | Require email verification before channel | Email verification adds 1-5 min of friction (open email, click link). Do it async. |

---

## 11. What to Revisit as System Grows

1. **WebSocket upgrade** — When verification volume grows, polling becomes wasteful. Switch to Socket.io (already installed in dependencies).
2. **OAuth registration** — "Sign up with Google" eliminates password friction entirely. Consider when user volume justifies the integration work.
3. **Multi-channel onboarding** — Currently optimized for 1 channel. When creators want to add multiple channels at once, the flow needs a "add another" loop.
4. **Advertiser onboarding** — This design is creator-only. Advertiser activation (create campaign → set budget → publish) needs its own dedicated flow.
5. **A/B testing** — Once baseline metrics are established, test: 2-step registration (email only, set password later), skip intro screen (go straight to link generation), different CTA copy.
6. **Internationalization** — Current UI is Spanish. Add i18n when expanding beyond LatAm.

---

## 12. Implementation Order

| Phase | Scope | Effort |
|-------|-------|--------|
| **Phase 1** | OnboardingLayout + RegisterStep + ChannelStep | ~4h |
| **Phase 2** | VerifyIntroStep + VerifyActionStep + VerifyProgressStep | ~4h |
| **Phase 3** | SuccessStep + routing + OnboardingContext | ~2h |
| **Phase 4** | Dashboard waiting state + seed campaigns | ~3h |
| **Phase 5** | Analytics events + metrics | ~2h |
| **Total** | | **~15h** |

No backend changes required for Phase 1-3. Phase 4 may need a lightweight campaigns endpoint.
