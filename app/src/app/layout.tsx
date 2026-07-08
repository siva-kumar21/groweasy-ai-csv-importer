import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GrowEasy CSV Importer",
  description: "AI-powered CSV importer for CRM lead records"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
