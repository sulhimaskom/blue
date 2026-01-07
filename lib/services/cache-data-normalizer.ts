export class CacheDataNormalizer {
  private static readonly MODEL_MAPPINGS: Record<string, string> = {
    "gpt-4": "gpt-4",
    gpt4: "gpt-4",
    "gpt-3.5-turbo": "gpt-3.5-turbo",
    "gpt3.5": "gpt-3.5-turbo",
    "claude-3": "claude-3",
    claude3: "claude-3",
    "iflow-gpt4": "iflow-gpt-4",
    "iflow-gpt-4": "iflow-gpt-4",
  };

  private static readonly STOP_WORDS = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
  ]);

  private static readonly PAGINATION_SIZES = [10, 25, 50, 100] as const;

  static normalizeCacheData(data: any): any {
    if (typeof data !== "object" || data === null) {
      return data;
    }

    const normalized: any = {};
    const sortedKeys = Object.keys(data).sort();

    for (const key of sortedKeys) {
      const value = data[key];

      if (value === undefined) {
        continue;
      }

      const lowerKey = key.toLowerCase();
      normalized[key] = this.normalizeValue(lowerKey, value);
    }

    return normalized;
  }

  private static normalizeValue(lowerKey: string, value: any): any {
    if (lowerKey.includes("timestamp") || lowerKey.includes("date")) {
      return this.normalizeTimestamp(value);
    }

    if (lowerKey.includes("limit") || lowerKey.includes("count")) {
      return this.normalizeLimit(value);
    }

    if (lowerKey.includes("model") || lowerKey.includes("ai")) {
      return this.normalizeAIModelName(value);
    }

    if (
      lowerKey.includes("query") ||
      lowerKey.includes("search") ||
      lowerKey.includes("prompt")
    ) {
      return this.normalizeTextForCache(value);
    }

    if (lowerKey.includes("url") || lowerKey.includes("endpoint")) {
      return this.normalizeUrlForCache(value);
    }

    if (lowerKey.includes("page")) {
      return Math.max(parseInt(value) || 1, 1);
    }

    if (typeof value === "boolean") {
      return value;
    }

    if (Array.isArray(value)) {
      return value.sort();
    }

    return value;
  }

  private static normalizeTimestamp(value: any): any {
    if (typeof value === "number") {
      return Math.floor(value / 60000) * 60000;
    }

    if (value instanceof Date) {
      return new Date(Math.floor(value.getTime() / 60000) * 60000);
    }

    return value;
  }

  private static normalizeLimit(value: any): number {
    const normalizedLimit = Math.min(Math.max(parseInt(value) || 10, 1), 100);

    for (const size of this.PAGINATION_SIZES) {
      if (normalizedLimit <= size) {
        return size;
      }
    }

    return 100;
  }

  static normalizeAIModelName(model: any): string {
    if (!model || typeof model !== "string") {
      return model;
    }

    const normalized = model.toLowerCase().trim();
    return this.MODEL_MAPPINGS[normalized] || normalized;
  }

  static normalizeTextForCache(text: any): string {
    if (!text || typeof text !== "string") {
      return text;
    }

    let normalized = text.trim().replace(/\s+/g, " ");

    if (normalized.length < 100) {
      normalized = normalized.toLowerCase();
    }

    if (normalized.includes(" ")) {
      normalized = normalized
        .split(" ")
        .filter((word) => !this.STOP_WORDS.has(word))
        .join(" ")
        .trim();
    }

    return normalized;
  }

  static normalizeUrlForCache(url: any): string {
    if (!url || typeof url !== "string") {
      return url;
    }

    try {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);
      const sortedParams = new URLSearchParams();

      Array.from(params.keys())
        .sort()
        .forEach((key) => {
          sortedParams.set(key, params.get(key) || "");
        });

      urlObj.search = sortedParams.toString();
      return urlObj.toString();
    } catch {
      return url;
    }
  }
}
