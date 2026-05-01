import React, { useState, useRef, useEffect } from 'react'
import {
  Plus, Star, Copy, Pencil, Trash2, MoreHorizontal, Check,
  Download, Upload, Layout,
} from 'lucide-react'
import { FONT_BODY, FONT_DISPLAY } from '../../../../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const pa = (o) => `rgba(139,92,246,${o})`

function ViewMenu({ view, onRename, onDuplicate, onDelete, onSetDefault, onExport, canDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        style={{
          width: 22, height: 22, borderRadius: 6, border: 'none',
          background: 'transparent', cursor: 'pointer', color: 'var(--muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg2)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 28, right: 0, zIndex: 30,
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 4, minWidth: 180,
          boxShadow: '0 8px 28px rgba(0,0,0,0.3)',
        }}>
          <MenuItem icon={Pencil} label="Renombrar" onClick={() => { setOpen(false); onRename() }} />
          <MenuItem icon={Copy} label="Duplicar" onClick={() => { setOpen(false); onDuplicate() }} />
          <MenuItem icon={Star} label={view.isDefault ? 'Vista por defecto' : 'Marcar como predeterminada'} onClick={() => { setOpen(false); onSetDefault() }} disabled={view.isDefault} />
          <MenuItem icon={Download} label="Exportar template" onClick={() => { setOpen(false); onExport() }} />
          {canDelete && (
            <>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <MenuItem icon={Trash2} label="Eliminar vista" onClick={() => { setOpen(false); onDelete() }} danger />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon: Icon, label, onClick, danger, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        width: '100%', textAlign: 'left',
        padding: '8px 10px', borderRadius: 6, border: 'none',
        background: 'transparent',
        color: disabled ? 'var(--muted2)' : danger ? '#ef4444' : 'var(--text)',
        fontSize: 12.5, fontWeight: 500, fontFamily: FONT_BODY,
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', gap: 8,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.1)' : 'var(--bg2)' }}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <Icon size={13} />
      {label}
    </button>
  )
}

function InlineRename({ value, onSubmit, onCancel }) {
  const [v, setV] = useState(value)
  const inputRef = useRef(null)
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select() }, [])
  return (
    <input
      ref={inputRef}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSubmit(v)
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={() => onSubmit(v)}
      maxLength={60}
      style={{
        background: 'var(--bg)', border: `1.5px solid ${PURPLE}`, borderRadius: 8,
        padding: '4px 10px', fontSize: 13, fontWeight: 600, color: 'var(--text)',
        outline: 'none', fontFamily: FONT_BODY, width: 140,
      }}
    />
  )
}

export default function ViewTabs({
  views, activeViewId, onSelect,
  onRename, onDelete, onDuplicate, onSetDefault, onExport,
  onCreate, onImport, syncing, syncError,
}) {
  const [renamingId, setRenamingId] = useState(null)

  if (!views || views.length === 0) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      borderBottom: '1px solid var(--border)', paddingBottom: 0,
      marginBottom: 16, overflowX: 'auto', flexWrap: 'wrap',
    }}>
      {views.map(v => {
        const active = v.id === activeViewId
        const isRenaming = renamingId === v.id
        return (
          <div key={v.id}
            onClick={() => !isRenaming && onSelect(v.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 12px',
              borderBottom: `2px solid ${active ? PURPLE : 'transparent'}`,
              background: active ? pa(0.06) : 'transparent',
              cursor: 'pointer',
              transition: 'background .15s, border-color .15s',
              borderRadius: '6px 6px 0 0',
              marginBottom: -1,
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg2)' }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
          >
            {v.isDefault && <Star size={11} fill={PURPLE} color={PURPLE} style={{ marginTop: 1 }} />}
            {isRenaming ? (
              <InlineRename
                value={v.name}
                onSubmit={(newName) => { onRename(v.id, newName); setRenamingId(null) }}
                onCancel={() => setRenamingId(null)}
              />
            ) : (
              <span style={{
                fontSize: 13, fontWeight: active ? 700 : 500,
                color: active ? 'var(--text)' : 'var(--muted)',
                fontFamily: FONT_BODY, whiteSpace: 'nowrap',
              }}>
                {v.name}
              </span>
            )}
            <ViewMenu
              view={v}
              canDelete={views.length > 1}
              onRename={() => setRenamingId(v.id)}
              onDelete={() => {
                if (window.confirm(`¿Eliminar la vista "${v.name}"?`)) onDelete(v.id)
              }}
              onDuplicate={() => onDuplicate(v.id)}
              onSetDefault={() => onSetDefault(v.id)}
              onExport={() => onExport(v.id)}
            />
          </div>
        )
      })}

      <button onClick={onCreate}
        title="Nueva vista"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '8px 12px', background: 'transparent', border: 'none',
          color: PURPLE, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          fontFamily: FONT_BODY, borderRadius: 6, marginBottom: -1,
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = pa(0.08)}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <Plus size={14} strokeWidth={2.5} /> Nueva
      </button>

      <button onClick={onImport}
        title="Importar template"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '8px 10px', background: 'transparent', border: 'none',
          color: 'var(--muted)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
          fontFamily: FONT_BODY, borderRadius: 6, marginBottom: -1,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg2)'; e.currentTarget.style.color = 'var(--text)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' }}
      >
        <Upload size={13} /> Importar
      </button>

      <div style={{ flex: 1 }} />

      {/* Sync indicator */}
      {syncing && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 11, color: 'var(--muted)', padding: '4px 10px',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: 4, background: PURPLE,
            animation: 'pulseDot 1s ease infinite',
          }} />
          <style>{`@keyframes pulseDot { 0%,100%{ opacity:0.4 } 50%{ opacity:1 } }`}</style>
          Guardando...
        </span>
      )}
      {!syncing && syncError && (
        <span style={{ fontSize: 11, color: '#ef4444', padding: '4px 10px' }} title={syncError}>
          ⚠ Error de sincronización
        </span>
      )}
      {!syncing && !syncError && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11, color: 'var(--muted2)', padding: '4px 10px',
        }}>
          <Check size={11} /> Sincronizado
        </span>
      )}
    </div>
  )
}
