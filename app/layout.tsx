import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://chord-progression-builder-beta.vercel.app"),
  title: "Chord Progression Builder",
  description: "Build a 4-chord progression by feel — pick each chord by the emotion it brings, then play it back as guitar, piano, or synth.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Chord Progression Builder",
    description: "Build a 4-chord progression by feel — pick each chord by the emotion it brings, then play it back as guitar, piano, or synth.",
    url: "https://chord-progression-builder-beta.vercel.app",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
