# Bridge IA - Gestor Narrativo del Servidor Esparcraft

Panel de control completo para el servidor Esparcraft con gestión de NPCs, mundos, embeddings vectoriales y configuración avanzada del sistema.

## 🚀 Características

- **Dashboard Completo**: 7 pestañas principales (Universo, NPCs, Mapa 2D, Sesiones, Router, Embeddings, Configuración)
- **Sistema de Embeddings**: Integración con PostgreSQL + pgvector para búsqueda vectorial
- **Configuración Avanzada**: Panel completo para PostgreSQL, Embeddings, LLM y más
- **Sistema de Configuración General**: 6 sub-pestañas con múltiples opciones
- **Gestión de NPCs**: Formato compatible con SillyTavern
- **Búsqueda Vectorial**: Búsqueda semántica con umbral configurable
- **Sistema de Depuración**: Logs en tiempo real, exportación, niveles de log
- **Persistencia Local**: Configuraciones guardadas en localStorage

## 📋 Requisitos

### Requisitos del Sistema

- **Docker**: 20.10+ o Docker Desktop 4.0+
- **Docker Compose**: 1.29+
- **RAM Mínima**: 2 GB (4 GB recomendado)
- **Espacio en Disco**: 1 GB mínimo

### Servicios Externos (Opcionales pero Recomendados)

- **PostgreSQL**: 12+ con extensión pgvector
- **Text Generation WebUI**: Para generación de embeddings
- **LLM API Compatible con OpenAI**: Para generación de texto

## 🐳 Instalación con Docker

### Opción 1: Usar Docker Compose (Recomendado)

Esta opción es la más fácil y gestiona todos los servicios automáticamente.

1. **Clonar o descargar el repositorio:**
   ```bash
   git clone https://github.com/drAkeSteinn/Esparcraft-Brige.git
   cd Esparcraft-Brige
   ```

2. **Crear directorios necesarios:**
   ```bash
   mkdir -p data logs
   touch data/.gitkeep logs/.gitkeep
   ```

3. **Iniciar la aplicación:**
   ```bash
   docker-compose up -d
   ```

4. **Verificar que la aplicación esté corriendo:**
   ```bash
   docker-compose ps
   ```

5. **Acceder a la aplicación:**
   
   Abre tu navegador en: http://localhost:3000

### Opción 2: Construir y Ejecutar Manualmente

1. **Construir la imagen Docker:**
   ```bash
   docker build -t bridge-ia .
   ```

2. **Ejecutar el contenedor:**
   ```bash
   docker run -d \
     -p 3000:3000 \
     -v $(pwd)/data:/data \
     -v $(pwd)/logs:/app/logs \
     --name bridge-ia \
     bridge-ia
   ```

## 🔧 Configuración

### Configuración Inicial

1. **Accede al panel de configuración:**
   
   Navega a http://localhost:3000 y selecciona la pestaña "Configuración"

2. **Configura PostgreSQL:**
   - Ve a "General" > "PostgreSQL"
   - Ingresa:
     - Host: localhost (o dirección IP del servidor PostgreSQL)
     - Puerto: 5432
     - Base de datos: esparcraft
     - Usuario: postgres (o tu usuario)
     - Contraseña: tu contraseña
   - Haz clic en "Probar Conexión"
   - Si es exitoso, haz clic en "Guardar Configuración"

3. **Configura Embeddings (Text Generation WebUI):**
   - Ve a "General" > "Embeddings"
   - Ingresa:
     - URL de Text Generation WebUI: http://localhost:7860 (o tu URL)
     - Selecciona el modelo de embeddings
     - Configura dimensiones (384 para all-MiniLM-L6-v2)
   - Haz clic en "Probar Conexión"
   - Si es exitoso, haz clic en "Guardar Configuración"

4. **Configura LLM API:**
   - Ve a "General" > "LLM"
   - Ingresa:
     - API URL: URL de tu API LLM
     - Modelo: nombre del modelo (ej: gpt-4, claude-3, etc.)
     - Temperatura: 0.7 (recomendado)
     - Max Tokens: 2048
   - Haz clic en "Probar Conexión"
   - Si es exitoso, haz clic en "Guardar Configuración"

### Configuraciones Generales Adicionales

En la pestaña "General" encontrarás 6 sub-pestañas:

1. **Servidor**: Nombre, descripción, versión y modo mantenimiento
2. **Interfaz**: Tema, idioma, tamaño de fuente, animaciones
3. **Sesiones**: Auto-guardado, historial máximo, sesiones por página
4. **NPCs**: Formato de exportación, directorio de imágenes, NPCs por página
5. **Embeddings**: Umbral de similitud, resultados máximos, namespace
6. **Debug**: Modo debug, nivel de log, consola en interfaz

## 📊 Uso de la Aplicación

### Dashboard Principal

1. **Universo (Mundos)**: Gestiona mundos y su lore
2. **NPCs**: Gestiona personajes del mundo con tarjetas SillyTavern
3. **Mapa 2D**: Visualiza ubicaciones en el mapa
4. **Sesiones**: Gestiona sesiones de chat y su historial
5. **Router**: Sistema de enrutamiento de mensajes
6. **Embeddings**: Gestiona documentos y búsqueda vectorial
7. **Configuración**: Panel completo de configuración

### Sistema de Embeddings

1. **Documents**: Lista y gestiona documentos indexados
2. **Search**: Búsqueda semántica con umbral de similitud
3. **Upload**: Sube documentos para indexar automáticamente
4. **Namespaces**: Gestiona espacios de nombres para organizar datos

## 🛠️ Solución de Problemas

### La aplicación no inicia

```bash
# Ver logs del contenedor
docker-compose logs bridge-ia

# Ver estado del contenedor
docker-compose ps

# Reiniciar el contenedor
docker-compose restart bridge-ia
```

### Errores de conexión a PostgreSQL

1. Verifica que PostgreSQL esté corriendo:
   ```bash
   docker ps | grep postgres
   ```

2. Verifica que el puerto 5432 esté accesible:
   ```bash
   telnet localhost 5432
   ```

3. Asegúrate de que la extensión pgvector esté instalada:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

### Errores de conexión a Text Generation WebUI

1. Verifica que Text Generation WebUI esté corriendo
2. Verifica la URL en el panel de configuración
3. Asegúrate de que el puerto esté accesible (default: 7860)

### Problemas de rendimiento

1. Aumenta la memoria asignada a Docker:
   ```bash
   # Edita tu archivo ~/.docker/daemon.json
   # Agrega: "memory": "4g"
   ```

2. Limpia el caché de Docker:
   ```bash
   docker system prune -a
   ```

## 📁 Estructura de Directorios

```
Esparcraft-Brige/
├── Dockerfile              # Configuración de Docker
├── docker-compose.yml      # Orquestación de servicios
├── .dockerignore         # Archivos a ignorar en Docker
├── README.md             # Este archivo
├── data/                 # Directorio de datos persistentes
│   ├── npcs/           # NPCs y tarjetas SillyTavern
│   ├── worlds/          # Configuración de mundos
│   ├── pueblos/         # Pueblos y ubicaciones
│   ├── edificios/        # Edificios y estructuras
│   ├── sessions/         # Sesiones de chat
│   └── avatars/         # Imágenes de avatares
├── logs/                 # Directorio de logs
│   ├── app.log          # Logs de la aplicación
│   └── error.log         # Logs de errores
└── src/                  # Código fuente
    ├── app/              # Rutas de Next.js
    ├── components/        # Componentes React
    ├── lib/              # Utilidades y configuración
    └── public/           # Archivos estáticos
```

## 🔄 Actualización de la Aplicación

### Actualizar a la última versión

```bash
# 1. Detener los contenedores
docker-compose down

# 2. Actualizar el código
git pull origin main

# 3. Reconstruir y reiniciar
docker-compose up -d --build
```

### Actualizar dependencias

```bash
# Reconstruir la imagen con nuevas dependencias
docker-compose build --no-cache

# Reiniciar con la nueva imagen
docker-compose up -d
```

## 📝 Variables de Entorno

Las siguientes variables de entorno pueden configurarse:

| Variable | Descripción | Default |
|----------|-------------|---------|
| `NODE_ENV` | Entorno de ejecución | `production` |
| `PORT` | Puerto de la aplicación | `3000` |

Puedes configurarlas en `docker-compose.yml` o crear un archivo `.env`.

## 🔒 Seguridad

### Recomendaciones de Seguridad

1. **No usar usuario root**: La aplicación corre como usuario `nodeuser` (UID 1001)
2. **Usar redes Docker aisladas**: Los servicios están en una red bridge separada
3. **Limitar recursos**: Configura límites en docker-compose.yml si es necesario
4. **Usar volúmenes para persistencia**: Los datos persistentes se almacenan en volúmenes Docker
5. **Escanear vulnerabilidades**: Ejecuta `docker scan bridge-ia` periódicamente

## 📚 Documentación Adicional

- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de shadcn/ui](https://ui.shadcn.com)
- [Documentación de pgvector](https://github.com/pgvector/pgvector)
- [Documentación de Text Generation WebUI](https://github.com/oobabooga/text-generation-webui)

## 🤝 Contribución

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo LICENSE para más detalles.

## 💬 Soporte

Para reportar problemas o solicitar características:
- Abre un issue en el repositorio de GitHub
- Contacta al equipo de desarrollo
- Consulta la documentación en el wiki del repositorio

---

**Desarrollado con ❤️ usando Next.js, TypeScript, Tailwind CSS y shadcn/ui**
