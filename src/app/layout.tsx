import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SkinApplier } from "@/components/cosmetics/SkinApplier";
import { SiteNav } from "@/components/nav/SiteNav";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { getEquippedSkinsForCurrentUser } from "@/lib/db/cosmetics";
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
  title: "Minesweeper Academy + Arena",
  description:
    "Train, compete, and analyze every game. Chess.com for Minesweeper — AI coach, daily challenges, no-guess mode, and ranked Arena.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const equipped = await getEquippedSkinsForCurrentUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // Suppress hydration warnings — the boot script flips this class
      // before React renders, by design.
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <SkinApplier equipped={equipped} />
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
