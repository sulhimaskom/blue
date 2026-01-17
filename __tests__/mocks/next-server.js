// Mock for next/server module in Jest environment

class NextResponseMock {
  constructor(body, options = {}) {
    let buffer;
    
    if (body instanceof Buffer || body instanceof Uint8Array) {
      buffer = Buffer.from(body);
    } else if (body !== null && body !== undefined) {
      const jsonString = JSON.stringify(body);
      buffer = Buffer.from(jsonString, "utf-8");
    } else {
      buffer = Buffer.alloc(0);
    }

    this.status = options?.status || 200;
    this.statusText = options?.statusText || "";
    this.ok = this.status < 400;
    this.headers = options?.headers instanceof Headers 
      ? options.headers 
      : new global.Headers(options?.headers || {});
    this._body = buffer;
    this._bodyUsed = false;

    if (!this.headers.has("content-length")) {
      this.headers.set("content-length", buffer.length.toString());
    }
  }

  json() {
    return Promise.resolve(this._body.length > 0 
      ? JSON.parse(this._body.toString("utf-8")) 
      : {});
  }

  text() {
    return Promise.resolve(this._body.toString("utf-8"));
  }

  arrayBuffer() {
    return Promise.resolve(
      this._body.buffer.slice(
        this._body.byteOffset,
        this._body.byteOffset + this._body.byteLength,
      )
    );
  }

  get body() {
    if (this._bodyUsed || this._body.length === 0) return null;
    this._bodyUsed = true;
    return new ReadableStream({
      start(controller) {
        controller.enqueue(this._body);
        controller.close();
      },
    });
  }

  get bodyUsed() {
    return this._bodyUsed;
  }

  clone() {
    const cloned = new NextResponseMock(this._body, {
      status: this.status,
      statusText: this.statusText,
      headers: this.headers,
    });
    cloned._bodyUsed = this._bodyUsed;
    return cloned;
  }

  static json(data, options = {}) {
    const jsonString = JSON.stringify(data);
    const buffer = Buffer.from(jsonString, "utf-8");
    return new NextResponseMock(buffer, options);
  }

  static redirect(url, options = {}) {
    const data = { redirect: url };
    const jsonString = JSON.stringify(data);
    const buffer = Buffer.from(jsonString, "utf-8");
    const headers = new global.Headers({
      location: url,
      ...(options?.headers || {}),
    });
    return new NextResponseMock(buffer, {
      status: options?.status || 307,
      statusText: options?.statusText || "",
      headers,
    });
  }

  static error() {
    const data = { error: "Internal Server Error" };
    const jsonString = JSON.stringify(data);
    const buffer = Buffer.from(jsonString, "utf-8");
    return new NextResponseMock(buffer, {
      status: 500,
      statusText: "Internal Server Error",
    });
  }
}

const nextResponseMock = NextResponseMock;
nextResponseMock.next = NextResponseMock.json.bind(NextResponseMock);

class NextRequestMock {
  constructor(req) {
    let url = typeof req === "string" ? req : req?.url;
    let method = "GET";
    let headers = new Headers();
    let body = null;

    if (typeof req !== "string" && req) {
      if (req.url) url = req.url;
      if (req.method) method = req.method;
      if (req.headers) {
        if (req.headers instanceof Headers) {
          headers = req.headers;
        } else {
          for (const key in req.headers) {
            headers.set(key, req.headers[key]);
          }
        }
      }
      if (req.body) {
        body = req.body;
      }
    }

    this.url = url;
    this.method = method;
    this.headers = headers;
    this._body = body;
    this._bodyUsed = false;
  }

  json() {
    return Promise.resolve(this._body || {});
  }

  text() {
    return Promise.resolve(this._body ? JSON.stringify(this._body) : "");
  }

  get bodyUsed() {
    return this._bodyUsed;
  }

  get cache() {
    return "default";
  }

  get credentials() {
    return "same-origin";
  }

  get destination() {
    return "";
  }

  get integrity() {
    return "";
  }

  get mode() {
    return "cors";
  }

  get redirect() {
    return "follow";
  }

  get referrer() {
    return "";
  }

  get referrerPolicy() {
    return "";
  }

  get nextUrl() {
    const urlObj = new URL(this.url);
    return {
      pathname: urlObj.pathname,
      searchParams: urlObj.searchParams,
      href: this.url,
      origin: urlObj.origin,
    };
  }

  arrayBuffer() {
    if (this._body instanceof Buffer || this._body instanceof Uint8Array) {
      return Promise.resolve(this._body.buffer);
    }
    const str = this._body ? JSON.stringify(this._body) : "";
    return Promise.resolve(
      new TextEncoder().encode(str).buffer
    );
  }

  clone() {
    const cloned = new NextRequestMock(this);
    cloned._bodyUsed = this._bodyUsed;
    return cloned;
  }
}

const nextRequestMock = NextRequestMock;

module.exports = {
  NextResponse: nextResponseMock,
  NextRequest: nextRequestMock,
};
