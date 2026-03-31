import React, { useEffect, useState, useCallback } from 'react'
import apiService from '../../../../services/api'
import { ErrorBanner } from './shared/DashComponents'

const statusLabels = {
  open: 'Abierta',
  under_review: 'En revisión',
  resolved_advertiser: 'Resuelta (Anunciante)',
  resolved_creator: 'Resuelta (Creador)',
  closed: 'Cerrada'
}

const reasonLabels = {
  not_published: 'No publicado',
  wrong_content: 'Contenido incorrecto',
  late_delivery: 'Entrega tardía',
  fraud: 'Fraude',
  other: 'Otro'
}

const statusColors = {
  open: 'bg-yellow-100 text-yellow-800',
  under_review: 'bg-blue-100 text-blue-800',
  resolved_advertiser: 'bg-green-100 text-green-800',
  resolved_creator: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800'
}

export default function DisputesPage() {
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [selectedDispute, setSelectedDispute] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ campaignId: '', reason: 'not_published', description: '' })
  const [sending, setSending] = useState(false)

  const loadDisputes = useCallback(async () => {
    setLoading(true)
    try {
      const result = await apiService.getMyDisputes()
      if (result?.success) {
        setDisputes(result.data?.items || [])
      }
    } catch (err) {
      console.error('Error loading disputes:', err)
      setFetchError('No se pudieron cargar los datos. Verifica tu conexion.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDisputes() }, [loadDisputes])

  const loadDisputeDetail = async (id) => {
    try {
      const result = await apiService.getDispute(id)
      if (result?.success) setSelectedDispute(result.data)
    } catch (err) {
      console.error('Error loading dispute:', err)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedDispute) return
    setSending(true)
    try {
      const result = await apiService.addDisputeMessage(selectedDispute._id, newMessage.trim())
      if (result?.success) {
        setSelectedDispute(result.data)
        setNewMessage('')
      }
    } catch (err) {
      console.error('Error sending message:', err)
    } finally {
      setSending(false)
    }
  }

  const handleCreateDispute = async (e) => {
    e.preventDefault()
    if (!createForm.campaignId || !createForm.description) return
    setSending(true)
    try {
      const result = await apiService.createDispute(createForm)
      if (result?.success) {
        setShowCreateModal(false)
        setCreateForm({ campaignId: '', reason: 'not_published', description: '' })
        loadDisputes()
      }
    } catch (err) {
      console.error('Error creating dispute:', err)
    } finally {
      setSending(false)
    }
  }

  if (selectedDispute) {
    const d = selectedDispute
    const isClosed = ['resolved_advertiser', 'resolved_creator', 'closed'].includes(d.status)
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button onClick={() => setSelectedDispute(null)} className="text-indigo-600 hover:text-indigo-800 mb-4 flex items-center gap-1">
          &larr; Volver a disputas
        </button>
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold">Disputa #{d._id?.slice(-6)}</h2>
              <p className="text-gray-500 text-sm mt-1">
                Abierta por {d.openedBy?.nombre || 'Usuario'} &middot; {new Date(d.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[d.status] || 'bg-gray-100'}`}>
              {statusLabels[d.status] || d.status}
            </span>
          </div>
          <div className="mb-4">
            <span className="text-sm text-gray-500">Razón:</span>{' '}
            <span className="font-medium">{reasonLabels[d.reason] || d.reason}</span>
          </div>
          {d.resolution && (
            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <span className="text-sm font-medium text-green-800">Resolución:</span>
              <p className="text-green-700 mt-1">{d.resolution}</p>
            </div>
          )}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Mensajes</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
              {(d.messages || []).map((m, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span className="font-medium">{m.sender?.nombre || 'Usuario'}</span>
                    <span>{new Date(m.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-gray-800">{m.text}</p>
                </div>
              ))}
            </div>
            {!isClosed && (
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  Enviar
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Disputas</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          Abrir disputa
        </button>
      </div>

      {fetchError && (
        <ErrorBanner
          message={fetchError}
          onRetry={() => { setFetchError(null); loadDisputes() }}
        />
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando disputas...</div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-5xl mb-4">&#9878;</div>
          <h3 className="text-lg font-medium text-gray-700">Sin disputas</h3>
          <p className="text-gray-500 mt-1">No tienes disputas activas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => (
            <div
              key={d._id}
              onClick={() => loadDisputeDetail(d._id)}
              className="bg-white rounded-xl shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">Disputa #{d._id?.slice(-6)}</h3>
                  <p className="text-sm text-gray-500 mt-1">{reasonLabels[d.reason] || d.reason}</p>
                  <p className="text-sm text-gray-400">{new Date(d.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[d.status] || 'bg-gray-100'}`}>
                  {statusLabels[d.status] || d.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create dispute modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Abrir nueva disputa</h2>
            <form onSubmit={handleCreateDispute} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID de Campaña</label>
                <input
                  type="text"
                  value={createForm.campaignId}
                  onChange={(e) => setCreateForm(f => ({ ...f, campaignId: e.target.value }))}
                  placeholder="ID de la campaña"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Razón</label>
                <select
                  value={createForm.reason}
                  onChange={(e) => setCreateForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {Object.entries(reasonLabels).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe el problema..."
                  rows={4}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  required
                  maxLength={2000}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {sending ? 'Enviando...' : 'Crear disputa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
