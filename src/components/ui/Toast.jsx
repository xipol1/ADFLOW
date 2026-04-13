import React, { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
}

const COLORS = {
  success: { bg: 'var(--accent-dim)', border: 'var(--accent-border)', text: 'var(--accent)' },
  error: { bg: 'var(--red-dim)', border: 'rgba(248,81,73,0.2)', text: 'var(--red)' },
  info: { bg: 'var(--blue-dim)', border: 'rgba(88,166,255,0.2)', text: 'var(--blue)' },
}

function ToastItem({ toast, onDismiss }) {
  const [exiting, setExiting] = useState(false)
  const colors = COLORS[toast.type] || COLORS.info
  const Icon = ICONS[toast.type] || Info

  useEffect(() => {
    const t = setTimeout(() => { setExiting(true); setTimeout(() => onDismiss(toast.id), 300) }, toast.duration || 4000)
    return () => clearTimeout(t)
  }, [toast, onDismiss])

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium max-w-sm shadow-lg"
      style={{
        background: 'var(--surface)',
        border: `1px solid ${colors.border}`,
        color: colors.text,
        animation: exiting ? 'fadeOut 0.3s ease forwards' : 'fadeIn 0.3s ease',
      }}
    >
      <Icon size={16} style={{ flexShrink: 0 }} />
      <span className="flex-1" style={{ color: 'var(--text)' }}>{toast.message}</span>
      <button onClick={() => { setExiting(true); setTimeout(() => onDismiss(toast.id), 300) }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)', padding: 2, flexShrink: 0 }}
      ><X size={14} /></button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type, duration }])
  }, [])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2">
          {toasts.map((t) => <ToastItem key={t.id} toast={t} onDismiss={dismiss} />)}
        </div>
      )}
      <style>{`@keyframes fadeOut { from { opacity:1; transform:translateY(0) } to { opacity:0; transform:translateY(8px) } }`}</style>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) return () => {} // safe fallback if no provider
  return ctx
}
