'use strict';

/**
 * Coerce WhatsApp metadata text fields (name / description / group subject) to a
 * safe display string.
 *
 * WhatsApp metadata sometimes returns these as an OBJECT instead of a string —
 * notably when a channel is resolved by its public invite link, where the
 * payload is shaped differently. Rendering that object directly produced
 * "[object Object]" in logs and in the channel picker UI.
 *
 * asDisplayText() accepts candidates in priority order and returns the first
 * usable display string: non-empty strings as-is, a common text subfield from
 * objects (`text`/`value`/`name`/`displayName`), else '' (empty). It never
 * yields "[object Object]". Use it for optional fields (description, group
 * subject) where an empty string is the right default.
 *
 * asDisplayName() is the same but falls back to the '(sin nombre)' placeholder —
 * use it for the primary name where a visible label is required.
 */
function asDisplayText(...candidates) {
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c;
    if (c && typeof c === 'object') {
      const t = c.text || c.value || c.name || c.displayName;
      if (typeof t === 'string' && t.trim()) return t;
    }
  }
  return '';
}

function asDisplayName(...candidates) {
  return asDisplayText(...candidates) || '(sin nombre)';
}

module.exports = { asDisplayText, asDisplayName };
