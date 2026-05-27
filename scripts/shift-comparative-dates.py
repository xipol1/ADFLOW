#!/usr/bin/env python3
"""One-shot: shift the 14 comparative posts forward by 2 L/Mi/V slots so
the first two publish today (2026-05-27) and recover the missed cadence.
Updates frontmatter in each .md and the matching block in blogPosts.js."""
import re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
BLOG_DIR = ROOT / 'content' / 'blog'
JS_FILE = ROOT / 'client' / 'src' / 'ui' / 'pages' / 'blog' / 'blogPosts.js'

# (slug, old_date, new_date)
SHIFTS = [
    ('channelad-vs-collaborator',                '2026-05-29', '2026-05-25'),
    ('whatsapp-business-vs-canal-whatsapp',      '2026-06-03', '2026-05-27'),
    ('channelad-vs-combot',                      '2026-06-05', '2026-05-29'),
    ('tgstat-vs-channelad',                      '2026-06-08', '2026-06-01'),
    ('aitarget-one-alternatives',                '2026-06-10', '2026-06-03'),
    ('beehiiv-ads-vs-channelad',                 '2026-06-12', '2026-06-05'),
    ('substack-vs-channelad-newsletter-ads',     '2026-06-15', '2026-06-08'),
    ('youtube-brandconnect-vs-channelad',        '2026-06-17', '2026-06-10'),
    ('tiktok-creator-marketplace-alternatives',  '2026-06-19', '2026-06-12'),
    ('whop-vs-channelad-monetizacion-comunidad', '2026-06-22', '2026-06-15'),
    ('telemetr-vs-channelad',                    '2026-06-24', '2026-06-17'),
    ('admixer-telegram-vs-channelad',            '2026-06-26', '2026-06-19'),
    ('adsgram-vs-channelad-telegram-ads',        '2026-06-29', '2026-06-22'),
    ('reddit-ads-vs-comunidades-cerradas',       '2026-07-01', '2026-06-24'),
]

PLACEHOLDER = '__SHIFTED_PLACEHOLDER_{}_{}'  # avoid cross-iteration collisions

# ── Update each .md ──
for slug, old, new in SHIFTS:
    md = BLOG_DIR / f'{slug}.md'
    txt = md.read_text(encoding='utf-8')
    # Each .md has date and dateModified on the same OLD value
    if old not in txt:
        print(f'WARN {slug}: old date {old} not found')
        continue
    txt = txt.replace(f'date: "{old}"', f'date: "{new}"')
    txt = txt.replace(f'dateModified: "{old}"', f'dateModified: "{new}"')
    md.write_text(txt, encoding='utf-8')
    print(f'  md  {slug}: {old} -> {new}')

# ── Update blogPosts.js atomically (two-pass placeholders to avoid date collisions) ──
js = JS_FILE.read_text(encoding='utf-8')

for i, (slug, old, new) in enumerate(SHIFTS):
    # Match the entry starting at slug: 'X', then the next date/dateModified pair
    pat = re.compile(
        r"(slug:\s*'" + re.escape(slug) + r"',[\s\S]*?date:\s*')" + re.escape(old) +
        r"(',\s*\n\s*dateModified:\s*')" + re.escape(old) + r"(',)"
    )
    placeholder = PLACEHOLDER.format(i, 'D')
    placeholder2 = PLACEHOLDER.format(i, 'M')
    js_new, n = pat.subn(r"\1" + placeholder + r"\2" + placeholder2 + r"\3", js)
    if n != 1:
        print(f'WARN js {slug}: matched {n} times, expected 1')
        continue
    js = js_new
    print(f'  js  {slug}: {old} -> {new}')

# Resolve placeholders to actual new dates
for i, (slug, old, new) in enumerate(SHIFTS):
    js = js.replace(PLACEHOLDER.format(i, 'D'), new)
    js = js.replace(PLACEHOLDER.format(i, 'M'), new)

JS_FILE.write_text(js, encoding='utf-8')
print('OK')
