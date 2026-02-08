# Inicializacion Automatica de Esparcraft-Bridge

## Inicio Rapido (Primera Vez)

Solo ejecuta estos 3 comandos:

```bash
# 1. Ir al proyecto
cd /ruta/a/esparcraft-bridge

# 2. Iniciar (instala dependencias automaticamente)
npm run dev      # Si estas en Linux/macOS
# O
bun run dev       # Si estas en Windows con Bun

# 3. Abrir en navegador
# La app estara en http://localhost:3000
```

**Eso es todo!** El script de setup se encarga del resto.

---

## Compatibilidad Multi-Plataforma

### Windows (recomendado Bun)
```bash
bun run dev         # Inicio automatico (recomendado)
bun run dev:quick   # Inicio rapido (sin setup completo)
bun run build        # Construir para produccion
bun run start        # Iniciar produccion
```

### Linux/macOS (recomendado npm)
```bash
npm run dev          # Inicio automatico (recomendado)
npm run dev:quick    # Inicio rapido (sin setup completo)
npm run build        # Construir para produccion
npm run start        # Iniciar produccion
```

---

## ¿Que hace el setup automatico?

Cuando ejecutas `npm run dev` o `bun run dev`, el script `setup.js` se ejecuta automaticamente y:

**1. Detecta el sistema operativo**
   - Windows: usa Bun si esta disponible
   - Linux/macOS: usa npm (siempre funciona)
   - Automaticamente detecta que gestor usar

**2. Verifica e instala dependencias**
   - Si `node_modules` no existe, ejecuta install
   - Usa bun si esta disponible (Windows)
   - Usa npm como fallback (Linux/macOS)
   - Si un gestor falla, intenta con el otro

**3. Crea directorios necesarios**
   - `/data/embeddings` - Para LanceDB
   - `/logs` - Para logs de aplicacion
   - `/temp` - Para archivos temporales

**4. Inicializa base de datos**
   - Crea la base de datos SQLite de Prisma
   - Ejecuta migraciones iniciales

**5. Verifica configuracion**
   - Crea `.env` si no existe (copia de `.env.example`)
   - Verifica variables de entorno

---

## Scripts Disponibles

### Scripts de Inicio (Automatizados)

| Comando | Bun | npm | Descripcion |
|---------|-----|-----|------------|
| `setup` | ✅ | ✅ | Solo setup, sin iniciar servidor |
| `dev` | ✅ | ✅ | Inicio automatico completo |
| `dev:npm` | ❌ | ✅ | Inicio con npm forzado |
| `dev:quick` | ✅ | ❌ | Desarrollo rapido (sin setup completo) |
| `dev:quick:npm` | ❌ | ✅ | Desarrollo rapido con npm |

### Scripts de Produccion

| Comando | Bun | npm | Descripcion |
|---------|-----|-----|------------|
| `build` | ✅ | ✅ | Construir para produccion |
| `start` | ✅ | ❌ | Iniciar servidor de produccion |
| `start:npm` | ❌ | ✅ | Iniciar con npm |

### Scripts de Base de Datos

| Comando | Descripcion |
|---------|------------|
| `db:push` | Aplicar cambios al schema |
| `db:generate` | Generar cliente Prisma |
| `db:migrate` | Ejecutar migraciones |
| `db:reset` | Resetear base de datos |
| `db:init` | Crear DB con bun |
| `db:init:npm` | Crear DB con npm |
| `db:backup` | Crear backup |
| `db:restore` | Restaurar backup |

---

## Situaciones Específicas

### Caso 1: Primera vez en el proyecto
```bash
# Windows con Bun (recomendado)
bun run dev

# Linux/macOS con npm (recomendado)
npm run dev
```
**Tiempo estimado**: 2-5 minutos (instala dependencias + setup + inicio)

### Caso 2: Dependencias desactualizadas
```bash
# Windows
rm -rf node_modules bun.lockb
bun run dev

# Linux/macOS
rm -rf node_modules package-lock.json
npm run dev
```
**Reinstala todo y actualiza**

### Caso 3: Cambiando de servidor (Windows a Linux)
```bash
# En Linux
cd /ruta/a/proyecto
npm run dev         # Automatico: detecta Linux, usa npm
```
**No necesitas configurar nada manualmente**

### Caso 4: Cambiando de servidor (Linux a Windows)
```bash
# En Windows
cd /ruta/a/proyecto
bun run dev         # Automatico: detecta Windows, usa Bun
```
**Automaticamente detecta que usar**

### Caso 5: Solo necesitas verificar dependencias
```bash
# En cualquier sistema
node setup.js
```
**Ejecuta solo el setup sin iniciar servidor**

### Caso 6: Error de modulo no encontrado
```bash
# Si ves: "Module not found: Can't resolve 'lancedb'"
# En Windows
bun install lancedb
# En Linux/macOS
npm install lancedb
```

---

## Detecion Automatica de Gestor de Paquetes

El script `setup.js` detecta automaticamente que usar:

1. **Detecta si Bun esta disponible**
   ```bash
   bun --version
   ```

2. **Si Bun existe:**
   - Windows: Usa Bun (rapido)
   - Linux/macOS: Tambien usa Bun si esta instalado

3. **Si Bun no existe:**
   - Usa npm (compatible con todo)

4. **Si el gestor seleccionado falla:**
   - Intenta con el gestor alternativo
   - Muestra mensajes de error claros

---

## Estructura de Directorios

Despues del setup, tendras:

```
esparcraft-bridge/
├── node_modules/        ← Dependencias instaladas
├── data/
│   └── embeddings/     ← Datos de LanceDB
├── logs/                ← Logs de aplicacion
├── temp/                ← Archivos temporales
├── .env                 ← Variables de entorno
└── ... resto del proyecto
```

---

## Primer Inicio vs Reinicios Posteriores

### Primer inicio:
```bash
npm run dev    # Linux/macOS
# O
bun run dev     # Windows
```
**Tiempo estimado**: 2-5 minutos
- Instala dependencias (si es necesario)
- Crea directorios
- Inicializa base de datos
- Inicia servidor

### Reinicios posteriores:
```bash
npm run dev    # Linux/macOS
# O
bun run dev     # Windows
```
**Tiempo estimado**: 5-15 segundos
- Setup se ejecuta muy rapido (todo esta instalado)
- Solo verifica que todo este en orden
- Inicia servidor

### Inicio rapido (sin setup completo):
```bash
npm run dev:quick    # Linux/macOS
# O
bun run dev:quick   # Windows
```
**Tiempo estimado**: 2-5 segundos
- Salta verificacion de dependencias
- Solo inicializa DB
- Inicia servidor

---

## Solucion de Problemas Comunes

### Error: "bun: command not found"
**Causa**: Bun no esta instalado
**Solucion en Linux/macOS**:
```bash
npm run dev        # Usa npm automaticamente
# O instalar Bun:
curl -fsSL https://bun.sh/install | bash
```

### Error: "Module not found: Can't resolve 'lancedb'"
**Causa**: Dependencias no instaladas en este servidor
**Solucion**:
```bash
npm run dev        # Automatico instala dependencias
# O manualmente:
npm install lancedb
```

### Error: "Cannot find module 'prisma'"
**Causa**: Cliente Prisma no generado
**Solucion**:
```bash
npm run db:generate
npm run dev
```

### Error: "No se puede conectar a base de datos"
**Causa**: Base de datos no inicializada
**Solucion**:
```bash
npm run db:reset
npm run dev
```

### Error de permiso en Windows
**Causa**: Permisos del sistema de archivos
**Solucion**:
- Ejecutar terminal como Administrador
- Desactivar temporalmente antivirus

---

## Recursos y Requisitos

### Requisitos Minimos:
- **Node.js**: 18+ (npm o bun 1.3+)
- **RAM**: 2GB minimo, 4GB recomendado
- **Disco**: 1GB minimo
- **Procesador**: 2 cores minimo

### Uso de Recursos:
- **LanceDB**: <50MB de RAM
- **Ollama**: ~1-2GB de RAM (segun modelo)
- **Next.js**: ~200-500MB de RAM
- **Total esperado**: ~2-4GB de RAM

### Diferencias entre Bun y npm:
| Aspecto | Bun | npm |
|---------|-----|-----|
| **Velocidad** | Muy rapido | Rapido |
| **Instalacion** | Facil | Facil |
| **Compatibilidad** | Principalmente Windows | Universal (todos los OS) |
| **Tamano** | Mas pequeno | Un poco mas grande |
| **Instalacion** | curl | viene con Node.js |

---

## Recomendaciones por Sistema Operativo

### Windows (recomendado)
```bash
# Instalar Bun si no esta instalado
curl -fsSL https://bun.sh/install | bash

# Usar Bun para el proyecto
bun run dev
```
**Ventajas**: Muy rapido, eficiente

### Linux (recomendado)
```bash
# Usar npm (siempre disponible)
npm run dev
```
**Ventajas**: Compatible, estable

### macOS (recomendado)
```bash
# Opcion 1: Usar npm
npm run dev

# Opcion 2: Instalar Bun si prefieres
curl -fsSL https://bun.sh/install | bash
bun run dev
```
**Ventajas npm**: Siempre funciona
**Ventajas Bun**: Muy rapido si esta instalado

---

## Check-list de Inicializacion

Cuando termines el setup, verifica:

- [ ] `npm run dev` o `bun run dev` se ejecuta sin errores
- [ ] http://localhost:3000 es accesible
- [ ] No hay errores de modulos no encontrados
- [ ] Directorio `/data/embeddings/` se creo
- [ ] Base de datos SQLite funciona
- [ ] LanceDB puede guardar embeddings
- [ ] Setup.js detecto correctamente el sistema operativo

---

## Comandos de Emergencia

### Reinstalar todo desde cero:
```bash
# Windows
rm -rf node_modules bun.lockb
bun run dev

# Linux/macOS
rm -rf node_modules package-lock.json
npm run dev
```

### Verificar instalacion:
```bash
# Ver que lancedb esta instalado
ls node_modules | grep lancedb

# Ver version de dependencias
cat package.json | grep lancedb
```

### Verificar entorno:
```bash
node --version
npm --version
# O
bun --version
```

---

## Documentacion Adicional

- **LanceDB**: `/LANCEDB_MIGRATION.md`
- **Ejemplo de uso**: `lancedb-example.ts`
- **Documentacion de Next.js**: https://nextjs.org/docs
- **Documentacion de Bun**: https://bun.sh/docs
- **Documentacion de npm**: https://docs.npmjs.com/

---

## Ayuda

Si tienes problemas:

1. **Ver logs del setup**:
   ```bash
   node setup.js
   ```

2. **Limpiar y reinstalar**:
   ```bash
   # Windows
   rm -rf node_modules bun.lockb .next
   bun run dev
   
   # Linux/macOS
   rm -rf node_modules package-lock.json .next
   npm run dev
   ```

3. **Verificar entorno**:
   ```bash
   node --version
   bun --version      # Si esta instalado
   npm --version
   ```

4. **Probar con otro gestor**:
   ```bash
   # En Windows con Bun
   npm run dev:npm      # Forzar npm
   
   # En Linux/macOS con npm
   curl -fsSL https://bun.sh/install | bash
   bun run dev           # Probar con Bun
   ```

---

## Resumen

### Para DESARROLLO:

| Sistema | Comando Recomendado |
|---------|-------------------|
| Windows | `bun run dev` |
| Linux | `npm run dev` |
| macOS | `npm run dev` |

### Para PRODUCCION:

| Sistema | Comando Recomendado |
|---------|-------------------|
| Windows | `bun run build && bun run start` |
| Linux | `npm run build && npm run start` |
| macOS | `npm run build && npm run start` |

---

**¿Listo para empezar? Ejecuta el comando para tu sistema operativo y comienza! 🚀
