"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { AuthLayout } from "./auth-layout";

type AuthType = "sign-in" | "sign-up";

interface AuthPageProps {
  type: AuthType;
  path?: string;
  className?: string;
}

export function AuthPage({ type, path, className }: AuthPageProps) {
  const componentPath = path || `/${type}`;

  return (
    <AuthLayout className={className}>
      {type === "sign-in" ? (
        <SignIn path={componentPath} />
      ) : (
        <SignUp path={componentPath} />
      )}
    </AuthLayout>
  );
}
