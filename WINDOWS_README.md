# Instrucciones para Windows

Este documento describe cómo ejecutar la aplicación Next.js Dashboard en Windows utilizando Node.js.

## Requisitos Previos

Antes de ejecutar la aplicación, asegúrate de tener instalado:

1. **Node.js** (versión 18 o superior recomendada)
   - Descargar desde: https://nodejs.org/
   - Durante la instalación, asegúrate de agregar Node.js al PATH
   - Para verificar la instalación: Abre CMD y ejecuta `node --version`

2. **Git** (opcional, si quieres clonar el repositorio)
   - Descargar desde: https://git-scm.com/download/win

3. **Un editor de código** (opcional pero recomendado)
   - Visual Studio Code: https://code.visualstudio.com/

## Archivos de Ejecución

La aplicación incluye dos archivos `.bat` para facilitar su ejecución en Windows:

### 1. `start-dev.bat` - Entorno de Desarrollo

Este archivo inicia la aplicación en modo de desarrollo con recarga en caliente.

**Características:**
- Verifica que Node.js y npm estén instalados
- Instala automáticamente las dependencias si no existen
- Genera el cliente de Prisma
- Configura la base de datos
- Inicia el servidor de desarrollo en http://localhost:3000
- Guarda los logs en `dev.log`

**Uso:**
```cmd
Doble clic en start-dev.bat
```

**Para detener el servidor:**
- Presiona `Ctrl + C` en la terminal

### 2. `start-prod.bat` - Entorno de Producción

Este archivo compila la aplicación y la ejecuta en modo de producción.

**Características:**
- Verifica que Node.js y npm estén instalados
- Instala automáticamente las dependencias si no existen
- Genera el cliente de Prisma
- Configura la base de datos
- Compila la aplicación (optimizada)
- Inicia el servidor de producción en http://localhost:3000
- Guarda los logs en `server.log`

**Uso:**
```cmd
Doble clic en start-prod.bat
```

**Para detener el servidor:**
- Presiona `Ctrl + C` en la terminal

## Ejecución Manual desde CMD

Si prefieres ejecutar comandos manualmente en lugar de usar los archivos `.bat`:

### 1. Abrir una terminal CMD
- Presiona `Win + R`, escribe `cmd` y presiona Enter
- O busca "Símbolo del sistema" en el menú de inicio

### 2. Navegar al directorio del proyecto
```cmd
cd ruta\a\tu\proyecto
```

### 3. Instalar dependencias (primera vez)
```cmd
npm install
```

### 4. Generar cliente Prisma
```cmd
npx prisma generate
```

### 5. Configurar base de datos
```cmd
npx prisma db push
```

### 6. Iniciar el servidor

**Modo Desarrollo:**
```cmd
npm run dev:win
```

**Modo Producción:**
```cmd
npm run build:win
npm run start:win
```

## Solución de Problemas

### Error: "Node.js no está instalado o no está en el PATH"

**Solución:**
1. Descarga e instala Node.js desde https://nodejs.org/
2. Durante la instalación, asegúrate de marcar la opción "Add to PATH"
3. Reinicia tu terminal CMD después de la instalación
4. Verifica con: `node --version`

### Error: "npm no está instalado"

**Solución:**
1. npm se instala automáticamente con Node.js
2. Reinstala Node.js desde https://nodejs.org/
3. Reinicia tu terminal CMD
4. Verifica con: `npm --version`

### Error: "Error al generar cliente Prisma"

**Solución:**
```cmd
npm install -g prisma
npx prisma generate
```

### Error: "Error al instalar dependencias"

**Solución:**
1. Asegúrate de tener conexión a internet
2. Intenta limpiar el caché de npm:
   ```cmd
   npm cache clean --force
   npm install
   ```
3. Si el problema persiste, elimina `node_modules` y `package-lock.json`:
   ```cmd
   rmdir /s /q node_modules
   del package-lock.json
   npm install
   ```

### Error: "El puerto 3000 ya está en uso"

**Solución:**
1. Encuentra el proceso que usa el puerto 3000:
   ```cmd
   netstat -ano | findstr :3000
   ```
2. Termina el proceso (reemplaza PID con el número que aparece):
   ```cmd
   taskkill /PID PID /F
   ```
3. O cambia el puerto en el script `.bat`:
   - Cambia `-p 3000` por `-p 3001` o cualquier otro puerto disponible

### Error de permisos en Windows

**Solución:**
1. Ejecuta CMD como Administrador:
   - Presiona `Win + X`
   - Selecciona "Símbolo del sistema (administrador)" o "Windows PowerShell (administrador)"
2. Navega al directorio del proyecto
3. Ejecuta el archivo `.bat` nuevamente

## Scripts npm Disponibles

El `package.json` incluye scripts específicos para Windows:

- `npm run dev:win` - Inicia servidor de desarrollo
- `npm run build:win` - Compila para producción
- `npm run start:win` - Inicia servidor de producción
- `npm run install:win` - Instala dependencias y genera Prisma

## Estructura de Logs

- **dev.log** - Contiene los logs del servidor de desarrollo
- **server.log** - Contiene los logs del servidor de producción

Estos archivos se crean automáticamente y se pueden ver con cualquier editor de texto.

## Recursos Adicionales

- **Next.js Documentación**: https://nextjs.org/docs
- **Prisma Documentación**: https://www.prisma.io/docs
- **React Documentación**: https://react.dev
- **Node.js Documentación**: https://nodejs.org/docs

## Soporte

Si encuentras algún problema que no esté cubierto en esta sección:

1. Revisa la consola de errores para mensajes específicos
2. Asegúrate de tener todas las dependencias instaladas
3. Verifica que Node.js y npm estén actualizados
4. Intenta reiniciar tu computadora

## Notas Importantes

- La primera ejecución puede tardar más tiempo porque necesita instalar todas las dependencias
- Asegúrate de tener suficiente espacio en disco (aprox. 500 MB para node_modules)
- Se requiere conexión a internet para la instalación inicial de dependencias
- No cierres la terminal mientras el servidor esté en ejecución

## Actualizar la Aplicación

Para actualizar la aplicación cuando haya cambios:

1. Si estás usando Git:
   ```cmd
   git pull
   ```

2. Instala las nuevas dependencias:
   ```cmd
   npm install
   ```

3. Regenera Prisma si hubo cambios en el esquema:
   ```cmd
   npx prisma generate
   npx prisma db push
   ```

4. Vuelve a ejecutar el archivo `.bat` correspondiente

---

**Versión**: 1.0
**Última actualización**: 2025
**Sistemas compatibles**: Windows 10, Windows 11
