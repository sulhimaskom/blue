// Development middleware - authentication disabled
// In production, configure proper Clerk keys for full functionality

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function middleware(req: NextRequest) {
  // Log that we're running in development mode without authentication
  if (process.env.NODE_ENV === "development") {
    console.log("🚧 Development mode: Authentication bypassed");
  }

  // Allow all requests without authentication checks
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
