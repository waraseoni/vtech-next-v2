import type { Metadata } from "next";
import { headers } from "next/headers";

import { Providers } from "@/components/providers";
import { WebVitalsReporter } from "@/components/web-vitals-reporter";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "V-Tech Admin",
    template: "%s · V-Tech Admin",
  },
  description: "V-Tech service management admin",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Nonce CSP: proxy.ts sets `x-nonce`; custom inline scripts (next-themes)
  // need it explicitly, Next only nonces its own scripts.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full antialiased">
        <WebVitalsReporter />
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
