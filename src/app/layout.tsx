import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { PendaftarSW } from "@/components/layout/pendaftar-sw";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "MSPO Audit",
    template: "%s | MSPO Audit",
  },
  description:
    "Sistem audit MSPO MS2530-2-2:2022 untuk pekebun kecil dan ladang sawit Malaysia",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#1f7a45",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms-MY">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PendaftarSW />
        {children}
      </body>
    </html>
  );
}
