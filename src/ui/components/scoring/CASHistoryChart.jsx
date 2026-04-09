import React from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Clock } from 'lucide-react'
import { C } from '../../theme/tokens'

function fmtDate(d) {
  if (!d) return ''
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return String(d)
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: C.surfaceEl,
        border: `1px solid ${C.borderEl}`,
        borderRadius: 8,
        padding: 12,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 12,
      }}
    >
      <div style={{ color: C.t2, marginBottom: 6 }}>{fmtDate(label)}</div>
      {payload.map((p) => (
        <div
          key={p.dataKey}
          className="flex items-center justify-between"
          style={{ gap: 12, color: p.color }}
        >
          <span>{p.dataKey}</span>
          <span style={{ fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function CASHistoryChart({ data = [], height = 200 }) {
  if (!Array.isArray(data) || data.length < 2) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{
          height,
          color: C.t3,
          gap: 8,
        }}
      >
        <Clock size={22} />
        <span style={{ fontSize: 12 }}>Historial disponible desde mañana</span>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
        <XAxis
          dataKey="fecha"
          tickFormatter={fmtDate}
          stroke={C.t3}
          tick={{ fontSize: 11, fill: C.t3 }}
          tickLine={false}
          axisLine={{ stroke: C.border }}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          stroke={C.t3}
          tick={{ fontSize: 11, fill: C.t3 }}
          tickLine={false}
          axisLine={{ stroke: C.border }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: C.borderEl }} />
        <Legend
          iconType="line"
          wrapperStyle={{ fontSize: 12, color: C.t2 }}
        />
        <Line
          type="monotone"
          dataKey="CAS"
          stroke={C.teal}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, fill: C.teal }}
        />
        <Line
          type="monotone"
          dataKey="CTF"
          stroke={C.adv}
          strokeWidth={2}
          strokeDasharray="4 2"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="CAP"
          stroke={C.cre}
          strokeWidth={2}
          strokeDasharray="2 2"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
