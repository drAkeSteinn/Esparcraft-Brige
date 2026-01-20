# Etapa base con Node.js
FROM node:20-alpine AS base

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar archivos de package
COPY package.json bun.lockb* package-lock.json* ./

# Instalar dependencias
RUN npm ci || bun install || pnpm install --frozen-lockfile

# Copiar el resto de la aplicación
COPY . .

# Exponer el puerto 3000
EXPOSE 3000

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000

# Crear usuario no root para seguridad
RUN addgroup -g nodeuser && adduser -G -g -u 1001 nodeuser
USER nodeuser

# Comando para iniciar la aplicación
CMD ["npm", "run", "dev"]

# Notas de configuración:
# - La aplicación usa PostgreSQL (requiere configuración en la interfaz)
# - La aplicación usa Text Generation WebUI para embeddings (requiere configuración)
# - La aplicación usa LLM API para generación de texto (requiere configuración)
# - Todos los datos y configuraciones se almacenan en localStorage del cliente
# - Los datos de archivos se almacenan en el directorio /data montado como volumen
