import { NextResponse } from "next/server";
import { Timing } from "../utils/time-measurement";

export class CacheValidationService {
  static validateCacheEntry(entry: any, expectedPrefix?: string): boolean {
    if (!entry || !entry.data) {
      return false;
    }

    if (expectedPrefix && entry.metadata?.prefix !== expectedPrefix) {
      return false;
    }

    if (entry.metadata && !entry.data) {
      const requiredFields = [
        "createdAt",
        "etag",
        "compressed",
        "size",
        "tags",
      ];
      for (const field of requiredFields) {
        if (!(field in entry.metadata)) {
          return false;
        }
      }
    }

    if (entry.metadata?.createdAt && entry.metadata?.ttl) {
      const age = Timing.now() - new Date(entry.metadata.createdAt).getTime();
      if (age > entry.metadata.ttl * 1000) {
        return false;
      }
    }

    return true;
  }

  static isCacheable(response: NextResponse): boolean {
    const status = response.status;

    if (status < 200 || status >= 300) {
      return false;
    }

    const cacheControl = response.headers.get("cache-control");
    if (
      cacheControl?.includes("no-cache") ||
      cacheControl?.includes("no-store")
    ) {
      return false;
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 1024 * 1024) {
      return false;
    }

    return true;
  }
}
