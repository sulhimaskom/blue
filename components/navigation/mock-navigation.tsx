"use client";

import Link from "next/link";

// Mock component for tests without ClerkProvider
export function MockNavigation({ className }: { className?: string }) {
  return (
    <header className={`w-full bg-white border-b border-gray-200 ${className}`}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <span className="text-xl font-bold text-blue-600">
              Architect Platform
            </span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-sm font-medium text-blue-600">
              Home
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-500"
            >
              Dashboard
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/sign-in"
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
