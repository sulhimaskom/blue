import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { EnterpriseThemeProvider } from "@/components/enterprise/enterprise-theme-provider";
import "./globals.css";

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
          <EnterpriseThemeProvider>
            <ErrorBoundary>{children}</ErrorBoundary>
          </EnterpriseThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
