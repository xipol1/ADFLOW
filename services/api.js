/**
 * Servicio de API para la plataforma de monetización
 * Centraliza todas las llamadas al backend
 */

const normalizeBase = (value) => {
  if (!value) return '';
  return String(value).trim().replace(/\/+$/, '');
};

const readEnv = () => {
  const fromVite = typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL
    : '';
  const fromDefine = typeof process !== 'undefined' && process.env ? process.env.NEXT_PUBLIC_API_URL : '';
  return normalizeBase(fromVite || fromDefine);
};

export const CONFIGURED_API_URL = readEnv();
export const CONFIGURED_API_BASE_URL = CONFIGURED_API_URL
  ? (CONFIGURED_API_URL.endsWith('/api') ? CONFIGURED_API_URL : `${CONFIGURED_API_URL}/api`)
  : '/api';
export const CONFIGURED_API_ORIGIN = CONFIGURED_API_URL
  ? CONFIGURED_API_URL.replace(/\/api$/, '')
  : '';

class ApiService {
  constructor() {
    this.baseURL = CONFIGURED_API_BASE_URL;
  }

  /**
   * Obtener el token de autenticación
   */
  getAuthToken() {
    return localStorage.getItem('token');
  }

  /**
   * Configurar headers por defecto
   */
  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Realizar petición HTTP
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(options.auth !== false),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const contentType = response.headers?.get?.('content-type') || '';
      const text = await response.text();
      const hasBody = text != null && text !== '';

      let parsed = null;
      if (hasBody) {
        if (contentType.includes('application/json')) {
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = null;
          }
        } else {
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = null;
          }
        }
      }

      if (response.ok) {
        if (parsed != null) return parsed;
        return { success: true };
      }

      // Auto-refresh on 401 (token expired) — one attempt only
      if (response.status === 401 && !options._retried) {
        const newTokens = await this._tryRefreshToken();
        if (newTokens) {
          return this.request(endpoint, { ...options, _retried: true });
        }
      }

      // Pass status through so AuthContext can handle auth rejection gracefully

      if (parsed && typeof parsed === 'object') return { ...parsed, status: response.status };
      return { success: false, message: hasBody ? text : 'Error del servidor', status: response.status };
    } catch (error) {
      return { success: false, message: 'No se pudo conectar con el servidor', error: error?.message };
    }
  }

  /**
   * Attempt to refresh the access token using the stored refresh token.
   * Stores the new rotated tokens in localStorage.
   */
  async _tryRefreshToken() {
    try {
      const rt = localStorage.getItem('refreshToken');
      if (!rt) return null;

      const res = await fetch(`${this.baseURL}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
      const data = await res.json();

      if (data?.success && data.token) {
        localStorage.setItem('token', data.token);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        return data;
      }
      return null;
    } catch {
      return null;
    }
  }

  // ==========================================
  // MÉTODOS DE AUTENTICACIÓN
  // ==========================================

  /**
   * Iniciar sesión
   */
  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      auth: false,
    });
  }

  /**
   * Registrar usuario
   */
  async register(userData) {
    return this.request('/auth/registro', {
      method: 'POST',
      body: JSON.stringify(userData),
      auth: false,
    });
  }

  /**
   * Verificar token
   */
  async verifyToken() {
    return this.request('/auth/verificar-token');
  }

  /**
   * Cerrar sesión
   */
  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  /**
   * Solicitar restablecimiento de contraseña
   */
  async requestPasswordReset(email) {
    return this.request('/auth/solicitar-restablecimiento', {
      method: 'POST',
      body: JSON.stringify({ email }),
      auth: false,
    });
  }

  /**
   * Restablecer contraseña
   */
  async resetPassword(token, newPassword) {
    return this.request(`/auth/restablecer-password/${token}`, {
      method: 'POST',
      body: JSON.stringify({ password: newPassword }),
      auth: false,
    });
  }

  async verifyEmail(token) {
    return this.request(`/auth/verificar-email/${token}`, { method: 'GET' });
  }

  async resendVerificationEmail(email) {
    return this.request('/auth/reenviar-verificacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  }

  async googleLogin(credential) {
    return this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
      auth: false,
    });
  }

  // ==========================================
  // MÉTODOS DE CANALES
  // ==========================================

  /**
   * Obtener mis canales
   */
  async getMyChannels(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/canales${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Obtener canal por ID
   */
  async getChannel(id) {
    return this.request(`/canales/${id}`);
  }

  /**
   * Public channel intelligence endpoint. No auth required.
   * Returns { canal, scores, historial, benchmark, campanias } or 404.
   */
  async getChannelIntelligence(id) {
    return this.request(`/channels/${id}/intelligence`, { auth: false });
  }

  async getChannelSnapshots(id, days = 30) {
    return this.request(`/channels/${id}/snapshots?days=${days}`, { auth: false });
  }

  async getChannelByUsername(username) {
    return this.request(`/channels/username/${encodeURIComponent(username)}`, { auth: false });
  }

  async initClaim(canalId) {
    return this.request(`/canales/${canalId}/claim/init`, { method: 'POST' });
  }

  async verifyClaim(canalId) {
    return this.request(`/canales/${canalId}/claim/verify`, { method: 'POST' });
  }

  async myClaimedChannels() {
    return this.request('/canales/claimed/mine');
  }

  async getChannelRankings(categoria = '', limit = 20) {
    const params = new URLSearchParams();
    if (categoria && categoria !== 'all') params.set('categoria', categoria);
    if (limit) params.set('limit', String(limit));
    const qs = params.toString();
    return this.request(`/channels/rankings${qs ? `?${qs}` : ''}`, { auth: false });
  }

  // ── Channel Candidates (admin) ─────────────────────────────────────────

  async getCandidates(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/channel-candidates/candidates${qs ? `?${qs}` : ''}`);
  }

  async approveCandidate(id) {
    return this.request(`/channel-candidates/candidates/${id}/approve`, { method: 'POST' });
  }

  async rejectCandidate(id, rejection_reason = '') {
    return this.request(`/channel-candidates/candidates/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason }),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Admin Dashboard ────────────────────────────────────────────────────

  async getAdminOverview() {
    return this.request('/admin/dashboard/overview');
  }
  async getAdminUsers(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/admin/dashboard/users${qs ? `?${qs}` : ''}`);
  }
  async getAdminUser(id) {
    return this.request(`/admin/dashboard/users/${id}`);
  }
  async updateAdminUser(id, data) {
    return this.request(`/admin/dashboard/users/${id}`, { method: 'PUT', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
  }
  async getAdminChannels(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/admin/dashboard/channels${qs ? `?${qs}` : ''}`);
  }
  async getAdminCampaigns(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/admin/dashboard/campaigns${qs ? `?${qs}` : ''}`);
  }
  async updateAdminCampaign(id, data) {
    return this.request(`/admin/dashboard/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
  }
  async getAdminDisputes(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/admin/dashboard/disputes${qs ? `?${qs}` : ''}`);
  }
  async resolveAdminDispute(id, data) {
    return this.request(`/admin/dashboard/disputes/${id}`, { method: 'PUT', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
  }
  async getAdminFinances(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/admin/dashboard/finances${qs ? `?${qs}` : ''}`);
  }
  async getAdminScoring() {
    return this.request('/admin/dashboard/scoring');
  }

  // ── Niche Intelligence (public, no auth) ──────────────────────────────
  async getNicheLeaderboard(nicho, limit = 10) {
    return this.request(`/niche/${encodeURIComponent(nicho)}/leaderboard?limit=${limit}`, { auth: false });
  }
  async getNicheTrends(nicho, days = 30) {
    return this.request(`/niche/${encodeURIComponent(nicho)}/trends?days=${days}`, { auth: false });
  }
  async getNicheSupplyDemand(nicho) {
    return this.request(`/niche/${encodeURIComponent(nicho)}/supply-demand`, { auth: false });
  }

  /**
   * Crear nuevo canal
   */
  async createChannel(channelData) {
    return this.request('/canales', {
      method: 'POST',
      body: JSON.stringify(channelData),
    });
  }

  /**
   * Actualizar canal
   */
  async updateChannel(id, channelData) {
    return this.request(`/canales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(channelData),
    });
  }

  /**
   * Actualizar perfil del canal (alias de updateChannel)
   */
  async updateChannelProfile(id, data) {
    return this.updateChannel(id, data);
  }

  /**
   * Eliminar canal
   */
  async deleteChannel(id) {
    return this.request(`/canales/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Verificar canal
   */
  async verifyChannel(id, verificationData) {
    return this.request(`/canales/${id}/verificar`, {
      method: 'POST',
      body: JSON.stringify(verificationData),
    });
  }

  // ==========================================
  // PLATFORM CONNECT / VERIFY / DISCONNECT
  // ==========================================

  /** Telegram — connect with bot token + chat ID */
  async connectTelegram(data) {
    return this.request('/oauth/telegram/connect', { method: 'POST', body: JSON.stringify(data) });
  }
  async verifyTelegram(id) {
    return this.request(`/oauth/telegram/verify/${id}`, { method: 'POST' });
  }
  async disconnectTelegram(id) {
    return this.request(`/oauth/telegram/disconnect/${id}`, { method: 'POST' });
  }

  /** Discord — connect with bot token + server ID */
  async connectDiscord(data) {
    return this.request('/oauth/discord/connect', { method: 'POST', body: JSON.stringify(data) });
  }
  async verifyDiscord(id) {
    return this.request(`/oauth/discord/verify/${id}`, { method: 'POST' });
  }
  async disconnectDiscord(id) {
    return this.request(`/oauth/discord/disconnect/${id}`, { method: 'POST' });
  }

  /** WhatsApp — manual Business API connection */
  async connectWhatsAppManual(data) {
    return this.request('/oauth/whatsapp/connect-manual', { method: 'POST', body: JSON.stringify(data) });
  }

  /** Newsletter — connect with API key + provider */
  async connectNewsletter(data) {
    return this.request('/oauth/newsletter/connect', { method: 'POST', body: JSON.stringify(data) });
  }
  async verifyNewsletter(id) {
    return this.request(`/oauth/newsletter/verify/${id}`, { method: 'POST' });
  }
  async disconnectNewsletter(id) {
    return this.request(`/oauth/newsletter/disconnect/${id}`, { method: 'POST' });
  }

  /** LinkedIn — OAuth flow */
  async getLinkedinAuthUrl() {
    return this.request('/oauth/linkedin/authorize');
  }
  async getLinkedinAccounts(session) {
    return this.request(`/oauth/linkedin/accounts?session=${encodeURIComponent(session)}`);
  }
  async connectLinkedin(data) {
    return this.request('/oauth/linkedin/connect', { method: 'POST', body: JSON.stringify(data) });
  }
  async disconnectLinkedin(id) {
    return this.request(`/oauth/linkedin/disconnect/${id}`, { method: 'POST' });
  }
  async refreshLinkedinToken(id) {
    return this.request(`/oauth/linkedin/refresh/${id}`, { method: 'POST' });
  }

  // ==========================================
  // PAYOUTS (Stripe Connect)
  // ==========================================

  async payoutOnboard() {
    return this.request('/payouts/onboard', { method: 'POST' });
  }
  async payoutStatus() {
    return this.request('/payouts/status');
  }
  async payoutDashboardLink() {
    return this.request('/payouts/dashboard-link');
  }
  async payoutWithdraw(amount) {
    return this.request('/payouts/withdraw', { method: 'POST', body: JSON.stringify({ amount }) });
  }
  async payoutHistory() {
    return this.request('/payouts/history');
  }

  // ==========================================
  // 2FA
  // ==========================================

  async setup2FA() {
    return this.request('/auth/2fa/setup', { method: 'POST' });
  }
  async verify2FA(code) {
    return this.request('/auth/2fa/verify', { method: 'POST', body: JSON.stringify({ code }) });
  }
  async validate2FA(email, code) {
    return this.request('/auth/2fa/validate', { method: 'POST', body: JSON.stringify({ email, code }) });
  }
  async disable2FA(password) {
    return this.request('/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ password }) });
  }

  // ==========================================
  // INVOICES
  // ==========================================

  async downloadInvoice(transactionId) {
    const url = `${this.baseURL}/invoices/${transactionId}`;
    const token = this.getAuthToken();
    window.open(`${url}?token=${encodeURIComponent(token)}`, '_blank');
  }

  // ==========================================
  // DISPUTES (enhanced)
  // ==========================================

  async escalateDispute(disputeId) {
    return this.request(`/disputes/${disputeId}/escalate`, { method: 'POST' });
  }

  /**
   * Buscar canales públicos
   */
  async searchChannels(params = {}) {
    const normalized = { ...params };
    if (normalized.limite == null && normalized.limit != null) normalized.limite = normalized.limit;
    if (normalized.pagina == null && normalized.page != null) normalized.pagina = normalized.page;
    if (normalized.verificado == null && normalized.verified != null) {
      normalized.verificado = normalized.verified === true || normalized.verified === 'true' ? 'true' : 'false';
    }
    if (normalized.plataforma == null && normalized.platform != null) normalized.plataforma = normalized.platform;
    if (normalized.categoria == null && normalized.category != null) normalized.categoria = normalized.category;
    if (normalized.ordenPor == null && normalized.sort != null) normalized.ordenPor = normalized.sort;
    delete normalized.limit;
    delete normalized.page;
    delete normalized.verified;
    delete normalized.platform;
    delete normalized.category;
    delete normalized.sort;

    const queryString = new URLSearchParams(normalized).toString();
    return this.request(`/channels${queryString ? `?${queryString}` : ''}`, { auth: false });
  }

  // ==========================================
  // MÉTODOS DE ANUNCIOS
  // ==========================================

  /**
   * Obtener mis anuncios
   */
  async getMyAds(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/anuncios${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Obtener anuncios para creador
   */
  async getAdsForCreator(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/anuncios/creador${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Obtener anuncio por ID
   */
  async getAd(id) {
    return this.request(`/anuncios/${id}`);
  }

  /**
   * Crear nuevo anuncio
   */
  async createAd(adData) {
    return this.request('/anuncios', {
      method: 'POST',
      body: JSON.stringify(adData),
    });
  }

  /**
   * Actualizar anuncio
   */
  async updateAd(id, adData) {
    return this.request(`/anuncios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(adData),
    });
  }

  /**
   * Eliminar anuncio
   */
  async deleteAd(id) {
    return this.request(`/anuncios/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Enviar anuncio para aprobación
   */
  async submitAdForApproval(id) {
    return this.request(`/anuncios/${id}/enviar-aprobacion`, {
      method: 'POST',
    });
  }

  /**
   * Responder a solicitud de aprobación
   */
  async respondToAdApproval(id, response) {
    return this.request(`/anuncios/${id}/responder-aprobacion`, {
      method: 'POST',
      body: JSON.stringify(response),
    });
  }

  /**
   * Activar anuncio
   */
  async activateAd(id) {
    return this.request(`/anuncios/${id}/activar`, {
      method: 'POST',
    });
  }

  /**
   * Completar anuncio
   */
  async completeAd(id, completionData) {
    return this.request(`/anuncios/${id}/completar`, {
      method: 'POST',
      body: JSON.stringify(completionData),
    });
  }

  /**
   * Obtener estadísticas de anuncios
   */
  async getAdStatistics(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/anuncios/estadisticas${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Optimizar campaña (Auto-buy)
   */
  async optimizeCampaign(data) {
    return this.request('/campaigns/optimize', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Lanzar campaña automática (Launch-auto)
   */
  async launchAutoCampaign(data) {
    return this.request('/campaigns/launch-auto', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==========================================
  // MÉTODOS DE LISTAS DE CANALES
  // ==========================================

  /**
   * Obtener mis listas de canales
   */
  async getMyLists() {
    return this.request('/lists');
  }

  /**
   * Crear nueva lista de canales
   */
  async createList(data) {
    return this.request('/lists', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Agregar canal a lista
   */
  async addChannelToList(listId, channelId) {
    return this.request(`/lists/${listId}/add-channel`, {
      method: 'POST',
      body: JSON.stringify({ channelId }),
    });
  }

  /**
   * Eliminar canal de lista
   */
  async removeChannelFromList(listId, channelId) {
    return this.request(`/lists/${listId}/remove-channel/${channelId}`, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // MÉTODOS DE TRANSACCIONES
  // ==========================================

  /**
   * Obtener mis transacciones
   */
  async getMyTransactions(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/transacciones${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Obtener transacción por ID
   */
  async getTransaction(id) {
    return this.request(`/transacciones/${id}`);
  }

  /**
   * Crear nueva transacción
   */
  async createTransaction(transactionData) {
    return this.request('/transacciones', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
  }

  /**
   * Procesar pago
   */
  async processPayment(paymentData) {
    return this.request('/transacciones/pagar', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  /**
   * Solicitar retiro
   */
  async requestWithdrawal(withdrawalData) {
    return this.request('/transacciones/retiro', {
      method: 'POST',
      body: JSON.stringify(withdrawalData),
    });
  }

  async getMyRetiros() {
    return this.request('/transacciones/retiros');
  }

  // ==========================================
  // MÉTODOS DE ESTADÍSTICAS
  // ==========================================

  /**
   * Obtener estadísticas generales
   */
  async getGeneralStats() {
    return this.request('/estadisticas/generales');
  }

  /**
   * Obtener estadísticas del dashboard
   */
  async getDashboardStats() {
    return this.request('/estadisticas/dashboard');
  }

  /**
   * Obtener estadísticas de un canal
   */
  async getChannelStats(id) {
    return this.request(`/estadisticas/canales/${id}`);
  }

  /**
   * Obtener estadísticas de un anuncio
   */
  async getAdStats(id) {
    return this.request(`/estadisticas/anuncios/${id}`);
  }

  // ==========================================
  // MÉTODOS DE NOTIFICACIONES
  // ==========================================

  /**
   * Obtener mis notificaciones
   */
  async getMyNotifications(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/notifications${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Marcar notificación como leída
   */
  async markNotificationAsRead(id) {
    return this.request(`/notifications/${id}/leer`, {
      method: 'PUT',
    });
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  async markAllNotificationsAsRead() {
    return this.request('/notifications/leer-todas', {
      method: 'PUT',
    });
  }

  /**
   * Eliminar notificación
   */
  async deleteNotification(id) {
    return this.request(`/notifications/${id}`, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // MÉTODOS DE ARCHIVOS
  // ==========================================

  /**
   * Subir archivo
   */
  async uploadFile(file, type = 'general') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return this.request('/files/upload', {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${this.getAuthToken()}`,
        // No incluir Content-Type para FormData
      },
    });
  }

  /**
   * Obtener archivo
   */
  async getFile(id) {
    return this.request(`/files/${id}`);
  }

  /**
   * Eliminar archivo
   */
  async deleteFile(id) {
    return this.request(`/files/${id}`, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // MÉTODOS DE CAMPAÑAS
  // ==========================================

  /**
   * Obtener campañas del usuario autenticado
   */
  async getMyCampaigns() {
    return this.request('/campaigns');
  }

  /**
   * Obtener campañas donde el usuario es creador (tiene el canal)
   */
  async getCreatorCampaigns() {
    return this.request('/campaigns?role=creator');
  }

  /**
   * Crear campaña
   */
  async createCampaign(payload) {
    return this.request('/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Crear campaña con archivo multimedia (FormData)
   */
  async createCampaignWithMedia(formData) {
    return this.request('/campaigns', {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${this.getAuthToken()}`,
        // No Content-Type — browser sets multipart boundary automatically
      },
    });
  }

  /**
   * Crear Stripe Checkout Session para recarga de saldo
   */
  async createCheckoutSession(amount) {
    return this.request('/transacciones/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  /**
   * Crear Stripe PaymentIntent para pago de campaña
   */
  async createPaymentIntent(transaccionId) {
    return this.request('/transacciones/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ transaccionId }),
    });
  }

  async getTransacciones(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request(`/transacciones${q ? '?' + q : ''}`);
  }

  async getNotifications(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request(`/notifications${q ? '?' + q : ''}`);
  }

  async markNotificationRead(id) {
    return this.request(`/notifications/${id}/leer`, { method: 'PUT' });
  }

  async markAllNotificationsRead() {
    return this.request('/notifications/leer-todas', { method: 'PUT' });
  }

  // ==========================================
  // MÉTODOS DE DISPUTAS
  // ==========================================

  async getMyDisputes() {
    return this.request('/disputes');
  }

  async getDispute(id) {
    return this.request(`/disputes/${id}`);
  }

  async createDispute(data) {
    return this.request('/disputes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addDisputeMessage(disputeId, text) {
    return this.request(`/disputes/${disputeId}/message`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async resolveDispute(disputeId, data) {
    return this.request(`/disputes/${disputeId}/resolve`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==========================================
  // MÉTODOS DE AUTOBUY
  // ==========================================

  async getAutoRules() {
    return this.request('/autobuy');
  }

  async createAutoRule(data) {
    return this.request('/autobuy', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAutoRule(id, data) {
    return this.request(`/autobuy/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAutoRule(id) {
    return this.request(`/autobuy/${id}`, { method: 'DELETE' });
  }

  async triggerAutoRule(id) {
    return this.request(`/autobuy/${id}/trigger`, { method: 'POST' });
  }

  // ==========================================
  // MÉTODOS DE DISPONIBILIDAD (CALENDAR)
  // ==========================================

  async getChannelAvailability(channelId, year, month) {
    return this.request(`/channels/${channelId}/availability?year=${year}&month=${month}`, { auth: false });
  }

  async updateChannelAvailability(channelId, data) {
    return this.request(`/canales/${channelId}/availability`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateChannelInsights(channelId, data) {
    return this.request(`/canales/${channelId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ==========================================
  // MÉTODOS DE CHAT DE CAMPAÑA
  // ==========================================

  async getCampaignMessages(campaignId) {
    return this.request(`/campaigns/${campaignId}/messages`);
  }

  async sendCampaignChat(campaignId, text, type = 'message') {
    return this.request(`/campaigns/${campaignId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text, type }),
    });
  }

  // ==========================================
  // MÉTODOS DE SCORING
  // ==========================================

  async getChannelScore(channelId) {
    return this.request(`/estadisticas/canales/${channelId}/score`);
  }

  async recalculateScore(channelId) {
    return this.request(`/estadisticas/canales/${channelId}/recalculate`, { method: 'POST' });
  }

  async connectPlatform(channelId, data) {
    return this.request(`/estadisticas/canales/${channelId}/connect`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==========================================
  // ADVANCED ANALYTICS
  // ==========================================

  /**
   * Creator analytics — time-series for dashboard charts
   * @param {Object} params - { period: '7d'|'30d'|'90d'|'1y', channelId?: string }
   */
  async getCreatorAnalytics(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/estadisticas/creator/analytics${qs ? `?${qs}` : ''}`);
  }

  /**
   * Advertiser analytics — spend, CPC, ROI charts
   * @param {Object} params - { period: '7d'|'30d'|'90d'|'1y' }
   */
  async getAdvertiserAnalytics(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/estadisticas/advertiser/analytics${qs ? `?${qs}` : ''}`);
  }

  /**
   * Channel analytics deep-dive
   * @param {string} channelId
   * @param {Object} params - { period: '7d'|'30d'|'90d'|'1y' }
   */
  async getChannelAnalytics(channelId, params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/estadisticas/channels/${channelId}/analytics${qs ? `?${qs}` : ''}`);
  }

  /**
   * Campaign analytics deep-dive (click data, devices, countries)
   * @param {string} campaignId
   * @param {Object} params - { period: '7d'|'30d'|'90d'|'1y' }
   */
  async getCampaignAnalytics(campaignId, params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/estadisticas/campaigns/${campaignId}/analytics${qs ? `?${qs}` : ''}`);
  }

  /**
   * Export a CSV report
   * @param {Object} params - { type: 'revenue'|'campaigns'|'channels'|'clicks', period, format: 'csv' }
   * @returns {Promise} resolves to CSV text or blob
   */
  async exportReport(params = {}) {
    const qs = new URLSearchParams({ format: 'csv', ...params }).toString();
    const url = `${this.baseURL}/estadisticas/export${qs ? `?${qs}` : ''}`;
    try {
      const response = await fetch(url, {
        headers: this.getHeaders(true),
      });
      if (!response.ok) {
        const text = await response.text();
        try { return JSON.parse(text); } catch { return { success: false, message: text }; }
      }
      const blob = await response.blob();
      return { success: true, blob, filename: params.type ? `channelad-${params.type}-report.csv` : 'channelad-report.csv' };
    } catch (error) {
      return { success: false, message: 'No se pudo descargar el reporte', error: error?.message };
    }
  }

  // ==========================================
  // MÉTODOS DE CAMPAÑAS (ACCIONES)
  // ==========================================

  async payCampaign(campaignId) {
    return this.request(`/campaigns/${campaignId}/pay`, { method: 'POST' });
  }

  async confirmCampaign(campaignId) {
    return this.request(`/campaigns/${campaignId}/confirm`, { method: 'POST' });
  }

  async completeCampaign(campaignId) {
    return this.request(`/campaigns/${campaignId}/complete`, { method: 'POST' });
  }

  async cancelCampaign(campaignId) {
    return this.request(`/campaigns/${campaignId}/cancel`, { method: 'POST' });
  }

  async getCampaignById(campaignId) {
    return this.request(`/campaigns/${campaignId}`);
  }

  // ==========================================
  // MÉTODOS DE TRACKING
  // ==========================================

  /**
   * Crear link de tracking
   */
  async createTrackingLink(data) {
    return this.request('/tracking/links', { method: 'POST', body: JSON.stringify(data) });
  }

  /**
   * Crear link de verificación para canal
   */
  async createVerificationLink(channelId) {
    return this.request('/tracking/verify-link', { method: 'POST', body: JSON.stringify({ channelId }) });
  }

  /**
   * Comprobar estado de verificación
   */
  async checkVerificationStatus(channelId) {
    return this.request(`/tracking/verify-status/${channelId}`);
  }

  /**
   * Convertir URL de anunciante en link trackeable
   */
  async convertUrl(targetUrl, campaignId) {
    return this.request('/tracking/convert', { method: 'POST', body: JSON.stringify({ targetUrl, campaignId }) });
  }

  /**
   * Obtener analytics de un link
   */
  async getLinkAnalytics(linkId) {
    return this.request(`/tracking/links/${linkId}/analytics`);
  }

  /**
   * Obtener mis links de tracking
   */
  async getMyTrackingLinks(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/tracking/links${qs ? `?${qs}` : ''}`);
  }

  // ==========================================
  // MÉTODOS DE REVIEWS
  // ==========================================

  async getChannelReviews(channelId, params = {}) {
    return this.request(`/reviews/channel/${channelId}`, { params });
  }

  async createReview(data) {
    return this.request('/reviews', { method: 'POST', body: JSON.stringify(data) });
  }

  async respondToReview(reviewId, text) {
    return this.request(`/reviews/${reviewId}/respond`, { method: 'PUT', body: JSON.stringify({ text }) });
  }

  async markReviewHelpful(reviewId) {
    return this.request(`/reviews/${reviewId}/helpful`, { method: 'PUT' });
  }

  async reportReview(reviewId) {
    return this.request(`/reviews/${reviewId}/report`, { method: 'PUT' });
  }

  async getMyReviews() {
    return this.request('/reviews/my');
  }

  async deleteReview(reviewId) {
    return this.request(`/reviews/${reviewId}`, { method: 'DELETE' });
  }

  // ==========================================
  // MÉTODOS DE REFERIDOS
  // ==========================================

  async getReferralStats() {
    return this.request('/referrals/stats');
  }

  async convertReferralCredits(amount) {
    return this.request('/referrals/convert', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async applyReferralCode(code) {
    return this.request('/referrals/apply', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }
}

// Crear instancia única del servicio
const apiService = new ApiService();

export default apiService;
