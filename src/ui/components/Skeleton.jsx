import React from 'react'
import { FONT_BODY } from '../theme/tokens'

/* ── Base pulse keyframes (injected once) ─────────────────────────────────── */
const PULSE_CSS = `
@keyframes _skel_pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.4; }
}
`
let _injected = false
function injectPulse() {
  if (_injected || typeof document === 'undefined') return
  const s = document.createElement('style')
  s.textContent = PULSE_CSS
  document.head.appendChild(s)
  _injected = true
}

/* ── Base skeleton block ──────────────────────────────────────────────────── */
function Bone({ width, height, radius = '8px', style: extra }) {
  injectPulse()
  return (
    <div style={{
      width: width || '100%',
      height: height || '16px',
      borderRadius: radius,
      background: 'var(--border, rgba(255,255,255,0.08))',
      animation: '_skel_pulse 1.6s ease-in-out infinite',
      ...extra,
    }} />
  )
}

/* ── Skeleton KPI Card ────────────────────────────────────────────────────── */
export function SkeletonKpi() {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '22px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Bone width="40px" height="40px" radius="11px" />
        <Bone width="84px" height="34px" radius="6px" />
      </div>
      <div>
        <Bone width="120px" height="28px" radius="8px" style={{ marginBottom: '8px' }} />
        <Bone width="80px" height="14px" radius="6px" style={{ marginBottom: '10px' }} />
        <Bone width="100px" height="22px" radius="20px" />
      </div>
    </div>
  )
}

/* ── Skeleton KPI Grid (4 cards) ──────────────────────────────────────────── */
export function SkeletonKpiGrid({ count = 4 }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
      gap: '16px',
    }}>
      {Array.from({ length: count }, (_, i) => <SkeletonKpi key={i} />)}
    </div>
  )
}

/* ── Skeleton Table Row ───────────────────────────────────────────────────── */
export function SkeletonRow() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '14px 18px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
    }}>
      <Bone width="36px" height="36px" radius="10px" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <Bone width="60%" height="14px" />
        <Bone width="35%" height="11px" />
      </div>
      <Bone width="80px" height="26px" radius="8px" />
    </div>
  )
}

/* ── Skeleton Table (multiple rows) ───────────────────────────────────────── */
export function SkeletonTable({ rows = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {Array.from({ length: rows }, (_, i) => <SkeletonRow key={i} />)}
    </div>
  )
}

/* ── Skeleton Chart ───────────────────────────────────────────────────────── */
export function SkeletonChart({ height = 200 }) {
  injectPulse()
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '24px',
      height: `${height}px`,
      display: 'flex',
      alignItems: 'flex-end',
      gap: '8px',
    }}>
      {[35, 55, 40, 70, 50, 80, 60, 90, 45, 65, 75, 55].map((h, i) => (
        <div key={i} style={{
          flex: 1,
          height: `${h}%`,
          borderRadius: '4px 4px 0 0',
          background: 'var(--border, rgba(255,255,255,0.08))',
          animation: '_skel_pulse 1.6s ease-in-out infinite',
          animationDelay: `${i * 80}ms`,
        }} />
      ))}
    </div>
  )
}

/* ── Skeleton Page — full overview placeholder ────────────────────────────── */
export function SkeletonPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Bone width="200px" height="24px" radius="8px" style={{ marginBottom: '8px' }} />
          <Bone width="140px" height="14px" radius="6px" />
        </div>
        <Bone width="130px" height="40px" radius="10px" />
      </div>

      {/* KPIs */}
      <SkeletonKpiGrid count={4} />

      {/* Chart + Table */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
      }}>
        <SkeletonChart />
        <SkeletonChart height={200} />
      </div>

      {/* Table rows */}
      <SkeletonTable rows={4} />
    </div>
  )
}
