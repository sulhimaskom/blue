// Polyfill for Web APIs in Jest environment

// TextEncoder/TextDecoder polyfill
if (typeof global.TextEncoder === "undefined") {
  const { TextEncoder, TextDecoder } = require("util");
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// ReadableStream constructor polyfill
global.ReadableStream = class ReadableStream {
  constructor(underlyingSource) {
    this.underlyingSource = underlyingSource;
    this.controller = null;
  }

  getReader() {
    return {
      read: jest.fn().mockResolvedValue({ done: true, value: undefined }),
      releaseLock: jest.fn(),
    };
  }

  cancel() {
    return Promise.resolve();
  }

  pipeTo() {
    return Promise.resolve();
  }

  tee() {
    return [this, this];
  }
};

// Headers constructor polyfill
global.Headers =
  global.Headers ||
  function (headers = {}) {
    const obj = new Map();

    for (const key in headers) {
      obj.set(key, headers[key]);
    }

    return {
      get: jest.fn().mockImplementation((key) => {
        // Handle case-insensitive header lookup
        const lowerKey = key.toLowerCase();
        for (const [headerName, headerValue] of obj.entries()) {
          if (headerName.toLowerCase() === lowerKey) {
            return headerValue;
          }
        }
        return null;
      }),
      set: jest.fn().mockImplementation((key, value) => {
        obj.set(key, value);
      }),
      has: jest.fn().mockImplementation((key) => {
        const lowerKey = key.toLowerCase();
        for (const headerName of obj.keys()) {
          if (headerName.toLowerCase() === lowerKey) {
            return true;
          }
        }
        return false;
      }),
      delete: jest.fn().mockImplementation((key) => {
        const lowerKey = key.toLowerCase();
        for (const headerName of obj.keys()) {
          if (headerName.toLowerCase() === lowerKey) {
            return obj.delete(headerName);
          }
        }
        return false;
      }),
      entries: jest.fn(() => obj.entries()),
      keys: jest.fn(() => obj.keys()),
      values: jest.fn(() => obj.values()),
      forEach: jest.fn((callback) => obj.forEach(callback)),
      [Symbol.iterator]: jest.fn(() => obj[Symbol.iterator]()),
    };
  };

// Request constructor polyfill for mocking
global.Request =
  global.Request ||
  jest.fn((req) => {
    req = typeof req === "string" ? req : req.url;

    let headers = new Map();
    let method = "GET";
    let body = null;
    let url = req;

    if (typeof req !== "string") {
      if (req.url) url = req.url;
      if (req.method) method = req.method;
      if (req.headers) {
        for (const key in req.headers) headers.set(key, req.headers[key]);
      }
      if (req.body) {
        body = req.body;
      }
    }

    return {
      url,
      method,
      headers,
      json: jest.fn().mockResolvedValue(body || {}),
      text: jest.fn().mockResolvedValue(body ? JSON.stringify(body) : ""),
      bodyUsed: false,
      arrayBuffer: jest.fn(),
    };
  });

// NextRequest constructor polyfill for mocking
global.NextRequest = global.Request;

global.Response = jest.fn().mockImplementation((body, options) => {
  let buffer;
  if (typeof body === "string") {
    buffer = Buffer.from(body, "utf-8");
  } else if (body instanceof Buffer) {
    buffer = body;
  } else if (body instanceof Uint8Array) {
    buffer = Buffer.from(body);
  } else if (body) {
    buffer = Buffer.from(JSON.stringify(body), "utf-8");
  } else {
    buffer = Buffer.alloc(0);
  }

  const response = {
    status: options?.status || 200,
    statusText: options?.statusText || "",
    ok: (options?.status || 200) < 400,
    json: jest.fn().mockImplementation(async () => {
      const text = buffer.toString("utf-8");
      try {
        return JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON");
      }
    }),
    text: jest.fn().mockResolvedValue(buffer.toString("utf-8")),
    arrayBuffer: jest
      .fn()
      .mockResolvedValue(
        buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength,
        ),
      ),
    body:
      buffer.length > 0
        ? new ReadableStream({
            start(controller) {
              controller.enqueue(buffer);
              controller.close();
            },
          })
        : null,
    headers: new global.Headers({
      "content-length": buffer.length.toString(),
      ...(options?.headers || {}),
    }),
    clone: jest.fn(function () {
      return { ...this };
    }),
  };
  return response;
});

// Mock NextResponse constructor and static methods
const nextResponseConstructor = jest
  .fn()
  .mockImplementation((body, options) => {
    let buffer;
    if (typeof body === "string") {
      buffer = Buffer.from(body, "utf-8");
    } else if (body instanceof Buffer) {
      buffer = body;
    } else if (body instanceof Uint8Array) {
      buffer = Buffer.from(body);
    } else if (body) {
      buffer = Buffer.from(JSON.stringify(body), "utf-8");
    } else {
      buffer = Buffer.alloc(0);
    }

    const response = {
      status: options?.status || 200,
      statusText: options?.statusText || "",
      ok: (options?.status || 200) < 400,
      json: jest.fn().mockImplementation(async () => {
        const text = buffer.toString("utf-8");
        try {
          return JSON.parse(text);
        } catch {
          throw new Error("Invalid JSON");
        }
      }),
      text: jest.fn().mockResolvedValue(buffer.toString("utf-8")),
      arrayBuffer: jest
        .fn()
        .mockResolvedValue(
          buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength,
          ),
        ),
      body:
        buffer.length > 0
          ? new ReadableStream({
              start(controller) {
                controller.enqueue(buffer);
                controller.close();
              },
            })
          : null,
      headers: new global.Headers({
        "content-length": buffer.length.toString(),
        ...(options?.headers || {}),
      }),
      clone: jest.fn(function () {
        return { ...this };
      }),
    };
    return response;
  });

global.NextResponse = Object.assign(nextResponseConstructor, {
  json: jest.fn((data, options) => {
    const jsonString = JSON.stringify(data);
    const buffer = Buffer.from(jsonString, "utf-8");

    const response = {
      status: options?.status || 200,
      statusText: options?.statusText || "",
      ok: (options?.status || 200) < 400,
      json: jest.fn().mockResolvedValue(data),
      text: jest.fn().mockResolvedValue(jsonString),
      arrayBuffer: jest
        .fn()
        .mockResolvedValue(
          buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength,
          ),
        ),
      body:
        buffer.length > 0
          ? new ReadableStream({
              start(controller) {
                controller.enqueue(buffer);
                controller.close();
              },
            })
          : null,
      headers: new global.Headers({
        "content-length": buffer.length.toString(),
        ...(options?.headers || {}),
      }),
      clone: jest.fn(function () {
        return { ...this };
      }),
    };
    return response;
  }),
  redirect: jest.fn((url, options) => {
    const data = { redirect: url };
    const jsonString = JSON.stringify(data);
    const buffer = Buffer.from(jsonString, "utf-8");

    const response = {
      status: options?.status || 307,
      statusText: options?.statusText || "",
      ok: false,
      json: jest.fn().mockResolvedValue(data),
      text: jest.fn().mockResolvedValue(jsonString),
      arrayBuffer: jest
        .fn()
        .mockResolvedValue(
          buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength,
          ),
        ),
      body:
        buffer.length > 0
          ? new ReadableStream({
              start(controller) {
                controller.enqueue(buffer);
                controller.close();
              },
            })
          : null,
      headers: new global.Headers({
        location: url,
        "content-length": buffer.length.toString(),
        ...(options?.headers || {}),
      }),
      clone: jest.fn(function () {
        return { ...this };
      }),
    };
    return response;
  }),
  error: jest.fn(() => {
    const data = { error: "Internal Server Error" };
    const jsonString = JSON.stringify(data);
    const buffer = Buffer.from(jsonString, "utf-8");

    const response = {
      status: 500,
      statusText: "Internal Server Error",
      ok: false,
      json: jest.fn().mockResolvedValue(data),
      text: jest.fn().mockResolvedValue(jsonString),
      arrayBuffer: jest
        .fn()
        .mockResolvedValue(
          buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength,
          ),
        ),
      body:
        buffer.length > 0
          ? new ReadableStream({
              start(controller) {
                controller.enqueue(buffer);
                controller.close();
              },
            })
          : null,
      headers: new Map(
        Object.entries({ "content-length": buffer.length.toString() }),
      ),
      clone: jest.fn(function () {
        return { ...this };
      }),
    };
    return response;
  }),
});

// Static method for redirects
global.NextResponse.redirect = jest.fn((url, options) => {
  const data = { redirect: url };
  const jsonString = JSON.stringify(data);
  const buffer = Buffer.from(jsonString, "utf-8");

  const response = {
    status: options?.status || 307,
    statusText: options?.statusText || "",
    ok: false,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(jsonString),
    arrayBuffer: jest
      .fn()
      .mockResolvedValue(
        buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength,
        ),
      ),
    body:
      buffer.length > 0
        ? new ReadableStream({
            start(controller) {
              controller.enqueue(buffer);
              controller.close();
            },
          })
        : null,
    headers: new Map(
      Object.entries({ location: url, ...(options?.headers || {}) }),
    ),
    clone: jest.fn(function () {
      return { ...this };
    }),
  };
  return response;
});

// Static method for errors
global.NextResponse.error = jest.fn(() => {
  const data = { error: "Internal Server Error" };
  const jsonString = JSON.stringify(data);
  const buffer = Buffer.from(jsonString, "utf-8");

  const response = {
    status: 500,
    statusText: "Internal Server Error",
    ok: false,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(jsonString),
    arrayBuffer: jest
      .fn()
      .mockResolvedValue(
        buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength,
        ),
      ),
    body:
      buffer.length > 0
        ? new ReadableStream({
            start(controller) {
              controller.enqueue(buffer);
              controller.close();
            },
          })
        : null,
    headers: new Map(),
    clone: jest.fn(function () {
      return { ...this };
    }),
  };
  return response;
});

// Mock Web Crypto API
global.crypto = {
  randomUUID: jest.fn(() => "mock-uuid-123-456"),
  getRandomValues: jest.fn(() => new Uint32Array(1)),
  subtle: {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    sign: jest.fn(),
    verify: jest.fn(),
    digest: jest.fn(),
    generateKey: jest.fn(),
    deriveKey: jest.fn(),
    importKey: jest.fn(),
    exportKey: jest.fn(),
  },
};

// Add webcrypto for Node.js compatibility
global.webcrypto = global.crypto;
