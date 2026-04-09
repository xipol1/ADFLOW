/**
 * WhatsAppAdminClient — Singleton IPC bridge to the whatsapp-web.js worker.
 *
 * All services that need WhatsApp admin access call this module.
 * The worker runs as a separate child process (workers/whatsappWorker.js).
 */

'use strict';

const { fork } = require('child_process');
const path = require('path');
const crypto = require('crypto');

const WORKER_PATH = path.join(__dirname, '..', 'workers', 'whatsappWorker.js');
const DEFAULT_TIMEOUT = 30000;   // 30s for most operations
const PUBLISH_TIMEOUT = 60000;   // 60s for publish (media uploads can be slow)
const MAX_RESTART_ATTEMPTS = 3;
const BACKOFF_BASE = 5000;       // 5s, 15s, 45s

class WhatsAppAdminClient {
  constructor() {
    this.worker = null;
    this.ready = false;
    this.pendingRequests = new Map();
    this.restartAttempts = 0;
    this._initialized = false;
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  initialize() {
    if (this._initialized && this.worker && !this.worker.killed) {
      return;
    }

    this._initialized = true;
    this._forkWorker();
  }

  _forkWorker() {
    console.log('[wa-admin] Forking WhatsApp worker...');

    this.worker = fork(WORKER_PATH, [], {
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });

    // Pipe worker stdout/stderr to main process
    this.worker.stdout?.on('data', (d) => process.stdout.write(d));
    this.worker.stderr?.on('data', (d) => process.stderr.write(d));

    this.worker.on('message', (msg) => this._handleMessage(msg));

    this.worker.on('exit', (code, signal) => {
      console.error(`[wa-admin] Worker exited (code=${code}, signal=${signal})`);
      this.ready = false;
      this._rejectAllPending('Worker process exited');
      this._attemptRestart();
    });

    this.worker.on('error', (err) => {
      console.error('[wa-admin] Worker error:', err.message);
    });
  }

  _handleMessage(msg) {
    // Lifecycle events from worker
    if (msg.event) {
      switch (msg.event) {
        case 'READY':
          this.ready = true;
          this.restartAttempts = 0;
          console.log('[wa-admin] Worker ready — WhatsApp connected');
          break;
        case 'DISCONNECTED':
          this.ready = false;
          console.warn('[wa-admin] Worker disconnected:', msg.reason);
          break;
        case 'QR_RECEIVED':
          console.log('[wa-admin] QR code available — scan with WhatsApp');
          break;
        case 'AUTH_FAILURE':
          this.ready = false;
          console.error('[wa-admin] Authentication failed:', msg.reason);
          break;
        case 'RECONNECTING':
          console.log(`[wa-admin] Worker reconnecting (attempt ${msg.attempt})`);
          break;
        case 'RECONNECT_FAILED':
          console.error('[wa-admin] Worker exhausted all reconnect attempts');
          break;
      }
      return;
    }

    // Response to a pending request
    const { requestId, result, error } = msg;
    if (!requestId) return;

    const pending = this.pendingRequests.get(requestId);
    if (!pending) return;

    clearTimeout(pending.timer);
    this.pendingRequests.delete(requestId);

    if (error) {
      pending.reject(new Error(error));
    } else {
      pending.resolve(result);
    }
  }

  _attemptRestart() {
    if (this.restartAttempts >= MAX_RESTART_ATTEMPTS) {
      console.error(`[wa-admin] Max restart attempts (${MAX_RESTART_ATTEMPTS}) reached. Worker stopped.`);
      return;
    }

    this.restartAttempts++;
    const delay = BACKOFF_BASE * Math.pow(3, this.restartAttempts - 1);
    console.log(`[wa-admin] Restarting worker in ${delay / 1000}s (attempt ${this.restartAttempts})`);

    setTimeout(() => {
      this._forkWorker();
    }, delay);
  }

  _rejectAllPending(reason) {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
    }
    this.pendingRequests.clear();
  }

  // ─── IPC Communication ─────────────────────────────────────────────────────

  _sendRequest(action, payload = {}, timeoutMs = DEFAULT_TIMEOUT) {
    if (!this.ready) {
      return Promise.reject(new Error('WhatsApp admin client not ready'));
    }

    if (!this.worker || this.worker.killed) {
      return Promise.reject(new Error('WhatsApp worker not running'));
    }

    const requestId = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`WhatsApp request timeout (${action}, ${timeoutMs}ms)`));
      }, timeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timer });

      try {
        this.worker.send({ action, payload, requestId });
      } catch (err) {
        clearTimeout(timer);
        this.pendingRequests.delete(requestId);
        reject(new Error(`Failed to send IPC message: ${err.message}`));
      }
    });
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  getClient() {
    if (!this.ready) throw new Error('WhatsApp admin client not ready');
    return this;
  }

  async getChannelInfo(channelId) {
    return this._sendRequest('getChannelInfo', { channelId });
  }

  async verifyAdminAccess(channelId) {
    return this._sendRequest('verifyAdminAccess', { channelId });
  }

  async getChannelFollowers(channelId) {
    return this._sendRequest('getChannelFollowers', { channelId });
  }

  async readPostMetrics(channelId, messageId) {
    return this._sendRequest('readPostMetrics', { channelId, messageId });
  }

  async publishToChannel(channelId, content) {
    return this._sendRequest('publishToChannel', { channelId, content }, PUBLISH_TIMEOUT);
  }

  async getRecentPosts(channelId, limit = 10) {
    return this._sendRequest('getRecentPosts', { channelId, limit });
  }

  async healthCheck() {
    return this._sendRequest('healthCheck', {}, 5000);
  }

  // ─── Shutdown ──────────────────────────────────────────────────────────────

  shutdown() {
    console.log('[wa-admin] Shutting down worker...');
    this.ready = false;
    this._initialized = false;
    this._rejectAllPending('Client shutting down');

    if (this.worker && !this.worker.killed) {
      this.worker.kill('SIGTERM');
      // Force kill after 5s
      setTimeout(() => {
        if (this.worker && !this.worker.killed) {
          this.worker.kill('SIGKILL');
        }
      }, 5000);
    }

    this.worker = null;
  }
}

module.exports = new WhatsAppAdminClient();
