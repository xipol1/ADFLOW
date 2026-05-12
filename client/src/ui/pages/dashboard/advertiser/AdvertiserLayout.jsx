import React from 'react'
import DashboardLayout from '../../../layouts/DashboardLayout'

// The DashboardTour spotlight was removed in favour of the unified
// OnboardingChecklist banner shown on the Overview page (mirrors the
// creator dashboard). The checklist persists its own dismissal so it
// doesn't reappear on every login.
export default function AdvertiserLayout() {
  return <DashboardLayout role="advertiser" />
}
