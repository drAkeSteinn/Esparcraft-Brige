# Next.js Dashboard

Aplicación dashboard construida con Next.js 16, TypeScript, Tailwind CSS y shadcn/ui.

## 🚀 Características

- ⚡ Next.js 16 con App Router
- 📝 TypeScript 5 para type-safety
- 🎨 Tailwind CSS 4 con shadcn/ui
- 🗄️ Prisma ORM con SQLite
- 🎭 Componentes UI modernos y accesibles
- 🌓 Soporte para modo oscuro/claro
- 📱 Diseño responsive
- 🔐 Autenticación con NextAuth.js v4

## 📋 Requisitos Previos

### Para Linux/Mac:
- **Bun** (recomendado) o Node.js 18+
- Git

### Para Windows:
- **Node.js 18+** (obligatorio)
- Git (opcional)

## 🛠️ Instalación y Ejecución

### 🪟 Windows

La aplicación incluye archivos `.bat` para facilitar la ejecución en Windows:

1. **Instalar dependencias:**
   ```cmd
   Doble clic en install.bat
   ```

2. **Ejecutar en modo desarrollo:**
   ```cmd
   Doble clic en start-dev.bat
   ```

3. **Ejecutar en modo producción:**
   ```cmd
   Doble clic en start-prod.bat
   ```

4. **Configurar base de datos:**
   ```cmd
   Doble clic en setup-db.bat
   ```

Para más detalles, consulta el archivo [WINDOWS_README.md](./WINDOWS_README.md)

### 🐧 Linux / 🍎 Mac

#### Instalación:

```bash
# Instalar dependencias
bun install

# Generar cliente Prisma
bun run db:generate

# Configurar base de datos
bun run db:push
```

#### Ejecución:

**Modo Desarrollo:**
```bash
bun run dev
```

**Modo Producción:**
```bash
bun run build
bun run start
```

## 📁 Estructura del Proyecto

```
├── prisma/              # Esquema de base de datos
├── src/
│   ├── app/            # App Router (Next.js 16)
│   ├── components/     # Componentes React
│   │   ├── dashboard/  # Componentes del dashboard
│   │   └── ui/         # Componentes shadcn/ui
│   ├── lib/            # Utilidades y configuraciones
│   └── hooks/          # Custom hooks
├── public/             # Archivos estáticos
├── mini-services/      # Microservicios (WebSocket, etc.)
└── *.bat              # Scripts de ejecución para Windows
```

## 🗄️ Base de Datos

La aplicación usa **Prisma ORM** con **SQLite** como base de datos.

### Comandos de Base de Datos

```bash
# Generar cliente Prisma
bun run db:generate

# Hacer push del esquema a la base de datos
bun run db:push

# Crear una nueva migración
bun run db:migrate

# Resetear la base de datos
bun run db:reset
```

En Windows, usa el archivo `setup-db.bat` para estas operaciones.

## 🎨 Componentes UI

La aplicación utiliza **shadcn/ui**, una colección de componentes reutilizables construidos con Radix UI y Tailwind CSS.

Los componentes están en `src/components/ui/` e incluyen:
- Button
- Card
- Dialog
- Input
- Select
- Table
- Y muchos más...

## 📝 Scripts Disponibles

### Linux/Mac:
- `bun run dev` - Inicia servidor de desarrollo
- `bun run build` - Compila para producción
- `bun run start` - Inicia servidor de producción
- `bun run lint` - Ejecuta ESLint
- `bun run db:push` - Configura base de datos
- `bun run db:generate` - Genera cliente Prisma

### Windows:
- `npm run dev:win` - Inicia servidor de desarrollo
- `npm run build:win` - Compila para producción
- `npm run start:win` - Inicia servidor de producción
- `npm run install:win` - Instala dependencias y genera Prisma

## 🔧 Desarrollo

### Agregar nuevos componentes shadcn/ui:

```bash
npx shadcn@latest add [nombre-componente]
```

### Crear nuevas rutas:

Las rutas se crean en `src/app/` siguiendo el App Router de Next.js 16:

```typescript
// src/app/ejemplo/page.tsx
export default function EjemploPage() {
  return <div>Ejemplo</div>
}
```

### Crear nuevas API routes:

Las API routes se crean en `src/app/api/`:

```typescript
// src/app/api/ejemplo/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Hola Mundo' });
}
```

## 🌍 Skills y Capacidades AI

La aplicación puede integrar capacidades AI a través del SDK `z-ai-web-dev-sdk`:

- **LLM** - Chatbots y generación de texto
- **VLM** - Análisis de imágenes
- **Image Generation** - Creación de imágenes
- **TTS** - Texto a voz
- **ASR** - Voz a texto
- **Web Search** - Búsqueda en la web

Estas capacidades deben implementarse en el backend (API routes) usando el SDK.

## 📱 Puerto de Ejecución

La aplicación se ejecuta en el puerto **3000**:
- http://localhost:3000

Si necesitas cambiar el puerto, modifica el script correspondiente:
- En scripts bun: cambia `-p 3000` por otro puerto
- En archivos .bat: cambia `-p 3000` por otro puerto

## 🔐 Gateway y Microservicios

La aplicación usa un gateway configurado en Caddyfile para manejar múltiples servicios:

- Todas las peticiones API deben usar rutas relativas
- Para servicios en puertos diferentes, usa el parámetro `XTransformPort` en la query:
  ```
  /api/servicio?XTransformPort=3030
  ```

WebSocket connections:
```javascript
io('/?XTransformPort=3030')
```

## 🐛 Solución de Problemas

### Errores comunes:

**1. Puerto ya en uso:**
```bash
# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID [PID] /F
```

**2. Error de Prisma:**
```bash
# Linux/Mac
bun run db:generate
bun run db:push

# Windows
# Usa setup-db.bat
```

**3. Dependencias corruptas:**
```bash
# Linux/Mac
rm -rf node_modules
bun install

# Windows
rmdir /s /q node_modules
npm install
```

Para más detalles de solución de problemas en Windows, consulta [WINDOWS_README.md](./WINDOWS_README.md).

## 📚 Recursos

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Prisma Documentation](https://www.prisma.io/docs)

## 📄 Licencia

Este proyecto es privado y confidencial.

## 👥 Soporte

Para soporte técnico o preguntas, contacta al equipo de desarrollo.

---

**Versión**: 0.2.0
**Última actualización**: 2025
