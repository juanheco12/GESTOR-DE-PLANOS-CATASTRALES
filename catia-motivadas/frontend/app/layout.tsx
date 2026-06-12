import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CatIA - Generador de Motivadas",
  description: "Generador de motivadas de trámites catastrales con IA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
