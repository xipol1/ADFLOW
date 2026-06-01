'use strict';

/**
 * Coerce a WhatsApp newsletter `name` field to a safe display string.
 *
 * WhatsApp newsletter metadata sometimes returns `name` (and
 * `thread_metadata.name`) as an OBJECT instead of a string — notably when a
 * channel is resolved by its public invite link, where the payload is shaped
 * differently. Rendering that object directly produced "[object Object]" in
 * logs and in the channel picker UI.
 *
 * asDisplayName() accepts candidates in priority order and returns the first
 * usable display string: non-empty strings as-is, a common text subfield from
 * objects (`text`/`value`/`name`/`displayName`), else the '(sin nombre)'
 * placeholder. It never yields "[object Object]".
 */
function asDisplayName(...candidates) {
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c;
    if (c && typeof c === 'object') {
      const t = c.text || c.value || c.name || c.displayName;
      if (typeof t === 'string' && t.trim()) return t;
    }
  }
  return '(sin nombre)';
}

module.exports = { asDisplayName };
