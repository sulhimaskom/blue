import { logger } from '@/lib/logger';
import { CREDIT_RULES } from '@/lib/constants';
import { ProjectDataService } from '@/lib/services/project-data-service';
import { StripePaymentService } from '@/lib/services/stripe-payment-service';
import { IdGenerators } from '@/lib/utils/id-generator';
import type { RequestContext } from '@/lib/services/user-service';

export interface CreditPurchaseRequest {
  amount: number;
  paymentMethodId: string;
  confirmImmediate: boolean;
}

export interface CreditPurchaseResult {
  transactionId: string;
  creditsAdded: number;
  totalCredits: number;
  amount: number;
  subscriptionTier: string;
  paymentId: string;
  message: string;
  // Stripe-specific fields (optional)
  stripeClientSecret?: string;
  paymentStatus?: string;
  requiresAction?: boolean;
  publishableKey?: string | null;
}

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  status: string;
}

/**
 * Service for credit purchase processing
 * Encapsulates payment processing logic (mock vs real Stripe) and credit calculation
 * Extracts business logic from app/api/credits/route.ts following blueprint.md:208-209
 */
export class CreditProcessingService {
  /**
   * Process a credit purchase request
   * Handles both mock payment (development) and real Stripe payment
   */
  static async processCreditPurchase(
    userId: number,
    clerkId: string,
    request: CreditPurchaseRequest,
    context: RequestContext
  ): Promise<CreditPurchaseResult> {
    const { amount, paymentMethodId, confirmImmediate } = request;
    const stripeService = StripePaymentService.getInstance();

    // Check if Stripe is properly configured
    if (!stripeService.isConfigured()) {
      return this.processMockPayment(userId, clerkId, amount, context);
    }

    return this.processStripePayment(
      userId,
      clerkId,
      amount,
      paymentMethodId,
      confirmImmediate,
      stripeService,
      context
    );
  }

  /**
   * Process mock payment for development/testing
   */
  private static async processMockPayment(
    userId: number,
    clerkId: string,
    amount: number,
    context: RequestContext
  ): Promise<CreditPurchaseResult> {
    logger.warn('Stripe not configured - using fallback payment simulation', {
      requestId: context.requestId,
      userId,
      amount,
    });

    const creditsToAdd = this.calculateCredits(amount);
    const mockPaymentId = IdGenerators.PAYMENT();

    const { transaction: newTransaction, user: updatedUser } =
      await ProjectDataService.processCreditPurchase(
        userId,
        amount,
        creditsToAdd,
        mockPaymentId,
        context
      );

    logger.userAction('Credits purchased (mock)', clerkId, {
      requestId: context.requestId,
      transactionId: newTransaction.id,
      amount: amount / 100,
      creditsAdded: creditsToAdd,
      paymentId: mockPaymentId,
      newTotal: updatedUser.credits,
    });

    return {
      transactionId: newTransaction.id,
      creditsAdded: creditsToAdd,
      totalCredits: updatedUser.credits,
      amount: amount / 100,
      subscriptionTier: updatedUser.subscriptionTier,
      paymentId: mockPaymentId,
      message: 'Credits added successfully (development mode).',
    };
  }

  /**
   * Process real Stripe payment
   */
  private static async processStripePayment(
    userId: number,
    clerkId: string,
    amount: number,
    paymentMethodId: string,
    confirmImmediate: boolean,
    stripeService: StripePaymentService,
    context: RequestContext
  ): Promise<CreditPurchaseResult> {
    const paymentIntent = await stripeService.createPaymentIntent(
      {
        amount,
        paymentMethodId,
        userId: userId.toString(),
        metadata: {
          clerkId,
          source: 'credits-api',
        },
      },
      context
    );

    // If payment is immediately confirmed and successful, process credits
    if (confirmImmediate && paymentIntent.status === 'succeeded') {
      const creditsToAdd = this.calculateCredits(amount);

      const { transaction: newTransaction, user: updatedUser } =
        await ProjectDataService.processCreditPurchase(
          userId,
          amount,
          creditsToAdd,
          paymentIntent.paymentIntentId,
          context
        );

      logger.userAction('Credits purchased (Stripe)', clerkId, {
        requestId: context.requestId,
        transactionId: newTransaction.id,
        amount: amount / 100,
        creditsAdded: creditsToAdd,
        paymentId: paymentIntent.paymentIntentId,
        newTotal: updatedUser.credits,
      });

      return {
        transactionId: newTransaction.id,
        creditsAdded: creditsToAdd,
        totalCredits: updatedUser.credits,
        amount: amount / 100,
        subscriptionTier: updatedUser.subscriptionTier,
        paymentId: paymentIntent.paymentIntentId,
        stripeClientSecret: paymentIntent.clientSecret,
        paymentStatus: paymentIntent.status,
        message: 'Credits added successfully via Stripe payment.',
      };
    }

    // Return payment intent for client-side confirmation
    logger.userAction('Payment intent created', clerkId, {
      requestId: context.requestId,
      amount: amount / 100,
      paymentIntentId: paymentIntent.paymentIntentId,
      paymentStatus: paymentIntent.status,
    });

    return {
      transactionId: '',
      creditsAdded: 0,
      totalCredits: 0,
      amount: amount / 100,
      subscriptionTier: '',
      paymentId: paymentIntent.paymentIntentId,
      requiresAction: true,
      stripeClientSecret: paymentIntent.clientSecret,
      paymentStatus: paymentIntent.status,
      publishableKey: stripeService.getPublishableKey(),
      message: 'Payment initiated. Please confirm the payment to add credits.',
    };
  }

  /**
   * Calculate credits from amount using conversion rate
   */
  static calculateCredits(amount: number): number {
    return Math.floor(amount / CREDIT_RULES.CONVERSION_RATE);
  }
}
