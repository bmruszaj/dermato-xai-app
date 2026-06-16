import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Geist_Mono, Quicksand } from "next/font/google";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://dermato-xai-app.vercel.app"),
  title: {
    default: "Dermato XAI — dermatoskopia wyjaśnialna",
    template: "%s | Dermato XAI",
  },
  description:
    "Publiczna wizytówka i demo projektu Dermato XAI: edukacyjne adnotacje dermoskopowe z porównaniem do modeli AI.",
  openGraph: {
    title: "Dermato XAI — dermatoskopia wyjaśnialna",
    description:
      "Wizytówka projektu AI Forum 2026 oraz demo adnotacji dermoskopowych ze wsparciem modeli AI.",
    type: "website",
  },
};

export const viewport = {
  maximumScale: 1,
  themeColor: "hsl(0 0% 100%)",
};

const quicksand = Quicksand({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${quicksand.variable} ${geistMono.variable}`} lang="pl">
      <body className="antialiased">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="top-right" />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
