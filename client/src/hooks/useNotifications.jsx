import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import apiService, { CONFIGURED_API_ORIGIN } from '../services/api'

const NotificationsContext = createContext(null)

export function NotificationsProvider({ children }) {
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef(null)

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.leida).length
  }, [notifications])

  // Load notifications from backend
  const loadNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const result = await apiService.getNotifications({ limite: 50 })
      if (result?.success && result?.data) {
        const items = result.data.notificaciones || result.data.items || result.data || []
        setNotifications(
          items.map((n) => ({
            id: n._id || n.id,
            tipo: n.tipo || 'info',
            titulo: n.titulo || 'Notificación',
            mensaje: n.mensaje || '',
            fecha: n.createdAt || n.fecha || new Date(),
            leida: Boolean(n.leida),
            datos: n.metadata || n.datos,
          }))
        )
      }
    } catch (err) {
      console.warn('Error loading notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Connect Socket.io for real-time notifications
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    let socket = null
    const connectSocket = async () => {
      try {
        const { io } = await import('socket.io-client')
        const origin = CONFIGURED_API_ORIGIN || window.location.origin
        socket = io(origin, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 3000,
          reconnectionAttempts: 10
        })

        socket.on('connect', () => {
          setIsConnected(true)
        })

        socket.on('disconnect', () => {
          setIsConnected(false)
        })

        socket.on('notificacion', (data) => {
          const normalized = {
            id: data.id || data._id || Date.now(),
            tipo: data.tipo || 'info',
            titulo: data.titulo || 'Notificación',
            mensaje: data.mensaje || '',
            fecha: data.timestamp || new Date(),
            leida: false,
            datos: data.datos,
          }
          setNotifications((prev) => [normalized, ...prev].slice(0, 200))

          // Browser notification if permitted
          if (Notification.permission === 'granted') {
            new Notification(normalized.titulo, { body: normalized.mensaje })
          }
        })

        socketRef.current = socket
      } catch (err) {
        console.warn('Socket.io client not available:', err.message)
      }
    }

    connectSocket()
    loadNotifications()

    return () => {
      if (socket) {
        socket.disconnect()
        socketRef.current = null
      }
    }
  }, [loadNotifications])

  const addNotification = (notificacion) => {
    setNotifications((prev) => {
      const normalized = {
        id: notificacion?.id || Date.now(),
        tipo: notificacion?.tipo || 'info',
        titulo: notificacion?.titulo || 'Notificación',
        mensaje: notificacion?.mensaje || '',
        fecha: notificacion?.fecha || new Date(),
        leida: Boolean(notificacion?.leida),
        datos: notificacion?.datos,
      }
      return [normalized, ...prev].slice(0, 200)
    })
  }

  const markAsRead = useCallback(async (notificationId) => {
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, leida: true } : n)))
    try {
      await apiService.markNotificationRead(notificationId)
    } catch (_) { /* silent */ }
  }, [])

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })))
    try {
      await apiService.markAllNotificationsRead()
    } catch (_) { /* silent */ }
  }, [])

  const deleteNotification = useCallback(async (notificationId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    try {
      await apiService.deleteNotification(notificationId)
    } catch (_) { /* silent */ }
  }, [])

  const clearAllNotifications = useCallback(async () => {
    setNotifications([])
  }, [])

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) return false
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }, [])

  const sendCustomNotification = useCallback((titulo, mensaje, tipo = 'info') => {
    addNotification({ titulo, mensaje, tipo, fecha: new Date(), leida: false })
  }, [])

  const value = useMemo(() => {
    return {
      notifications,
      unreadCount,
      loading,
      loadNotifications,
      addNotification,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAllNotifications,
      requestNotificationPermission,
      sendCustomNotification,
      isConnected,
    }
  }, [notifications, unreadCount, loading, isConnected, loadNotifications, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications, requestNotificationPermission, sendCustomNotification])

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications debe ser usado dentro de un NotificationsProvider')
  return ctx
}

export default useNotifications
