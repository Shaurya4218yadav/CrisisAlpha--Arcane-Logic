import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CrisisAlpha — Geopolitical Crisis Simulation Engine",
  description:
    "Interactive crisis simulation engine showing how geopolitical shocks spread across global logistics networks. Visualize cascading disruptions, make strategic decisions, and score your crisis management.",
  keywords: [
    "crisis simulation",
    "geopolitical risk",
    "supply chain",
    "logistics",
    "risk management",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-slate-950 text-white`}>
        {children}
      </body>
    </html>
  );
}
