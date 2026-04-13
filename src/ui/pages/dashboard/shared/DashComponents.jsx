/**
 * DashComponents.jsx
 * Shared component library for ChannelAd SaaS Dashboard
 * Design: Stripe / Fiverr Pro / Linear inspired
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { GREEN as AG, FONT_BODY, FONT_DISPLAY, SPARKLINE, ERR, OK, WARN, BLUE } from '../../../theme/tokens';
const A = 'var(--accent, #00D4A8)';
const purpleAlpha = (o) => `var(--accent-dim, rgba(0,212,168,${o}))`;

// ─── Keyframe injection (runs once) ──────────────────────────────────────────
const KEYFRAMES = `
@keyframes _dash_fadeUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0);    }
}
@keyframes _dash_spin {
  from { transform: rotate(-90deg); }
  to   { transform: rotate(270deg); }
}
@keyframes _dash_slideUp {
  from { opacity: 0; transform: translateY(28px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}
@keyframes _dash_backdropIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes _dash_tooltipIn {
  from { opacity: 0; transform: translateX(-50%) translateY(4px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0);   }
}
`;

let _kfInjected = false;
function injectKeyframes() {
  if (_kfInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = KEYFRAMES;
  document.head.appendChild(style);
  _kfInjected = true;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a smooth cubic-bezier SVG path through an array of {x,y} points */
function smoothPath(pts) {
  if (pts.length < 2) return '';
  const cp = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const c1 = cp(pts[i], pts[i + 1]);
    const c2 = cp(pts[i], pts[i + 1]);
    // Use a tighter control point for smooth curves
    const ctrl1x = pts[i].x + (pts[i + 1].x - pts[i].x) * 0.4;
    const ctrl1y = pts[i].y;
    const ctrl2x = pts[i].x + (pts[i + 1].x - pts[i].x) * 0.6;
    const ctrl2y = pts[i + 1].y;
    d += ` C ${ctrl1x} ${ctrl1y}, ${ctrl2x} ${ctrl2y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
  }
  return d;
}

function normalizeValues(values, minY = 0, maxY) {
  const max = maxY ?? Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  return values.map(v => (v - min) / range);
}

// ─────────────────────────────────────────────────────────────────────────────
// 0. Sparkline — shared smooth SVG sparkline
// ─────────────────────────────────────────────────────────────────────────────
export function Sparkline({ data, color = A, w = SPARKLINE.w, h = SPARKLINE.h }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const rng = max - min || 1
  const pad = SPARKLINE.pad

  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * (w - pad * 2) + pad,
    y: h - pad - ((v - min) / rng) * (h - pad * 2),
  }))

  let d = `M ${pts[0].x},${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const cp1x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * 0.4
    const cp2x = pts[i].x - (pts[i].x - pts[i - 1].x) * 0.4
    d += ` C ${cp1x},${pts[i - 1].y} ${cp2x},${pts[i].y} ${pts[i].x},${pts[i].y}`
  }

  const fillD = `${d} L ${pts[pts.length - 1].x},${h} L ${pts[0].x},${h} Z`
  const gradId = `sg-${color.replace('#', '')}`

  return (
    <svg width={w} height={h} style={{ overflow: 'visible', flexShrink: 0 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#${gradId})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. StatCard
// ─────────────────────────────────────────────────────────────────────────────
export function StatCard({
  icon,
  label,
  value,
  change,
  changeDir = 'up',
  sparkData = [],
  accent = A,
  gradient = false,
}) {
  injectKeyframes();
  const [hovered, setHovered] = useState(false);

  const isUp = changeDir === 'up';

  // Build sparkline SVG
  const W = 80, H = 32;
  const norm = normalizeValues(sparkData.length ? sparkData : [0, 1]);
  const pts = norm.map((v, i) => ({
    x: (i / Math.max(norm.length - 1, 1)) * W,
    y: H - v * H * 0.85 - H * 0.075,
  }));
  const linePath = smoothPath(pts);
  const areaPath = pts.length > 1
    ? `${linePath} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`
    : '';

  const sparkId = `spark-${label?.replace(/\s/g, '')}-${accent.replace('#', '')}`;

  const cardStyle = {
    position: 'relative',
    borderRadius: 16,
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    overflow: 'hidden',
    cursor: 'default',
    transition: 'transform 0.22s cubic-bezier(.22,1,.36,1), box-shadow 0.22s ease',
    animation: '_dash_fadeUp 0.4s cubic-bezier(.22,1,.36,1) both',
    transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
    ...(gradient
      ? {
          background: `linear-gradient(135deg, ${accent}22 0%, ${accent}08 100%)`,
          border: `1px solid ${accent}30`,
          boxShadow: hovered
            ? `0 12px 32px ${accent}20, inset 0 1px 0 ${accent}30`
            : `0 4px 16px ${accent}12, inset 0 1px 0 ${accent}20`,
        }
      : {
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: hovered
            ? '0 12px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.06)'
            : '0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
        }),
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Floating icon (gradient mode) */}
      {gradient && (
        <div style={{
          position: 'absolute',
          right: 20,
          top: 20,
          fontSize: 36,
          opacity: 0.18,
          lineHeight: 1,
          userSelect: 'none',
          filter: 'blur(1px)',
        }}>
          {icon}
        </div>
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {!gradient && (
          <span style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `${accent}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            flexShrink: 0,
          }}>
            {icon}
          </span>
        )}
        {gradient && (
          <span style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: `${accent}28`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            flexShrink: 0,
          }}>
            {icon}
          </span>
        )}
        <span style={{
          fontFamily: FONT_BODY,
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--muted)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          {label}
        </span>
      </div>

      {/* Value + sparkline row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <span style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 28,
          fontWeight: 700,
          color: 'var(--text)',
          letterSpacing: '-0.03em',
          lineHeight: 1,
        }}>
          {value}
        </span>

        {sparkData.length > 1 && (
          <svg width={W} height={H} style={{ flexShrink: 0 }}>
            <defs>
              <linearGradient id={sparkId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
                <stop offset="100%" stopColor={accent} stopOpacity="0" />
              </linearGradient>
            </defs>
            {areaPath && (
              <path d={areaPath} fill={`url(#${sparkId})`} />
            )}
            <path
              d={linePath}
              fill="none"
              stroke={accent}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* Change indicator */}
      {change !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            background: isUp ? '#16a34a18' : '#dc262618',
            color: isUp ? '#22c55e' : '#f87171',
            borderRadius: 6,
            padding: '2px 7px',
            fontFamily: FONT_DISPLAY,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '-0.01em',
          }}>
            <span style={{ fontSize: 10 }}>{isUp ? '▲' : '▼'}</span>
            {change}
          </span>
          <span style={{
            fontFamily: FONT_BODY,
            fontSize: 11,
            color: 'var(--muted2)',
          }}>
            vs mes anterior
          </span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SmoothLineChart
// ─────────────────────────────────────────────────────────────────────────────
export function SmoothLineChart({
  data = [],
  color = A,
  height = 200,
  showGrid = true,
  showLabels = true,
  fill = true,
}) {
  injectKeyframes();
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const svgRef = useRef(null);
  const [dims, setDims] = useState({ w: 400 });

  useEffect(() => {
    if (!svgRef.current) return;
    const ro = new ResizeObserver(([e]) => setDims({ w: e.contentRect.width }));
    ro.observe(svgRef.current.parentElement);
    return () => ro.disconnect();
  }, []);

  const PAD = { top: 16, right: 16, bottom: showLabels ? 36 : 12, left: 12 };
  const W = dims.w;
  const H = height;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const values = data.map(d => d.value);
  const maxV = Math.max(...values, 1);
  const minV = Math.min(...values, 0);
  const range = maxV - minV || 1;

  const toX = i => PAD.left + (i / Math.max(data.length - 1, 1)) * innerW;
  const toY = v => PAD.top + innerH - ((v - minV) / range) * innerH;

  const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.value) }));
  const linePath = smoothPath(pts);
  const areaPath = pts.length > 1
    ? `${linePath} L ${pts[pts.length - 1].x} ${PAD.top + innerH} L ${pts[0].x} ${PAD.top + innerH} Z`
    : '';

  const gradId = `slc-${color.replace('#', '')}`;
  const gridLines = showGrid ? [0, 0.25, 0.5, 0.75, 1] : [];

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <svg
        ref={svgRef}
        width="100%"
        height={H}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {showGrid && gridLines.map((t, i) => {
          const y = PAD.top + innerH - t * innerH;
          return (
            <line
              key={i}
              x1={PAD.left}
              y1={y}
              x2={PAD.left + innerW}
              y2={y}
              stroke="var(--border)"
              strokeWidth="1"
              strokeDasharray="3 4"
            />
          );
        })}

        {/* Area fill */}
        {fill && areaPath && (
          <path d={areaPath} fill={`url(#${gradId})`} />
        )}

        {/* Line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Dots */}
        {pts.map((pt, i) => (
          <g key={i} onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={hoveredIdx === i ? 5 : 3}
              fill={color}
              stroke="var(--bg)"
              strokeWidth="2"
              style={{ transition: 'r 0.15s ease', cursor: 'crosshair' }}
            />
            {hoveredIdx === i && (
              <>
                <rect
                  x={pt.x - 24}
                  y={pt.y - 30}
                  width={48}
                  height={22}
                  rx={5}
                  fill="var(--bg3)"
                  stroke="var(--border)"
                  strokeWidth="1"
                />
                <text
                  x={pt.x}
                  y={pt.y - 14}
                  textAnchor="middle"
                  fill="var(--text)"
                  fontSize="11"
                  fontFamily={FONT_DISPLAY}
                  fontWeight="600"
                >
                  {data[i]?.value}
                </text>
              </>
            )}
          </g>
        ))}

        {/* X labels */}
        {showLabels && data.map((d, i) => (
          <text
            key={i}
            x={toX(i)}
            y={H - 6}
            textAnchor="middle"
            fill="var(--muted2)"
            fontSize="10"
            fontFamily={FONT_BODY}
          >
            {d.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. BarChart
// ─────────────────────────────────────────────────────────────────────────────
export function BarChart({
  data = [],
  color = A,
  height = 200,
}) {
  injectKeyframes();
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [dims, setDims] = useState({ w: 400 });
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => setDims({ w: e.contentRect.width }));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const PAD = { top: 24, right: 8, bottom: 32, left: 8 };
  const W = dims.w;
  const H = height;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxV = Math.max(...data.map(d => d.value), 1);
  const barCount = data.length;
  const gap = Math.max(4, innerW * 0.05 / barCount);
  const barW = (innerW - gap * (barCount - 1)) / barCount;

  return (
    <div ref={containerRef} style={{ width: '100%', height }}>
      <svg width="100%" height={H} style={{ display: 'block', overflow: 'visible' }}>
        {data.map((d, i) => {
          const barH = (d.value / maxV) * innerH;
          const x = PAD.left + i * (barW + gap);
          const y = PAD.top + innerH - barH;
          const isActive = i === data.length - 1;
          const isHover = hoveredIdx === i;
          const barColor = isHover ? color : isActive ? color : `${color}99`;
          const rx = Math.min(6, barW / 3);

          return (
            <g
              key={i}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Rounded top bar via path */}
              <path
                d={`
                  M ${x + rx} ${y}
                  h ${barW - rx * 2}
                  q ${rx} 0 ${rx} ${rx}
                  v ${barH - rx}
                  h ${-barW}
                  v ${-(barH - rx)}
                  q 0 ${-rx} ${rx} ${-rx}
                  Z
                `}
                fill={barColor}
                style={{ transition: 'fill 0.18s ease' }}
              />

              {/* Value label on hover or active */}
              {(isActive || isHover) && (
                <text
                  x={x + barW / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fill="var(--text)"
                  fontSize="11"
                  fontFamily={FONT_DISPLAY}
                  fontWeight="600"
                  letterSpacing="-0.02em"
                >
                  {d.value}
                </text>
              )}

              {/* X label */}
              <text
                x={x + barW / 2}
                y={H - 6}
                textAnchor="middle"
                fill="var(--muted2)"
                fontSize="10"
                fontFamily={FONT_BODY}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DonutChart
// ─────────────────────────────────────────────────────────────────────────────
export function DonutChart({ segments = [], size = 180 }) {
  injectKeyframes();
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.38;
  const r = size * 0.24;
  const GAP_DEG = 1.5;

  const total = segments.reduce((s, seg) => s + seg.value, 0);

  // Build arc paths
  let currentAngle = -90;
  const arcs = segments.map((seg, i) => {
    const pct = total ? seg.value / total : 0;
    const sweepDeg = pct * 360 - GAP_DEG;
    const startAngle = currentAngle + GAP_DEG / 2;
    const endAngle = startAngle + sweepDeg;
    currentAngle += pct * 360;

    const toRad = deg => (deg * Math.PI) / 180;
    const x1 = cx + R * Math.cos(toRad(startAngle));
    const y1 = cy + R * Math.sin(toRad(startAngle));
    const x2 = cx + R * Math.cos(toRad(endAngle));
    const y2 = cy + R * Math.sin(toRad(endAngle));
    const x3 = cx + r * Math.cos(toRad(endAngle));
    const y3 = cy + r * Math.sin(toRad(endAngle));
    const x4 = cx + r * Math.cos(toRad(startAngle));
    const y4 = cy + r * Math.sin(toRad(startAngle));
    const large = sweepDeg > 180 ? 1 : 0;

    const path = `
      M ${x1} ${y1}
      A ${R} ${R} 0 ${large} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${r} ${r} 0 ${large} 0 ${x4} ${y4}
      Z
    `;

    return { ...seg, path, pct };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
      <svg
        width={size}
        height={size}
        style={{ flexShrink: 0, animation: '_dash_spin 0s' }}
      >
        {arcs.map((arc, i) => (
          <path
            key={i}
            d={arc.path}
            fill={arc.color}
            opacity={hoveredIdx !== null && hoveredIdx !== i ? 0.45 : 1}
            style={{
              transition: 'opacity 0.2s ease, transform 0.2s ease',
              transform: hoveredIdx === i ? `scale(1.04)` : 'scale(1)',
              transformOrigin: `${cx}px ${cy}px`,
              cursor: 'pointer',
            }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          />
        ))}

        {/* Center text */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fill="var(--text)"
          fontSize={size * 0.13}
          fontFamily={FONT_DISPLAY}
          fontWeight="700"
          letterSpacing="-0.04em"
        >
          {hoveredIdx !== null ? segments[hoveredIdx]?.value : total}
        </text>
        <text
          x={cx}
          y={cy + size * 0.1}
          textAnchor="middle"
          fill="var(--muted)"
          fontSize={size * 0.07}
          fontFamily={FONT_BODY}
        >
          {hoveredIdx !== null ? segments[hoveredIdx]?.label : 'anuncios'}
        </text>
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {segments.map((seg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              opacity: hoveredIdx !== null && hoveredIdx !== i ? 0.45 : 1,
              transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <span style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              background: seg.color,
              flexShrink: 0,
            }} />
            <span style={{
              fontFamily: FONT_BODY,
              fontSize: 12,
              color: 'var(--text)',
              fontWeight: 500,
            }}>
              {seg.label}
            </span>
            <span style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 12,
              color: 'var(--muted)',
              letterSpacing: '-0.01em',
              marginLeft: 4,
            }}>
              {seg.pct !== undefined
                ? `${Math.round(seg.pct * 100)}%`
                : total ? `${Math.round((seg.value / total) * 100)}%` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. DataTable
// ─────────────────────────────────────────────────────────────────────────────
export function DataTable({
  columns = [],
  rows = [],
  onRowClick,
  emptyMessage = 'No hay datos',
  emptyIcon = '📭',
}) {
  injectKeyframes();
  const [hoveredRow, setHoveredRow] = useState(null);

  const thStyle = {
    padding: '10px 16px',
    fontFamily: FONT_BODY,
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--muted)',
    textAlign: 'left',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg2)',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  };

  const tdStyle = {
    padding: '11px 16px',
    fontFamily: FONT_BODY,
    fontSize: 13,
    color: 'var(--text)',
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{
      width: '100%',
      overflowX: 'auto',
      borderRadius: 12,
      border: '1px solid var(--border)',
      background: 'var(--surface)',
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        tableLayout: 'fixed',
      }}>
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                style={{ ...thStyle, width: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: '48px 16px',
                  textAlign: 'center',
                  fontFamily: FONT_BODY,
                  color: 'var(--muted)',
                }}
              >
                <EmptyState icon={emptyIcon} title={emptyMessage} />
              </td>
            </tr>
          ) : (
            rows.map((row, ri) => (
              <tr
                key={ri}
                style={{
                  background: hoveredRow === ri ? 'var(--bg2)' : 'transparent',
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={() => setHoveredRow(ri)}
                onMouseLeave={() => setHoveredRow(null)}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(col => (
                  <td key={col.key} style={tdStyle}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Badge
// ─────────────────────────────────────────────────────────────────────────────
export function Badge({
  label,
  color = A,
  bg,
  size = 'md',
}) {
  const resolvedBg = bg ?? `${color}18`;
  const isSm = size === 'sm';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: isSm ? 4 : 5,
      padding: isSm ? '2px 8px' : '3px 10px',
      borderRadius: 999,
      background: resolvedBg,
      border: `1px solid ${color}28`,
      fontFamily: FONT_BODY,
      fontSize: isSm ? 10 : 11,
      fontWeight: 600,
      color,
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: isSm ? 5 : 6,
        height: isSm ? 5 : 6,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
      }} />
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. ActionMenu
// ─────────────────────────────────────────────────────────────────────────────
export function ActionMenu({ items = [] }) {
  injectKeyframes();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: open ? 'var(--bg2)' : 'var(--surface)',
          color: 'var(--muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          lineHeight: 1,
          transition: 'background 0.15s ease, border-color 0.15s ease',
          fontFamily: FONT_BODY,
          padding: 0,
        }}
      >
        ···
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: 'calc(100% + 6px)',
          zIndex: 200,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)',
          minWidth: 168,
          padding: '4px',
          animation: '_dash_fadeUp 0.15s cubic-bezier(.22,1,.36,1) both',
        }}>
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.onClick?.(); setOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '8px 10px',
                background: 'transparent',
                border: 'none',
                borderRadius: 7,
                cursor: 'pointer',
                fontFamily: FONT_BODY,
                fontSize: 13,
                fontWeight: 500,
                color: item.danger ? '#f87171' : 'var(--text)',
                textAlign: 'left',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = item.danger ? '#f8717118' : 'var(--bg2)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {item.icon && (
                <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
              )}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Modal
// ─────────────────────────────────────────────────────────────────────────────
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 520,
}) {
  injectKeyframes();

  useEffect(() => {
    if (!open) return;
    const handler = e => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(0,0,0,0.52)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        animation: '_dash_backdropIn 0.2s ease both',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: width,
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)',
          border: '1px solid var(--border-med)',
          borderRadius: 16,
          boxShadow: '0 24px 64px rgba(0,0,0,0.28), 0 4px 16px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.07)',
          animation: '_dash_slideUp 0.25s cubic-bezier(.22,1,.36,1) both',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexShrink: 0,
          gap: 16,
        }}>
          <div>
            {title && (
              <h2 style={{
                margin: 0,
                fontFamily: FONT_DISPLAY,
                fontSize: 17,
                fontWeight: 700,
                color: 'var(--text)',
                letterSpacing: '-0.02em',
                lineHeight: 1.3,
              }}>
                {title}
              </h2>
            )}
            {subtitle && (
              <p style={{
                margin: '4px 0 0',
                fontFamily: FONT_BODY,
                fontSize: 13,
                color: 'var(--muted)',
                lineHeight: 1.4,
              }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              border: '1px solid var(--border)',
              background: 'var(--bg2)',
              color: 'var(--muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              flexShrink: 0,
              transition: 'background 0.15s ease, color 0.15s ease',
              fontFamily: FONT_BODY,
              padding: 0,
              lineHeight: 1,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--bg3)';
              e.currentTarget.style.color = 'var(--text)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--bg2)';
              e.currentTarget.style.color = 'var(--muted)';
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{
          padding: '20px 24px',
          overflowY: 'auto',
          flex: 1,
        }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 8,
            flexShrink: 0,
            background: 'var(--bg2)',
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. EmptyState
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// ErrorBanner — inline error banner with optional retry
// ─────────────────────────────────────────────────────────────────────────────
export function ErrorBanner({ message = 'Error al cargar los datos.', onRetry, style }) {
  const [hov, setHov] = useState(false);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 18px', borderRadius: 12,
      background: 'rgba(239,68,68,0.08)',
      border: '1px solid rgba(239,68,68,0.18)',
      fontFamily: FONT_BODY, fontSize: 14, color: ERR,
      animation: '_dash_fadeUp 0.3s cubic-bezier(.22,1,.36,1) both',
      ...style,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
      <span style={{ flex: 1, color: 'var(--text)', fontWeight: 500 }}>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            background: hov ? ERR : 'transparent',
            color: hov ? '#fff' : ERR,
            border: `1px solid ${ERR}`,
            borderRadius: 8, padding: '6px 14px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: FONT_BODY, flexShrink: 0,
            transition: 'all 150ms ease',
          }}
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon = '📭',
  title = 'Sin resultados',
  desc,
  action,
  actionLabel = 'Comenzar',
}) {
  injectKeyframes();
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      gap: 12,
      animation: '_dash_fadeUp 0.35s cubic-bezier(.22,1,.36,1) both',
    }}>
      <span style={{
        fontSize: 44,
        lineHeight: 1,
        filter: 'grayscale(0.2)',
        userSelect: 'none',
      }}>
        {icon}
      </span>

      <h3 style={{
        margin: 0,
        fontFamily: FONT_DISPLAY,
        fontSize: 16,
        fontWeight: 700,
        color: 'var(--text)',
        letterSpacing: '-0.02em',
        textAlign: 'center',
      }}>
        {title}
      </h3>

      {desc && (
        <p style={{
          margin: 0,
          fontFamily: FONT_BODY,
          fontSize: 13,
          color: 'var(--muted)',
          textAlign: 'center',
          maxWidth: 320,
          lineHeight: 1.5,
        }}>
          {desc}
        </p>
      )}

      {action && (
        <button
          onClick={action}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            marginTop: 4,
            padding: '8px 20px',
            borderRadius: 10,
            border: 'none',
            background: hovered ? '#7c3aed' : A,
            color: '#fff',
            cursor: 'pointer',
            fontFamily: FONT_BODY,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.01em',
            boxShadow: hovered
              ? `0 6px 20px ${A}50`
              : `0 2px 8px ${A}30`,
            transition: 'background 0.18s ease, box-shadow 0.18s ease',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Ring — mini donut ring for KPI cards
// ─────────────────────────────────────────────────────────────────────────────
export function Ring({ pct, color, size = 48 }) {
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth="4.5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4.5"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray .6s cubic-bezier(.4,0,.2,1)' }} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. KpiCard — unified KPI card used across all dashboards
// ─────────────────────────────────────────────────────────────────────────────
export function KpiCard({ icon: Icon, label, value, change, changeLabel, sparkData, accent = A, ring, sub, subColor }) {
  const [hovered, setHovered] = useState(false);
  const isPositive = change > 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const trendColor = isPositive ? OK : ERR;
  const accentAlpha = (o) => {
    // parse hex to rgba
    const hex = accent || A;
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${o})`;
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${hovered ? accentAlpha(0.35) : 'var(--border)'}`,
        borderRadius: '16px',
        padding: '22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        transition: 'border-color .2s, box-shadow .2s, transform .2s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? `0 8px 32px ${accentAlpha(0.1)}` : '0 1px 4px rgba(0,0,0,0.06)',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '16px',
        background: hovered ? accentAlpha(0.03) : 'transparent',
        transition: 'background .2s', pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', zIndex: 1 }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '11px',
          background: `${accent}15`,
          border: `1px solid ${accent}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={accent} strokeWidth={2} />
        </div>
        {ring !== undefined && <Ring pct={ring} color={accent} size={44} />}
        {sparkData && !ring && <Sparkline data={sparkData} color={accent} />}
      </div>

      <div style={{ zIndex: 1 }}>
        <div style={{
          fontSize: '28px', fontWeight: 800, fontFamily: FONT_DISPLAY, color: 'var(--text)',
          letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '4px',
        }}>
          {value}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: (change !== undefined || sub) ? '8px' : 0 }}>{label}</div>

        {change !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '3px',
              background: `${trendColor}12`, border: `1px solid ${trendColor}25`,
              borderRadius: '20px', padding: '2px 8px',
            }}>
              <TrendIcon size={11} color={trendColor} strokeWidth={2.5} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: trendColor }}>
                {isPositive ? '+' : ''}{change}%
              </span>
            </div>
            {changeLabel && <span style={{ fontSize: '11px', color: 'var(--muted2)' }}>{changeLabel}</span>}
          </div>
        )}

        {sub && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: `${subColor || OK}12`, borderRadius: '20px', padding: '2px 8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: subColor || OK }}>{sub}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. StatusBadge — campaign status badge
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_STATUS_CFG = {
  DRAFT:     { color: '#64748b', bg: 'rgba(100,116,139,0.1)', label: 'Borrador' },
  PAID:      { color: BLUE,      bg: `${BLUE}14`,             label: 'Pagada' },
  PUBLISHED: { color: OK,        bg: `${OK}14`,               label: 'Publicada' },
  COMPLETED: { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', label: 'Completada' },
  CANCELLED: { color: ERR,       bg: `${ERR}14`,              label: 'Cancelada' },
  // lowercase variants
  pendiente: { color: WARN,      bg: `${WARN}14`,             label: 'Pendiente' },
  activo:    { color: OK,        bg: `${OK}14`,               label: 'Activo' },
  pausado:   { color: '#64748b', bg: 'rgba(100,116,139,0.1)', label: 'Pausado' },
  cancelado: { color: ERR,       bg: `${ERR}14`,              label: 'Cancelado' },
};

export function StatusBadge({ status, config }) {
  const cfg = (config || DEFAULT_STATUS_CFG)[status] || DEFAULT_STATUS_CFG.DRAFT;
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      borderRadius: '8px', padding: '4px 10px',
      fontSize: '11px', fontWeight: 600, letterSpacing: '0.01em',
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      fontFamily: FONT_BODY, whiteSpace: 'nowrap',
    }}>
      {cfg.icon && <cfg.icon size={12} strokeWidth={2.5} />}
      {cfg.label || status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. Tooltip
// ─────────────────────────────────────────────────────────────────────────────
export function Tooltip({ text, children }) {
  injectKeyframes();
  const [visible, setVisible] = useState(false);

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}

      {visible && (
        <span style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 500,
          background: 'rgba(15,15,18,0.95)',
          color: '#f1f1f3',
          borderRadius: 7,
          padding: '5px 10px',
          fontFamily: FONT_BODY,
          fontSize: 11,
          fontWeight: 500,
          whiteSpace: 'nowrap',
          letterSpacing: '0.01em',
          boxShadow: '0 4px 16px rgba(0,0,0,0.28)',
          pointerEvents: 'none',
          animation: '_dash_tooltipIn 0.15s cubic-bezier(.22,1,.36,1) both',
        }}>
          {text}
          {/* Arrow */}
          <span style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid rgba(15,15,18,0.95)',
          }} />
        </span>
      )}
    </span>
  );
}
