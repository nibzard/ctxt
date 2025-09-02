import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ctxt.help - The LLM Context Builder",
  description: "Convert any webpage to clean markdown perfect for AI and LLM contexts. Build rich context stacks for better AI interactions.",
  keywords: "markdown, converter, AI, LLM, context, webpage, URL",
  authors: [{ name: "ctxt.help" }],
  openGraph: {
    title: "ctxt.help - The LLM Context Builder",
    description: "Convert any webpage to clean markdown perfect for AI and LLM contexts",
    url: "https://ctxt.help",
    siteName: "ctxt.help",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ctxt.help - The LLM Context Builder",
    description: "Convert any webpage to clean markdown perfect for AI and LLM contexts",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
