#!/bin/bash
# Keepalive loop: relanza next dev si no está escuchando el puerto 3000
while true; do
  if ! ss -tln 2>/dev/null | grep -q ":3000"; then
    # El puerto no está escuchando, lanzar next dev
    pkill -9 -f "next-server" 2>/dev/null
    pkill -9 -f "next dev" 2>/dev/null
    sleep 1
    cd /home/z/my-project
    NODE_OPTIONS="--max-old-space-size=1024" nohup ./node_modules/.bin/next dev -p 3000 > /home/z/my-project/dev.log 2>&1 &
    echo "[$(date '+%H:%M:%S')] [keepalive] Relanzado next dev (PID=$!)"
  fi
  sleep 10
done
