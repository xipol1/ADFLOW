"""
ChannelAd Telegram Bot v2 — Neuromarketing Lead Funnel
Calcula potencial de ingresos, clasifica canales por tier,
aplica estrategia de neuromarketing y captura leads cualificados.
"""

import os
import re
import logging
import asyncio
import secrets
import json
from datetime import datetime
from urllib.parse import quote

import aiohttp
import aiosqlite
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    ConversationHandler,
    ContextTypes,
    filters,
)

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
ADMIN_ID = int(os.getenv("ADMIN_ID", "0"))
DB_PATH = os.getenv("DB_PATH", "channelad_leads.db")
API_URL = os.getenv("API_URL", "http://localhost:5000/api")
BOT_API_KEY = os.getenv("BOT_API_KEY", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://channelad.io")

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

# ── Conversation states ──────────────────────────────────────────
(
    STATE_CHANNEL,
    STATE_VIEWS,
    STATE_NICHE,
    STATE_YA_COBRA,
    STATE_CUANTO_COBRA,
    STATE_INTEREST,
    STATE_LAST_CHANCE,
    STATE_EMAIL,
    STATE_SMALL_EMAIL,
) = range(9)

# ── CPMs por nicho ───────────────────────────────────────────────
NICHES = {
    "seo":        ("SEO / Linkbuilding",   18.5),
    "marketing":  ("Marketing digital",    17.0),
    "ecommerce":  ("Ecommerce / Tiendas",  15.0),
    "finanzas":   ("Finanzas / Inversión",  23.0),
    "tech":       ("Tecnología / SaaS",     20.0),
    "cripto":     ("Cripto / Trading",      26.0),
    "general":    ("General / Lifestyle",   11.0),
    "otra":       ("Otra temática",         13.0),
}

PRICE_RANGES = {
    "menos_50":   ("Menos de €50",   0,   50),
    "50_100":     ("€50–€100",      50,  100),
    "100_200":    ("€100–€200",    100,  200),
    "mas_200":    ("Más de €200",  200,  500),
}

FOUNDERS_TOTAL = 100
FOUNDERS_REMAINING = 23  # Editable — actualizar manualmente conforme se llenen


# ── Helpers ──────────────────────────────────────────────────────

def fmt(value: float) -> str:
    """Format money: €1.234,56 for thousands, €45,50 for smaller."""
    if value >= 1000:
        integer = int(value)
        decimals = int(round((value - integer) * 100))
        int_str = f"{integer:,}".replace(",", ".")
        return f"€{int_str},{decimals:02d}"
    return f"€{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def classify_tier(precio_post: float, views: int) -> str:
    if precio_post >= 150:
        return "super_canal"
    if precio_post >= 15:
        return "prometedor"
    return "pequeno"


async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(DB_PATH)
    await db.execute("PRAGMA journal_mode=WAL")
    return db


async def init_db():
    db = await get_db()
    await db.execute("""
        CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_user_id TEXT,
            telegram_username TEXT,
            channel_username TEXT,
            views_promedio INTEGER,
            niche TEXT,
            precio_mercado_post REAL,
            ingreso_potencial_mensual REAL,
            ya_cobra BOOLEAN,
            rango_actual TEXT,
            email TEXT,
            tier TEXT,
            estado TEXT DEFAULT 'pre_qualify',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # Add tier column if missing (migration for existing DBs)
    try:
        await db.execute("ALTER TABLE leads ADD COLUMN tier TEXT")
    except Exception:
        pass
    await db.commit()
    await db.close()
    logger.info("DB inicializada: %s", DB_PATH)


async def generate_registration_token(email: str, user_data: dict) -> str | None:
    """Generate a secure token, register it with the backend API, and return the full URL."""
    token = secrets.token_hex(32)

    payload = {
        "token": token,
        "email": email,
        "telegramUserId": user_data.get("telegram_user_id", ""),
        "channelUsername": user_data.get("channel_username", ""),
        "channelTier": user_data.get("tier", ""),
        "precioPost": user_data.get("precio_post", 0),
        "ingresoMensual": user_data.get("ingreso_mensual", 0),
        "niche": user_data.get("niche_name", ""),
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{API_URL}/auth/bot-token",
                json=payload,
                headers={"X-Bot-Key": BOT_API_KEY, "Content-Type": "application/json"},
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                if resp.status == 201:
                    url = f"{FRONTEND_URL}/auth/register?bot_token={token}&email={quote(email)}"
                    logger.info("Token registrado en backend para %s", email)
                    return url
                else:
                    body = await resp.text()
                    logger.error("Error registrando token: %s %s", resp.status, body)
    except Exception as e:
        logger.error("Error conectando con backend API: %s", e)

    # Fallback: return URL without token (normal registration)
    return f"{FRONTEND_URL}/auth/register?email={quote(email)}"


async def upsert_lead(user_id: str, data: dict):
    db = await get_db()
    existing = await db.execute(
        "SELECT id FROM leads WHERE telegram_user_id = ? ORDER BY id DESC LIMIT 1",
        (user_id,),
    )
    row = await existing.fetchone()
    if row:
        sets = ", ".join(f"{k} = ?" for k in data)
        vals = list(data.values()) + [row[0]]
        await db.execute(f"UPDATE leads SET {sets} WHERE id = ?", vals)
    else:
        cols = ", ".join(data.keys())
        placeholders = ", ".join("?" for _ in data)
        await db.execute(
            f"INSERT INTO leads ({cols}) VALUES ({placeholders})",
            list(data.values()),
        )
    await db.commit()
    await db.close()


# ── Conversation handlers ────────────────────────────────────────

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data.clear()
    context.user_data["telegram_user_id"] = str(update.effective_user.id)
    context.user_data["telegram_username"] = update.effective_user.username or ""

    await update.message.reply_text(
        "👋 Bienvenido a *ChannelAd* — el marketplace de publicidad "
        "para canales de Telegram.\n\n"
        "Voy a calcular en 60 segundos cuánto deberías estar "
        "ganando con tu canal según datos reales de mercado.\n\n"
        "Solo necesito 3 datos. Empecemos:\n\n"
        "¿Cuál es el link o username de tu canal?\n"
        "_(Ejemplo: https://t.me/tucanal o @tucanal)_",
        parse_mode="Markdown",
    )
    return STATE_CHANNEL


async def receive_channel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    text = update.message.text.strip()

    link_match = re.match(r"https?://t\.me/([a-zA-Z][a-zA-Z0-9_]{3,})", text)
    if link_match:
        username = link_match.group(1)
    elif text.startswith("@"):
        username = text[1:]
    else:
        username = text

    if not re.match(r"^[a-zA-Z][a-zA-Z0-9_]{3,}$", username):
        await update.message.reply_text(
            "Hmm, ese formato no parece correcto.\n"
            "Envíame el link (https://t.me/tucanal) o el username (@tucanal)"
        )
        return STATE_CHANNEL

    context.user_data["channel_username"] = f"@{username}"

    await upsert_lead(context.user_data["telegram_user_id"], {
        "telegram_user_id": context.user_data["telegram_user_id"],
        "telegram_username": context.user_data["telegram_username"],
        "channel_username": f"@{username}",
        "estado": "pre_qualify",
    })

    await update.message.reply_text(
        "Perfecto. Ahora necesito un dato que solo tú conoces:\n\n"
        "*¿Cuántas visualizaciones tienen tus posts "
        "en las primeras 24 horas de media?*\n\n"
        "📍 Cómo verlo: abre cualquier post reciente de tu canal → "
        "el número con el icono del ojo 👁 debajo del mensaje.\n\n"
        "Escribe solo el número, sin puntos ni comas:",
        parse_mode="Markdown",
    )
    return STATE_VIEWS


async def receive_views(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    text = update.message.text.strip().replace(".", "").replace(",", "")

    if not text.isdigit():
        await update.message.reply_text(
            "Necesito un número. Escribe solo las visualizaciones "
            "(ej: 2500):"
        )
        return STATE_VIEWS

    views = int(text)

    if views < 100:
        context.user_data["views"] = views
        await upsert_lead(context.user_data["telegram_user_id"], {
            "views_promedio": views,
            "tier": "pre_qualify",
            "estado": "pre_qualify",
        })
        logger.info(
            "Lead pre-qualify: %s — %d views",
            context.user_data.get("channel_username"), views,
        )
        await update.message.reply_text(
            "Tu canal aún no tiene el volumen mínimo para monetizar "
            "con publicidad directa (se necesitan al menos 100 views/post).\n\n"
            "Pero hay buenas noticias: los canales que pasan de 100 a 500 "
            "views suelen hacerlo en semanas, no meses.\n\n"
            "💡 *3 cosas que puedes hacer ahora:*\n"
            "1. Publica con constancia — mínimo 3-4 posts/semana\n"
            "2. Colabora con otros canales de tu temática (shoutouts cruzados)\n"
            "3. Comparte contenido que la gente reenvíe, no solo lea\n\n"
            "Cuando superes las 100 visualizaciones, vuelve a /start "
            "y te digo exactamente cuánto vale tu canal.",
            parse_mode="Markdown",
        )
        return ConversationHandler.END

    if views > 10_000_000:
        await update.message.reply_text(
            "Ese número parece demasiado alto. "
            "Escribe las visualizaciones medias por post (ej: 5000):"
        )
        return STATE_VIEWS

    context.user_data["views"] = views
    await upsert_lead(context.user_data["telegram_user_id"], {
        "views_promedio": views,
    })

    keyboard = [
        [
            InlineKeyboardButton("SEO / Linkbuilding", callback_data="niche_seo"),
            InlineKeyboardButton("Marketing digital", callback_data="niche_marketing"),
        ],
        [
            InlineKeyboardButton("Ecommerce / Tiendas", callback_data="niche_ecommerce"),
            InlineKeyboardButton("Finanzas / Inversión", callback_data="niche_finanzas"),
        ],
        [
            InlineKeyboardButton("Tecnología / SaaS", callback_data="niche_tech"),
            InlineKeyboardButton("Cripto / Trading", callback_data="niche_cripto"),
        ],
        [
            InlineKeyboardButton("General / Lifestyle", callback_data="niche_general"),
            InlineKeyboardButton("Otra temática", callback_data="niche_otra"),
        ],
    ]

    await update.message.reply_text(
        "Última pregunta:\n\n"
        "¿Cuál es la temática principal de tu canal?",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )
    return STATE_NICHE


# ── Niche → Result + Tier-based pitch ────────────────────────────

async def receive_niche(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()

    niche_key = query.data.replace("niche_", "")
    niche_name, cpm = NICHES[niche_key]

    views = context.user_data["views"]
    precio_post = (views / 1000) * cpm
    ingreso_mensual = precio_post * 3
    ingreso_anual = ingreso_mensual * 12
    tier = classify_tier(precio_post, views)

    context.user_data.update({
        "niche_key": niche_key,
        "niche_name": niche_name,
        "precio_post": precio_post,
        "ingreso_mensual": ingreso_mensual,
        "ingreso_anual": ingreso_anual,
        "tier": tier,
    })

    await upsert_lead(context.user_data["telegram_user_id"], {
        "niche": niche_name,
        "precio_mercado_post": round(precio_post, 2),
        "ingreso_potencial_mensual": round(ingreso_mensual, 2),
        "tier": tier,
        "estado": "calculado",
    })

    channel = context.user_data["channel_username"]

    logger.info(
        "Lead [%s]: %s — %s — %s/post — %s/mes",
        tier.upper(), channel, niche_name,
        fmt(precio_post), fmt(ingreso_mensual),
    )

    # ── RESULT MESSAGE (same for all tiers) ──
    result_text = (
        f"📊 *Resultado para {channel}*\n\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"💰 Precio por post: *{fmt(precio_post)}*\n"
        f"📅 Potencial mensual (3 posts): *{fmt(ingreso_mensual)}*\n"
        f"📈 Potencial anual: *{fmt(ingreso_anual)}*\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n\n"
        f"Datos de mercado reales para canales de _{niche_name}_ "
        f"con {views:,} views/post en España."
    )

    # ── TIER: SMALL CHANNEL (<€15/post) ──
    if tier == "pequeno":
        await query.edit_message_text(
            result_text + "\n\n"
            "━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"Ahora mismo tu canal genera *{fmt(precio_post)}* por post. "
            "Es un buen inicio, pero todavía no alcanza el umbral "
            "que los anunciantes consideran rentable (€15+/post).\n\n"
            "La buena noticia: *puedes multiplicar ese precio* "
            "sin necesitar más suscriptores.\n\n"
            "💡 *Cómo subir el valor de tu canal:*\n\n"
            "1️⃣ *Engagement > Tamaño* — Un canal con 500 views y "
            "alto engagement vale más que uno con 2.000 views y "
            "audiencia pasiva. Haz preguntas, encuestas, debates.\n\n"
            "2️⃣ *Nicho específico* — Los anunciantes pagan 2-3x más "
            "por audiencias especializadas. \"Marketing para ecommerce\" "
            "vale más que \"Marketing general\".\n\n"
            "3️⃣ *Publica con datos* — Posts con métricas, casos de estudio "
            "o análisis propios generan más forwards y más views.\n\n"
            "En ChannelAd ofrecemos métricas gratuitas para que "
            "veas exactamente qué funciona y qué no en tu canal.\n\n"
            "¿Quieres acceso gratuito a las métricas de tu canal?",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("Sí, quiero acceso", callback_data="interest_yes"),
                InlineKeyboardButton("No, gracias", callback_data="interest_no"),
            ]]),
        )
        return STATE_INTEREST

    # ── TIER: PROMISING CHANNEL (€15–€149/post) ──
    if tier == "prometedor":
        await query.edit_message_text(
            result_text + "\n\n"
            "━━━━━━━━━━━━━━━━━━━━━\n\n"
            "Tu canal tiene números sólidos. Los anunciantes de "
            f"_{niche_name}_ están buscando canales como el tuyo "
            "para llegar a su audiencia.\n\n"
            "La pregunta es: *¿estás cobrando lo que vale?*\n\n"
            "¿Cobras publicidad en tu canal ahora mismo?",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("Sí, ya cobro", callback_data="ya_cobra"),
                InlineKeyboardButton("No, todavía no", callback_data="no_cobra"),
            ]]),
        )
        return STATE_YA_COBRA

    # ── TIER: SUPER CANAL (€150+/post) ──
    await query.edit_message_text(
        result_text + "\n\n"
        "🏆 *Tu canal está en el TOP de Telegram España.*\n\n"
        "━━━━━━━━━━━━━━━━━━━━━\n\n"
        f"Con *{fmt(precio_post)}* por publicación, tu canal está "
        "en el rango de los canales premium que los anunciantes "
        "buscan primero.\n\n"
        "Cada mes que pasa sin monetizar correctamente, "
        f"estás dejando *{fmt(ingreso_mensual)}* sobre la mesa.\n"
        f"Al año eso son *{fmt(ingreso_anual)}* que no recuperas.\n\n"
        "¿Cobras publicidad en tu canal ahora mismo?",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup([[
            InlineKeyboardButton("Sí, ya cobro", callback_data="ya_cobra"),
            InlineKeyboardButton("No, todavía no", callback_data="no_cobra"),
        ]]),
    )
    return STATE_YA_COBRA


# ── Already charging / Not charging ──────────────────────────────

async def handle_ya_cobra(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()
    tier = context.user_data["tier"]

    if query.data == "ya_cobra":
        context.user_data["ya_cobra"] = True
        await upsert_lead(context.user_data["telegram_user_id"], {"ya_cobra": True})

        keyboard = [
            [
                InlineKeyboardButton("Menos de €50", callback_data="rango_menos_50"),
                InlineKeyboardButton("€50–€100", callback_data="rango_50_100"),
            ],
            [
                InlineKeyboardButton("€100–€200", callback_data="rango_100_200"),
                InlineKeyboardButton("Más de €200", callback_data="rango_mas_200"),
            ],
        ]
        await query.edit_message_text(
            "¿Cuánto cobras aproximadamente por post?",
            reply_markup=InlineKeyboardMarkup(keyboard),
        )
        return STATE_CUANTO_COBRA

    # ── Not charging yet ──
    context.user_data["ya_cobra"] = False
    await upsert_lead(context.user_data["telegram_user_id"], {
        "ya_cobra": False, "estado": "interesado",
    })

    precio_post = context.user_data["precio_post"]
    ingreso_mensual = context.user_data["ingreso_mensual"]

    if tier == "super_canal":
        text = (
            f"Tu canal vale *{fmt(precio_post)}* por publicación "
            "y no está generando ni un euro.\n\n"
            "Voy a ser directo: canales con tus números son "
            "exactamente lo que buscan los anunciantes premium "
            f"de {context.user_data['niche_name']}.\n\n"
            f"Solo quedan *{FOUNDERS_REMAINING} plazas* de las "
            f"{FOUNDERS_TOTAL} del programa de Canales Fundadores:\n\n"
            "✅ *10% de comisión* permanente (vs 15% estándar)\n"
            "✅ Prioridad en campañas premium\n"
            "✅ *€10 de bono de bienvenida* en créditos\n"
            "✅ *€10 por cada canal* que refieras y se registre\n"
            "✅ Pago garantizado antes de publicar\n\n"
            "Los canales fundadores se están llenando. "
            "Un canal como el tuyo no debería quedarse fuera.\n\n"
            "¿Quieres reservar tu plaza de fundador?"
        )
    else:  # prometedor
        text = (
            f"Tu canal tiene un potencial real de *{fmt(precio_post)}* "
            "por post y no está generando ingresos.\n\n"
            "El problema no es la demanda — hay anunciantes buscando "
            f"canales de {context.user_data['niche_name']} ahora mismo. "
            "Lo que falta es un sistema que los conecte contigo.\n\n"
            "Eso es exactamente lo que hace ChannelAd:\n\n"
            "✅ Matching automático con anunciantes de tu nicho\n"
            "✅ Pago garantizado antes de publicar\n"
            "✅ Tú decides qué campañas aceptas\n"
            "✅ *€10 de bono de bienvenida* en créditos\n"
            "✅ *€10 por cada canal* que invites y se registre\n\n"
            f"Ahora mismo hay *{FOUNDERS_REMAINING} plazas* disponibles "
            "en el programa de Canales Fundadores "
            "(10% comisión permanente en lugar del 15% estándar).\n\n"
            "¿Te interesa?"
        )

    await query.edit_message_text(
        text,
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup([[
            InlineKeyboardButton("Sí, quiero entrar", callback_data="interest_yes"),
            InlineKeyboardButton("No por ahora", callback_data="interest_no"),
        ]]),
    )
    return STATE_INTEREST


async def handle_cuanto_cobra(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()

    rango_key = query.data.replace("rango_", "")
    rango_name, rango_min, rango_max = PRICE_RANGES[rango_key]
    tier = context.user_data["tier"]

    context.user_data["rango_actual"] = rango_name
    await upsert_lead(context.user_data["telegram_user_id"], {
        "rango_actual": rango_name, "estado": "interesado",
    })

    precio_mercado = context.user_data["precio_post"]
    mid_range = (rango_min + rango_max) / 2

    if mid_range < precio_mercado * 0.8:
        # Undercharging
        diff_min = max(precio_mercado - rango_max, 0)
        diff_max = precio_mercado - rango_min

        if tier == "super_canal":
            text = (
                f"Según datos de mercado tu canal vale "
                f"*{fmt(precio_mercado)}* por post.\n\n"
                f"Si cobras {rango_name}, estás dejando entre "
                f"*{fmt(diff_min)}* y *{fmt(diff_max)}* en cada publicación.\n\n"
                "Con 3 posts al mes, eso es entre "
                f"*{fmt(diff_min * 3)}* y *{fmt(diff_max * 3)}* "
                "mensuales que se pierden.\n\n"
                "Tu canal es de los que los anunciantes premium "
                "buscan primero. No deberías negociar precios: "
                "deberías fijarlos.\n\n"
                f"*Quedan {FOUNDERS_REMAINING} plazas* en el programa "
                "de Canales Fundadores:\n\n"
                "✅ Precio calculado automáticamente por algoritmo\n"
                "✅ *10% de comisión* permanente (vs 15%)\n"
                "✅ Prioridad en campañas premium\n"
                "✅ *€10 bono de bienvenida* + *€10 por referido*\n"
                "✅ Pago garantizado antes de publicar\n\n"
                "¿Quieres asegurar tu plaza?"
            )
        else:
            text = (
                f"El precio de mercado para tu canal es "
                f"*{fmt(precio_mercado)}* por post.\n\n"
                f"Cobrando {rango_name} estás dejando entre "
                f"*{fmt(diff_min)}* y *{fmt(diff_max)}* por publicación.\n\n"
                "ChannelAd calcula el precio justo automáticamente "
                "y te conecta con anunciantes que lo pagan:\n\n"
                "✅ Matching con anunciantes de tu nicho\n"
                "✅ Pago garantizado antes de publicar\n"
                "✅ *€10 de bienvenida* + *€10 por referido*\n\n"
                f"*{FOUNDERS_REMAINING} plazas* disponibles como "
                "Canal Fundador (10% comisión permanente).\n\n"
                "¿Te interesa?"
            )
    else:
        # Charging correctly
        if tier == "super_canal":
            text = (
                "Bien, conoces el valor de tu audiencia. 👌\n\n"
                "Lo que ChannelAd añade a canales premium como el tuyo:\n\n"
                "🔹 *Flujo constante* de anunciantes de tu nicho "
                "— sin buscarlos tú\n"
                "🔹 *Pago garantizado* antes de publicar\n"
                "🔹 Dashboard con métricas de rendimiento\n"
                "🔹 *€10 por cada canal* que refieras\n\n"
                f"Solo *{FOUNDERS_REMAINING} plazas* de fundador disponibles "
                "(10% comisión permanente vs 15% estándar).\n\n"
                "Un canal como el tuyo merece estar en el grupo fundador.\n\n"
                "¿Quieres reservar tu plaza?"
            )
        else:
            text = (
                "Bien, sabes valorar tu audiencia. 👌\n\n"
                "Lo que ChannelAd añade es previsibilidad: "
                "matching automático con anunciantes de tu nicho, "
                "sin buscarlos tú, y pago garantizado.\n\n"
                "✅ *€10 de bono de bienvenida*\n"
                "✅ *€10 por cada canal* que invites\n\n"
                f"Hay *{FOUNDERS_REMAINING} plazas* abiertas como "
                "Canal Fundador (10% comisión permanente).\n\n"
                "¿Te interesa?"
            )

    await query.edit_message_text(
        text,
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup([[
            InlineKeyboardButton("Sí, quiero entrar", callback_data="interest_yes"),
            InlineKeyboardButton("No por ahora", callback_data="interest_no"),
        ]]),
    )
    return STATE_INTEREST


# ── Interest handler (with last-chance nudge on "no") ────────────

async def handle_interest(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()

    if query.data == "interest_yes":
        tier = context.user_data.get("tier", "prometedor")
        if tier == "pequeno":
            await query.edit_message_text(
                "Genial. Déjame tu email y te envío acceso "
                "a las métricas gratuitas de tu canal.\n\n"
                "Cuando tu canal supere el umbral, serás el primero "
                "en enterarte. 🚀"
            )
        else:
            await query.edit_message_text(
                "Perfecto. ¿A qué email te enviamos los detalles "
                "para completar tu registro como Canal Fundador?\n\n"
                "_(Recibirás el acceso a la plataforma + tu bono "
                "de bienvenida de €10)_",
                parse_mode="Markdown",
            )
        return STATE_EMAIL

    # ── First "no" → LAST CHANCE nudge ──
    tier = context.user_data.get("tier", "prometedor")
    precio_post = context.user_data.get("precio_post", 0)
    ingreso_anual = context.user_data.get("ingreso_anual", 0)

    if tier == "super_canal":
        text = (
            "Entiendo. Pero antes de irte, quiero que tengas "
            "un dato claro:\n\n"
            f"Cada año que pasa sin un sistema como ChannelAd, "
            f"tu canal deja de generar *{fmt(ingreso_anual)}*.\n\n"
            "No es una estimación optimista. Es el precio real "
            "que pagan los anunciantes por canales con tus métricas.\n\n"
            f"Las *{FOUNDERS_REMAINING} plazas* de fundador incluyen "
            "condiciones que no volverán a estar disponibles: "
            "10% de comisión permanente, prioridad en campañas "
            "premium y €10 de bono.\n\n"
            "¿Seguro que no quieres al menos ver cómo funciona?"
        )
    elif tier == "prometedor":
        text = (
            "Sin problema. Solo ten en cuenta que las plazas "
            "de fundador son limitadas y las condiciones no se "
            "repetirán.\n\n"
            f"Tu canal puede generar *{fmt(precio_post)}* por post "
            "con el sistema adecuado. El registro tarda 2 minutos "
            "y el bono de €10 es inmediato.\n\n"
            "¿Seguro?"
        )
    else:
        text = (
            "Entendido. De todas formas, las métricas gratuitas "
            "te ayudarán a saber exactamente qué mejorar.\n\n"
            "Sin compromiso, sin coste. ¿Seguro que no quieres "
            "acceso?"
        )

    await query.edit_message_text(
        text,
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup([[
            InlineKeyboardButton("Vale, me apunto", callback_data="lastchance_yes"),
            InlineKeyboardButton("No, gracias", callback_data="lastchance_no"),
        ]]),
    )
    return STATE_LAST_CHANCE


async def handle_last_chance(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()

    if query.data == "lastchance_yes":
        tier = context.user_data.get("tier", "prometedor")
        if tier == "pequeno":
            await query.edit_message_text(
                "Genial. Déjame tu email y te envío acceso "
                "a las métricas gratuitas:"
            )
        else:
            await query.edit_message_text(
                "Buena decisión. ¿A qué email te envío "
                "los detalles del registro?\n\n"
                "_(Recibirás acceso + bono de €10)_",
                parse_mode="Markdown",
            )
        return STATE_EMAIL

    # ── Final no — accept gracefully ──
    await upsert_lead(context.user_data["telegram_user_id"], {
        "estado": "no_interesado",
    })

    await query.edit_message_text(
        "Perfecto, sin problema.\n\n"
        "Si en algún momento cambias de opinión, "
        "escribe /start y recalculamos.\n\n"
        "También puedes escribirme directamente: @rafafe43\n\n"
        "Suerte con tu canal 🙌"
    )
    return ConversationHandler.END


# ── Email capture ────────────────────────────────────────────────

async def receive_email(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    text = update.message.text.strip()

    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", text):
        await update.message.reply_text(
            "Ese email no parece correcto. Introdúcelo de nuevo:"
        )
        return STATE_EMAIL

    tier = context.user_data.get("tier", "prometedor")

    await upsert_lead(context.user_data["telegram_user_id"], {
        "email": text,
        "estado": "lead_capturado",
    })

    channel = context.user_data.get("channel_username", "")
    niche = context.user_data.get("niche_name", "")
    precio = context.user_data.get("precio_post", 0)
    mensual = context.user_data.get("ingreso_mensual", 0)

    logger.info(
        "LEAD CAPTURADO [%s]: %s — %s — %s/post — %s/mes — %s",
        tier.upper(), channel, niche, fmt(precio), fmt(mensual), text,
    )

    # Generate secure registration token and get special URL
    reg_url = await generate_registration_token(text, context.user_data)

    if tier == "super_canal":
        await update.message.reply_text(
            f"✅ *¡Hecho, {text}!*\n\n"
            "Tu plaza de Canal Fundador está pre-reservada.\n\n"
            "👉 *Completa tu registro ahora* para activar "
            "tu bono de €10 y empezar a recibir campañas:\n\n"
            f"🔗 [Registrarse como Fundador]({reg_url})\n\n"
            "⚠️ *Este enlace es personal, válido 48h y de un solo uso.* "
            "Solo con él se activan los beneficios de fundador.\n\n"
            "El registro tarda 2 minutos. En cuanto lo completes, "
            "nuestro equipo revisará tu canal y te activamos "
            "con prioridad.\n\n"
            "¿Dudas? Escríbeme directamente: @rafafe43\n\n"
            "━━━━━━━━━━━━━━━━━━━━━\n"
            "💡 *Dato:* invita otros canales y gana €10 "
            "por cada uno que se registre. Sin límite.",
            parse_mode="Markdown",
            disable_web_page_preview=True,
        )
    elif tier == "prometedor":
        await update.message.reply_text(
            f"✅ *Perfecto, {text} registrado!*\n\n"
            "👉 *Siguiente paso* — completa tu registro "
            "para activar el bono de €10:\n\n"
            f"🔗 [Completar registro]({reg_url})\n\n"
            "⚠️ *Enlace personal, válido 48h y de un solo uso.*\n\n"
            "Tarda 2 minutos. Una vez dentro, empezarás "
            "a recibir propuestas de anunciantes de tu nicho.\n\n"
            "¿Conoces otros creadores de canales? "
            "Invítalos y gana *€10 por cada registro*.\n\n"
            "Cualquier duda: @rafafe43",
            parse_mode="Markdown",
            disable_web_page_preview=True,
        )
    else:  # pequeno
        await update.message.reply_text(
            f"✅ *Listo, {text} anotado!*\n\n"
            "👉 Regístrate para acceder a las métricas "
            "gratuitas de tu canal:\n\n"
            f"🔗 [Acceder a métricas gratis]({reg_url})\n\n"
            "⚠️ *Enlace personal, válido 48h.*\n\n"
            "Verás exactamente qué posts funcionan mejor, "
            "en qué horario publicar y cómo crece tu audiencia.\n\n"
            "Cuando tu canal alcance el umbral para monetizar, "
            "te avisamos automáticamente.\n\n"
            "Cualquier duda: @rafafe43",
            parse_mode="Markdown",
            disable_web_page_preview=True,
        )

    return ConversationHandler.END


# ── /leads command (admin only) ──────────────────────────────────

async def leads_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        await update.message.reply_text("⛔ No tienes permiso para usar este comando.")
        return

    db = await get_db()

    total = (await (await db.execute("SELECT COUNT(*) FROM leads")).fetchone())[0]
    pre = (await (await db.execute(
        "SELECT COUNT(*) FROM leads WHERE estado='pre_qualify'"
    )).fetchone())[0]
    calc = (await (await db.execute(
        "SELECT COUNT(*) FROM leads WHERE estado='calculado'"
    )).fetchone())[0]
    inter = (await (await db.execute(
        "SELECT COUNT(*) FROM leads WHERE estado='interesado'"
    )).fetchone())[0]
    captured = (await (await db.execute(
        "SELECT COUNT(*) FROM leads WHERE estado='lead_capturado'"
    )).fetchone())[0]
    no_int = (await (await db.execute(
        "SELECT COUNT(*) FROM leads WHERE estado='no_interesado'"
    )).fetchone())[0]

    # Tier breakdown
    t_super = (await (await db.execute(
        "SELECT COUNT(*) FROM leads WHERE tier='super_canal'"
    )).fetchone())[0]
    t_prom = (await (await db.execute(
        "SELECT COUNT(*) FROM leads WHERE tier='prometedor'"
    )).fetchone())[0]
    t_peq = (await (await db.execute(
        "SELECT COUNT(*) FROM leads WHERE tier='pequeno'"
    )).fetchone())[0]
    t_pre = (await (await db.execute(
        "SELECT COUNT(*) FROM leads WHERE tier='pre_qualify'"
    )).fetchone())[0]

    last = await (await db.execute(
        "SELECT channel_username, ingreso_potencial_mensual, niche, tier, email "
        "FROM leads ORDER BY id DESC LIMIT 1"
    )).fetchone()
    await db.close()

    last_text = "N/A"
    if last:
        email_flag = " ✅" if last[4] else ""
        last_text = (
            f"{last[0]} — {fmt(last[1] or 0)}/mes — "
            f"{last[2] or 'N/A'} — {last[3] or 'N/A'}{email_flag}"
        )

    await update.message.reply_text(
        f"📊 *Resumen de leads — ChannelAd Bot*\n\n"
        f"*Total:* {total}\n"
        f"├ Pre-calificados: {pre}\n"
        f"├ Calcularon resultado: {calc}\n"
        f"├ Mostraron interés: {inter}\n"
        f"├ Email capturado: {captured} ✅\n"
        f"└ No interesados: {no_int}\n\n"
        f"*Por tier:*\n"
        f"🏆 Super Canal: {t_super}\n"
        f"⭐ Prometedor: {t_prom}\n"
        f"🌱 Pequeño: {t_peq}\n"
        f"🔸 Pre-qualify: {t_pre}\n\n"
        f"*Último lead:* {last_text}",
        parse_mode="Markdown",
    )


# ── Fallback ─────────────────────────────────────────────────────

async def fallback_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Escribe /start para calcular el potencial de tu canal."
    )


# ── Main ─────────────────────────────────────────────────────────

def main():
    if not BOT_TOKEN:
        logger.error("BOT_TOKEN no configurado en .env")
        return

    app = Application.builder().token(BOT_TOKEN).build()

    conv = ConversationHandler(
        entry_points=[
            CommandHandler("start", start),
        ],
        states={
            STATE_CHANNEL: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, receive_channel),
            ],
            STATE_VIEWS: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, receive_views),
            ],
            STATE_NICHE: [
                CallbackQueryHandler(receive_niche, pattern=r"^niche_"),
            ],
            STATE_YA_COBRA: [
                CallbackQueryHandler(handle_ya_cobra, pattern=r"^(ya_cobra|no_cobra)$"),
            ],
            STATE_CUANTO_COBRA: [
                CallbackQueryHandler(handle_cuanto_cobra, pattern=r"^rango_"),
            ],
            STATE_INTEREST: [
                CallbackQueryHandler(handle_interest, pattern=r"^interest_"),
            ],
            STATE_LAST_CHANCE: [
                CallbackQueryHandler(handle_last_chance, pattern=r"^lastchance_"),
            ],
            STATE_EMAIL: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, receive_email),
            ],
        },
        fallbacks=[
            CommandHandler("start", start),
        ],
        allow_reentry=True,
        per_message=False,
    )

    app.add_handler(conv)
    app.add_handler(CommandHandler("leads", leads_command))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, fallback_text))

    asyncio.run(init_db())

    logger.info("ChannelAd Bot v2 iniciado. Esperando mensajes...")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
