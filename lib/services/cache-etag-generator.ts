import crypto from "crypto";

export class CacheETagGenerator {
  static generateETag(data: any): string {
    const content = JSON.stringify(data);
    const size = content.length;
    const contentFingerprint = this.calculateContentFingerprint(data);

    return `"${contentFingerprint}-${Math.floor(size / 1024)}kb"`;
  }

  static calculateContentFingerprint(data: any): string {
    try {
      if (typeof data === "object" && data !== null) {
        const keys = Object.keys(data).sort();
        const timestamp = data.timestamp || data.createdAt;
        const type = data.type || typeof data;

        const structure = `${keys.join(",")}-${type}-${timestamp || ""}`;

        return crypto
          .createHash("sha1")
          .update(structure)
          .digest("hex")
          .substring(0, 8);
      } else {
        return crypto
          .createHash("sha1")
          .update(String(data))
          .digest("hex")
          .substring(0, 8);
      }
    } catch (error) {
      return crypto
        .createHash("md5")
        .update(JSON.stringify(data))
        .digest("hex")
        .substring(0, 12);
    }
  }
}
