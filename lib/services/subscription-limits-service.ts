import { logger } from "@/lib/logger";

/**
 * Service for subscription tier limits and quota enforcement
 * Handles team and member limits based on subscription tiers
 */
export class SubscriptionLimitsService {
  private static instance: SubscriptionLimitsService;

  private constructor() {}

  static getInstance(): SubscriptionLimitsService {
    if (!SubscriptionLimitsService.instance) {
      SubscriptionLimitsService.instance = new SubscriptionLimitsService();
    }
    return SubscriptionLimitsService.instance;
  }

  /**
   * Get maximum teams allowed for subscription tier
   */
  getMaxTeamsForSubscription(tier: string): number {
    const limits: Record<string, number> = {
      free: 1,
      pro: 5,
      enterprise: -1, // unlimited
    };
    return limits[tier] || 1;
  }

  /**
   * Get maximum members allowed for subscription tier
   */
  getMaxMembersForSubscription(tier: string): number {
    const limits: Record<string, number> = {
      free: 2,
      pro: 10,
      enterprise: -1, // unlimited
    };
    return limits[tier] || 2;
  }

  /**
   * Check if tier allows unlimited teams
   */
  hasUnlimitedTeams(tier: string): boolean {
    return this.getMaxTeamsForSubscription(tier) === -1;
  }

  /**
   * Check if tier allows unlimited members
   */
  hasUnlimitedMembers(tier: string): boolean {
    return this.getMaxMembersForSubscription(tier) === -1;
  }

  /**
   * Validate if user can create another team based on subscription limits
   */
  canCreateTeam(currentCount: number, tier: string): boolean {
    const maxTeams = this.getMaxTeamsForSubscription(tier);
    return maxTeams === -1 || currentCount < maxTeams;
  }

  /**
   * Validate if team can add another member based on subscription limits
   */
  canAddMember(currentCount: number, tier: string): boolean {
    const maxMembers = this.getMaxMembersForSubscription(tier);
    return maxMembers === -1 || currentCount < maxMembers;
  }

  /**
   * Get limit validation error message for teams
   */
  getTeamLimitError(tier: string): string {
    const maxTeams = this.getMaxTeamsForSubscription(tier);
    if (maxTeams === -1) {
      return "Enterprise subscription allows unlimited teams";
    }
    return `Maximum ${maxTeams} teams allowed for ${tier} subscription`;
  }

  /**
   * Get limit validation error message for members
   */
  getMemberLimitError(tier: string): string {
    const maxMembers = this.getMaxMembersForSubscription(tier);
    if (maxMembers === -1) {
      return "Enterprise subscription allows unlimited team members";
    }
    return `Maximum ${maxMembers} members allowed for ${tier} subscription`;
  }
}

export const subscriptionLimitsService = SubscriptionLimitsService.getInstance();
