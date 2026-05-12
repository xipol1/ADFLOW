import React from 'react'
import OnboardingChecklist from './OnboardingChecklist'

// Backwards-compat shim. The component was unified into OnboardingChecklist
// when advertiser support was added. New call sites should import
// OnboardingChecklist directly with the role prop they need.
export default function CreatorOnboardingChecklist(props) {
  return <OnboardingChecklist role="creator" {...props} />
}
