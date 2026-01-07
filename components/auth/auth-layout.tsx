import { cn } from "@/lib/utils";

interface AuthLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthLayout({ children, className }: AuthLayoutProps) {
  return (
    <main
      className={cn("flex min-h-screen items-center justify-center", className)}
      role="main"
      aria-label="Authentication"
    >
      {children}
    </main>
  );
}
