import type { Metadata } from "next";
import { VT323, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// Fuente para texto funcional
const vt323 = VT323({
  variable: "--font-vt323",
  subsets: ["latin"],
  weight: "400",
});

// Fuente para títulos (pixel art style)
const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Bridge IA — Gestor Narrativo Esparcraft",
  description: "Panel arcano para gestión narrativa del servidor Esparcraft. Interfaz pixel art dark fantasy para escribas, cronistas y guardianes del conocimiento.",
  keywords: ["Esparcraft", "Bridge IA", "Gestor Narrativo", "Tirano Estudios", "Pixel Art", "Dark Fantasy", "RPG"],
  authors: [{ name: "Tirano Estudios" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Bridge IA — Gestor Narrativo",
    description: "Panel arcano para gestión narrativa del servidor Esparcraft",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${vt323.variable} ${pressStart.variable} antialiased bg-background text-foreground font-vt323`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
