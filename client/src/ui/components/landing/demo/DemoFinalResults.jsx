import React from 'react'
import { CheckCircle2, Download, FileText, Sparkles } from 'lucide-react'

/**
 * Step 4 ("Resultados reales") demo — final report card showing verified
 * metrics and escrow auto-release confirmation.
 */
export default function DemoFinalResults() {
  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 18,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Q4_Test · Completada
          </h3>
          <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0, marginTop: 2 }}>
            Reporte final · 2 días de campaña · Datos auditables
          </p>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(34, 197, 94, 0.14)',
            color: '#16a34a',
            padding: '6px 12px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            border: '1px solid rgba(34, 197, 94, 0.18)',
          }}
        >
          <CheckCircle2 size={12} strokeWidth={2.4} />
          Verificada
        </span>
      </div>

      {/* 4 verified stats — the report card */}
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}
        className="final-results-grid"
      >
        <ResultStat
          label="Clicks únicos"
          value="1.247"
          delta="+18% vs benchmark"
          deltaColor="#16a34a"
          accent="#7C3AED"
        />
        <ResultStat
          label="CPC efectivo"
          value="1,00 €"
          delta="vs 9,84€ Meta Ads"
          deltaColor="#16a34a"
          accent="#7C3AED"
        />
        <ResultStat
          label="Alcance verificado"
          value="24.891"
          delta="impresiones únicas"
          deltaColor="var(--muted)"
          accent="#7C3AED"
        />
        <ResultStat
          label="ROAS"
          value="4.2x"
          delta="objetivo 3.0x · superado"
          deltaColor="#16a34a"
          accent="#7C3AED"
        />
      </div>

      {/* Escrow released — focal trust outcome */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(34,197,94,0.12) 100%)',
          border: '1px solid rgba(34, 197, 94, 0.22)',
          borderRadius: 12,
          padding: 14,
          marginBottom: 14,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: '#16a34a',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Sparkles size={15} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
            Escrow liberado · 1.247,00 € transferidos al canal
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            Liberación automática tras verificar entrega y métricas mínimas
          </div>
        </div>
      </div>

      {/* Report actions */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          paddingTop: 12,
          borderTop: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}
      >
        <ReportChip icon={Download} label="Exportar CSV" />
        <ReportChip icon={FileText} label="Reporte PDF" />
        <ReportChip icon={CheckCircle2} label="Datos auditables" tone="success" />
      </div>

      <style>{`
        @media (max-width: 640px) {
          .final-results-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function ResultStat({ label, value, delta, deltaColor, accent }) {
  return (
    <div
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 14,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 3,
          height: '100%',
          background: accent,
          opacity: 0.6,
        }}
      />
      <p
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--muted)',
          fontWeight: 600,
          margin: 0,
          marginBottom: 6,
        }}
      >
        {label}
      </p>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: 'var(--text)',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          fontFamily: "'Sora', system-ui, sans-serif",
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: deltaColor, marginTop: 6, fontWeight: 500 }}>{delta}</div>
    </div>
  )
}

function ReportChip({ icon: Icon, label, tone = 'default' }) {
  const isSuccess = tone === 'success'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 12px',
        borderRadius: 8,
        background: isSuccess ? 'rgba(34, 197, 94, 0.10)' : 'var(--bg2)',
        border: `1px solid ${isSuccess ? 'rgba(34, 197, 94, 0.20)' : 'var(--border)'}`,
        fontSize: 11,
        fontWeight: 500,
        color: isSuccess ? '#16a34a' : 'var(--text)',
      }}
    >
      <Icon size={12} strokeWidth={2.2} />
      {label}
    </span>
  )
}
