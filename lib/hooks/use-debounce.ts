import { useCallback, useRef } from "react";

/**
 * Custom hook for debouncing function calls
 *
 * Delays the execution of a function until after a specified delay
 * has elapsed since the last time the debounced function was invoked.
 *
 * @template T - Function type to debounce
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function with same type signature as original
 *
 * @example
 * ```typescript
 * const debouncedSearch = useDebounce((query: string) => {
 *   performSearch(query);
 * }, 300);
 *
 * debouncedSearch('search term'); // Only executes after 300ms delay
 * ```
 */
export function useDebounce<T extends (..._parameters: unknown[]) => unknown>( // eslint-disable-line no-unused-vars
  callback: T,
  delay: number,
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...parameters: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => callback(...parameters), delay);
    }) as T,
    [callback, delay],
  );
}
