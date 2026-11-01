import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const manrope = localFont({ src: "./fonts/Manrope-variable.ttf", variable: "--font-manrope", display: "swap", weight: "200 800" });

export const metadata: Metadata = {
  title: { default: "Gestión documental", template: "%s | Gestión documental" },
  description: "Documentación empresarial y control de vencimientos.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-AR" className={manrope.variable}><body>{children}</body></html>;
}
