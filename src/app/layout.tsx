import type { Metadata } from "next";

import { ThemeToggle } from "@/components/ui/theme-toggle";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Legal Document Analysis Platform",
  description: "Upload legal PDFs and ask questions with AI-powered analysis, citations, and risk flagging.",
};

// Root layout with theme toggle and shared shell.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <div className="fixed right-4 top-4 z-50">
          <ThemeToggle />
        </div>
        {children}
      </body>
    </html>
  );
}
