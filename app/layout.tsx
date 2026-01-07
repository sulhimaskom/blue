import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { EnterpriseThemeProvider } from "@/components/enterprise/enterprise-theme-provider";
import { NavigationBar } from "@/components/layout/navigation-bar";
import { SkipLink } from "@/components/ui/skip-link";
import { getUIText } from "@/lib/constants/ui-text";
import "@/lib/sentry"; // Initialize error monitoring
import "./globals.css";

const clerkAppearance = {
  variables: {
    colorPrimary: "#2563eb",
  },
};

const clerkOptions = {
  appearance: clerkAppearance,
  signInUrl: "/sign-in",
  signUpUrl: "/sign-up",
  afterSignInUrl: "/dashboard/monitoring",
  afterSignUpUrl: "/dashboard/monitoring",
};

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: getUIText("homepage", "hero.title"),
  description: getUIText("homepage", "hero.subtitle"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider {...clerkOptions}>
      <html lang="en">
        <body className={inter.className}>
          <EnterpriseThemeProvider>
            <SkipLink />
            <NavigationBar />
            <ErrorBoundary>
              <main id="main-content" className="min-h-screen">
                {children}
              </main>
            </ErrorBoundary>
          </EnterpriseThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
