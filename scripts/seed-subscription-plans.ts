/**
 * Subscription Plans Seeder
 * 
 * This script seeds the subscription plans table with the default tier configurations.
 * Run this script after database setup to initialize subscription tiers.
 */

import { db } from "@/lib/db";
import { subscriptionPlans } from "@/lib/db/schema";

const DEFAULT_PLANS = [
  {
    tier: "free",
    maxCredits: 100,
    monthlyCreditAllowance: 100,
    apiRateLimitMultiplier: 1,
    maxProjects: 3,
    maxTeams: 0,
    maxWebhooks: 1,
    features: {
      advancedAnalytics: false,
      customDomains: false,
      prioritySupport: false,
      apiAccess: true,
      teamCollaboration: false,
      webhookHistory: 7,
      blueprintVersioning: true,
      advancedDeployments: false,
      customThemes: false,
      exportFeatures: true,
      priorityQueue: false,
      maxBlueprintVersions: 5,
      maxDeploymentsPerDay: 2,
    },
    priceMonthly: 0,
    priceYearly: 0,
    sortOrder: 0,
  },
  {
    tier: "pro",
    maxCredits: 1000,
    monthlyCreditAllowance: 1000,
    apiRateLimitMultiplier: 3,
    maxProjects: 50,
    maxTeams: 5,
    maxWebhooks: 10,
    features: {
      advancedAnalytics: true,
      customDomains: false,
      prioritySupport: true,
      apiAccess: true,
      teamCollaboration: true,
      webhookHistory: 30,
      blueprintVersioning: true,
      advancedDeployments: true,
      customThemes: true,
      exportFeatures: true,
      priorityQueue: true,
      maxBlueprintVersions: 20,
      maxDeploymentsPerDay: 10,
    },
    priceMonthly: 2900, // $29.00
    priceYearly: 29000, // $290.00 (2 months free)
    sortOrder: 1,
  },
  {
    tier: "enterprise",
    maxCredits: -1, // Unlimited
    monthlyCreditAllowance: -1, // Unlimited
    apiRateLimitMultiplier: 10,
    maxProjects: -1, // Unlimited
    maxTeams: -1, // Unlimited
    maxWebhooks: -1, // Unlimited
    features: {
      advancedAnalytics: true,
      customDomains: true,
      prioritySupport: true,
      apiAccess: true,
      teamCollaboration: true,
      webhookHistory: 90,
      blueprintVersioning: true,
      advancedDeployments: true,
      customThemes: true,
      exportFeatures: true,
      priorityQueue: true,
      maxBlueprintVersions: -1, // Unlimited
      maxDeploymentsPerDay: -1, // Unlimited
    },
    priceMonthly: 9900, // $99.00
    priceYearly: 99000, // $990.00 (2 months free)
    sortOrder: 2,
  },
];

/**
 * Seed subscription plans
 */
export async function seedSubscriptionPlans() {
  try {
    console.log("Starting subscription plans seeding...");

    // Clear existing plans (be careful in production!)
    await db.delete(subscriptionPlans);

    // Insert default plans
    await db.insert(subscriptionPlans).values(DEFAULT_PLANS);

    console.log(`✅ Successfully seeded ${DEFAULT_PLANS.length} subscription plans`);
    
    console.table(DEFAULT_PLANS.map(plan => ({
      Tier: plan.tier,
      "Max Credits": plan.maxCredits === -1 ? "Unlimited" : plan.maxCredits,
      "Monthly Credits": plan.monthlyCreditAllowance === -1 ? "Unlimited" : plan.monthlyCreditAllowance,
      "Max Projects": plan.maxProjects === -1 ? "Unlimited" : plan.maxProjects,
      "Max Teams": plan.maxTeams === -1 ? "Unlimited" : plan.maxTeams,
      "Price Monthly": plan.priceMonthly === 0 ? "Free" : `$${plan.priceMonthly / 100}`,
      "Price Yearly": plan.priceYearly === 0 ? "Free" : `$${plan.priceYearly / 100}`,
    })));

    return { success: true, seeded: DEFAULT_PLANS.length };
  } catch (error) {
    console.error("❌ Failed to seed subscription plans:", error);
    throw error;
  }
}

/**
 * Run if this file is executed directly
 */
if (require.main === module) {
  seedSubscriptionPlans()
    .then(() => {
      console.log("Subscription plans seeding completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Subscription plans seeding failed:", error);
      process.exit(1);
    });
}