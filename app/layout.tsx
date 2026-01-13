import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { EnterpriseThemeProvider } from "@/components/enterprise/enterprise-theme-provider";
import { NavigationBar } from "@/components/layout/navigation-bar";
import { SkipLink } from "@/components/ui/skip-link";
import { getUIText } from "@/lib/constants/ui-text";
import { Environment } from "@/lib/utils/environment";
import { env } from "@/lib/env";
// Sentry initialization temporarily disabled due to Next.js 15 webpack issue
// TODO: Re-enable once proper webpack node: protocol handling is implemented
// import "@/lib/sentry"; // Initialize error monitoring
import "./globals.css";

const clerkAppearance = {
  variables: {
    colorPrimary: "#2563eb",
  },
};

// GITHUB ISSUE #343 FIX: Conditional Clerk provider for CI builds
// Skip Clerk setup entirely in CI environments to prevent build failures
const isCIEnvironment = (env.NODE_ENV === 'production' && 
                       !env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) ||
                       env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === 'placeholder';

const clerkOptions = {
  appearance: clerkAppearance,
  signInUrl: "/sign-in",
  signUpUrl: "/sign-up",
  afterSignInUrl: "/dashboard/monitoring",
  afterSignUpUrl: "/dashboard/monitoring",
  // Allow build to proceed without valid keys for development and CI
  ...(Environment.isDevelopment() && {
    telemetry: { disabled: true },
  }),
};

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: getUIText("homepage", "hero.title"),
  description: getUIText("homepage", "hero.subtitle"),
};

// CI-SAFE Layout: Skip ClerkProvider in CI to prevent build failures
function SafeClerkProvider({ children }: { children: React.ReactNode }) {
  if (isCIEnvironment) {
    return <>{children}</>;
  }
  return <ClerkProvider {...clerkOptions}>{children}</ClerkProvider>;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SafeClerkProvider>
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
    </SafeClerkProvider>
  );
}