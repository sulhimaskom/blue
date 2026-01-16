import { NextRequest } from "next/server";
import { formatErrorResponse } from "@/lib/api-utils";
import { WebhookService } from "@/lib/services/webhook-service";
import { SecurityService } from "@/lib/services/security-service";
import { RateLimiters } from "@/lib/rate-limit-config";
import { githubWebhookHandlerService } from "@/lib/services/github-webhook-handler-service";
import {
  type GitHubWebhookEvent,
  type WebhookContext,
} from "@/lib/types/webhook-events";

export async function POST(req: NextRequest) {
  const identifier =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "anonymous";
  const rateLimitCheck = await RateLimiters.webhook()(identifier);

  if (!rateLimitCheck.allowed) {
    return formatErrorResponse(
      new Error("Rate limit exceeded. Try again in 60 seconds."),
    );
  }

  return WebhookService.processWebhookWithReliability(req, {
    serviceName: "GitHub",
    verifySignature: SecurityService.verifyGitHubWebhook,
    useQueue: true,
    processEvent: async (
      event: GitHubWebhookEvent,
      context: WebhookContext,
    ) => {
      await githubWebhookHandlerService.processWebhookEvent(event, context);
    },
  });
}

export async function OPTIONS() {
  return WebhookService.handleOptions();
}
