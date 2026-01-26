# 🜏 Bridge IA — Guía de Estilo Pixel Art Dark Fantasy

---

## 📖 Índice

1. [Visión General](#1-visión-general)
2. [Filosofía de Diseño](#2-filosofía-de-diseño)
3. [Paleta Cromática](#3-paleta-cromática)
4. [Tipografía](#4-tipografía)
5. [Estructura de Componentes](#5-estructura-de-componentes)
6. [Implementación CSS](#6-implementación-css)
7. [Variables CSS](#7-variables-css)
8. [Utilidades y Clases](#8-utilidades-y-clases)
9. [Override de Componentes](#9-override-de-componentes)
10. [Ejemplos de Uso](#10-ejemplos-de-uso)

---

## 1. Visión General

Bridge IA utiliza una interfaz **pixel art dark fantasy** diseñada para sentirse como:

> "Un panel arcano utilizado por escribas, cronistas y guardianes del conocimiento."

### Objetivo Principal

Transformar la interfaz desde un estilo web moderno hacia una estética:
- Coherente con el universo narrativo de **Esparcraft**
- Diegética (la herramienta existe dentro del mundo)
- Usable y legible
- Con identidad visual consistente

### Metáforas Visuales

La interfaz simula:
- 📜 **Grimorio**: Libro de hechizos antiguo
- ⚔️ **Consola arcanal**: Panel de mando de reliquias
- 🏛️ **Placas físicas**: Paneles de metal/piedra
- ⚖️ **Reliquias funcionales**: Artefactos mágicos utilizables

---

## 2. Filosofía de Diseño

### 2.1 Qué NO Somos

| Elemento | ❌ Evitar |
|----------|-----------|
| Estilo SaaS | ✅ |
| Flat UI | ✅ |
| Rounded moderno (border-radius) | ✅ |
| Sombras suaves/blur | ✅ |
| Gradientes modernos sutiles | ✅ |
| Animaciones fluidas excesivas | ✅ |
| Color neón/vibrante | ✅ |

### 2.2 Qué SOMOS

| Elemento | ✅ Aplicar |
|----------|-------------|
| Estética RPG clásico | ✅ |
| Bordes duros (2-3px) | ✅ |
| Pixel visible | ✅ |
| Oro envejecido | ✅ |
| Oscuridad dominante | ✅ |
| Sombras duras (1px) | ✅ |
| Gradientes de metal | ✅ |
| Animaciones rápidas (0.1s) | ✅ |

### 2.3 Regla de Proporción de Colores

```
80%  Negros y carbón (fondo, paneles)
15%  Bronces y oro oscuro (bordes, elementos secundarios)
5%   Brillo dorado (títulos, iconos, estados activos, highlights)
```

**Importante**: El color `#F8E097` (oro luz) **NO debe usarse en texto largo**, solo en:
- Títulos
- Iconos
- Estados activos
- Highlights

---

## 3. Paleta Cromática

### 3.1 Colores Base (80%)

| Nombre | HEX | Uso | CSS Variable |
|--------|------|------|--------------|
| Negro carbón | `#0A090A` | Fondo principal | `--background` |
| Negro profundo | `#100F11` | Paneles, cards, dialogs | `--card` |
| Gris grafito | `#1A191A` | Muted backgrounds | `--muted` |
| Carbón texturizado | `#2C2923` | Bordes, separadores | `--border` |

### 3.2 Dorados y Metales (15%)

| Nombre | HEX | Uso | CSS Variable |
|--------|------|------|--------------|
| Bronce oscuro | `#423C2E` | Botones secundarios, inputs | `--secondary` |
| Oro envejecido | `#60553A` | Texto secundario, muted text | `--muted-foreground` |
| Oro antiguo | `#83673D` | Acentos, badges, toggles | `--accent` |
| Oro principal | `#C89E5B` | Primary, botones principales | `--primary` |

### 3.3 Brillos (5%)

| Nombre | HEX | Uso | Restricción |
|--------|------|------|-------------|
| Oro luz | `#F8E097` | Títulos, iconos, estados activos | ❌ NO texto largo |

### 3.4 Colores Especiales

| Nombre | HEX | Uso |
|--------|------|------|
| Rojo destructivo | `#8B3A3A` | Errores, acciones destructivas |

### 3.5 Paleta Tailwind

La paleta está disponible como clases Tailwind:

```html
<!-- Fondos -->
<div class="bg-fantasy-charcoal">       <!-- #0A090A -->
<div class="bg-fantasy-deep-black">     <!-- #100F11 -->
<div class="bg-fantasy-graphite">       <!-- #1A191A -->
<div class="bg-fantasy-textured">       <!-- #2C2923 -->
<div class="bg-fantasy-bronze">         <!-- #423C2E -->
<div class="bg-fantasy-aged-gold">      <!-- #60553A -->
<div class="bg-fantasy-antique-gold">  <!-- #83673D -->
<div class="bg-fantasy-gold">          <!-- #C89E5B -->

<!-- Texto -->
<p class="text-gold-light">    <!-- #F8E097 -->
<p class="text-gold-main">     <!-- #C89E5B -->
<p class="text-gold-aged">     <!-- #83673D -->
```

---

## 4. Tipografía

### 4.1 Fuentes Utilizadas

| Propósito | Fuente | Google Font | Tamaño Base |
|----------|---------|--------------|-------------|
| Títulos (h1-h6) | **Press Start 2P** | `Press_Start_2P` | 20-28px |
| Texto funcional | **VT323** | `VT323` | 18px |
| Código/monospace | VT323 | `VT323` | 16px |

### 4.2 Configuración en Tailwind

```typescript
// tailwind.config.ts
fontFamily: {
  vt323: ['var(--font-vt323)', 'monospace'],
  'press-start': ['var(--font-press-start)', 'monospace'],
}
```

### 4.3 Jerarquía Tipográfica

```css
/* Títulos */
h1 {
  font-family: 'Press Start 2P', monospace;
  font-size: 28px;
  color: #C89E5B;
  text-shadow: 2px 2px 0px rgba(0, 0, 0, 1);
  text-transform: uppercase;
  letter-spacing: 1px;
}

h2 {
  font-family: 'Press Start 2P', monospace;
  font-size: 24px;
  color: #F8E097;
}

h3 {
  font-family: 'Press Start 2P', monospace;
  font-size: 20px;
  color: #C89E5B;
}

h4, h5, h6 {
  font-family: 'Press Start 2P', monospace;
  color: #83673D;
}

/* Texto funcional */
body {
  font-family: 'VT323', monospace;
  font-size: 18px;
  line-height: 1.6;
  letter-spacing: 0.5px;
  color: #B8B8B8;
}
```

### 4.4 Clases de Utilidad Tailwind

```html
<h1 class="font-press-start pixel-gold-text">Título Principal</h1>
<h2 class="font-press-start text-gold-light">Subtítulo</h2>
<p class="font-vt323 text-foreground">Texto funcional</p>
```

---

## 5. Estructura de Componentes

### 5.1 Componentes Personalizados (`src/components/pixel/`)

#### PixelPanel
Paneles que simulan placas físicas de metal/piedra.

```tsx
import { PixelPanel } from '@/components/pixel';

<PixelPanel variant="default" padding="md">
  {/* Contenido */}
</PixelPanel>

<PixelPanel variant="bronze" padding="lg">
  {/* Panel con gradiente broncino */}
</PixelPanel>

<PixelPanel variant="gold" padding="sm">
  {/* Panel con acentos dorados */}
</PixelPanel>
```

**Props**:
- `variant`: 'default' | 'bronze' | 'gold'
- `padding`: 'sm' | 'md' | 'lg'
- `className`: clases adicionales

#### PixelButton
Botones con estética pixel art y efectos hover/active.

```tsx
import { PixelButton } from '@/components/pixel';

<PixelButton onClick={handleClick}>
  Botón Normal
</PixelButton>

<PixelButton variant="primary" onClick={handleSubmit}>
  Botón Principal
</PixelButton>

<PixelButton variant="destructive" onClick={handleDelete}>
  Eliminar
</PixelButton>

<PixelButton isLoading={true} disabled={true}>
  Cargando...
</PixelButton>
```

**Props**:
- `variant`: 'default' | 'primary' | 'destructive'
- `size`: 'sm' | 'md' | 'lg'
- `isLoading`: boolean (muestra spinner)
- `disabled`: boolean

#### PixelInput
Inputs con estilos pixel art y validación.

```tsx
import { PixelInput } from '@/components/pixel';

<PixelInput
  label="Nombre del NPC"
  value={formData.nombre}
  onChange={(e) => setNombre(e.target.value)}
  error={errors.nombre}
/>

<PixelInput
  label="Descripción"
  type="textarea"
  value={formData.descripcion}
  onChange={(e) => setDescripcion(e.target.value)}
/>
```

**Props**:
- `label`: string (etiqueta con tipografía pixel)
- `error`: string (muestra error en rojo)
- Todos los props de `<input>` estándar

### 5.2 Estilos CSS de Componentes

#### PixelPanel

```css
.pixel-panel {
  background: #100F11;
  border: 2px solid #2C2923;
  box-shadow:
    2px 2px 0px rgba(0, 0, 0, 1),
    -1px -1px 0px rgba(255, 255, 255, 0.05),
    inset 0 0 20px rgba(0, 0, 0, 0.3);
}

.pixel-panel-bronze {
  background: linear-gradient(135deg, #423C2E 0%, #60553A 50%, #423C2E 100%);
  border: 2px solid #83673D;
  box-shadow:
    2px 2px 0px rgba(0, 0, 0, 1),
    inset 0 0 10px rgba(0, 0, 0, 0.5);
}
```

#### PixelButton

```css
.pixel-button {
  background: linear-gradient(180deg, #60553A 0%, #423C2E 100%);
  border: 2px solid #83673D;
  color: #B8B8B8;
  padding: 8px 16px;
  font-size: 16px;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  box-shadow:
    2px 2px 0px rgba(0, 0, 0, 1),
    -1px -1px 0px rgba(255, 255, 255, 0.05);
  transition: all 0.1s ease;
}

.pixel-button:hover {
  background: linear-gradient(180deg, #83673D 0%, #60553A 100%);
  box-shadow:
    2px 2px 0px rgba(0, 0, 0, 1),
    0 0 10px rgba(200, 158, 91, 0.2),
    -1px -1px 0px rgba(255, 255, 255, 0.08);
}

.pixel-button:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0px rgba(0, 0, 0, 1);
}

.pixel-button-primary {
  background: linear-gradient(180deg, #C89E5B 0%, #83673D 100%);
  border: 2px solid #F8E097;
  color: #0A090A;
  font-weight: bold;
}
```

#### PixelInput

```css
.pixel-input {
  background: #0A090A;
  border: 2px solid #2C2923;
  color: #B8B8B8;
  padding: 8px 12px;
  font-size: 18px;
}

.pixel-input:focus {
  border-color: #C89E5B;
  box-shadow: 0 0 0 1px #C89E5B, 2px 2px 0px rgba(0, 0, 0, 1);
}

.pixel-input::placeholder {
  color: #423C2E;
}
```

---

## 6. Implementación CSS

### 6.1 Estructura de Archivos

```
src/
├── app/
│   ├── globals.css           # CSS global y tema
│   └── layout.tsx          # Configuración de fuentes
├── components/
│   └── pixel/             # Componentes personalizados
│       ├── PixelPanel.tsx
│       ├── PixelButton.tsx
│       ├── PixelInput.tsx
│       └── index.ts
└── tailwind.config.ts       # Configuración de Tailwind
```

### 6.2 globals.css - Estructura

El archivo `globals.css` tiene 3 capas principales:

#### Layer 1: `@theme inline`
Define variables CSS para Tailwind.

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-vt323: var(--font-vt323);
  --font-press-start: var(--font-press-start);
  /* ... más variables */
  --radius-sm: 0px;
  --radius-md: 0px;
  --radius-lg: 0px;
}
```

#### Layer 2: `:root`
Define los valores reales del tema Dark Fantasy.

```css
:root {
  --background: #0A090A;
  --foreground: #B8B8B8;
  --card: #100F11;
  --primary: #C89E5B;
  /* ... etc */
}
```

#### Layer 3: `@layer base`
Estilos base que se aplican automáticamente.

```css
@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground font-vt323;
    font-size: 18px;
    line-height: 1.6;
    letter-spacing: 0.5px;
  }

  h1, h2, h3, h4, h5, h6 {
    @apply font-press-start;
    font-weight: 400;
    line-height: 1.4;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
}
```

#### Layer 4: `@layer utilities`
Clases de utilidad personalizadas.

```css
@layer utilities {
  .pixel-border { /* ... */ }
  .pixel-panel { /* ... */ }
  .pixel-button { /* ... */ }
  .gold-glow { /* ... */ }
  /* ... más utilidades */
}
```

### 6.3 Scrollbar Personalizada

```css
/* Scrollbar styling */
::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

::-webkit-scrollbar-track {
  background: #0A090A;
  border: 2px solid #2C2923;
}

::-webkit-scrollbar-thumb {
  background: #423C2E;
  border: 2px solid #2C2923;
}

::-webkit-scrollbar-thumb:hover {
  background: #60553A;
}

::-webkit-scrollbar-button {
  background: #423C2E;
  border: 2px solid #2C2923;
}
```

### 6.4 Selección de Texto

```css
::selection {
  background: #C89E5B;
  color: #0A090A;
}
```

---

## 7. Variables CSS

### 7.1 Variables de Color (Dark Fantasy)

```css
:root {
  /* Colores base (80%) */
  --background: #0A090A;          /* Negro carbón */
  --foreground: #B8B8B8;          /* Gris claro para texto */
  --card: #100F11;                /* Negro profundo */
  --muted: #1A191A;              /* Gris grafito */
  --border: #2C2923;              /* Carbón texturizado */

  /* Dorados y metales (15%) */
  --secondary: #423C2E;           /* Bronce oscuro */
  --muted-foreground: #60553A;    /* Oro envejecido */
  --accent: #83673D;              /* Oro antiguo */
  --primary: #C89E5B;             /* Oro principal */

  /* Brillos (5%) */
  /* Oro luz (#F8E097) usado solo en: */
  /*   - Títulos */
  /*   - Iconos */
  /*   - Estados activos */
  /*   - Highlights */
}
```

### 7.2 Variables de Componentes

```css
:root {
  --card-foreground: #B8B8B8;
  --popover: #100F11;
  --popover-foreground: #B8B8B8;
  --primary-foreground: #0A090A;
  --secondary-foreground: #B8B8B8;
  --accent-foreground: #B8B8B8;
  --input: #1A191A;
  --ring: #C89E5B;

  /* Colores especiales */
  --destructive: #8B3A3A;
  --destructive-foreground: #B8B8B8;
}
```

### 7.3 Variables de Bordes

```css
:root {
  --radius-sm: 0px;     /* Sin rounded */
  --radius-md: 0px;     /* Sin rounded */
  --radius-lg: 0px;     /* Sin rounded */
}
```

---

## 8. Utilidades y Clases

### 8.1 Bordes

```html
<div class="pixel-border">
  Borde 2px sólido #2C2923 con sombra pixel
</div>

<div class="pixel-border-gold">
  Borde 2px sólido #83673D con brillo dorado
</div>
```

**CSS**:
```css
.pixel-border {
  border-width: 2px;
  border-style: solid;
  border-color: #2C2923;
  box-shadow:
    2px 2px 0px rgba(0, 0, 0, 1),
    -1px -1px 0px rgba(255, 255, 255, 0.05);
}

.pixel-border-gold {
  border-width: 2px;
  border-style: solid;
  border-color: #83673D;
  box-shadow:
    2px 2px 0px rgba(0, 0, 0, 1),
    inset 0 0 0 1px rgba(248, 224, 151, 0.1);
}
```

### 8.2 Paneles

```html
<div class="pixel-panel">
  Panel con fondo #100F11 y borde #2C2923
</div>

<div class="pixel-panel-bronze">
  Panel con gradiente broncino y borde #83673D
</div>
```

### 8.3 Sombras

```html
<div class="shadow-pixel">
  Sombra dura 1px
</div>

<div class="shadow-pixel-hard">
  Sombra dura 2px
</div>

<div class="gold-glow">
  Brillo dorado (10px y 20px)
</div>
```

**CSS**:
```css
.shadow-pixel {
  box-shadow:
    1px 1px 0px rgba(0, 0, 0, 1),
    -1px -1px 0px rgba(255, 255, 255, 0.05);
}

.shadow-pixel-hard {
  box-shadow:
    2px 2px 0px rgba(0, 0, 0, 1),
    -1px -1px 0px rgba(255, 255, 255, 0.05);
}

.gold-glow {
  box-shadow:
    0 0 10px rgba(200, 158, 91, 0.3),
    0 0 20px rgba(200, 158, 91, 0.1);
}
```

### 8.4 Texto Dorado

```html
<h1 class="pixel-gold-text">
  Título con brillo dorado y sombra
</h1>

<p class="text-gold-light">Oro luz (#F8E097)</p>
<p class="text-gold-main">Oro principal (#C89E5B)</p>
<p class="text-gold-aged">Oro envejecido (#83673D)</p>
```

**CSS**:
```css
.pixel-gold-text {
  color: #F8E097;
  text-shadow:
    1px 1px 0px rgba(0, 0, 0, 1),
    0 0 10px rgba(200, 158, 91, 0.3);
}
```

### 8.5 Tabs Activos

```html
<button class="tab-active">
  Pestaña activa con gradiente dorado
</button>
```

**CSS**:
```css
.tab-active {
  background: linear-gradient(180deg, #C89E5B 0%, #83673D 100%);
  border-bottom: 3px solid #F8E097;
  color: #0A090A;
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.5),
    inset 0 1px 0px rgba(255, 255, 255, 0.1);
}
```

---

## 9. Override de Componentes

### 9.1 Cards

```css
.bg-card {
  background: #100F11 !important;
  border: 2px solid #2C2923;
  box-shadow: 2px 2px 0px rgba(0, 0, 0, 1);
}
```

### 9.2 Dialogs

```css
[data-radix-dialog-overlay] {
  background: rgba(10, 9, 10, 0.9);
}

[data-radix-dialog-content] {
  background: #100F11;
  border: 3px solid #83673D;
  border-radius: 0;
  box-shadow:
    4px 4px 0px rgba(0, 0, 0, 1),
    0 0 20px rgba(200, 158, 91, 0.2);
}
```

### 9.3 Tabs

```css
[data-radix-tabs-list] {
  border-bottom: 3px solid #2C2923;
}

[data-radix-tabs-trigger] {
  border-radius: 0;
  border: none;
  border-bottom: 3px solid transparent;
}

[data-radix-tabs-trigger][data-state="active"] {
  background: linear-gradient(180deg, #C89E5B 0%, #83673D 100%);
  border-bottom: 3px solid #F8E097;
  color: #0A090A;
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.5),
    inset 0 1px 0px rgba(255, 255, 255, 0.1);
}

[data-radix-tabs-trigger]:hover {
  color: #F8E097;
}
```

### 9.4 Select

```css
[data-radix-select-trigger] {
  background: #0A090A;
  border: 2px solid #2C2923;
  border-radius: 0;
}

[data-radix-select-trigger]:focus {
  border-color: #C89E5B;
  box-shadow: 2px 2px 0px rgba(200, 158, 91, 0.4);
}

[data-radix-select-content] {
  background: #100F11;
  border: 2px solid #83673D;
  border-radius: 0;
  box-shadow:
    2px 2px 0px rgba(0, 0, 0, 1),
    0 0 10px rgba(0, 0, 0, 0.5);
}
```

### 9.5 Tables

```css
table {
  border: 2px solid #2C2923;
}

th {
  background: #423C2E;
  border: 2px solid #2C2923;
  color: #F8E097;
  font-weight: normal;
}

td {
  border: 1px solid #2C2923;
  background: #100F11;
}

tr:hover td {
  background: #1A191A;
}
```

### 9.6 Badges

```css
.badge {
  border: 2px solid #2C2923;
  border-radius: 0;
  background: #423C2E;
  color: #B8B8B8;
  padding: 4px 8px;
  font-size: 14px;
  font-weight: normal;
}
```

### 9.7 Alerts

```css
.alert {
  border: 2px solid #2C2923;
  border-radius: 0;
  background: #100F11;
}

.alert-info {
  border-color: #83673D;
  background: linear-gradient(135deg, rgba(131, 103, 61, 0.1) 0%, rgba(10, 9, 10, 1) 100%);
}

.alert-warning {
  border-color: #C89E5B;
  background: linear-gradient(135deg, rgba(200, 158, 91, 0.1) 0%, rgba(10, 9, 10, 1) 100%);
}

.alert-destructive {
  border-color: #8B3A3A;
  background: linear-gradient(135deg, rgba(139, 58, 58, 0.1) 0%, rgba(10, 9, 10, 1) 100%);
}
```

### 9.8 Toggles (Switches)

```css
[data-radix-switch] {
  background: #0A090A;
  border: 2px solid #2C2923;
  border-radius: 0;
}

[data-radix-switch]:focus {
  box-shadow: 2px 2px 0px rgba(200, 158, 91, 0.4);
}

[data-radix-switch-thumb] {
  background: #423C2E;
  border: 2px solid #83673D;
  border-radius: 0;
  box-shadow: 1px 1px 0px rgba(0, 0, 0, 1);
}

[data-state="checked"][data-radix-switch] {
  background: #83673D;
}

[data-state="checked"][data-radix-switch-thumb] {
  background: #C89E5B;
  border-color: #F8E097;
}
```

### 9.9 Sliders

```css
[data-radix-slider] {
  background: #0A090A;
  border: 2px solid #2C2923;
  border-radius: 0;
  height: 8px;
}

[data-radix-slider-track] {
  background: #1A191A;
}

[data-radix-slider-thumb] {
  background: linear-gradient(180deg, #C89E5B 0%, #83673D 100%);
  border: 2px solid #F8E097;
  border-radius: 0;
  box-shadow: 2px 2px 0px rgba(0, 0, 0, 1);
}
```

### 9.10 Toasts

```css
[data-radix-toast] {
  background: #100F11;
  border: 2px solid #83673D;
  border-radius: 0;
  box-shadow:
    2px 2px 0px rgba(0, 0, 0, 1),
    0 0 10px rgba(0, 0, 0, 0.5);
}
```

### 9.11 Textarea

```css
textarea {
  background: #0A090A;
  border: 2px solid #2C2923;
  border-radius: 0;
  resize: none;
}

textarea:focus {
  border-color: #C89E5B;
  box-shadow: 2px 2px 0px rgba(200, 158, 91, 0.4);
}
```

---

## 10. Ejemplos de Uso

### 10.1 Ejemplo Completo: Header

```tsx
import { Scroll } from 'lucide-react';

export function Header() {
  return (
    <header className="pixel-panel-bronze border-b-4 border-fantasy-textured">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Scroll className="w-8 h-8 text-gold-light" />
              <h1 className="text-2xl md:text-3xl font-press-start uppercase tracking-wider pixel-gold-text">
                Bridge IA
              </h1>
            </div>
            <p className="text-sm md:text-base font-vt323 text-foreground mb-1">
              Gestor Narrativo — Servidor Esparcraft
            </p>
            <p className="text-xs font-press-start text-gold-aged uppercase tracking-wider">
              Comunidad Tirano Estudios
            </p>
          </div>
          
          <PixelPanel variant="bronze" padding="md" className="hidden md:block">
            <div className="text-right">
              <p className="text-sm font-press-start uppercase tracking-wider text-gold-main mb-1">
                Conexión LLM
              </p>
              <p className="text-xs font-vt323 text-foreground">
                Puerto: 5000 (API OpenAI-compatible)
              </p>
            </div>
          </PixelPanel>
        </div>
      </div>
    </header>
  );
}
```

### 10.2 Ejemplo Completo: Tabs

```tsx
import { Globe, Users, MapPin } from 'lucide-react';

const tabs = [
  { id: 'mundo', label: 'Universo', icon: Globe },
  { id: 'npcs', label: 'NPCs', icon: Users },
  { id: 'map', label: 'Mapa 2D', icon: MapPin },
];

export function PixelTabs({ activeTab, setActiveTab }: TabsProps) {
  return (
    <nav className="flex flex-wrap gap-1 border-b-2 border-fantasy-textured">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-3 py-3 font-press-start text-sm uppercase tracking-wider
              border-b-3 border-transparent transition-all
              hover:text-gold-light
              ${isActive 
                ? 'bg-gradient-to-b from-fantasy-gold to-fantasy-antique-gold text-fantasy-charcoal border-b-3 border-gold-light shadow-lg' 
                : 'text-foreground'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
```

### 10.3 Ejemplo Completo: Card con Contenido

```tsx
export function PixelCard({ title, children }: CardProps) {
  return (
    <div className="pixel-panel p-6">
      <h3 className="text-gold-main mb-4">{title}</h3>
      <div className="space-y-4">
        {children}
      </div>
      <div className="mt-6 flex gap-2">
        <PixelButton variant="primary" onClick={handleSave}>
          Guardar
        </PixelButton>
        <PixelButton onClick={handleCancel}>
          Cancelar
        </PixelButton>
      </div>
    </div>
  );
}
```

### 10.4 Ejemplo Completo: Formulario

```tsx
export function PixelForm() {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
  });

  return (
    <PixelPanel padding="lg">
      <h2 className="pixel-gold-text mb-6">Crear NPC</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <PixelInput
          label="Nombre del NPC"
          value={formData.nombre}
          onChange={(e) => setFormData({...formData, nombre: e.target.value})}
          placeholder="Ej: Gandalf el Gris"
        />
        
        <div>
          <label className="block mb-2 text-sm font-press-start uppercase tracking-wider text-gold-aged">
            Descripción
          </label>
          <textarea
            className="w-full bg-fantasy-charcoal border-2 border-fantasy-textured text-foreground pixel-input rounded-none"
            value={formData.descripcion}
            onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
            rows={4}
            placeholder="Descripción detallada del NPC..."
          />
        </div>
        
        <div className="flex gap-2 mt-4">
          <PixelButton variant="primary" type="submit">
            Crear NPC
          </PixelButton>
          <PixelButton type="button" onClick={handleCancel}>
            Cancelar
          </PixelButton>
        </div>
      </form>
    </PixelPanel>
  );
}
```

### 10.5 Ejemplo Completo: Footer

```tsx
export function Footer() {
  return (
    <footer className="pixel-panel-bronze border-t-4 border-fantasy-textured mt-auto">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-sm">
          <p className="font-press-start uppercase tracking-wider text-gold-main text-center md:text-left">
            Bridge IA — Gestor Narrativo v1.0.0
          </p>
          <p className="font-vt323 text-foreground text-center md:text-right">
            Comunidad Tirano Estudios — Servidor Esparcraft
          </p>
        </div>
      </div>
    </footer>
  );
}
```

---

## 📋 Checklist de Estilo

Cuando desarrolles nuevos componentes, verifica:

- [ ] **No usar** `rounded-*` (usar `rounded-none` o `border-radius: 0`)
- [ ] **Usar** bordes duros de 2-3px (`border-2` o `border-pixel`)
- [ ] **Fuentes correctas**: VT323 para texto, Press Start 2P para títulos
- [ ] **Colores adecuados**: 80% oscuros, 15% bronce/oscuro, 5% dorado brillante
- [ ] **Sombras duras**: `box-shadow: 2px 2px 0px rgba(0,0,0,1)`
- [ ] **No blur**: Evitar `backdrop-filter: blur()`
- [ ] **Gradientes sutiles**: Solo para metales (bronce, oro)
- [ ] **Animaciones rápidas**: `transition: all 0.1s ease`
- [ ] **Brillo dorado**: Solo en estados activos y títulos
- [ ] **Bordes consistentes**: Siempre `border: 2px solid #2C2923` o `#83673D`

---

## 🎨 Referencia Rápida de Colores

```css
/* Copia y pega en tu proyecto para referencia rápida */

:root {
  /* Base Colors (80%) */
  --fantasy-charcoal: #0A090A;
  --fantasy-deep-black: #100F11;
  --fantasy-graphite: #1A191A;
  --fantasy-textured: #2C2923;

  /* Metals & Golds (15%) */
  --fantasy-bronze: #423C2E;
  --fantasy-aged-gold: #60553A;
  --fantasy-antique-gold: #83673D;
  --fantasy-gold: #C89E5B;

  /* Highlights (5%) */
  --fantasy-gold-light: #F8E097;

  /* Special */
  --fantasy-destructive: #8B3A3A;
}
```

---

## 📚 Recursos Adicionales

### Fuentes
- **VT323**: https://fonts.google.com/specimen/VT323
- **Press Start 2P**: https://fonts.google.com/specimen/Press+Start+2P

### Inspiración
- Juegos RPG clásicos (Final Fantasy I-VI, Dragon Quest)
- Interfaces de grimorios y reliquias mágicas
- Arte pixel art dark fantasy moderno

### Herramientas de Diseño
- **Aseprite**: Para crear gráficos pixel art
- **Piskel**: Editor pixel art online gratuito
- **Lospec**: Paletas de colores pixel art

---

## 🚀 Próximos Pasos de Extensión

Para extender el estilo, considera:

1. **Animaciones Pixel Art**
   - Movimientos discretos (2px por frame)
   - Duración de 0.1s-0.2s
   - Sin smooth/suave

2. **Efectos de Partículas**
   - Brillos dorados
   - Escarcha/magia
   - Glitch effects

3. **Sonidos de UI**
   - Clicks metálicos
   - Pergamino desplegándose
   - Magia activándose

4. **Transiciones de Pantalla**
   - Fade oscuro
   - Glitch retro
   - Efecto de TV apagada

---

## 📝 Notas Finales

Este estilo fue diseñado para:
- ✅ Ser consistente con el universo de Esparcraft
- ✅ Proporcionar una experiencia diegética
- ✅ Mantener usabilidad y legibilidad
- ✅ Evitar clichés de SaaS y flat UI
- ✅ Crear identidad visual única

La clave del estilo está en:
1. **Restricción**: Seguir estrictamente las reglas de color y forma
2. **Consistencia**: Aplicar los mismos patrones en todas partes
3. **Proporción**: Respetar 80/15/5 de distribución de colores
4. **Detalle**: Los pequeños detalles (sombras, gradientes) marcan la diferencia

---

**Versión**: 1.0.0  
**Fecha**: 2025  
**Autor**: Z.ai Code  
**Proyecto**: Bridge IA — Gestor Narrativo Esparcraft
