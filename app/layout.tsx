import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { JsonLd } from "@/components/json-ld";
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  ORG_NAME,
  ORG_URL,
} from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Spit Wars — Turn-Based Artillery Llamas",
    template: "%s · Spit Wars",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Spit Wars",
    "artillery game",
    "turn-based game",
    "llama game",
    "browser game",
    "online multiplayer artillery",
    "free game",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: "Spit Wars — Turn-Based Artillery Llamas",
    description: SITE_DESCRIPTION,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Spit Wars" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Spit Wars — Turn-Based Artillery Llamas",
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  category: "game",
};

// Game viewport: cover the notch (safe-area insets handled in CSS) and lock
// pinch-zoom so aiming gestures never zoom the page mid-battle.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#060614",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": `${SITE_URL}/#organization`,
                name: ORG_NAME,
                url: ORG_URL,
                sameAs: [ORG_URL],
              },
              {
                "@type": "WebSite",
                "@id": `${SITE_URL}/#website`,
                name: SITE_NAME,
                url: SITE_URL,
                description: SITE_DESCRIPTION,
                inLanguage: "en",
                publisher: { "@id": `${SITE_URL}/#organization` },
              },
            ],
          }}
        />
        {children}
      </body>
    </html>
  );
}
