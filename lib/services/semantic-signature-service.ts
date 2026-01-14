/**
 * Semantic Signature Service
 * Extracts semantic signatures for pattern recognition
 */
export class SemanticSignatureService {
  /**
   * Extract semantic signature from input text
   * Provides fingerprint-like representation for pattern matching
   */
  static extractSemanticSignature(input: string): string {
    if (!input || input.length === 0) {
      return "";
    }

    const semanticKeywords: Record<string, string[]> = {
      marketplace: ["vendor", "seller", "buyer", "listing"],
      ecommerce: ["cart", "checkout", "product", "inventory"],
      social: ["feed", "profile", "community", "network"],
      fintech: ["payment", "transaction", "investment", "banking"],
      healthcare: ["patient", "doctor", "medical", "health"],
      edtech: ["student", "course", "learning", "education"],
    };

    const normalized = input.toLowerCase();
    const detectedSemantics: string[] = [];

    for (const [category, keywords] of Object.entries(semanticKeywords)) {
      if (keywords.some((keyword) => normalized.includes(keyword))) {
        detectedSemantics.push(category);
      }
    }

    return detectedSemantics.sort().join("-");
  }
}
