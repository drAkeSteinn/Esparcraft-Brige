# Instrucciones para Instalar LanceDB en Windows

## Problema

El error que estás viendo es:
```
Error: could not resolve "@lancedb/lancedb-win32-x64-msvc" into a module
```

Esto ocurre porque `@lancedb/lancedb` requiere módulos nativos compilados para cada plataforma, y el módulo de Windows no se instaló automáticamente.

---

## 🔧 Solución

### Opción 1: Instalar Módulo Nativo Manualmente (Recomendado)

En Windows, abre una terminal en el directorio del proyecto y ejecuta:

```batch
cd "G:\Proyecto Esparcraft\Esparcraft\esparcraft-llm_full"

npm install @lancedb/lancedb-win32-x64-msvc@0.10.0
```

Luego reinicia el servidor con `start.bat` o `npm run dev`.

### Opción 2: Reinstalar Todo

Si la Opción 1 no funciona, reinstala todas las dependencias:

```batch
# 1. Eliminar node_modules
rmdir /s /q node_modules

# 2. Eliminar lockfile
del package-lock.json
del bun.lockb

# 3. Instalar todo incluyendo el módulo nativo de Windows
npm install @lancedb/lancedb @lancedb/lancedb-win32-x64-msvc@0.10.0

# 4. Iniciar servidor
npm run dev
# O ejecuta start.bat
```

---

## 📝 Por Qué Sucede Esto

### LanceDB Arquitectura

El paquete `@lancedb/lancedb` usa una arquitectura con módulos nativos:

```json
{
  "optionalDependencies": {
    "@lancedb/lancedb-darwin-arm64": "0.10.0",    // macOS ARM
    "@lancedb/lancedb-linux-arm64-gnu": "0.10.0",  // Linux ARM
    "@lancedb/lancedb-darwin-x64": "0.10.0",       // macOS Intel
    "@lancedb/lancedb-linux-x64-gnu": "0.10.0",    // Linux x64
    "@lancedb/lancedb-win32-x64-msvc": "0.10.0"    // Windows 64-bit
  }
}
```

Estos paquetes contienen binarios compilados nativamente para cada plataforma para mejor rendimiento.

### El Problema

Cuando instalamos con Bun en Linux (como estamos haciendo aquí), solo se instala el módulo nativo para Linux (`@lancedb/lancedb-linux-x64-gnu`). Cuando el código se ejecuta en Windows, busca el módulo de Windows (`@lancedb/lancedb-win32-x64-msvc`) pero no lo encuentra.

---

## ✅ Verificación en Windows

Después de instalar, verifica que el módulo nativo esté instalado:

En tu proyecto, ve a:
```
node_modules\@lancedb\lancedb-win32-x64-msvc\
```

Deberías ver archivos como:
- `lancedb.win32-x64-msvc.node` (el binario nativo)
- `package.json`
- Otros archivos

---

## 🚀 Después de la Instalación

Una vez que el módulo nativo esté instalado:

1. **Reinicia el servidor:**
   ```batch
   start.bat
   # O
   npm run dev
   ```

2. **Prueba la API de embeddings:**
   - Ve a la pestaña "Embeddings" en la interfaz
   - Debería cargar sin errores

3. **Verifica los logs:**
   - Deberías ver algo como:
     ```
     📦 Conectando a LanceDB: ./data/embeddings
     ✅ Tabla de embeddings lista
     ```

---

## 🛠️ Si Sigue Fallando

### Problema: Módulo nativo corrupto

Si después de instalar el módulo sigues viendo errores:

```batch
# 1. Limpia el caché de npm
npm cache clean --force

# 2. Elimina node_modules y lockfiles
rmdir /s /q node_modules
del package-lock.json
del bun.lockb

# 3. Reinstala todo
npm install

# 4. Instala específicamente el módulo de Windows
npm install @lancedb/lancedb-win32-x64-msvc@0.10.0

# 5. Limpia el cache de Next.js
rmdir /s /q .next

# 6. Reinicia el servidor
start.bat
```

### Problema: Node.js version incompatible

LanceDB requiere Node.js >= 18 (según package.json).

Verifica tu versión:
```batch
node --version
```

Si tu versión es anterior a 18, actualiza Node.js desde https://nodejs.org/

---

## 📚 Información Adicional

### Acerca de LanceDB

- **Sitio oficial:** https://lancedb.github.io/lancedb/
- **Documentación:** https://lancedb.github.io/lancedb/js/
- **Repositorio:** https://github.com/lancedb/lancedb

### Requisitos de Sistema

- **Node.js:** >= 18
- **Plataformas:**
  - ✅ Windows (x64)
  - ✅ macOS (x64, ARM64)
  - ✅ Linux (x64, ARM64)

---

## 💡 Resumen

1. El error es porque falta el módulo nativo de Windows
2. La solución es instalarlo manualmente con:
   ```batch
   npm install @lancedb/lancedb-win32-x64-msvc@0.10.0
   ```
3. Después de instalar, reinicia el servidor con `start.bat`
4. La pestaña de embeddings debería funcionar

**¡Buena suerte con la instalación en Windows!** 🚀
