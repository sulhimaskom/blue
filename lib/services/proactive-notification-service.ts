import { db } from "@/lib/db";
import { users, userSettings } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { NotificationService } from "./notification-service";
import { subscriptionService } from "./subscription-service";
import { logger } from "@/lib/logger";
import { NotFoundError, DatabaseError } from "@/lib/api-utils";

interface CreditWarningThreshold {
  daysBeforeExhaustion: number;
  urgency: "low" | "medium" | "high" | "critical";
  title: string;
  messageTemplate: (_days: number, _projectedDate: string, _recommendedTier: string) => string;
}

const WARNING_THRESHOLDS: CreditWarningThreshold[] = [
  {
    daysBeforeExhaustion: 30,
    urgency: "low",
    title: "Credit Usage Alert - 30 Days",
    messageTemplate: (_days: number, _projectedDate: string, _recommendedTier: string) => {
      return `Based on your usage pattern, your credits will run out in ${_days} days (on ${_projectedDate}). Consider upgrading to ${_recommendedTier} to avoid service interruption.`;
    },
  },
  {
    daysBeforeExhaustion: 14,
    urgency: "medium",
    title: "Credit Usage Alert - 14 Days",
    messageTemplate: (_days: number, _projectedDate: string, _recommendedTier: string) => {
      return `Your credits will run out in ${_days} days (on ${_projectedDate}). We recommend upgrading to ${_recommendedTier} soon to ensure uninterrupted service.`;
    },
  },
  {
    daysBeforeExhaustion: 7,
    urgency: "high",
    title: "Urgent: Credit Exhaustion in 7 Days",
    messageTemplate: (_days: number, _projectedDate: string, _recommendedTier: string) => {
      return `URGENT: Your credits will be exhausted in ${_days} days (on ${_projectedDate}). Please upgrade to ${_recommendedTier} immediately to avoid service interruption.`;
    },
  },
  {
    daysBeforeExhaustion: 3,
    urgency: "critical",
    title: "CRITICAL: Credit Exhaustion Imminent",
    messageTemplate: (_days: number, _projectedDate: string, _recommendedTier: string) => {
      return `CRITICAL: Your credits will run out in ${_days} days (on ${_projectedDate}). Upgrade to ${_recommendedTier} NOW to avoid service disruption.`;
    },
  },
];

export class ProactiveNotificationService {
  static async sendCreditWarningsForAllUsers(): Promise<{ processed: number; sent: number; errors: number }> {
    try {
      logger.info("Starting proactive credit warning notification job");

      const database = db();

      const allUsers = await database
        .select()
        .from(users)
        .where(isNull(users.deletedAt));

      let processed = 0;
      let sent = 0;
      let errors = 0;

      for (const user of allUsers) {
        processed++;
        try {
          const notificationSent = await this.sendCreditWarningsForUser(user.id, user.clerkId);
          if (notificationSent) {
            sent++;
          }
        } catch (error) {
          errors++;
          logger.error("Failed to send credit warnings for user", {
            userId: user.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      logger.info("Proactive credit warning notification job completed", {
        processed,
        sent,
        errors,
      });

      return { processed, sent, errors };
    } catch (error) {
      logger.error("Proactive credit warning notification job failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  static async sendCreditWarningsForUser(userId: number, clerkId: string): Promise<boolean> {
    try {
      const database = db();

      const [user] = await database
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        throw new NotFoundError("User not found");
      }

      const [settings] = await database
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId));

      const preferences = settings?.notificationPreferences as Record<string, any> | null;
      const creditExhaustionWarnings = preferences?.creditExhaustionWarnings ?? true;

      if (!creditExhaustionWarnings) {
        logger.userAction("Skipping credit warnings - user opted out", clerkId);
        return false;
      }

      const result = await subscriptionService.getPredictiveAnalytics(userId);
      if (!result.success || !result.data) {
        throw new DatabaseError(`Failed to get predictive analytics: ${result.error}`);
      }

      const analyticsData = result.data;
      const { projectedExhaustionDate, tierRecommendation } = analyticsData.credits;

      if (!projectedExhaustionDate || tierRecommendation.recommendedTier === "current") {
        logger.userAction("Skipping credit warnings - no exhaustion projected", clerkId);
        return false;
      }

      const exhaustionDate = new Date(projectedExhaustionDate);
      const today = new Date();
      const daysUntilExhaustion = Math.ceil(
        (exhaustionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      let notificationSent = false;

      for (const threshold of WARNING_THRESHOLDS) {
        const isExactMatch = daysUntilExhaustion === threshold.daysBeforeExhaustion;

        if (!isExactMatch) {
          continue;
        }

        const formattedDate = exhaustionDate.toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const message = threshold.messageTemplate(
          daysUntilExhaustion,
          formattedDate,
          tierRecommendation.recommendedTier,
        );

        await NotificationService.dispatch(
          clerkId,
          "credit_exhaustion_warning",
          threshold.title,
          message,
          {
            projectedExhaustionDate: projectedExhaustionDate,
            daysUntilExhaustion,
            recommendedTier: tierRecommendation.recommendedTier,
          },
          "/dashboard/subscription",
        );

        logger.userAction("Credit exhaustion warning sent", clerkId, {
          daysUntilExhaustion,
          urgency: threshold.urgency,
        });

        notificationSent = true;
        break;
      }

      return notificationSent;
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  static async checkCreditWarningsForUser(userId: number, clerkId: string): Promise<void> {
    try {
      await this.sendCreditWarningsForUser(userId, clerkId);
    } catch (error) {
      logger.error("Failed to check credit warnings for user", {
        userId,
        clerkId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
