import { cn } from "@/lib/utils";

interface AuthLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthLayout({ children, className }: AuthLayoutProps) {
  return (
    <div
      className={cn("flex min-h-screen items-center justify-center", className)}
    >
      {children}
    </div>
  );
}
