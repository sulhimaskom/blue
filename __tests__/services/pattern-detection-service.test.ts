/**
 * PatternDetectionService Test Suite
 *
 * Comprehensive unit tests for PatternDetectionService covering:
 * - Pattern detection for 12 industry types
 * - Confidence scoring logic
 * - Industry context detection
 * - Keyword matching (case-insensitive, partial)
 * - Edge cases: empty input, no matches, multiple matches
 * - Semantic bonus calculations
 */

import { PatternDetectionService } from '../../lib/services/pattern-detection-service';

describe('PatternDetectionService', () => {
  // ==================== MARKETPLACE ====================
  describe('Pattern Detection - Marketplace', () => {
    it('should detect marketplace pattern with primary keywords', () => {
      const input =
        'Build a multi-vendor marketplace platform with seller listings and product catalog';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBe('marketplace');
      expect(result.detectedKeywords).toContain('marketplace');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect marketplace with storefront keyword', () => {
      const input = 'Create an online storefront with vendor listings';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBe('marketplace');
    });
  });

  // ==================== ECOMMERCE ====================
  describe('Pattern Detection - Ecommerce', () => {
    it('should detect ecommerce pattern with shopping cart', () => {
      const input = 'Build an ecommerce platform with shopping cart and checkout flow';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBe('ecommerce');
      expect(result.detectedKeywords).toContain('ecommerce');
    });

    it('should detect ecommerce with inventory and shipping', () => {
      const input = 'Create an online store with inventory management and shipping';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBe('ecommerce');
    });
  });

  // ==================== SOCIAL ====================
  describe('Pattern Detection - Social', () => {
    it('should detect social pattern with community keywords', () => {
      const input = 'Build a social platform with community features and followers';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBe('social');
      expect(result.detectedKeywords).toContain('social');
    });

    it('should detect social with messaging and likes', () => {
      const input = 'Create a social network with messaging and likes';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBe('social');
    });
  });

  // ==================== DASHBOARD ====================
  describe('Pattern Detection - Dashboard', () => {
    it('should detect dashboard pattern with analytics', () => {
      const input = 'Build a dashboard with analytics and metrics reporting';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBe('dashboard');
      expect(result.detectedKeywords).toContain('dashboard');
    });
  });

  // ==================== API SERVICE ====================
  describe('Pattern Detection - API Service', () => {
    it('should detect api-service pattern with REST keywords', () => {
      const input = 'Build an API service with REST endpoints and microservices';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBe('api-service');
    });

    it('should detect api-service with GraphQL', () => {
      const input = 'Create a backend API with GraphQL and integration';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBe('api-service');
    });
  });

  // ==================== MOBILE APP ====================
  describe('Pattern Detection - Mobile App', () => {
    it('should detect mobile-app pattern with iOS and Android', () => {
      const input = 'Build a mobile app for iOS and Android with React Native';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBe('mobile-app');
    });

    it('should detect mobile-app with PWA', () => {
      const input = 'Create a mobile-first PWA for smartphone users';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBe('mobile-app');
    });
  });

  // ==================== FINTECH ====================
  describe('Pattern Detection - Fintech', () => {
    it('should detect fintech pattern with banking and payments', () => {
      const input = 'Build a fintech platform with banking and payments features';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBe('fintech');
      expect(result.detectedKeywords).toContain('fintech');
    });

    it('should detect fintech with cryptocurrency', () => {
      const input = 'Create a cryptocurrency trading platform with blockchain and wallet';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBe('fintech');
    });

    it('should apply semantic bonus for fintech compliance terms', () => {
      const input =
        'Build a secure fintech banking platform with compliance and regulatory features';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBe('fintech');
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  // ==================== HEALTHCARE ====================
  describe('Pattern Detection - Healthcare', () => {
    it('should detect healthcare pattern with medical keywords', () => {
      const input = 'Build a healthcare platform with medical records and hospital management';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBe('healthcare');
      expect(result.detectedKeywords).toContain('healthcare');
    });

    it('should detect healthcare with HIPAA', () => {
      const input =
        'Create a telemedicine platform with HIPAA compliance and patient data security';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBe('healthcare');
    });
  });

  // ==================== EDTECH ====================
  describe('Pattern Detection - Edtech', () => {
    it('should detect edtech pattern with learning keywords', () => {
      const input = 'Build an edtech platform with online courses and learning management';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBe('edtech');
      expect(result.detectedKeywords).toContain('edtech');
    });

    it('should detect edtech with virtual classroom', () => {
      const input = 'Create a learning management system with virtual classroom';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBe('edtech');
    });
  });

  // ==================== REAL ESTATE ====================
  describe('Pattern Detection - Real Estate', () => {
    it('should detect realestate pattern with property keywords', () => {
      const input = 'Build a real estate platform with property listings and rentals';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBe('realestate');
      expect(result.detectedKeywords).toContain('real estate');
    });

    it('should detect realestate with agent and broker', () => {
      const input = 'Create a property management platform for real estate agents and brokers';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBe('realestate');
    });
  });

  // ==================== LOGISTICS ====================
  describe('Pattern Detection - Logistics', () => {
    it('should detect logistics pattern with shipping and delivery', () => {
      const input = 'Build a logistics platform with shipping and delivery';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBe('logistics');
      expect(result.detectedKeywords).toContain('logistics');
    });

    it('should detect logistics with warehouse and fleet', () => {
      const input = 'Create a supply chain platform with warehouse and fleet management';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBe('logistics');
    });
  });

  // ==================== SAAS ====================
  describe('Pattern Detection - SaaS', () => {
    it('should detect saas pattern with subscription keywords', () => {
      const input = 'Build a SaaS platform with subscription billing and recurring revenue';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBe('saas');
      expect(result.detectedKeywords).toContain('SaaS');
    });

    it('should detect saas with B2B', () => {
      const input = 'Create a B2B SaaS platform for enterprise customers';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBe('saas');
    });
  });

  // ==================== INDUSTRY CONTEXT ====================
  describe('Industry Context Detection', () => {
    it('should detect finance-banking industry context', () => {
      const input = 'Build a secure banking platform with financial payment features';
      const result = PatternDetectionService.detectIndustryContext(input);
      expect(result).toBe('finance-banking');
    });

    it('should detect medical-health industry context', () => {
      const input = 'Create a patient medical system with hospital health records';
      const result = PatternDetectionService.detectIndustryContext(input);
      expect(result).toBe('medical-health');
    });

    it('should detect education industry context', () => {
      const input = 'Build an online learning platform for student education and courses';
      const result = PatternDetectionService.detectIndustryContext(input);
      expect(result).toBe('education');
    });

    it('should return null for unrecognized industry context', () => {
      const input = 'random text with no industry keywords';
      const result = PatternDetectionService.detectIndustryContext(input);
      expect(result).toBeNull();
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    it('should return null pattern for empty input', () => {
      const input = '';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.detectedKeywords).toHaveLength(0);
    });

    it('should return null for unrecognized input with no keywords', () => {
      const input = 'random text xyz123 abcdef';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBeNull();
    });

    it('should handle case-insensitive keyword matching', () => {
      const input = 'BUILD A FINTECH PLATFORM WITH PAYMENTS AND BANKING';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBe('fintech');
    });

    it('should cap confidence at 1.0', () => {
      const input =
        'marketplace seller buyer listing vendor commission multi-vendor product catalog storefront market platform marketplace seller buyer listing vendor';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  // ==================== RETURN VALUE STRUCTURE ====================
  describe('Return Value Structure', () => {
    it('should return correct structure for detected pattern', () => {
      const input = 'Build an ecommerce platform with shopping cart';
      const result = PatternDetectionService.detectPattern(input);
      expect(result).toHaveProperty('pattern');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('detectedKeywords');
    });

    it('should return null pattern type when no match', () => {
      const input = 'random xyz';
      const result = PatternDetectionService.detectPattern(input);
      expect(result.pattern).toBeNull();
    });
  });
});
