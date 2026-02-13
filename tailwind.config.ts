import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        vt323: ['var(--font-vt323)', 'monospace'],
        'press-start': ['var(--font-press-start)', 'monospace'],
      },
      colors: {
        // CSS Variables para shadcn/ui
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        chart: {
          '1': 'var(--chart-1)',
          '2': 'var(--chart-2)',
          '3': 'var(--chart-3)',
          '4': 'var(--chart-4)',
          '5': 'var(--chart-5)',
        },
        // Pixel Art Dark Fantasy palette (80/15/5)
        fantasy: {
          // Base Colors (80%)
          charcoal: '#0A090A',      // Negro carbón - Fondo principal
          'deep-black': '#100F11',  // Negro profundo - Paneles, cards
          graphite: '#1A191A',      // Gris grafito - Muted backgrounds
          textured: '#2C2923',      // Carbón texturizado - Bordes
          // Metals & Golds (15%)
          bronze: '#423C2E',        // Bronce oscuro - Botones secundarios
          'aged-gold': '#60553A',   // Oro envejecido - Texto secundario
          'antique-gold': '#83673D',// Oro antiguo - Acentos, badges
          gold: '#C89E5B',          // Oro principal - Primary, botones
        },
        // Gold text colors (5%)
        gold: {
          light: '#F8E097',   // Oro luz - Títulos, iconos, estados activos
          main: '#C89E5B',    // Oro principal
          aged: '#83673D',    // Oro envejecido
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'var(--radius-xl)',
      },
      // Animaciones rápidas para pixel art
      transitionDuration: {
        '100': '100ms',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
