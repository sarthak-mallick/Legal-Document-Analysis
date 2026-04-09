import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "@/lib/env-check";
import "@/app/globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Legal Document Analysis Platform",
  description:
    "Upload legal PDFs and ask questions with AI-powered analysis, citations, and risk flagging.",
};

// Root layout with Inter font and shared shell.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
