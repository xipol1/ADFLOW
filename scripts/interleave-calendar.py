#!/usr/bin/env python3
"""Shift the 12 existing comparative posts to interleave with the 10 new
guides/monetization posts. Result: continuous L/Mi/V cadence with rotation
of post types (BOFU/MOFU/TOFU + cluster diversification).

Final calendar (22 posts, 29-may to 17-jul):
  29-may Vie  channelad-vs-combot                           comparativa (unchanged)
  01-jun Lun  media-kit-canal-whatsapp                      ★ new
  03-jun Mié  tgstat-vs-channelad                           shifted
  05-jun Vie  monetizar-canal-whatsapp-finanzas             ★ new
  08-jun Lun  aitarget-one-alternatives                     shifted
  10-jun Mié  publicidad-newsletters-espana-guia            ★ new
  12-jun Vie  beehiiv-ads-vs-channelad                      shifted
  15-jun Lun  monetizar-newsletter-substack-vs-propia       ★ new
  17-jun Mié  substack-vs-channelad-newsletter-ads          shifted
  19-jun Vie  crear-canal-difusion-instagram-paso-paso      ★ new
  22-jun Lun  youtube-brandconnect-vs-channelad             shifted
  24-jun Mié  monetizar-canal-difusion-instagram-nichos     ★ new
  26-jun Vie  tiktok-creator-marketplace-alternatives       shifted
  29-jun Lun  cuanto-cobrar-publicidad-discord              ★ new
  01-jul Mié  whop-vs-channelad-monetizacion-comunidad      shifted
  03-jul Vie  monetizar-canal-whatsapp-marketing            ★ new
  06-jul Lun  telemetr-vs-channelad                         shifted
  08-jul Mié  monetizar-canal-whatsapp-salud-fitness        ★ new
  10-jul Vie  admixer-telegram-vs-channelad                 shifted
  13-jul Lun  herramientas-creador-telegram-2026            ★ new
  15-jul Mié  adsgram-vs-channelad-telegram-ads             shifted
  17-jul Vie  reddit-ads-vs-comunidades-cerradas            shifted
"""
import re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
BLOG_DIR = ROOT / 'content' / 'blog'
JS_FILE = ROOT / 'client' / 'src' / 'ui' / 'pages' / 'blog' / 'blogPosts.js'

# (slug, old_date, new_date) — only the 12 existing comparatives that shift
SHIFTS = [
    # channelad-vs-combot stays at 2026-05-29
    ('tgstat-vs-channelad',                      '2026-06-01', '2026-06-03'),
    ('aitarget-one-alternatives',                '2026-06-03', '2026-06-08'),
    ('beehiiv-ads-vs-channelad',                 '2026-06-05', '2026-06-12'),
    ('substack-vs-channelad-newsletter-ads',     '2026-06-08', '2026-06-17'),
    ('youtube-brandconnect-vs-channelad',        '2026-06-10', '2026-06-22'),
    ('tiktok-creator-marketplace-alternatives',  '2026-06-12', '2026-06-26'),
    ('whop-vs-channelad-monetizacion-comunidad', '2026-06-15', '2026-07-01'),
    ('telemetr-vs-channelad',                    '2026-06-17', '2026-07-06'),
    ('admixer-telegram-vs-channelad',            '2026-06-19', '2026-07-10'),
    ('adsgram-vs-channelad-telegram-ads',        '2026-06-22', '2026-07-15'),
    ('reddit-ads-vs-comunidades-cerradas',       '2026-06-24', '2026-07-17'),
]

PLACEHOLDER = '__INTERLEAVE_{}_{}'

# ── Update each .md ──
for slug, old, new in SHIFTS:
    md = BLOG_DIR / f'{slug}.md'
    if not md.exists():
        print(f'SKIP {slug}: file not found')
        continue
    txt = md.read_text(encoding='utf-8')
    if old not in txt:
        print(f'WARN {slug}: old date {old} not in file (already shifted?)')
        continue
    txt = txt.replace(f'date: "{old}"', f'date: "{new}"')
    txt = txt.replace(f'dateModified: "{old}"', f'dateModified: "{new}"')
    md.write_text(txt, encoding='utf-8')
    print(f'  md  {slug}: {old} -> {new}')

# ── Update blogPosts.js atomically ──
js = JS_FILE.read_text(encoding='utf-8')

for i, (slug, old, new) in enumerate(SHIFTS):
    pat = re.compile(
        r"(slug:\s*'" + re.escape(slug) + r"',[\s\S]*?date:\s*')" + re.escape(old) +
        r"(',\s*\n\s*dateModified:\s*')" + re.escape(old) + r"(',)"
    )
    p1 = PLACEHOLDER.format(i, 'D')
    p2 = PLACEHOLDER.format(i, 'M')
    js_new, n = pat.subn(r"\1" + p1 + r"\2" + p2 + r"\3", js)
    if n != 1:
        print(f'WARN js {slug}: matched {n} times (expected 1)')
        continue
    js = js_new
    print(f'  js  {slug}: {old} -> {new}')

# Resolve placeholders
for i, (_, _, new) in enumerate(SHIFTS):
    js = js.replace(PLACEHOLDER.format(i, 'D'), new)
    js = js.replace(PLACEHOLDER.format(i, 'M'), new)

JS_FILE.write_text(js, encoding='utf-8')
print('OK')
