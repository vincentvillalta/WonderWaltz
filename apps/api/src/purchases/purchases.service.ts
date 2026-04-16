import { Injectable, Logger } from '@nestjs/common';
import { EntitlementService } from '../entitlements/entitlement.service.js';

/**
 * Shape returned from RevenueCat REST API v1 GET /v1/subscribers/{app_user_id}
 * Only the fields we consume are typed here.
 */
interface RcSubscriberResponse {
  subscriber: {
    non_subscriptions: Record<
      string,
      Array<{
        id: string;
        purchase_date: string;
        store: string;
      }>
    >;
    subscriber_attributes: Record<string, { value: string }>;
  };
}

export interface RestoreResult {
  restored_count: number;
  entitlements: Array<{ trip_id: string; purchased_at: string }>;
}

/**
 * PurchasesService -- handles purchase restore flow.
 *
 * restorePurchases() calls RevenueCat REST API to get the subscriber's
 * purchase history, reconciles with the entitlements table (creating
 * missing rows), and returns the current entitlement list.
 */
@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(private readonly entitlementService: EntitlementService) {}

  /**
   * Restore purchases from RevenueCat for a given user.
   *
   * 1. Fetch subscriber data from RevenueCat REST API
   * 2. For each active purchase, create entitlement (idempotent)
   * 3. Unlock trips for newly-created entitlements
   * 4. Return current entitlements list
   */
  async restorePurchases(userId: string): Promise<RestoreResult> {
    const apiKey = process.env['REVENUECAT_API_KEY'] ?? '';

    // Step 1: Call RevenueCat REST API
    const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${userId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'X-Platform': 'stripe',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      this.logger.error(`RevenueCat API error: ${response.status} ${response.statusText}`);
      throw new Error(`RevenueCat API returned ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as RcSubscriberResponse;

    // Step 2: Parse non_subscriptions.trip_unlock purchases
    const purchases = data.subscriber.non_subscriptions['trip_unlock'] ?? [];
    const subscriberAttrs = data.subscriber.subscriber_attributes;

    let restoredCount = 0;

    for (const purchase of purchases) {
      // Derive trip_id from subscriber_attributes or purchase id
      const tripIdAttr = subscriberAttrs[`trip_id_${purchase.id}`];
      const tripId = tripIdAttr?.value ?? purchase.id;

      // Step 3: Create entitlement (idempotent via unique constraint)
      const created = await this.entitlementService.createEntitlement(
        userId,
        tripId,
        purchase.id,
        new Date(purchase.purchase_date),
      );

      // Step 4: Only unlock trip for newly-created entitlements
      if (created) {
        await this.entitlementService.unlockTrip(tripId);
        restoredCount++;
      }
    }

    // Return current active entitlements
    const entitlements = await this.entitlementService.getEntitlementsByUserId(userId);

    return {
      restored_count: restoredCount,
      entitlements: entitlements.map((e) => ({
        trip_id: e.trip_id,
        purchased_at: e.purchased_at,
      })),
    };
  }
}
