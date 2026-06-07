import type { Metadata } from "next";
import type { ReactNode } from "react";
import PwaRegister from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "HOT MONEY",
  description: "HOT MONEY - Black Edition",
  manifest: "/manifest.json",
  applicationName: "HOT MONEY",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HOT MONEY",
    startupImage: [
      {
        url: "/splash-1170x2532.png",
        media:
          "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
      },
    ],
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export const viewport = {
  themeColor: "#050505",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="it">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
