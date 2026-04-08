import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import apiService from '../../services/api'

const AuthContext = createContext(null)

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('refreshToken') || '')
  const [user, setUser] = useState(() => readJson('user', null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isAuthenticated = Boolean(token)

  useEffect(() => {
    let mounted = true

    const verify = async () => {
      try {
        if (!token) {
          if (mounted) setLoading(false)
          return
        }
        const res = await apiService.verifyToken()
        if (mounted && res?.success && res?.user) {
          localStorage.setItem('user', JSON.stringify(res.user))
          setUser(res.user)
        }
        // Only clear session on explicit auth rejection (401/403), not on network errors
        const isAuthRejection = res?.success === false && (res?.status === 401 || res?.status === 403)
        if (mounted && isAuthRejection) {
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('user')
          setToken('')
          setRefreshToken('')
          setUser(null)
        }
      } catch {
      } finally {
        if (mounted) setLoading(false)
      }
    }

    verify()
    return () => {
      mounted = false
    }
  }, [token])

  const login = async ({ email, password }) => {
    setError('')
    setLoading(true)
    try {
      const res = await apiService.login({ email, password })
      if (res && res.success && res.token && res.user) {
        localStorage.setItem('token', res.token)
        localStorage.setItem('refreshToken', res.refreshToken || '')
        localStorage.setItem('user', JSON.stringify(res.user))
        setToken(res.token)
        setRefreshToken(res.refreshToken || '')
        setUser(res.user)
      }
      return res
    } catch (e) {
      setError(e?.message || 'No se pudo iniciar sesión')
      return { success: false, message: e?.message || 'No se pudo iniciar sesión' }
    } finally {
      setLoading(false)
    }
  }

  const register = async (userData) => {
    setError('')
    setLoading(true)
    try {
      const res = await apiService.register(userData)
      if (res && res.success && res.token && res.user) {
        localStorage.setItem('token', res.token)
        localStorage.setItem('refreshToken', res.refreshToken || '')
        localStorage.setItem('user', JSON.stringify(res.user))
        setToken(res.token)
        setRefreshToken(res.refreshToken || '')
        setUser(res.user)
      }
      return res
    } catch (e) {
      setError(e?.message || 'No se pudo registrar')
      return { success: false, message: e?.message || 'No se pudo registrar' }
    } finally {
      setLoading(false)
    }
  }

  // Called after email verification — updates session with fresh tokens
  const setAuthFromVerification = (newToken, newRefreshToken, newUser) => {
    if (newToken && newUser) {
      localStorage.setItem('token', newToken)
      localStorage.setItem('refreshToken', newRefreshToken || '')
      localStorage.setItem('user', JSON.stringify(newUser))
      setToken(newToken)
      setRefreshToken(newRefreshToken || '')
      setUser(newUser)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setToken('')
    setRefreshToken('')
    setUser(null)
    setError('')
  }

  const value = useMemo(() => {
    const rol = user?.rol || user?.role || ''
    // Full-access is determined by the backend (user.fullAccess flag) or admin role.
    // Never hardcode email whitelists in the frontend — they're visible in the JS bundle.
    const isFullAccess = rol === 'admin' || user?.fullAccess === true

    return {
      token,
      refreshToken,
      user,
      rol,
      loading,
      error,
      isAuthenticated,
      login,
      register,
      logout,
      setAuthFromVerification,
      clearError: () => setError(''),
      isAnunciante: rol === 'anunciante',
      isCreador: rol === 'creador',
      isAdmin: rol === 'admin',
      isFullAccess,
    }
  }, [token, refreshToken, user, loading, error, isAuthenticated])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

