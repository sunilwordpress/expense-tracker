import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";
import { RegisterServiceWorker } from "@/components/register-service-worker";

export const metadata: Metadata = {
  title: "ExpenseFlow",
  description: "Fast voice-first expense and income tracking.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ExpenseFlow",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  themeColor: "#209689",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProviders>
          {children}
          <RegisterServiceWorker />
        </AppProviders>
      </body>
    </html>
  );
}
