import { useState, useEffect, useRef } from 'react'

const STORAGE_KEY = 'channelad-widget-last-seen-v1'
const MARK_DELAY_MS = 4000  // mark widget as "seen" after 4s of being mounted
const MAX_AGE_DAYS = 30     // anything older than 30 days is treated as already-seen

/**
 * useSinceLastVisit — Hootsuite-beating "what's new since last time"
 *
 * Tracks the last time the user "looked at" a widget instance and counts
 * how many items in `items` are newer than that timestamp. Returns a
 * count that the widget can render as a pill ("+3 nuevos").
 *
 * Heuristics:
 *   • First-ever visit returns 0 (no baseline → don't startle the user)
 *   • Mark-as-seen is delayed by MARK_DELAY_MS so the pill doesn't
 *     disappear the instant it loads
 *   • lastSeenAt is per widget instance (id), per browser (localStorage)
 *
 * Args:
 *   widgetId   string — unique id of the widget instance
 *   items      array — items to count; each must have a getTimestamp-able value
 *   getTimestamp fn(item) → Date|number|string — extracts the timestamp
 *
 * Returns:
 *   { newCount, isFirstVisit, markSeen }   — markSeen() lets the widget
 *                                            mark items as seen on demand
 *                                            (e.g. when user clicks "ver todo")
 */
export default function useSinceLastVisit(widgetId, items, getTimestamp) {
  const [newCount, setNewCount] = useState(0)
  const [isFirstVisit, setIsFirstVisit] = useState(false)
  const lastSeenRef = useRef(null)
  const markedRef = useRef(false)

  // ── Read baseline from localStorage on mount or when widgetId changes ──
  useEffect(() => {
    if (!widgetId) return
    const all = readAll()
    const stored = all[widgetId]
    if (stored == null) {
      setIsFirstVisit(true)
      lastSeenRef.current = null
    } else {
      // Discard ancient timestamps so "20 nuevos" doesn't show after 6 months
      const ageMs = Date.now() - stored
      if (ageMs > MAX_AGE_DAYS * 86400000) {
        setIsFirstVisit(true)
        lastSeenRef.current = null
      } else {
        lastSeenRef.current = stored
      }
    }
    markedRef.current = false
  }, [widgetId])

  // ── Compute newCount whenever items change (or baseline changes) ──
  useEffect(() => {
    if (!Array.isArray(items)) { setNewCount(0); return }
    if (isFirstVisit || lastSeenRef.current == null) { setNewCount(0); return }
    let count = 0
    for (const it of items) {
      const t = parseTs(getTimestamp(it))
      if (Number.isFinite(t) && t > lastSeenRef.current) count++
    }
    setNewCount(count)
  }, [items, getTimestamp, isFirstVisit])

  // ── Schedule "mark as seen" after a delay so the pill doesn't flicker ──
  useEffect(() => {
    if (!widgetId) return
    if (markedRef.current) return
    const timer = setTimeout(() => {
      markedRef.current = true
      writeOne(widgetId, Date.now())
      // Don't clear newCount here — we want the pill to remain visible until
      // the next render with new items, otherwise the user might miss it.
    }, MARK_DELAY_MS)
    return () => clearTimeout(timer)
  }, [widgetId])

  const markSeen = () => {
    if (!widgetId) return
    markedRef.current = true
    writeOne(widgetId, Date.now())
    setNewCount(0)
    lastSeenRef.current = Date.now()
  }

  return { newCount, isFirstVisit, markSeen }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return (parsed && typeof parsed === 'object') ? parsed : {}
  } catch { return {} }
}

function writeOne(widgetId, ts) {
  try {
    const all = readAll()
    all[widgetId] = ts
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch { /* ignore quota / disabled storage */ }
}

function parseTs(v) {
  if (v == null) return NaN
  if (v instanceof Date) return v.getTime()
  if (typeof v === 'number') return v
  const t = new Date(v).getTime()
  return Number.isFinite(t) ? t : NaN
}
