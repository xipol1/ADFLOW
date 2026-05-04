import React, { Suspense, lazy } from 'react'
import DashboardLayout from '../../../layouts/DashboardLayout'

const DashboardTour = lazy(() => import('../../../components/onboarding/DashboardTour'))

export default function AdvertiserLayout() {
  return (
    <>
      <DashboardLayout role="advertiser" />
      <Suspense fallback={null}>
        <DashboardTour />
      </Suspense>
    </>
  )
}
