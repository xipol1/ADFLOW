import React, { createContext, useContext, useReducer, useEffect } from 'react'

const OnboardingContext = createContext()

const STORAGE_KEY = 'channelad_onboarding'

const initialState = {
  step: 1,
  channelId: null,
  platform: null,
  channelName: '',
  trackingUrl: '',
  trackingCode: '',
  verificationStatus: 'pending',
  uniqueClicks: 0,
  clicks: [],
  minClicks: 3,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.payload }
    case 'SET_CHANNEL':
      return { ...state, channelId: action.payload.channelId, platform: action.payload.platform, channelName: action.payload.channelName, step: 3 }
    case 'SET_VERIFY_LINK':
      return { ...state, trackingUrl: action.payload.trackingUrl, trackingCode: action.payload.trackingCode, minClicks: action.payload.minClicks || 3 }
    case 'UPDATE_VERIFICATION':
      return { ...state, verificationStatus: action.payload.status, uniqueClicks: action.payload.uniqueClicks, clicks: action.payload.clicks || state.clicks }
    case 'RESET':
      return { ...initialState }
    default:
      return state
  }
}

function loadState() {
  try {
    // Only restore state if user has an active token (is logged in)
    const hasToken = Boolean(localStorage.getItem('token'))
    if (!hasToken) {
      sessionStorage.removeItem(STORAGE_KEY)
      return initialState
    }
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) return { ...initialState, ...JSON.parse(saved) }
  } catch (err) { console.error('OnboardingContext.loadState failed:', err) }
  return initialState
}

export function OnboardingProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, loadState)

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  return (
    <OnboardingContext.Provider value={{ state, dispatch }}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be inside OnboardingProvider')
  return ctx
}

export function clearOnboarding() {
  sessionStorage.removeItem(STORAGE_KEY)
}
