import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChiLife — Tu vida en equilibrio",
  description: "Acompaña tus hábitos, encuentra tu balance y ahorra para celebrar tus logros.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
