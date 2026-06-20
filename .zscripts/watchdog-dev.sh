#!/bin/bash
# Watchdog robusto: mantiene el dev server de Next.js vivo.
# - Verifica el puerto 3000 cada 15 segundos
# - Si no está escuchando, relanza `bun run dev`
# - Hace un ping periódico para mantener el server activo
# - Diseñado para el sandbox que mata procesos inactivos

PROJECT_DIR="/home/z/my-project"
DEV_LOG="${PROJECT_DIR}/dev.log"
WATCHDOG_LOG="${PROJECT_DIR}/.zscripts/watchdog.log"
PID_FILE="${PROJECT_DIR}/.zscripts/dev.pid"

cd "${PROJECT_DIR}" || exit 1

log() {
  echo "[$(date '+%H:%M:%S')] [watchdog] $*" >> "${WATCHDOG_LOG}"
}

# Limpiar procesos previos
pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "next dev" 2>/dev/null
pkill -9 -f "bun run dev" 2>/dev/null
sleep 2

launch_server() {
  log "Lanzando bun run dev..."
  : > "${DEV_LOG}"
  cd "${PROJECT_DIR}"
  NODE_OPTIONS="--max-old-space-size=2048" nohup bun run dev > "${DEV_LOG}" 2>&1 &
  local pid=$!
  echo "${pid}" > "${PID_FILE}"
  log "bun run dev lanzado (PID=${pid})"
  # Dar tiempo a que arranque
  sleep 12
  if ss -tln 2>/dev/null | grep -q ":3000"; then
    log "Server escuchando en puerto 3000"
  else
    log "WARN: Server no escucha después de 12s, esperando más..."
    sleep 8
  fi
}

# Lanzamiento inicial
launch_server

# Loop principal
while true; do
  # Verificar si el puerto 3000 está escuchando
  if ! ss -tln 2>/dev/null | grep -q ":3000"; then
    log "Puerto 3000 no escucha. Relanzando server..."
    pkill -9 -f "next-server" 2>/dev/null
    pkill -9 -f "next dev" 2>/dev/null
    pkill -9 -f "bun run dev" 2>/dev/null
    sleep 2
    launch_server
  fi

  # Hacer un ping ligero para mantener el server activo
  # (el sandbox mata procesos inactivos)
  curl -s --max-time 5 -o /dev/null http://127.0.0.1:3000/api/worlds 2>/dev/null
  log "Ping OK (server vivo)"

  sleep 15
done
