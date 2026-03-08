import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Legal Document Analysis Platform",
  description: "Upload legal PDFs, index them, and prepare them for question answering.",
};

// This layout defines the shared document shell and font setup.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
