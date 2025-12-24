import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { automatedCacheWarmingService } from "@/lib/services/automated-cache-warming";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import "./globals.css";

// Start the automated cache warming service for optimal performance
if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
  automatedCacheWarmingService.start();
}

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Architect Platform",
  description: "AI-powered platform for generating software blueprints",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  );
}
