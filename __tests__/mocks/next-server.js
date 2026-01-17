// Mock for next/server module in Jest environment

const nextResponseMock = {
  next: jest.fn(() => {
    const response = {
      status: 200,
      statusText: "OK",
      ok: true,
      json: jest.fn().mockResolvedValue({}),
      text: jest.fn().mockResolvedValue(""),
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
      body: null,
      headers: new global.Headers(),
      clone: jest.fn(function () {
        return { ...this };
      }),
    };
    return response;
  }),
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
};

const nextRequestMock = jest.fn((req) => {
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

module.exports = {
  NextResponse: nextResponseMock,
  NextRequest: nextRequestMock,
};
