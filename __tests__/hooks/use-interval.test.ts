/**
 * Test suite for interval management hooks
 * Validates atomic interval functionality and error handling
 */

import { renderHook, act } from "@testing-library/react";
import { useInterval, STANDARD_INTERVALS } from "@/lib/hooks/use-interval";

// Mock timer functions
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useInterval Hook", () => {
  it("should initialize with correct defaults", () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useInterval(callback));

    expect(result.current.isActive).toBe(true);
    expect(typeof result.current.start).toBe("function");
    expect(typeof result.current.stop).toBe("function");
    expect(typeof result.current.toggle).toBe("function");
  });

  it("should call callback immediately when runImmediately is true", () => {
    const callback = jest.fn();
    renderHook(() => useInterval(callback, { runImmediately: true }));

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("should not call callback immediately when runImmediately is false", () => {
    const callback = jest.fn();
    renderHook(() => useInterval(callback, { runImmediately: false }));

    expect(callback).not.toHaveBeenCalled();
  });

  it("should call callback periodically at specified interval", () => {
    const callback = jest.fn();
    const intervalMs = 1000;

    renderHook(() =>
      useInterval(callback, {
        runImmediately: false,
        intervalMs,
      }),
    );

    // Should not be called initially
    expect(callback).not.toHaveBeenCalled();

    // Advance time by interval
    act(() => {
      jest.advanceTimersByTime(intervalMs);
    });

    expect(callback).toHaveBeenCalledTimes(1);

    // Advance time by another interval
    act(() => {
      jest.advanceTimersByTime(intervalMs);
    });

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("should stop calling callback when stopped", () => {
    const callback = jest.fn();
    const intervalMs = 1000;

    const { result } = renderHook(() =>
      useInterval(callback, {
        runImmediately: false,
        intervalMs,
      }),
    );

    // Start the interval
    act(() => {
      jest.advanceTimersByTime(intervalMs);
    });
    expect(callback).toHaveBeenCalledTimes(1);

    // Stop the interval
    act(() => {
      result.current.stop();
    });

    // Advance time - should not call callback
    act(() => {
      jest.advanceTimersByTime(intervalMs);
    });
    expect(callback).toHaveBeenCalledTimes(1); // Still 1, not 2
  });

  it("should correctly toggle active state", () => {
    const callback = jest.fn();
    const { result } = renderHook(() =>
      useInterval(callback, {
        runImmediately: false,
      }),
    );

    // Initially active (autoStart: true by default)
    expect(result.current.isActive).toBe(true);

    // Toggle to stop
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isActive).toBe(false);

    // Toggle to start
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isActive).toBe(true);
  });

  it("should handle callback errors and call onError", () => {
    const errorMessage = "Test error";
    const callback = jest.fn(() => {
      throw new Error(errorMessage);
    });
    const onError = jest.fn();

    renderHook(() =>
      useInterval(callback, {
        runImmediately: true,
        onError,
      }),
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: errorMessage }),
    );
  });

  it("should call manual trigger function", () => {
    const callback = jest.fn();
    const { result } = renderHook(() =>
      useInterval(callback, {
        runImmediately: false,
      }),
    );

    // Should not be called initially
    expect(callback).not.toHaveBeenCalled();

    // Manual trigger
    act(() => {
      result.current.trigger();
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("should restart interval correctly", () => {
    const callback = jest.fn();
    const intervalMs = 1000;

    const { result } = renderHook(() =>
      useInterval(callback, {
        runImmediately: false,
        intervalMs,
      }),
    );

    // Call callback once via interval
    act(() => {
      jest.advanceTimersByTime(intervalMs);
    });
    expect(callback).toHaveBeenCalledTimes(1);

    // Restart interval
    act(() => {
      result.current.restart();
    });

    // Advance time - should call callback again due to restart
    act(() => {
      jest.advanceTimersByTime(intervalMs);
    });
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("should not start when enabled is false", () => {
    const callback = jest.fn();

    renderHook(() =>
      useInterval(callback, {
        autoStart: false,
        runImmediately: true,
      }),
    );

    // Should not be called initially due to autoStart: false
    expect(callback).not.toHaveBeenCalled();
  });
});

describe("STANDARD_INTERVALS Constants", () => {
  it("should provide all expected interval constants", () => {
    expect(STANDARD_INTERVALS.REAL_TIME).toBe(1000);
    expect(STANDARD_INTERVALS.FAST_MONITORING).toBe(5000);
    expect(STANDARD_INTERVALS.STANDARD_MONITORING).toBe(15000);
    expect(STANDARD_INTERVALS.DEFAULT_MONITORING).toBe(30000);
    expect(STANDARD_INTERVALS.SLOW_REFRESH).toBe(60000);
    expect(STANDARD_INTERVALS.BACKGROUND_REFRESH).toBe(300000);
  });

  it("should have consistent interval increments", () => {
    expect(STANDARD_INTERVALS.FAST_MONITORING).toBe(
      STANDARD_INTERVALS.REAL_TIME * 5,
    );
    expect(STANDARD_INTERVALS.STANDARD_MONITORING).toBe(
      STANDARD_INTERVALS.FAST_MONITORING * 3,
    );
    expect(STANDARD_INTERVALS.DEFAULT_MONITORING).toBe(
      STANDARD_INTERVALS.STANDARD_MONITORING * 2,
    );
    expect(STANDARD_INTERVALS.SLOW_REFRESH).toBe(
      STANDARD_INTERVALS.DEFAULT_MONITORING * 2,
    );
    expect(STANDARD_INTERVALS.BACKGROUND_REFRESH).toBe(
      STANDARD_INTERVALS.SLOW_REFRESH * 5,
    );
  });
});
