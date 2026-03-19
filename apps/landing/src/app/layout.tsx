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
  title: "GoTofu — Synthetic User Research Platform",
  description:
    "Generate realistic AI personas from real-world data, run synthetic interviews at scale, and get actionable insights — in minutes, not months.",
  openGraph: {
    title: "GoTofu — Synthetic User Research Platform",
    description:
      "AI-powered synthetic user interviews at scale. From persona generation to insight extraction.",
    url: "https://gotofu.io",
    siteName: "GoTofu",
    type: "website",
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
