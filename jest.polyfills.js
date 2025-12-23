// Polyfill for Web APIs in Jest environment
global.Request = jest.fn().mockImplementation((url, options) => ({
  url,
  method: options?.method || "GET",
  headers: new Map(Object.entries(options?.headers || {})),
  json: jest.fn().mockResolvedValue(options?.body || {}),
  text: jest.fn().mockResolvedValue(JSON.stringify(options?.body || {})),
}));

global.Response = jest.fn().mockImplementation((body, options) => ({
  status: options?.status || 200,
  json: jest
    .fn()
    .mockResolvedValue(typeof body === "string" ? JSON.parse(body) : body),
  text: jest
    .fn()
    .mockResolvedValue(typeof body === "string" ? body : JSON.stringify(body)),
}));

// Mock Web Crypto API
global.crypto = {
  randomUUID: jest.fn(() => "mock-uuid-123-456"),
  getRandomValues: jest.fn(() => new Uint32Array(1)),
};

// Mock Headers
global.Headers = jest.fn().mockImplementation((headers) => ({
  get: jest.fn((key) => headers?.[key] || null),
  set: jest.fn(),
  has: jest.fn(),
  delete: jest.fn(),
}));
