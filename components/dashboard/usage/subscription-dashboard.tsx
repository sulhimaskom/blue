"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PredictiveAnalytics } from "@/components/dashboard/usage/predictive-analytics";
import {
  CreditCardIcon,
  UsersIcon,
  FolderOpenIcon,
  WebhookIcon,
  TrendingUpIcon,
  LockIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ZapIcon,
  CrownIcon,
  StarIcon
} from "@/components/ui/icons";
import { useAnalytics } from "@/lib/hooks/useAnalytics";

interface SubscriptionTier {
  tier: string;
  limits: {
    maxCredits: number;
    monthlyCreditAllowance: number;
    apiRateLimitMultiplier: number;
    maxProjects: number;
    maxTeams: number;
    maxWebhooks: number;
    maxBlueprintVersions: number;
    maxDeploymentsPerDay: number;
  };
  features: {
    advancedAnalytics: boolean;
    customDomains: boolean;
    prioritySupport: boolean;
    apiAccess: boolean;
    teamCollaboration: boolean;
    webhookHistory: number;
    blueprintVersioning: boolean;
    advancedDeployments: boolean;
    customThemes: boolean;
    exportFeatures: boolean;
    priorityQueue: boolean;
  };
  pricing: {
    monthly: number;
    yearly: number;
  };
  usage?: {
    currentUsage: {
      credits: number;
      projects: number;
      teams: number;
      webhooks: number;
      apiRequests: number;
    };
    remaining: {
      credits: number;
      projects: number;
      teams: number;
      webhooks: number;
    };
    percentageUsed: {
      credits: number;
      projects: number;
      teams: number;
      webhooks: number;
    };
  };
}

export function SubscriptionDashboard() {
  const [subscription, setSubscription] = useState<SubscriptionTier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analytics tracking
  const { trackButton, trackConversion, trackError } = useAnalytics();

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/subscription/current");
      
      if (!response.ok) {
        throw new Error("Failed to fetch subscription data");
      }
      
      const data = await response.json();
      setSubscription(data.data.subscription);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier: string) => {
    // Track upgrade attempt
    trackButton(`upgrade-to-${tier}`, "subscription-dashboard", {
      currentTier: subscription?.tier,
      targetTier: tier,
    });

    trackConversion("subscription_upgrade_attempt", {
      currentTier: subscription?.tier,
      targetTier: tier,
    });

    try {
      const response = await fetch("/api/subscription/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tier,
          billingCycle: "monthly",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to initiate upgrade");
      }

      const data = await response.json();
      
      // Track successful upgrade initiation (redirect to Stripe)
      trackConversion("subscription_upgrade_initiated", {
        currentTier: subscription?.tier,
        targetTier: tier,
      });
      
      // Redirect to Stripe checkout
      window.location.href = data.checkoutUrl;
    } catch (err) {
      // Track upgrade failure
      trackConversion("subscription_upgrade_failed", {
        currentTier: subscription?.tier,
        targetTier: tier,
        error: err instanceof Error ? err.message : "Unknown error",
      });
      
      trackError("subscription_upgrade_error", {
        tier,
        error: err instanceof Error ? err.message : "Unknown error",
      });
      
      setError(err instanceof Error ? err.message : "Upgrade failed");
    }
  };

  if (loading) {
    return (
      <div 
        className="flex items-center justify-center h-64"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Loading subscription data"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" aria-hidden="true"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertCircleIcon className="h-4 w-4" aria-hidden="true" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!subscription) {
    return (
      <Alert role="alert">
        <AlertCircleIcon className="h-4 w-4" aria-hidden="true" />
        <AlertDescription>Unable to load subscription information</AlertDescription>
      </Alert>
    );
  }

  const { tier, limits, features, usage } = subscription;

  return (
    <main className="space-y-6" role="main" aria-label="Subscription Dashboard">
      {/* Current Tier Overview */}
      <section aria-labelledby="current-plan-heading">
        <Card>
          <CardHeader>
            <CardTitle id="current-plan-heading" className="flex items-center gap-2">
              {tier === "enterprise" ? <CrownIcon className="h-5 w-5 text-yellow-500" aria-hidden="true" /> :
               tier === "pro" ? <StarIcon className="h-5 w-5 text-blue-500" aria-hidden="true" /> :
               <CreditCardIcon className="h-5 w-5 text-gray-500" aria-hidden="true" />}
              Current Plan: {tier.charAt(0).toUpperCase() + tier.slice(1)}
              <Badge variant={tier === "free" ? "secondary" : "default"}>
                {tier === "free" ? "Free" : tier === "pro" ? "Pro" : "Enterprise"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
              aria-live="polite"
              aria-atomic="true"
            >
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600" aria-label="Credits used">
                  {usage?.currentUsage.credits || 0}
                </div>
                <div className="text-sm text-gray-600">Credits Used</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600" aria-label="Projects count">
                  {usage?.currentUsage.projects || 0}
                </div>
                <div className="text-sm text-gray-600">Projects</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600" aria-label="Teams count">
                  {usage?.currentUsage.teams || 0}
                </div>
                <div className="text-sm text-gray-600">Teams</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600" aria-label="Webhooks count">
                  {usage?.currentUsage.webhooks || 0}
                </div>
                <div className="text-sm text-gray-600">Webhooks</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Usage Limits */}
      <section aria-labelledby="usage-limits-heading">
        <Card>
          <CardHeader>
            <CardTitle id="usage-limits-heading" className="flex items-center gap-2">
              <TrendingUpIcon className="h-5 w-5" aria-hidden="true" />
              Usage & Limits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Credits */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <ZapIcon className="h-4 w-4" aria-hidden="true" />
                  Credits
                </span>
                <span aria-live="polite">
                  {usage?.currentUsage.credits || 0} / {limits.maxCredits === -1 ? "∞" : limits.maxCredits}
                </span>
              </div>
              {limits.maxCredits !== -1 && usage && (
                <Progress
                  value={usage.percentageUsed.credits}
                  className="h-2"
                  aria-label={`Credits usage: ${usage.percentageUsed.credits.toFixed(0)} percent`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={usage.percentageUsed.credits}
                />
              )}
            </div>

            {/* Projects */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <FolderOpenIcon className="h-4 w-4" aria-hidden="true" />
                  Projects
                </span>
                <span aria-live="polite">
                  {usage?.currentUsage.projects || 0} / {limits.maxProjects === -1 ? "∞" : limits.maxProjects}
                </span>
              </div>
              {limits.maxProjects !== -1 && usage && (
                <Progress
                  value={usage.percentageUsed.projects}
                  className="h-2"
                  aria-label={`Projects usage: ${usage.percentageUsed.projects.toFixed(0)} percent`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={usage.percentageUsed.projects}
                />
              )}
            </div>

            {/* Teams */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <UsersIcon className="h-4 w-4" aria-hidden="true" />
                  Teams
                </span>
                <span aria-live="polite">
                  {usage?.currentUsage.teams || 0} / {limits.maxTeams === -1 ? "∞" : limits.maxTeams}
                </span>
              </div>
              {limits.maxTeams !== -1 && usage && (
                <Progress
                  value={usage.percentageUsed.teams}
                  className="h-2"
                  aria-label={`Teams usage: ${usage.percentageUsed.teams.toFixed(0)} percent`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={usage.percentageUsed.teams}
                />
              )}
            </div>

            {/* Webhooks */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <WebhookIcon className="h-4 w-4" aria-hidden="true" />
                  Webhooks
                </span>
                <span aria-live="polite">
                  {usage?.currentUsage.webhooks || 0} / {limits.maxWebhooks === -1 ? "∞" : limits.maxWebhooks}
                </span>
              </div>
              {limits.maxWebhooks !== -1 && usage && (
                <Progress
                  value={usage.percentageUsed.webhooks}
                  className="h-2"
                  aria-label={`Webhooks usage: ${usage.percentageUsed.webhooks.toFixed(0)} percent`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={usage.percentageUsed.webhooks}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Predictive Analytics */}
      <PredictiveAnalytics />

      {/* Features */}
      <section aria-labelledby="features-heading">
        <Card>
          <CardHeader>
            <CardTitle id="features-heading" className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
              Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
              role="list"
              aria-label="Subscription features"
            >
              {Object.entries(features).map(([key, enabled]) => (
                <div key={key} className="flex items-center gap-2" role="listitem">
                  {enabled ? (
                    <CheckCircleIcon className="h-4 w-4 text-green-500" aria-hidden="true" />
                  ) : (
                    <LockIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  )}
                  <span className={`text-sm ${enabled ? "" : "text-gray-500"}`}>
                    {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                  </span>
                  {!enabled && tier !== "enterprise" && (
                    <Badge variant="outline" className="text-xs">
                      Upgrade
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Upgrade Options */}
      {tier !== "enterprise" && (
        <section aria-labelledby="upgrade-heading">
          <Card>
            <CardHeader>
              <CardTitle id="upgrade-heading">Upgrade Your Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                role="list"
                aria-label="Available upgrade plans"
              >
                {tier === "free" && (
                  <article className="border rounded-lg p-4 space-y-3" role="listitem">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Pro</h3>
                      <Badge>Popular</Badge>
                    </div>
                    <div className="text-2xl font-bold" aria-label={`Pro plan: $${(29 / 100).toFixed(2)} per month`}>
                      ${29 / 100}
                      <span className="text-sm text-gray-500">/month</span>
                    </div>
                    <ul className="text-sm space-y-1" aria-label="Pro plan features">
                      <li>• 1,000 monthly credits</li>
                      <li>• 50 projects</li>
                      <li>• 5 teams</li>
                      <li>• Advanced analytics</li>
                      <li>• Priority support</li>
                    </ul>
                    <Button
                      onClick={() => handleUpgrade("pro")}
                      className="w-full"
                      aria-label={`Upgrade to Pro plan for $${(29 / 100).toFixed(2)} per month`}
                    >
                      Upgrade to Pro
                    </Button>
                  </article>
                )}

                <article className={`border rounded-lg p-4 space-y-3 ${tier === "free" ? "md:col-span-2 lg:col-span-1" : ""}`} role="listitem">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      Enterprise
                      <CrownIcon className="h-4 w-4 text-yellow-500" aria-hidden="true" />
                    </h3>
                  </div>
                  <div className="text-2xl font-bold" aria-label={`Enterprise plan: $${(99 / 100).toFixed(2)} per month`}>
                    ${99 / 100}
                    <span className="text-sm text-gray-500">/month</span>
                  </div>
                  <ul className="text-sm space-y-1" aria-label="Enterprise plan features">
                    <li>• Unlimited everything</li>
                    <li>• Custom domains</li>
                    <li>• Priority support</li>
                    <li>• Advanced deployments</li>
                    <li>• Custom themes</li>
                  </ul>
                  <Button
                    onClick={() => handleUpgrade("enterprise")}
                    variant="default"
                    className="w-full"
                    aria-label={`Upgrade to Enterprise plan for $${(99 / 100).toFixed(2)} per month`}
                  >
                    Upgrade to Enterprise
                  </Button>
                </article>
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </main>
  );
}
