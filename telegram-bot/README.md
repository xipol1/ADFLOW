# ChannelAd Telegram Bot

Bot de cualificacion de leads para propietarios de canales de Telegram.
Calcula el potencial de ingresos publicitarios y captura leads interesados.

## Requisitos

- Python 3.11+
- Token de bot de Telegram (via @BotFather)

## Instalacion rapida

```bash
# 1. Instalar dependencias
pip install -r requirements.txt

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tu BOT_TOKEN y ADMIN_ID

# 3. Ejecutar
python main.py
```

## Variables de entorno

| Variable    | Descripcion                          |
|-------------|--------------------------------------|
| `BOT_TOKEN` | Token del bot de @BotFather          |
| `ADMIN_ID`  | Tu Telegram ID numerico (para /leads)|
| `DB_PATH`   | Ruta de la base de datos SQLite      |

## Obtener tu ADMIN_ID

Busca `@userinfobot` en Telegram y te dara tu ID numerico.

## Despliegue en VPS

```bash
# Subir archivos
scp main.py requirements.txt .env user@server:/opt/channelad-bot/

# En el servidor
cd /opt/channelad-bot
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Crear servicio systemd (ver instrucciones al final de main.py)
```

## Comandos del bot

- `/start` — Inicia el flujo de cualificacion
- `/leads` — (Solo admin) Muestra resumen de leads capturados
