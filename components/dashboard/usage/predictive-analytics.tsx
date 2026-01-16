"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  TrendingUpIcon,
  ZapIcon,
  FolderOpenIcon,
  ChevronUp,
  CheckCircleIcon,
  LightbulbIcon,
  ClockIcon,
  CalendarIcon,
} from "@/components/ui/icons";

interface PredictionsResponse {
  predictions: {
    credits: {
      dailyAverage: number;
      projectedExhaustionDate: string | null;
      tierRecommendation: {
        recommendedTier: string | "current";
        reason: string;
        urgency: "immediate" | "upcoming" | "none";
      };
    };
    projects: {
      currentGrowthRate: number;
      projectedLimitHit: string | null;
    };
    deployments: {
      dailyAverage: number;
      monthlyProjection: number;
    };
  };
  recommendations: Array<{
    type: "upgrade" | "optimization" | "info";
    title: string;
    description: string;
    action?: string;
  }>;
}

export function PredictiveAnalytics() {
  const [predictions, setPredictions] = useState<PredictionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPredictions();
  }, []);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/subscription/predictions");
      
      if (!response.ok) {
        throw new Error("Failed to fetch predictions");
      }
      
      const data = await response.json();
      setPredictions(data.data);
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
      
      if (!data.checkoutUrl || typeof data.checkoutUrl !== "string") {
        throw new Error("Invalid checkout URL received");
      }

      try {
        const url = new URL(data.checkoutUrl, window.location.origin);
        if (url.hostname !== new URL(window.location.origin).hostname &&
            url.hostname !== "checkout.stripe.com" &&
            url.hostname !== "www.paypal.com") {
          throw new Error("Untrusted checkout URL");
        }
      } catch (e) {
        throw new Error("Invalid checkout URL format");
      }

      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upgrade failed");
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "immediate":
        return { variant: "destructive" as const, text: "Immediate" };
      case "upcoming":
        return { variant: "default" as const, text: "Upcoming" };
      default:
        return { variant: "secondary" as const, text: "None" };
    }
  };

  const formatDateSafely = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }
      return date.toLocaleDateString();
    } catch (e) {
      return "Invalid Date";
    }
  };

  const getTierCardClassName = (variant: string): string => {
    const base = "border-2";
    if (variant === "destructive") return `${base} border-red-500`;
    if (variant === "default") return `${base} border-blue-500`;
    return base;
  };

  const getRecommendationItemClassName = (type: string): string => {
    const base = "border rounded-lg p-4";
    switch (type) {
      case "upgrade":
        return `${base} border-blue-500 bg-blue-50 dark:bg-blue-950`;
      case "optimization":
        return `${base} border-green-500 bg-green-50 dark:bg-green-950`;
      default:
        return `${base} border-gray-300 bg-gray-50 dark:bg-gray-900`;
    }
  };

  if (loading) {
    return (
      <div 
        className="flex items-center justify-center h-32"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Loading predictions"
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

  if (!predictions) {
    return null;
  }

  const { predictions: preds, recommendations } = predictions;
  const urgencyBadge = getUrgencyBadge(preds.credits.tierRecommendation.urgency);

  return (
    <div className="space-y-6" role="main" aria-label="Predictive Analytics">
      {/* Credit Exhaustion & Tier Recommendation */}
      {preds.credits.projectedExhaustionDate && (
        <section aria-labelledby="exhaustion-heading">
          <Card>
            <CardHeader>
              <CardTitle id="exhaustion-heading" className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5" aria-hidden="true" />
                Credit Exhaustion Prediction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                     <ZapIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                   </div>
                   <div>
                     <div className="text-sm text-gray-600 dark:text-gray-400">Projected Exhaustion</div>
                     <div className="font-semibold flex items-center gap-2">
                       <CalendarIcon className="h-4 w-4" aria-hidden="true" />
                       {formatDateSafely(preds.credits.projectedExhaustionDate)}
                     </div>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                    <TrendingUpIcon className="h-5 w-5 text-green-600 dark:text-green-400" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Daily Average Usage</div>
                    <div className="font-semibold">{preds.credits.dailyAverage.toFixed(1)} credits</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Tier Recommendation Card */}
      {preds.credits.tierRecommendation.recommendedTier !== "current" && (
        <section aria-labelledby="recommendation-heading">
          <Card className={getTierCardClassName(urgencyBadge.variant)}>
            <CardHeader>
              <CardTitle id="recommendation-heading" className="flex items-center gap-2">
                <ChevronUp className="h-5 w-5" aria-hidden="true" />
                Tier Recommendation
                <Badge variant={urgencyBadge.variant}>{urgencyBadge.text}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Recommended Tier</div>
                <div className="text-xl font-bold capitalize">
                  {preds.credits.tierRecommendation.recommendedTier}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Reason</div>
                <div className="text-sm">{preds.credits.tierRecommendation.reason}</div>
              </div>
              {urgencyBadge.variant === "destructive" && (
                <Alert>
                  <AlertCircleIcon className="h-4 w-4" aria-hidden="true" />
                  <AlertDescription>
                    Your current usage rate may cause service interruptions. We recommend upgrading soon to avoid disruptions.
                  </AlertDescription>
                </Alert>
              )}
              <Button
                onClick={() => handleUpgrade(preds.credits.tierRecommendation.recommendedTier)}
                className="w-full md:w-auto"
                aria-label={`Upgrade to ${preds.credits.tierRecommendation.recommendedTier} tier`}
              >
                Upgrade to {preds.credits.tierRecommendation.recommendedTier.charAt(0).toUpperCase() + preds.credits.tierRecommendation.recommendedTier.slice(1)}
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Project & Deployment Predictions */}
      <section aria-labelledby="usage-predictions-heading">
        <Card>
          <CardHeader>
            <CardTitle id="usage-predictions-heading" className="flex items-center gap-2">
              <TrendingUpIcon className="h-5 w-5" aria-hidden="true" />
              Usage Predictions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Projects */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FolderOpenIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                  <span className="font-semibold">Projects</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Growth Rate</span>
                    <span className="font-medium">
                      {preds.projects.currentGrowthRate > 0 ? "+" : ""}{preds.projects.currentGrowthRate.toFixed(1)}%
                    </span>
                  </div>
                  {preds.projects.projectedLimitHit && (
                     <div className="flex justify-between text-sm">
                       <span>Projected Limit Hit</span>
                       <span className="font-medium flex items-center gap-1">
                         <CalendarIcon className="h-3 w-3" aria-hidden="true" />
                         {formatDateSafely(preds.projects.projectedLimitHit)}
                       </span>
                     </div>
                   )}
                </div>
              </div>

              {/* Deployments */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ZapIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" aria-hidden="true" />
                  <span className="font-semibold">Deployments</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Daily Average</span>
                    <span className="font-medium">{preds.deployments.dailyAverage.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Monthly Projection</span>
                    <span className="font-medium">{preds.deployments.monthlyProjection}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Optimization Recommendations */}
      {recommendations.length > 0 && (
        <section aria-labelledby="recommendations-heading">
          <Card>
            <CardHeader>
              <CardTitle id="recommendations-heading" className="flex items-center gap-2">
                <LightbulbIcon className="h-5 w-5" aria-hidden="true" />
                Optimization Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="space-y-3"
                role="list"
                aria-label="Optimization recommendations"
              >
                {recommendations.map((rec, index) => (
                  <div 
                    key={`${rec.type}-${rec.title}-${index}`}
                    className={getRecommendationItemClassName(rec.type)}
                    role="listitem"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {rec.type === "upgrade" ? (
                          <ChevronUp className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                        ) : rec.type === "optimization" ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden="true" />
                        ) : (
                          <LightbulbIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" aria-hidden="true" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="font-semibold">{rec.title}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{rec.description}</div>
                        {rec.action && (
                          <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                            {rec.action}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
