import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bridge IA - Gestor Narrativo Esparcraft",
  description: "Sistema de gestión narrativa con IA para el servidor Esparcraft. Gestiona mundos, NPCs, mapas y sesiones interactivas.",
  keywords: ["Bridge IA", "Esparcraft", "Gestión Narrativa", "Next.js", "TypeScript", "Tailwind CSS", "shadcn/ui", "AI"],
  authors: [{ name: "Comunidad Tirano Estudios" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Bridge IA - Gestor Narrativo Esparcraft",
    description: "Sistema de gestión narrativa con IA para el servidor Esparcraft",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
