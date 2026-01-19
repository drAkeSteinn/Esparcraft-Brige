# Archivos de Windows - Resumen

Este documento describe los archivos creados para habilitar la ejecución de la aplicación Next.js Dashboard en Windows.

## 📋 Archivos Creados

### 1. **start-dev.bat**
Script de inicio para el entorno de desarrollo en Windows.

**Características:**
- Verifica instalación de Node.js y npm
- Instala dependencias automáticamente si no existen
- Genera el cliente de Prisma
- Configura la base de datos con `prisma db push`
- Inicia el servidor de desarrollo en el puerto 3000
- Guarda logs en `dev.log`
- Manejo de errores con códigos de color

**Uso:**
```cmd
Doble clic en start-dev.bat
```

---

### 2. **start-prod.bat**
Script de inicio para el entorno de producción en Windows.

**Características:**
- Verifica instalación de Node.js y npm
- Instala dependencias automáticamente si no existen
- Genera el cliente de Prisma
- Configura la base de datos con `prisma db push`
- Compila la aplicación (build optimizado)
- Inicia el servidor de producción en el puerto 3000
- Guarda logs en `server.log`
- Manejo de errores con códigos de color

**Uso:**
```cmd
Doble clic en start-prod.bat
```

---

### 3. **install.bat**
Script para instalar y configurar dependencias en Windows.

**Características:**
- Verifica instalación de Node.js y npm
- Opción de limpiar y reinstalar `node_modules`
- Instala dependencias con `npm install`
- Genera el cliente de Prisma
- Manejo de errores con códigos de color

**Uso:**
```cmd
Doble clic en install.bat
```

---

### 4. **setup-db.bat**
Script para configurar y gestionar la base de datos Prisma en Windows.

**Características:**
- Menú interactivo con 6 opciones:
  1. Generar cliente Prisma
  2. Hacer push del esquema a la base de datos
  3. Crear una nueva migración
  4. Resetear la base de datos (con advertencia de seguridad)
  5. Hacer todo (generar + push)
  6. Salir
- Verifica instalación de Node.js
- Manejo de errores con códigos de color
- Confirmación de seguridad para operaciones destructivas

**Uso:**
```cmd
Doble clic en setup-db.bat
```

---

### 5. **.npmrc**
Archivo de configuración para npm compatible con Windows.

**Configuraciones:**
- `script-shell=cmd.exe` - Usa CMD para scripts en Windows
- Configuración de cache y prefix para Windows
- `save-exact=true` - Para reproducibilidad de dependencias
- `strict-peer-deps=false` - Para evitar errores con dependencias

**Uso:**
Automático, no requiere intervención del usuario.

---

### 6. **WINDOWS_README.md**
Documentación completa para ejecutar la aplicación en Windows.

**Contenido:**
- Requisitos previos (Node.js, Git, editor de código)
- Instrucciones detalladas para cada archivo .bat
- Ejecución manual desde CMD
- Solución de problemas comunes
- Scripts npm disponibles para Windows
- Recursos y enlaces útiles
- Notas importantes sobre actualizaciones

**Uso:**
Documentación de referencia para usuarios de Windows.

---

### 7. **README_ES.md**
README principal en español.

**Contenido:**
- Descripción general del proyecto
- Características principales
- Requisitos previos para Linux/Mac y Windows
- Instrucciones de instalación y ejecución para ambos sistemas
- Estructura del proyecto
- Comandos de base de datos
- Scripts disponibles
- Solución de problemas
- Recursos adicionales

**Uso:**
Documentación principal del proyecto en español.

---

## 🔧 Modificaciones Archivos Existentes

### **package.json**
Se agregaron scripts específicos para Windows:

- `dev:win` - Inicia servidor de desarrollo (sin `tee` que no existe en Windows)
- `build:win` - Compila para producción (usando comandos Windows en lugar de Unix)
- `start:win` - Inicia servidor de producción (usa Node.js en lugar de bun)
- `install:win` - Instala dependencias y genera Prisma

---

## 🎨 Características de los Scripts .bat

Todos los scripts .bat incluyen:

### 1. **Codificación UTF-8**
```cmd
chcp 65001 >nul
```
Permite mostrar caracteres especiales y acentos correctamente.

### 2. **Colores de Terminal**
- `0A` (Verde claro) - Éxito
- `0B` (Azul claro) - Información producción
- `0C` (Rojo claro) - Error
- `0D` (Magenta claro) - Base de datos
- `0E` (Amarillo claro) - Instalación
- `0F` (Blanco) - Título
- `0E` (Amarillo claro) - Normal

### 3. **Verificaciones de Dependencias**
Todos los scripts verifican que Node.js y npm estén instalados antes de continuar.

### 4. **Manejo de Errores**
```cmd
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] ...
    pause
    exit /b 1
)
```

### 5. **Progress Indicators**
```
[1/5] Verificando Node.js...
[2/5] Verificando npm...
[3/5] Verificando dependencias...
...
```

### 6. **Separadores Visuales**
```
========================================
   Título
========================================
```

---

## 📊 Compatibilidad

| Sistema Operativo | Archivos Soportados |
|-------------------|---------------------|
| Windows 10        | ✅ Todos los .bat y scripts |
| Windows 11        | ✅ Todos los .bat y scripts |
| Linux             | ✅ Scripts de package.json |
| macOS             | ✅ Scripts de package.json |

---

## 🚀 Flujo de Trabajo Recomendado en Windows

### Primera Instalación:
1. Instalar Node.js desde https://nodejs.org/
2. Doble clic en `install.bat`
3. Esperar a que se instalen todas las dependencias

### Uso Diario:
- **Desarrollo:** Doble clic en `start-dev.bat`
- **Producción:** Doble clic en `start-prod.bat`

### Gestión de Base de Datos:
- **Configurar:** Doble clic en `setup-db.bat` y seleccionar opción 5

### Actualizaciones:
1. Git pull (si se usa git)
2. Doble clic en `install.bat` para actualizar dependencias
3. Doble clic en `start-dev.bat` para iniciar

---

## 🔍 Depuración

Si un script falla:

1. **Verifica la consola:** Los mensajes de error están en color rojo
2. **Revisa los requisitos:** Asegúrate de tener Node.js instalado
3. **Ejecuta como administrador:** Si hay errores de permisos
4. **Consulta WINDOWS_README.md:** Para solución de problemas detallada

---

## 📝 Notas Técnicas

### Comandos Unix vs Windows

| Unix | Windows | Archivo |
|------|---------|---------|
| `bun` | `npm` | package.json |
| `tee` | N/A (se elimina) | package.json |
| `cp -r` | `xcopy /E /I /Y` | package.json |
| `rm -rf` | `rmdir /s /q` | .bat files |
| `del` | `del` (igual) | .bat files |

### Variables de Entorno

Windows usa `set VAR=value` en lugar de `VAR=value` en Unix:
```cmd
set NODE_ENV=production && node .next\standalone\server.js
```

### Rutas de Archivos

Windows usa backslashes (`\`) en lugar de forward slashes (`/`):
```cmd
# Unix
.next/standalone/server.js

# Windows
.next\standalone\server.js
```

---

## ✅ Verificación de Funcionamiento

Después de ejecutar cualquier script, verifica:

1. **No hubo errores en rojo** en la consola
2. **La aplicación está accesible** en http://localhost:3000
3. **Los logs se generan correctamente** (dev.log o server.log)
4. **Las APIs responden** correctamente en el dashboard

---

## 🆘 Soporte

Para problemas específicos en Windows:
1. Revisa el archivo `WINDOWS_README.md`
2. Consulta la sección de Solución de Problemas
3. Verifica los logs en `dev.log` o `server.log`
4. Asegúrate de tener Node.js 18+ instalado

---

**Versión:** 1.0
**Fecha de creación:** 2025
**Sistemas compatibles:** Windows 10, Windows 11
