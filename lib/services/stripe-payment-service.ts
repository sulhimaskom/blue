import { logger } from "@/lib/logger";
import { retryService, RETRY_CONFIGS } from "./retry-service";
import type { RequestContext } from "@/lib/services/user-service";
import { DatabaseError, ValidationError } from "@/lib/api-utils";

export interface PaymentIntentRequest {
  amount: number;
  paymentMethodId: string;
  userId: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  status: string;
  amount: number;
  currency: string;
}

export interface WebhookEvent {
  type: string;
  data: {
    object: {
      id: string;
      status: string;
      amount: number;
      currency: string;
      metadata?: Record<string, string>;
      payment_intent?: string;
      charges?: {
        data: Array<{
          id: string;
          amount: number;
          status: string;
          payment_method: string;
        }>;
      };
    };
  };
}

/**
 * Production-ready Stripe payment service
 * Integrates with Stripe API for payment processing
 */
export class StripePaymentService {
  private static instance: StripePaymentService;
  private stripe: any;

  private constructor() {
    // Stripe will be initialized with environment variables
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        this.stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
      } catch (error) {
        logger.error("Failed to initialize Stripe", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw new DatabaseError(
          "Stripe library not available or invalid configuration",
        );
      }
    } else {
      logger.warn(
        "STRIPE_SECRET_KEY not configured - payment service disabled",
      );
    }
  }

  public static getInstance(): StripePaymentService {
    if (!StripePaymentService.instance) {
      StripePaymentService.instance = new StripePaymentService();
    }
    return StripePaymentService.instance;
  }

  /**
   * Create a payment intent for credit purchases
   */
  public async createPaymentIntent(
    request: PaymentIntentRequest,
    context: RequestContext,
  ): Promise<PaymentIntentResponse> {
    if (!this.stripe) {
      throw new DatabaseError("Stripe payment service not configured");
    }

    try {
      const paymentIntent = await retryService.executeWithRetry(
        async () => {
          const intent = await this.stripe.paymentIntents.create({
            amount: request.amount,
            currency: "usd",
            payment_method: request.paymentMethodId,
            confirmation_method: "manual",
            confirm: true,
            metadata: {
              userId: request.userId,
              idempotencyKey: `payment_${request.userId}_${Date.now()}`,
              ...(request.metadata || {}),
            },
            automatic_payment_methods: {
              enabled: true,
            },
            return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/credits/success`,
          });
          return intent;
        },
        {
          ...RETRY_CONFIGS.STANDARD,
          retryableErrors: retryService.createErrorFilter({
            nonRetryableMessages: [
              "card_declined",
              "insufficient_funds",
              "expired_card",
              "incorrect_cvc",
              "authentication_required",
              "incorrect_number",
            ],
          }),
          context: {
            service: "stripe-api",
            operation: "create-payment-intent",
            userId: request.userId,
            amount: request.amount,
          },
        },
      );

      logger.systemEvent("Payment intent created", {
        requestId: context.requestId,
        paymentIntentId: paymentIntent.id,
        userId: request.userId,
        amount: request.amount,
        status: paymentIntent.status,
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      };
    } catch (error) {
      logger.error("Payment intent creation failed", {
        requestId: context.requestId,
        userId: request.userId,
        amount: request.amount,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw new DatabaseError(
        `Payment processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Process Stripe webhooks for payment confirmations
   */
  public async processWebhookEvent(
    payload: string,
    signature: string,
    context: RequestContext,
  ): Promise<{ processed: boolean; type: string }> {
    if (!this.stripe) {
      throw new DatabaseError("Stripe payment service not configured");
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      logger.error("STRIPE_WEBHOOK_SECRET not configured", {
        requestId: context.requestId,
      });
      throw new ValidationError("Webhook secret not configured");
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );

      logger.systemEvent("Webhook event received", {
        requestId: context.requestId,
        eventType: event.type,
        eventId: event.id,
      });

      switch (event.type) {
        case "payment_intent.succeeded":
          await this.handlePaymentSucceeded(event as any, context);
          break;
        case "payment_intent.payment_failed":
          await this.handlePaymentFailed(event as any, context);
          break;
        case "payment_intent.canceled":
          await this.handlePaymentCanceled(event as any, context);
          break;
        default:
          logger.systemEvent("Unhandled webhook event type", {
            requestId: context.requestId,
            eventType: event.type,
          });
      }

      return { processed: true, type: event.type };
    } catch (error) {
      logger.serviceError("StripePaymentService", "Webhook processing failed", {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw new DatabaseError(
        `Webhook processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Handle successful payment events
   */
  private async handlePaymentSucceeded(
    event: WebhookEvent,
    context: RequestContext,
  ): Promise<void> {
    const paymentIntent = event.data.object;
    const userId = paymentIntent.metadata?.userId;

    if (!userId) {
      logger.error("Payment intent missing userId metadata", {
        requestId: context.requestId,
        paymentIntentId: paymentIntent.id,
      });
      return;
    }

    try {
      // Import services dynamically to avoid circular dependencies
      const { UserService } = await import("@/lib/services/user-service");
      const { ProjectDataService } =
        await import("@/lib/services/project-data-service");
      const { CREDIT_RULES } = await import("@/lib/constants");

      // Calculate credits to add
      const creditsToAdd = Math.floor(
        paymentIntent.amount / (CREDIT_RULES.CONVERSION_RATE * 100),
      ); // Convert from cents

      // Create transaction record
      await ProjectDataService.createTransaction(
        parseInt(userId, 10),
        paymentIntent.amount,
        creditsToAdd,
        paymentIntent.id,
      );

      // Update user credits
      await UserService.updateUserCredits(
        parseInt(userId, 10),
        creditsToAdd,
        context,
      );

      // Update subscription tier if needed
      await UserService.updateSubscriptionTierIfNeeded(
        parseInt(userId, 10),
        creditsToAdd,
        context,
      );

      logger.systemEvent("Payment processed successfully", {
        requestId: context.requestId,
        userId,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        creditsAdded: creditsToAdd,
      });
    } catch (error) {
      logger.error("Failed to process successful payment", {
        requestId: context.requestId,
        userId,
        paymentIntentId: paymentIntent.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Handle failed payment events
   */
  private async handlePaymentFailed(
    event: WebhookEvent,
    context: RequestContext,
  ): Promise<void> {
    const paymentIntent = event.data.object;
    const userId = paymentIntent.metadata?.userId;

    logger.systemEvent("Payment failed", {
      requestId: context.requestId,
      userId,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      status: paymentIntent.status,
    });

    // Additional notification logic could be added here
    // For example, send email notifications, update user records, etc.
  }

  /**
   * Handle canceled payment events
   */
  private async handlePaymentCanceled(
    event: WebhookEvent,
    context: RequestContext,
  ): Promise<void> {
    const paymentIntent = event.data.object;
    const userId = paymentIntent.metadata?.userId;

    logger.systemEvent("Payment canceled", {
      requestId: context.requestId,
      userId,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
    });
  }

  /**
   * Retrieve payment intent details
   */
  public async retrievePaymentIntent(
    paymentIntentId: string,
    context: RequestContext,
  ): Promise<any> {
    if (!this.stripe) {
      throw new DatabaseError("Stripe payment service not configured");
    }

    try {
      const paymentIntent =
        await this.stripe.paymentIntents.retrieve(paymentIntentId);

      logger.info("Payment intent retrieved", {
        requestId: context.requestId,
        paymentIntentId,
        status: paymentIntent.status,
      });

      return paymentIntent;
    } catch (error) {
      logger.error("Failed to retrieve payment intent", {
        requestId: context.requestId,
        paymentIntentId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw new DatabaseError(
        `Failed to retrieve payment: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Check if Stripe service is properly configured
   */
  public isConfigured(): boolean {
    return !!this.stripe && !!process.env.STRIPE_SECRET_KEY;
  }

  /**
   * Get Stripe publishable key for frontend
   */
  public getPublishableKey(): string {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      throw new ValidationError("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not configured");
    }
    return key;
  }
}
