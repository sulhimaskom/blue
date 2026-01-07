import crypto from "crypto";
import { CacheDataNormalizer } from "./cache-data-normalizer";

export class CacheKeyGenerator {
  private static readonly CACHE_PREFIX = "ai-platform:";
  private static readonly RESPONSE_PREFIX = "response:";

  private static readonly KEY_VERSIONS: Record<string, string> = {
    "iflow-completion": "v1",
    "tavily-research": "v1",
    "blueprint-draft": "v2",
    "market-analysis": "v1",
    "cache-warmup": "v3",
    "blueprint-skeleton": "v2",
    "tech-stack": "v1",
    "feature-templates": "v1",
  };

  static generateKey(prefix: string, data: any): string {
    const normalizedData = CacheDataNormalizer.normalizeCacheData(data);

    const hash = crypto
      .createHash("sha256")
      .update(JSON.stringify(normalizedData))
      .digest("hex")
      .substring(0, 12);

    const keyVersion = this.getKeyVersion(prefix);

    return `${this.CACHE_PREFIX}${prefix}:${hash}:${keyVersion}`;
  }

  static generateResponseKey(
    url: string,
    varyBy: Record<string, string>,
  ): string {
    const keyComponents = [
      url,
      ...Object.entries(varyBy).map(
        ([header, value]) => `${header}:${value || ""}`,
      ),
    ];

    const keyString = keyComponents.join("|");
    const hash = crypto
      .createHash("sha256")
      .update(keyString)
      .digest("hex")
      .substring(0, 16);

    return `${this.RESPONSE_PREFIX}${hash}`;
  }

  static getKeyVersion(prefix: string): string {
    return this.KEY_VERSIONS[prefix] || "v1";
  }
}
