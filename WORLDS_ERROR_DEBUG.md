# Depuración de Error en Mundos - Logging Mejorado

## Fecha: 2025-02-08

## 🎯 Error Reportado

### Mensaje de Error en Consola:
```
Console TypeError
Cannot read properties of undefined (reading 'map')
```

### Mensaje en la UI:
"No se han podido cargar los datos"

---

## 🔍 Causa del Error

### Explicación Técnica

El error ocurre en `MundosSection.tsx` línea 47:

```typescript
const memoriaPromises = worldsResult.data.map(world =>
  fetch(`/api/worlds/${world.id}/memory`)
);
```

**El problema:**
- Si `worldsResult.data` es `undefined`, entonces `.map()` se llama sobre `undefined`
- TypeScript lanza el error: "Cannot read properties of undefined (reading 'map')"
- Esto significa que el API `/api/worlds` NO está devolviendo la propiedad `data`

### Por Qué No Hay `data`:

**Causa 1:** El API `/api/worlds` está lanzando una excepción
**Causa 2:** El endpoint `[id]/memory` está fallando y bloqueando la petición
**Causa 3:** La base de datos no tiene mundos
**Causa 4:** Hay un error en `worldDbManager.getAll()`

---

## 🔧 Cambios Aplicados para Depuración

### 1. Frontend - MundosSection.tsx

#### Cambios en `fetchData()` (líneas 34-113)

**Antes:**
```typescript
const fetchData = async () => {
  try {
    setLoading(true);
    const [worldsRes, pueblosRes] = await Promise.all([
      fetch('/api/worlds'),
      fetch('/api/pueblos')
    ]);
    const worldsResult = await worldsRes.json();
    const pueblosResult = await pueblosRes.json();
    if (worldsResult.success) setWorlds(worldsResult.data);
    if (pueblosResult.success) setPueblos(pueblosResult.data);

    // Cargar memorias de mundos en paralelo
    const memoriaPromises = worldsResult.data.map(world =>
      fetch(`/api/worlds/${world.id}/memory`)
    );
    const memoriaResponses = await Promise.all(memoriaPromises);
    const memories: Record<string, any> = {};
    memoriaResponses.forEach((response, index) => {
      if (response.ok) {
        const result = response.json();
        if (result.success && result.data.memory) {
          memories[worldsResult.data[index].id] = result.data.memory;
        }
      }
    });
    setWorldMemories(memories);
  } catch (error) {
    console.error('Error fetching data:', error);
    toast({ title: 'Error', description: 'No se pudieron cargar los datos', variant: 'destructive' });
  } finally {
    setLoading(false);
  }
};
```

**Después:**
```typescript
const fetchData = async () => {
  try {
    setLoading(true);
    console.log('[MundosSection] Iniciando fetchData...');
    
    const [worldsRes, pueblosRes] = await Promise.all([
      fetch('/api/worlds'),
      fetch('/api/pueblos')
      ]);
    
    console.log('[MundosSection] Respuestas HTTP:');
    console.log('[MundosSection] /api/worlds status:', worldsRes.status);
    console.log('[MundosSection] /api/pueblos status:', pueblosRes.status);
    
    const worldsResult = await worldsRes.json();
    const pueblosResult = await pueblosRes.json();
    
    console.log('[MundosSection] worldsResult:', worldsResult);
    console.log('[MundosSection] pueblosResult:', pueblosResult);
    
    if (worldsResult.success) {
        console.log('[MundosSection] worldsData existe:', !!worldsResult.data);
        setWorlds(worldsResult.data);
      } else {
        console.error('[MundosSection] Error cargando mundos:', worldsResult.error);
        toast({
          title: 'Error',
          description: worldsResult.error || 'No se pudieron cargar los mundos',
          variant: 'destructive'
        });
      }
      
      if (pueblosResult.success) {
        setPueblos(pueblosResult.data);
      } else {
        console.error('[MundosSection] Error cargando pueblos:', pueblosResult.error);
        toast({
          title: 'Error',
          description: pueblosResult.error || 'No se pudieron cargar las regiones',
          variant:destructive'
        });
      }
      
      // Cargar memorias de mundos en paralelo (SOLO si cargamos mundos exitosamente)
      if (worldsResult.success && worldsResult.data && worldsResult.data.length > 0) {
        console.log('[MundosSection] Cargando memorias para', worldsResult.data.length, 'mundos...');
        try {
          const memoriaPromises = worldsResult.data.map((world) => {
            console.log(`[MundosSection] Requesting memory for world: ${world.id} (${world.name})`);
            return fetch(`/api/worlds/${world.id}/memory`);
          });
          
          const memoriaResponses = await Promise.all(memoriaPromises);
          
          console.log('[MundosSection] Respuestas de memoria recibidas');
          const memories: Record<string, any> = {};
          
          memoriaResponses.forEach((response, index) => {
            if (response.ok) {
              const result = response.json();
              console.log(`[MundosSection] Memory response for world ${index}:`, result);
              if (result.success && result.data.memory) {
                memories[worldsResult.data[index].id] = result.data.memory;
                console.log(`[MundosSection] Memory guardada para world ${worldsResult.data[index].id}`);
              } else {
                console.warn(`[MundosSection] No memory data for world ${worldsResult.data[index].id}`);
              }
            } else {
              console.error(`[MundosSection] Error fetching memory for world ${index}: status ${response.status}`);
            }
          });
          
          setWorldMemories(memories);
          console.log('[MundosSection] Memorias cargadas exitosamente');
        } catch (error) {
          console.error('[MundosSection] Error cargando memorias:', error);
        }
      } else {
        console.warn('[MundosSection] Omitiendo carga de memorias: no hay mundos o no se cargaron exitosamente');
      }
    } catch (error) {
      console.error('[MundosSection] Error en fetchData:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
};
```

**Mejoras Implementadas:**
1. ✅ Logging inicial de cada paso
2. ✅ Logging de status HTTP de cada fetch
3. ✅ Logging del contenido de las respuestas
4. ✅ Verificación explícita de `worldsResult.data` antes de usar `.map()`
5. ✅ Mensajes de error específicos para cada tipo de error
6. ✅ Protección: Solo intentar cargar memorias si mundos se cargaron exitosamente
7. ✅ Try-catch alrededor de la carga de memorias
8. ✅ Logs con prefijo `[MundosSection]` para fácil filtrado

### 2. Backend - /api/worlds/route.ts

#### Cambios en GET endpoint (líneas 6-23)

**Antes:**
```typescript
export async function GET() {
  try {
    const worlds = await worldDbManager.getAll();
    return NextResponse.json({
      success: true,
      data: worlds
    });
  } catch (error) {
    console.error('Error fetching worlds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch worlds' },
      { status: 500 }
    );
  }
}
```

**Después:**
```typescript
export async function GET() {
  try {
    console.log('[API:worlds] Iniciando GET all worlds...');
    const worlds = await worldDbManager.getAll();
    console.log('[API:worlds] Mundos obtenidos:', worlds.length);
    
    return NextResponse.json({
      success: true,
      data: worlds
    });
  } catch (error) {
    console.error('[API:worlds] Error fetching worlds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch worlds' },
      { status: 500 }
    );
  }
}
```

**Mejoras Implementadas:**
1. ✅ Logging inicial del endpoint
2. ✅ Logging de la cantidad de mundos obtenidos
3. ✅ Logging del error si hay problema

---

## 📋 Cómo Diagnosticar

### Paso 1: Abrir Consola del Navegador

1. Presiona **F12** para abrir DevTools
2. Ve a la pestaña **"Console"**
3. Mantén la consola visible

### Paso 2: Recargar la Página

Presiona **F5** para recargar la página
- Esto reiniciará `fetchData()` y mostrará los nuevos logs

### Paso 3: Buscar Logs

En la consola, busca logs con el prefijo `[MundosSection]`:

**Si todo funciona correctamente, deberías ver:**
```
[MundosSection] Iniciando fetchData...
[MundosSection] Respuestas HTTP:
[MundosSection] /api/worlds status: 200
[MundosSection] /api/pueblos status: 200
[MundosSection] worldsResult: {success: true, data: [...]}
[MundosSection] pueblosResult: {success: true, data: [...]}
[MundosSection] worldsData existe: true
[MundosSection] Cargando memorias para X mundos...
[MundosSection] Requesting memory for world: abc123 (Mundo Ejemplo)...
[MundosSection] Requesting memory for world: def456 (Mundo 2)...
[MundosSection] Respuestas de memoria recibidas
[MundosSection] Memory response for world 0: {success: true, data: {...}}
[MundosSection] Memory guardada para world abc123
[MundosSection] Memory guardada para world def456
[MundosSection] Memorias cargadas exitosamente
```

**Si hay error, verás uno de estos:**

**Caso 1: Error al cargar mundos**
```
[MundosSection] Iniciando fetchData...
[MundosSection] /api/worlds status: 500
[MundosSection] worldsResult: {error: "Database error", ...}
[MundosSection] Error cargando mundos: Database error
```
→ El backend tiene un error de base de datos

**Caso 2: worldsResult.success = true pero no hay data**
```
[MundosSection] worldsResult: {success: true}
[MundosSection] worldsData existe: false
```
→ El API devolvió success pero sin la propiedad data

**Caso 3: Error al cargar memorias**
```
[MundosSection] Requesting memory for world: abc123 (Mundo Ejemplo)...
[MundosSection] Memory response for world 0: {success: true, data: {...}}
[MundosSection] Memory guardada para world abc123
[MundosSection] Error fetching memory for world 1: status 404}
```
→ El endpoint de memoria no existe o está fallando

**Caso 4: Error de red**
```
[MundosSection] /api/worlds status: 0 (error de red)
[MundosSection] Error cargando mundos: Failed to fetch
```
→ El endpoint no es accesible

---

## 🛠️ Soluciones Posibles

### 1. Verificar Base de Datos

**Posible problema:**
- La base de datos puede estar corrupta
- Puede que no haya mundos en la base de datos
- Puede que el schema de Prisma no está sincronizado

**Solución:**
```batch
# En Windows (en el directorio del proyecto)
npm run db:push

# O manualmente eliminar y recrear la base de datos
del db\*.db
npm run db:generate
npm run db:push
```

### 2. Verificar Endpoint de Memoria

**Posible problema:**
- El endpoint `/api/worlds/[id]/memory` no existe
- Tiene un error en su implementación
- No está manejando el caso donde no hay memoria

**Solución:**
El endpoint de memoria necesita ser creado. Si el sistema no lo requiere, puedes:
- Eliminar la llamada a `/api/worlds/${world.id}/memory` en el frontend
- O crear el endpoint faltante

### 3. Verificar Permisos del Archivo

**Posible problema:**
- No hay permisos para escribir en el directorio `db`
- El usuario que corre el servidor no tiene permisos de escritura

**Solución:**
- Ejutar como administrador en Windows
- Verificar permisos del directorio `db`
- Asegurar que el usuario del proceso de Node.js tiene permisos

### 4. Verificar Estado del Servidor

**Posible problema:**
- Next.js está en modo de desarrollo pero hay un error interno
- Turbopack está compilando incorrectamente

**Solución:**
- Verificar el log del servidor: `dev.log`
- Reiniciar el servidor si hay errores internos
- Limpiar el caché de Next.js: `rm -rf .next`

---

## 📋 Qué Deberías Ver en los Logs

### Logs del Frontend (Consola del Navegador)

Busca estos patrones:

**✅ Funcionamiento Normal:**
```
[MundosSection] worldsData existe: true
[MundosSection] Mundos obtenidos: 0
```
→ No hay mundos, es normal

**✅ Con Datos:**
```
[MundosSection] worldsData existe: true
[MundosSection] Mundos obtenidos: 3
[MundosSection] Requesting memory for world: ...
[MundosSection] Memory guardada para world: ...
```
→ Todo funciona correctamente

**❌ Error en Mundos:**
```
[MundosSection] worldsData existe: false
[MundosSection] Error cargando mundos: ...
```
→ No se cargaron los mundos

**❌ Error en Memoria:**
```
[MundosSection] Error fetching memory for world: ... status: 404
[MundosSection] Error fetching memory for world: ... status: 500
```
→ El endpoint de memoria está fallando

**❌ Error de Red:**
```
[MundosSection] /api/worlds status: 0
[MundosSection] Error cargando mundos: Failed to fetch
```
→ El servidor no es accesible

### Logs del Backend (Servidor)

Busca en el log del servidor o en la terminal:

**✅ Funcionamiento Normal:**
```
[API:worlds] Iniciando GET all worlds...
[API:worlds] Mundos obtenidos: 3
```

**❌ Error de Base de Datos:**
```
Error: [some database error]
```

---

## 🔍 Diferencias de Logs

### Prefijos para Filtrado

**Frontend:**
- `[MundosSection]` - Todos los logs del componente MundosSection

**Backend:**
- `[API:worlds]` - Todos los logs del API de mundos

### Por Qué Usar Prefijos

Los prefijos permiten filtrar fácilmente en DevTools:

1. Abre DevTools (F12)
2. Ve a la pestaña "Console"
3. En el filtro, escribe: `MundosSection` o `API:worlds`
4. Verás solo los logs relevantes al problema

---

## 📝 Próximo Paso

1. Recarga la página (F5)
2. Observa los logs en la consola del navegador
3. Identifica cuál es el caso según los patrones mostrados arriba
4. Comunícate cuál caso viste

---

## ✅ Resumen

**Cambios aplicados:**
1. ✅ Logging completo en el frontend (MundosSection)
2. ✅ Logging en el backend (API:worlds)
3. ✅ Verificaciones de seguridad antes de usar `.map()`
4. ✅ Protección contra errores de undefined
5. ✅ Mensajes de error más específicos

**Cómo usar:**
1. Recarga la página
2. Abre la consola del navegador (F12)
3. Busca logs con prefijo `[MundosSection]`
4. Identifica el problema según los patrones de este documento
5. Reporta cuál caso viste

---

## 📁 Archivos Modificados

| Archivo | Líneas | Cambio |
|---------|--------|--------|
| `src/components/dashboard/mundo/MundosSection.tsx` | 34-113 | Logging completo y manejo robusto de errores |
| `src/app/api/worlds/route.ts` | 6-23 | Logging en GET endpoint |

---

**¡Con estos cambios podrás ver exactamente qué está pasando!** 🚀
