"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { 
  CreditCard, 
  Users, 
  FolderOpen, 
  Webhook, 
  TrendingUp,
  Lock,
  CheckCircle,
  AlertCircle,
  Zap,
  Crown,
  Star
} from "lucide-react";

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
      
      // Redirect to Stripe checkout
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upgrade failed");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!subscription) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Unable to load subscription information</AlertDescription>
      </Alert>
    );
  }

  const { tier, limits, features, pricing, usage } = subscription;

  return (
    <div className="space-y-6">
      {/* Current Tier Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {tier === "enterprise" ? <Crown className="h-5 w-5 text-yellow-500" /> :
             tier === "pro" ? <Star className="h-5 w-5 text-blue-500" /> :
             <CreditCard className="h-5 w-5 text-gray-500" />}
            Current Plan: {tier.charAt(0).toUpperCase() + tier.slice(1)}
            <Badge variant={tier === "free" ? "secondary" : "default"}>
              {tier === "free" ? "Free" : tier === "pro" ? "Pro" : "Enterprise"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {usage?.currentUsage.credits || 0}
              </div>
              <div className="text-sm text-gray-600">Credits Used</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {usage?.currentUsage.projects || 0}
              </div>
              <div className="text-sm text-gray-600">Projects</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {usage?.currentUsage.teams || 0}
              </div>
              <div className="text-sm text-gray-600">Teams</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {usage?.currentUsage.webhooks || 0}
              </div>
              <div className="text-sm text-gray-600">Webhooks</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Usage & Limits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Credits */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Credits
              </span>
              <span>
                {usage?.currentUsage.credits || 0} / {limits.maxCredits === -1 ? "∞" : limits.maxCredits}
              </span>
            </div>
            {limits.maxCredits !== -1 && usage && (
              <Progress value={usage.percentageUsed.credits} className="h-2" />
            )}
          </div>

          {/* Projects */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Projects
              </span>
              <span>
                {usage?.currentUsage.projects || 0} / {limits.maxProjects === -1 ? "∞" : limits.maxProjects}
              </span>
            </div>
            {limits.maxProjects !== -1 && usage && (
              <Progress value={usage.percentageUsed.projects} className="h-2" />
            )}
          </div>

          {/* Teams */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Teams
              </span>
              <span>
                {usage?.currentUsage.teams || 0} / {limits.maxTeams === -1 ? "∞" : limits.maxTeams}
              </span>
            </div>
            {limits.maxTeams !== -1 && usage && (
              <Progress value={usage.percentageUsed.teams} className="h-2" />
            )}
          </div>

          {/* Webhooks */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                Webhooks
              </span>
              <span>
                {usage?.currentUsage.webhooks || 0} / {limits.maxWebhooks === -1 ? "∞" : limits.maxWebhooks}
              </span>
            </div>
            {limits.maxWebhooks !== -1 && usage && (
              <Progress value={usage.percentageUsed.webhooks} className="h-2" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(features).map(([key, enabled]) => (
              <div key={key} className="flex items-center gap-2">
                {enabled ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Lock className="h-4 w-4 text-gray-400" />
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

      {/* Upgrade Options */}
      {tier !== "enterprise" && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade Your Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tier === "free" && (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Pro</h3>
                    <Badge>Popular</Badge>
                  </div>
                  <div className="text-2xl font-bold">
                    ${(pricing.monthly / 100)}
                    <span className="text-sm text-gray-500">/month</span>
                  </div>
                  <ul className="text-sm space-y-1">
                    <li>• 1,000 monthly credits</li>
                    <li>• 50 projects</li>
                    <li>• 5 teams</li>
                    <li>• Advanced analytics</li>
                    <li>• Priority support</li>
                  </ul>
                  <Button 
                    onClick={() => handleUpgrade("pro")}
                    className="w-full"
                  >
                    Upgrade to Pro
                  </Button>
                </div>
              )}
              
              <div className={`border rounded-lg p-4 space-y-3 ${tier === "free" ? "md:col-span-2 lg:col-span-1" : ""}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    Enterprise
                    <Crown className="h-4 w-4 text-yellow-500" />
                  </h3>
                </div>
                <div className="text-2xl font-bold">
                  ${(tier === "free" ? 99 : tier === "pro" ? 99 : 0) / 100}
                  <span className="text-sm text-gray-500">/month</span>
                </div>
                <ul className="text-sm space-y-1">
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
                >
                  Upgrade to Enterprise
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}