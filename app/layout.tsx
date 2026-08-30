import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://entre-farmacias.vercel.app"),

  title: {
    default: "Entre farmacias | Compara precios de medicamentos",
    template: "%s | Entre farmacias",
  },

  description:
    "Compara precios de medicamentos de libre venta en distintas farmacias de México. Consulta presentaciones, marcas, precio por unidad y encuentra la opción más conveniente.",

  applicationName: "Entre farmacias",

  keywords: [
    "comparador de medicamentos",
    "precios de medicamentos",
    "farmacias México",
    "comparar farmacias",
    "medicamentos baratos",
    "precio de medicinas",
    "Farmacias Guadalajara",
    "Farmacias Benavides",
    "Farmacias del Ahorro",
    "Farmacias San Pablo",
    "Walmart farmacia",
    "medicamentos sin receta",
    "medicamentos de libre venta",
  ],

  authors: [
    {
      name: "Entre farmacias",
    },
  ],

  creator: "Entre farmacias",
  publisher: "Entre farmacias",

  category: "health",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "/",
    siteName: "Entre farmacias",

    title: "Entre farmacias | Compara precios de medicamentos",

    description:
      "Compara precios de medicamentos de libre venta en distintas farmacias de México y encuentra dónde te conviene comprar.",

    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Entre farmacias - Comparador de precios de medicamentos",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title: "Entre farmacias | Compara precios de medicamentos",

    description:
      "Compara precios de medicamentos de libre venta entre distintas farmacias de México.",

    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  icons: {
    icon: [
      {
        url: "/favicon.ico",
      },
    ],

    apple: [
      {
        url: "/apple-touch-icon.png",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1b1f1b",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-MX"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}

        <Analytics />
      </body>
    </html>
  );
}