# Guía de Configuración del Bridge para Denizen

## Problemas Identificados y Soluciones

### ✅ Problema 1: Denizen no recibe respuesta de la API
**Estado**: SOLUCIONADO

**Causa**: El script de Denizen original usaba `http://localhost:3001/api/v1`, pero:
- El Next.js corre en el puerto **3000** (interno)
- El Gateway expone el servicio externamente en el puerto **81**

**Solución**: Actualizado el script generado en RouterTab para usar `http://127.0.0.1:3000/api/v1`

### ⚠️ Problema 2: Error "LLM API error: 500 Internal Server Error"
**Estado**: CONFIGURACIÓN AGREGADA - REQUIERE LLM CORRIENDO

**Causa**: No había variables de entorno configuradas para el LLM.

**Solución aplicada**: Se han agregado las siguientes variables al archivo `.env`:
```env
LLM_API_URL=http://127.0.0.1:5000/v1/chat/completions
LLM_MODEL=local-model
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=2000
```

**IMPORTANTE**: Para que el sistema funcione completamente, necesitas:
1. Tener un servidor LLM corriendo (Text Generation WebUI, Oobabooga, etc.)
2. Configurar la URL correcta del servidor LLM en `LLM_API_URL`
3. Configurar el modelo correcto en `LLM_MODEL`

### ✅ Problema 3: Postman no conecta - Error ECONNREFUSED 127.0.0.1:81
**Estado**: SOLUCIONADO

**Causa**: Caddy en el puerto 81 solo escucha en IPv6 (`:::81`), no en IPv4 (`127.0.0.1:81`).

**Solución**: Usa una de las siguientes URLs en Postman:

#### Opción 1: Directo a Next.js (Recomendada para testing local)
```
http://127.0.0.1:3000/api/v1
```
✅ **Funciona** - Next.js escucha en IPv4 en el puerto 3000

#### Opción 2: Usando localhost (resuelve a IPv6)
```
http://localhost:81/api/v1
```
✅ **Funciona** - Si tu SO resuelve localhost a IPv6

#### Opción 3: IP de red con puerto del gateway
```
http://21.0.8.121:81/api/v1
```
✅ **Funciona** - IP de red con gateway en puerto 81

#### ❌ No usar:
```
http://127.0.0.1:81/api/v1
```
❌ **NO funciona** - Caddy no escucha IPv4 en puerto 81

## Ejemplos de CURL para Postman

### Health Check
```bash
# Opción 1 - Directo a Next.js (recomendado)
curl -X GET http://127.0.0.1:3000/api/v1

# Opción 2 - Through gateway (localhost IPv6)
curl -X GET http://localhost:81/api/v1

# Opción 3 - Through gateway (IP de red)
curl -X GET http://21.0.8.121:81/api/v1
```

**Respuesta esperada**:
```json
{
  "status": "ok",
  "service": "Bridge IA - Denizen API",
  "version": "1.0.0",
  "modes": [
    "chat",
    "resumen_sesion",
    "resumen_npc",
    "resumen_edificio",
    "resumen_pueblo",
    "resumen_mundo",
    "nuevo_lore"
  ]
}
```

### Prueba completa de Chat Trigger (CREA NUEVA SESIÓN)
```bash
curl -X POST http://127.0.0.1:3000/api/v1 \
  -H "Content-Type: application/json" \
  -H "accept: application/json" \
  -d '{
    "mode": "chat",
    "npcid": "NPC_1768825922617",
    "message": "hola, ¿cómo estás?",
    "jugador": {
      "nombre": "drAke",
      "raza": "Humano",
      "nivel": "10",
      "almakos": "1000",
      "deuda": "100",
      "piedras_del_alma": "5",
      "salud_actual": "10",
      "reputacion": "6",
      "hora": "10:30pm",
      "clima": "soleado"
    }
  }'
```

### Prueba de Chat Trigger con Sesión Existente
```bash
curl -X POST http://127.0.0.1:3000/api/v1 \
  -H "Content-Type: application/json" \
  -H "accept: application/json" \
  -d '{
    "mode": "chat",
    "npcid": "NPC_1768825922617",
    "playersessionid": "sesion_1234567890",
    "message": "hola, ¿cómo estás?",
    "jugador": {
      "nombre": "drAke",
      "raza": "Humano",
      "nivel": "10",
      "almakos": "1000",
      "deuda": "100",
      "piedras_del_alma": "5",
      "salud_actual": "10",
      "reputacion": "6",
      "hora": "10:30pm",
      "clima": "soleado"
    }
  }'
```

**Nota**: Si la sesión no existe, recibirás el error: `Session sesion_1234567890 not found`

### Respuestas del API

#### ✅ Éxito (cuando el LLM está corriendo)
```json
{
  "success": true,
  "data": {
    "response": "Hola! Soy el NPC. ¿En qué puedo ayudarte?",
    "sessionId": "SESSION_xxxxxxxxxx"
  }
}
```

#### ❌ Error de sesión no encontrada
```json
{
  "success": false,
  "error": "Session sesion_1234567890 not found"
}
```

#### ❌ Error de LLM no disponible (LLM no corriendo)
```json
{
  "success": false,
  "error": "fetch failed"
}
```

## Configuración del LLM

### Text Generation WebUI (Oobabooga)
1. Inicia Text Generation WebUI con la API habilitada
2. Verifica que esté corriendo en `http://127.0.0.1:5000`
3. Configura `.env`:
```env
LLM_API_URL=http://127.0.0.1:5000/v1/chat/completions
LLM_MODEL=local-model
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=2000
```

### OpenAI API
```env
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_MODEL=gpt-4
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=2000
```

### Otros proveedores compatibles con OpenAI API
- Anthropic (via proxy)
- Groq
- DeepSeek
- Mistral
- LocalAI
- LM Studio

## Script de Denizen Final

El script que se genera automáticamente en el dashboard:

```
- definemap headers 'Content-Type:application/json accept:application/json'
- definemap consulta:
    "mode": "chat"
    "npcid": "NPC_1768825922617"
    "playersessionid": "sesion_1234567890"
    "message": "hola, ¿cómo estás?"
    "jugador":
      "nombre": "drAke"
      "raza": "Humano"
      "nivel": "10"
      "almakos": "1000"
      "deuda": "100"
      "piedras_del_alma": "5"
      "salud_actual": "10"
      "reputacion": "6"
      "hora": "10:30pm"
      "clima": "soleado"
- ~webget http://127.0.0.1:3000/api/v1 data:<[consulta].to_json> headers:<[headers]> save:response
```

## Resumen de Cambios

1. ✅ **Configuración LLM**: Agregadas variables de entorno al `.env`
2. ✅ **Endpoint `/api/v1`**: Funciona correctamente y recibe peticiones externas
3. ✅ **Gateway**: El puerto 81 expone el servicio externamente (IPv6)
4. ✅ **RouterTab**: Actualizado para generar script con puerto 3000 (compatible IPv4)
5. ✅ **Postman**: Múltiples opciones de conexión disponibles
6. ⚠️ **LLM**: Requiere que el servidor LLM esté corriendo para funcionar completamente

## Opciones de Conexión

### Para Postman (testing desde tu máquina)
Usa esta URL:
```
http://127.0.0.1:3000/api/v1
```
Esta es la opción más confiable porque Next.js escucha en IPv4 en el puerto 3000.

### Para Denizen (en la misma máquina que el Bridge)
El script generado usa:
```
http://127.0.0.1:3000/api/v1
```

### Para Denizen (en otra máquina en la red)
Cambia la URL en el script a:
```
http://21.0.8.121:81/api/v1
```
Reemplaza `21.0.8.121` con la IP real de tu máquina del Bridge.

### Para aplicaciones externas (fuera de tu red)
Necesitas:
1. Configurar port forwarding en tu router
2. Usar tu IP pública
3. Considerar configurar HTTPS/SSL
4. O usar un servicio de tunel (ngrok, cloudflared, etc.)

## Próximos Pasos

Para tener el sistema completamente funcional:

1. **Iniciar un servidor LLM** (Text Generation WebUI, Oobabooga, etc.)
2. **Verificar que el LLM responde**:
   ```bash
   curl http://127.0.0.1:5000/v1/models
   ```
3. **Probar el API del Bridge con Postman**:
   ```bash
   curl -X POST http://127.0.0.1:3000/api/v1 \
     -H "Content-Type: application/json" \
     -H "accept: application/json" \
     -d '{"mode": "chat", "npcid": "NPC_1768825922617", "message": "hola"}'
   ```
4. **Usar el script de Denizen** en tu servidor de Minecraft con Denizen

## Troubleshooting

### Error: "LLM API error: 500 Internal Server Error"
**Causa**: El servidor LLM no está corriendo o la URL es incorrecta.

**Solución**:
1. Verifica que el LLM esté corriendo
2. Prueba la URL del LLM directamente:
   ```bash
   curl http://127.0.0.1:5000/v1/models
   ```
3. Actualiza `LLM_API_URL` en `.env` si la URL es diferente

### Error: "fetch failed"
**Causa**: El Bridge no puede conectar con el LLM.

**Solución**: Mismo que arriba - verifica que el LLM esté corriendo y accesible.

### Error: ECONNREFUSED 127.0.0.1:81
**Causa**: Caddy solo escucha en IPv6 en el puerto 81, no en IPv4.

**Solución**: Usa `http://127.0.0.1:3000/api/v1` en su lugar.

### Error de CORS
**Causa**: El navegador está bloqueando la petición.

**Nota**: Esto NO aplica cuando Denizen o Postman hacen la petición directamente. Solo aplica si haces peticiones desde el navegador. Denizen hace peticiones directas sin CORS.

### Denizen no recibe respuesta
**Causa**: URL incorrecta en el script.

**Solución**: Asegúrate de usar una de estas URLs válidas:
- `http://127.0.0.1:3000/api/v1` (si Denizen está en la misma máquina)
- `http://21.0.8.121:81/api/v1` (si Denizen está en otra máquina en la red)
- Reemplaza `21.0.8.121` con la IP correcta de tu máquina

## Verificación de Puertos

Puedes verificar qué puertos están escuchando:
```bash
netstat -tuln | grep -E ":(81|3000|5000)"
# o
ss -tuln | grep -E ":(81|3000|5000)"
```

Deberías ver algo como:
```
tcp6       0      0 :::81                   :::*                    LISTEN
tcp6       0      0 :::3000                 :::*                    LISTEN
tcp6       0      0 :::5000                 :::*                    LISTEN
```

- **Puerto 3000**: Next.js (escucha IPv6)
- **Puerto 81**: Caddy Gateway (escucha IPv6)
- **Puerto 5000**: LLM (si está corriendo)
