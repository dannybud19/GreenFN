import type { Metadata, Viewport } from "next";
import { Doto, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import { themeScript } from "@/lib/theme";
import "./globals.css";

// Doto for headings, names, big numbers and the team code; Geist Mono for everything else (nothing-style.md).
const doto = Doto({ variable: "--font-doto", weight: "900", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", weight: ["400", "500", "600"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "GreenFN", template: "%s · GreenFN" },
  description: "Find NBA players whose careers look alike, from the style of every season they played since 1980.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${doto.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
