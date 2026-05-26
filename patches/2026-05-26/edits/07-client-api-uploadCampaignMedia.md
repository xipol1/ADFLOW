# Edit · `client/src/services/api.js` · Método `uploadCampaignMedia`

## Qué hace

Añade al cliente `apiService` un método `uploadCampaignMedia(file, onProgress)`
que sube un archivo al endpoint `POST /api/uploads/campaign-media` con
progreso en tiempo real (XHR, no fetch — fetch no expone progress de body).

Devuelve `{ success, data: { url, key, type, mime, size } }` que el
wizard usa directamente como `campaign.media[].url`.

## Cómo aplicarlo

Localiza el método `uploadFile(file, type = 'general')` en `api.js`
(busca por `async uploadFile`). Justo **después de su cierre `}`**
añade el nuevo método:

```js
/**
 * Subir un archivo de campaña a Cloudflare R2 vía nuestro backend.
 *
 * Devuelve { url, key, type, mime, size } donde `url` es la URL pública
 * que el wizard puede meter directamente en campaign.media[].url.
 *
 * Tipos permitidos: image/* video/* application/pdf (max 25MB).
 * Errores comunes:
 *   - 400 MIME_NOT_ALLOWED · tipo no soportado
 *   - 413 LIMIT_FILE_SIZE · archivo > 25MB
 *   - 503 STORAGE_NOT_CONFIGURED · operadores aún no han puesto las env
 *     vars R2_*. El wizard cae en modo "solo texto" — la UI se lo dice.
 *
 * @param {File} file
 * @param {(loaded:number,total:number)=>void} [onProgress]
 */
async uploadCampaignMedia(file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    if (typeof onProgress === 'function' && xhr.upload) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(e.loaded, e.total);
      });
    }
    xhr.open('POST', `${this.baseURL}/uploads/campaign-media`);
    xhr.setRequestHeader('Authorization', `Bearer ${this.getAuthToken()}`);
    xhr.onload = () => {
      try {
        const body = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        if (xhr.status >= 200 && xhr.status < 300 && body?.success) {
          resolve(body);
        } else {
          resolve({
            success: false,
            status: xhr.status,
            message: body?.message || `Upload failed (${xhr.status})`,
            code: body?.code || 'UPLOAD_FAILED',
          });
        }
      } catch (err) {
        reject(err);
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.send(formData);
  });
}
```

## Verificación

En el navegador, con DevTools abierto:

```js
// Asume que estás logueado y tienes un input type=file con id="test"
const file = document.querySelector('#test').files[0];
window.apiService.uploadCampaignMedia(file, (loaded, total) =>
  console.log('progress:', Math.round(loaded / total * 100), '%')
).then(r => console.log('result:', r));
```

Esperado (con R2 configurado): `{ success: true, data: { url, key, type, mime, size } }`.
Sin R2: `{ success: false, code: 'STORAGE_NOT_CONFIGURED' }`.
