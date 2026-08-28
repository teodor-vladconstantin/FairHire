import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FairHire — Bias-free ZK Screening",
  description:
    "Zero-knowledge candidate screening on Midnight Network. Prove you qualify without exposing your CV.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        {children}
      </body>
    </html>
  );
}
