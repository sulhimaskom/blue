import { useRef, useCallback } from "react";

/**
 * useDebounce hook for performance optimization
 *
 * Delays execution of a callback function until a specified delay has passed
 * since the last invocation. Useful for preventing rapid successive API calls,
 * search input handling, and other performance-sensitive operations.
 *
 * @template T - Function type of callback
 * @param callback - The function to debounce
 * @param delay - The delay in milliseconds before executing callback
 * @returns A debounced version of the callback function
 *
 * @example
 * ```tsx
 * const debouncedSearch = useDebounce(
 *   () => searchApi(term),
 *   300
 * );
 *
 * <input onChange={() => debouncedSearch(term)} />
 * ```
 */
export function useDebounce<T extends () => any>(
  callback: T,
  delay: number,
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    (() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => callback(), delay);
    }) as T,
    [callback, delay],
  ) as T;
}
