# 🪟 Guia de Inicio para Windows

## Inicio Rapido en Windows

**Opcion 1: Usar start.bat (RECOMENDADO)**

Doble click en `start.bat` desde el Explorador de Archivos
- Instala dependencias automaticamente
- Crea archivos de configuracion .env y .env.local
- Inicia el servidor en http://localhost:3000

**Opcion 2: Ejecutar comandos manualmente**

Abre PowerShell o CMD en el directorio del proyecto y ejecuta:
```powershell
npm run dev
```

---

## Archivos de Configuracion

El proyecto usa DOS archivos de configuracion con propositos diferentes:

### 1. `.env` - Configuracion General
**Proposito**: Variables de entorno generales (se pueden commitear al repo)
**Contenido**:
- `DATABASE_URL` - URL de base de datos SQLite
- `LANCEDB_PATH` - Ruta de LanceDB
- `EMBEDDING_PROVIDER` - Proveedor de embeddings (ollama o textgen)
- `OLLAMA_URL`, `OLLAMA_MODEL`, etc. - Configuracion de embeddings
- Variables generales de Next.js

### 2. `.env.local` - Configuracion Local (SENSIBLE)
**Proposito**: Variables especificas de TU entorno (NO se deben commitear al repo)
**Contenido**:
- `LLM_API_URL` - URL de la API de LLM (http://127.0.0.1:5000/v1/chat/completions)
- `LLM_MODEL` - Modelo de LLM (local-model)
- `LLM_TEMPERATURE` - Temperatura de generacion (0.7)
- `LLM_MAX_TOKENS` - Maximos tokens (2048)
- Overrides especificos del usuario

### 3. `.env.example` - Plantilla de Ejemplo
**Proposito**: Plantilla con todos los valores posibles y comentarios
**Uso**: Copiar a `.env` y `.env.local` para crear nuevos archivos

---

## Por que DOS archivos .env?

### `.env` - Base del Proyecto
- Contiene configuraciones que son comunes a todos los desarrolladores
- Se puede commitear al repositorio (no contiene secretos sensibles)
- Valores basicos como DATABASE_URL, paths de servicios

### `.env.local` - Tu Configuracion Personal
- Contiene configuraciones especificas de TU entorno
- NO se debe commitear al repositorio
- URLs de LLM, API keys, configuraciones personalizadas
- Puede sobrescribir valores de .env

### `.env.local` tiene PRIORIDAD
- En Next.js, las variables en `.env.local` tienen prioridad sobre `.env`
- Esto permite tener configuraciones por defecto en `.env`
- Y personalizaciones especificas en `.env.local` sin modificar `.env`

---

## Estructura de Archivos

```
esparcraft-bridge/
├── .env                  ← Configuracion general (DB, embeddings, etc.)
├── .env.local           ← Tu config personal (LLM API, overrides) ← PRIORIDAD
├── .env.example          ← Plantilla con todos los valores posibles
├── .gitignore           ← EXCLUDE .env.local para que no se commitee
├── start.bat              ← Script de inicio para Windows
├── db/                   ← Base de datos SQLite
├── data/
│   └── embeddings/       ← Datos de LanceDB
└── ... resto del proyecto
```

---

## Flujo de Prioridad de Configuracion

```
1. Next.js carga .env
2. Next.js carga .env.local
3. Si hay valores duplicados, .env.local SOBREESCRIBE .env
```

**Ejemplo**:
- `.env`: `DATABASE_URL="file:./db/dev.db"`
- `.env.local`: `DATABASE_URL="file:./db/custom.db"`

**Resultado**: Se usara `"file:./db/custom.db"` (de .env.local)

---

## Inicio con start.bat

### Paso 1: Doble Click en start.bat
```
Doble click desde Explorador de Archivos
```

### Paso 2: El script hace automaticamente:
1. [✓] Detecta si Node.js esta instalado
2. [✓] Detecta si Bun esta instalado (recomendado)
3. [✓] Verifica/crea archivos .env y .env.local
4. [✓] Crea directorios necesarios (data, db, logs)
5. [✓] Instala dependencias (node_modules)
6. [✓] Verifica/instala LanceDB
7. [✓] Genera cliente Prisma
8. [✓] Inicia servidor en http://localhost:3000

### Paso 3: Abre el navegador
```
Visita: http://localhost:3000
```

---

## Inicio Manual (PowerShell o CMD)

### Opcion 1: Con npm (compatible con todos los sistemas)
```powershell
# Abre PowerShell en el directorio del proyecto
cd C:\ruta\a\esparcraft-bridge

# Ejecutar
npm run dev

# O si prefieres ejecutar setup primero
node setup.js
npm run dev
```

### Opcion 2: Con Bun (mas rapido, solo Windows)
```powershell
# Instalar Bun si no esta instalado
curl -fsSL https://bun.sh/install | powershell

# Ejecutar
bun run dev

# O ejecutar setup primero
node setup.js
bun run dev
```

---

## Personalizacion de Configuracion

### Cambiar URL de LLM
Edita `.env.local`:
```env
LLM_API_URL=http://tu-url:5000/v1/chat/completions
```

### Cambiar temperatura de LLM
Edita `.env.local`:
```env
LLM_TEMPERATURE=0.5
# Valores comunes: 0.5 (mas preciso), 0.7 (equilibrado), 1.0 (mas creativo)
```

### Cambiar base de datos (NO RECOMENDADO)
Si cambias la ruta de DB, asegurate que el directorio exista:

```env
# En .env
DATABASE_URL="file:./db/mi-base-de-datos.db"
```

**Nota**: Por defecto se usa `file:./db/dev.db` que se crea automaticamente

---

## Problemas Comunes en Windows

### Problema: "No se encontro modulo 'lancedb'"
**Solucion 1**: Usa start.bat (instala automaticamente)
```cmd
start.bat
```

**Solucion 2**: Instalar manualmente con npm
```powershell
npm install lancedb
npm run dev
```

**Solucion 3**: Reinstalar todo
```powershell
rm -r node_modules
rm package-lock.json
npm install
npm run dev
```

### Problema: "Cannot find module 'prisma'"
**Solucion**:
```powershell
npm run db:generate
npm run dev
```

### Problema: "Error: EACCES: permiso denegado"
**Solucion**:
1. Ejecutar PowerShell como Administrador
2. O desactivar temporalmente el antivirus
3. Ejecutar start.bat de nuevo

### Problema: "Port 3000 already in use"
**Solucion 1**: Cierra el servidor anterior (Ctrl+C)
```powershell
# Presiona Ctrl+C en la terminal donde corre el servidor
```

**Solucion 2**: Mata el proceso que ocupa el puerto
```powershell
# Buscar el proceso
tasklist | find "node"

# Matar el proceso
taskkill /F /IM node.exe

# Ejecutar de nuevo
npm run dev
```

---

## Actualizacion del Proyecto

### Para actualizar desde el repositorio
```powershell
# 1. Guardar tus configuraciones
# Copia .env.local a un lugar seguro

# 2. Descargar cambios
git pull

# 3. Restaurar configuraciones
# Pega tu .env.local de nuevo

# 4. Iniciar
start.bat
```

### Cuando cambias de maquina o servidor
```powershell
# 1. Clonar el proyecto
git clone <repositorio>
cd esparcraft-bridge

# 2. Ejecutar start.bat
start.bat

# 3. Configurar si es necesario
# Editar .env.local con tu URL de LLM, etc.
```

---

## Recomendaciones para Windows

### 1. Usar PowerShell en lugar de CMD
```powershell
# Abre PowerShell (Win+X, busca "PowerShell")
cd C:\ruta\a\esparcraft-bridge
npm run dev
```

### 2. Ejecutar como Administrador (solo primera vez)
```powershell
# Click derecho en PowerShell
# "Ejecutar como administrador"
```

### 3. Desactivar analisis en tiempo real del antivirus
```
Configura el antivirus para excluir:
- C:\ruta\a\esparcraft-bridge
- node_modules
- .next
```

---

## Scripts Disponibles

| Comando | Descripcion |
|---------|------------|
| `start.bat` | Inicio automatico completo para Windows |
| `node setup.js` | Solo setup sin iniciar servidor |
| `npm run dev` | Inicio con npm (Windows, Linux, macOS) |
| `npm run dev:quick` | Inicio rapido con npm (sin setup completo) |
| `npm run build` | Construir para produccion |
| `npm run start` | Iniciar produccion con npm |

---

## Verificacion del Inicio

Despues de ejecutar start.bat, verifica:

- [ ] PowerShell/Command Prompt se abre automaticamente
- [ ] Muestra "Node.js detectado"
- [ ] Crea archivos .env y .env.local si no existen
- [ ] Instala dependencias si no existen
- [ ] Genera cliente Prisma si es necesario
- [ ] Inicia servidor en http://localhost:3000
- [ ] Navegador muestra la aplicacion

---

## Logs y Depuracion

### Ver logs del servidor
```powershell
# En tiempo real
Get-Content dev.log -Wait -Tail 10

# Ultimas lineas
Get-Content dev.log -Tail 50
```

### Log de desarrollo
```powershell
type dev.log | more
```

### Logs antiguos
```powershell
type logs\dev.log | more
```

---

## Resumen

### Para DESARROLLO en Windows:
```powershell
# Opcion 1: Automatico (RECOMENDADO)
start.bat

# Opcion 2: Manual
npm run dev
```

### Archivos Clave:
- **start.bat** - Script de inicio para Windows
- **.env** - Configuracion general (commiteable)
- **.env.local** - Tu config personal (NO commiteable) ← IMPORTANTE
- **.env.example** - Plantilla con ejemplos

### Reglas de Oro:
1. **.env.local tiene prioridad** - Sobreescribe valores de .env
2. **Nunca commitear .env.local** - Contiene tus configuraciones personales
3. **Editar .env.local para personalizaciones** - No .env
4. **Usar start.bat en Windows** - Detecta todo automaticamente

---

## Ayuda

Si tienes problemas:

1. **Limpia e instala de nuevo**:
   ```powershell
   rm -r node_modules
   rm package-lock.json
   start.bat
   ```

2. **Verifica configuracion**:
   - Revisa .env.local
   - Confirma que las URLs son correctas
   - Verifica que Node.js esta instalado

3. **Verifica logs**:
   ```powershell
   type dev.log
   ```

4. **Problemas de puerto**:
   ```powershell
   netstat -ano | find ":3000"
   tasklist | find "node"
   ```

---

**¡Listo para comenzar en Windows!** 🪟

Ejecuta `start.bat` y abre http://localhost:3000 en tu navegador.
