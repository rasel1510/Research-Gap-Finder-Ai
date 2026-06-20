import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "ResearchGap AI",
  description:
    "An AI-native research platform that extracts structured insights, maps citation clusters, and detects methodologies gaps in scientific literature.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth" data-scroll-behavior="smooth">
      <body className={`${inter.variable} animated-gradient min-h-screen text-foreground antialiased selection:bg-indigo-500/30 selection:text-indigo-200`}>
        <Providers>
          <div className="mesh-gradient min-h-screen flex flex-col relative overflow-x-hidden">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
