import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const NotificationsContext = createContext(null)

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function NotificationsProvider({ children }) {
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState(() => readJson('notifications', []))

  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications))
  }, [notifications])

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.leida).length
  }, [notifications])

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

  const loadNotifications = async () => {
    setLoading(false)
  }

  const markAsRead = async (notificationId) => {
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, leida: true } : n)))
  }

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })))
  }

  const deleteNotification = async (notificationId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
  }

  const clearAllNotifications = async () => {
    setNotifications([])
  }

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return false
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  const sendCustomNotification = (titulo, mensaje, tipo = 'info') => {
    addNotification({ titulo, mensaje, tipo, fecha: new Date(), leida: false })
  }

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
      isConnected: false,
    }
  }, [notifications, unreadCount, loading])

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications debe ser usado dentro de un NotificationsProvider')
  return ctx
}

export default useNotifications
