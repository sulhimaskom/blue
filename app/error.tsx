'use client';

import { useEffect } from 'react';
import Link from "next/link";
import { logger } from '@/lib/logger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Global error boundary triggered', {
      error: {
        name: error.name,
        message: error.message,
        digest: error.digest,
      },
    });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900">500</h1>
        <h2 className="mt-4 text-xl font-semibold text-gray-800">Server Error</h2>
        <p className="mt-2 text-lg text-gray-600">
          Something went wrong on our end. Please try again.
        </p>
        <div className="mt-8 space-x-4">
          <button
            onClick={reset}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2"
          >
            Go Home
          </Link>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-8 text-left">
            <summary className="cursor-pointer text-sm text-gray-500">
              Error Details (Development Only)
            </summary>
            <pre className="mt-2 overflow-auto text-xs text-red-600">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}