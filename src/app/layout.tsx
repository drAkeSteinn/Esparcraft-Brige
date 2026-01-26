// Esparcraft Bridge - Panel Arcano with Pixel Art Dark Fantasy theme
import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  weight: "400",
  subsets: ["latin"],
});

const vt323 = VT323({
  variable: "--font-vt323",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Esparcraft Bridge - Panel Arcano",
  description: "Panel arcano de gestión del mundo de Esparcraft. Interfaz pixel art dark fantasy para escribas y guardianes del conocimiento.",
  keywords: ["Esparcraft", "Bridge", "Pixel Art", "Dark Fantasy", "NPCs", "World", "Map"],
  authors: [{ name: "Esparcraft Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Esparcraft Bridge",
    description: "Panel arcano de gestión del mundo de Esparcraft",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Esparcraft Bridge",
    description: "Panel arcano de gestión del mundo de Esparcraft",
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
        className={`${pressStart.variable} ${vt323.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
