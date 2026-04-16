import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB_TOKEN } from '../ingestion/queue-times.service.js';
import { EntitlementService } from '../entitlements/entitlement.service.js';

/** Minimal Drizzle-compatible interface for raw SQL execution */
interface DbExecutable {
  execute(query: ReturnType<typeof sql>): Promise<{ rows: Record<string, unknown>[] }>;
}

/** Shape of a RevenueCat webhook payload */
interface RevenueCatPayload {
  api_version: string;
  event: {
    type: string;
    app_user_id: string;
    id: string;
    purchased_at_ms?: number;
    subscriber_attributes?: Record<string, { value: string }>;
  };
}

/**
 * WebhookService -- processes RevenueCat webhook events.
 *
 * All events are logged to iap_events regardless of outcome.
 * Purchase events (INITIAL_PURCHASE, NON_RENEWING_PURCHASE) create
 * entitlements and unlock trips.
 * REFUND events revoke entitlements and lock trips.
 * CANCELLATION / EXPIRATION are log-only (consumable lifecycle).
 *
 * NOTE: IAP-07 affiliate tag rewriting is already handled by
 * AffiliateService from Phase 3 (packing-list module). No additional
 * code needed here.
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: DbExecutable,
    private readonly entitlementService: EntitlementService,
  ) {}

  /**
   * Log raw event to iap_events table.
   * Called before any business logic so every event is captured.
   */
  private async logRawEvent(payload: RevenueCatPayload): Promise<void> {
    const event = payload.event;
    const tripId = event.subscriber_attributes?.['trip_id']?.value ?? null;

    await this.db.execute(
      sql`INSERT INTO iap_events (user_id, trip_id, event_type, revenuecat_id, raw_payload)
          VALUES (
            ${event.app_user_id},
            ${tripId},
            ${event.type},
            ${event.id},
            ${JSON.stringify(payload)}
          )`,
    );
  }

  /**
   * Process a RevenueCat webhook event.
   * Logs to iap_events first, then handles event-specific business logic.
   */
  async processEvent(payload: RevenueCatPayload): Promise<void> {
    const event = payload.event;
    const tripId = event.subscriber_attributes?.['trip_id']?.value ?? null;

    // Always log raw event first
    await this.logRawEvent(payload);

    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'NON_RENEWING_PURCHASE': {
        if (!tripId) {
          this.logger.warn(
            `${event.type} event missing trip_id in subscriber_attributes, skipping entitlement creation`,
          );
          break;
        }

        const purchasedAt = event.purchased_at_ms ? new Date(event.purchased_at_ms) : new Date();

        const created = await this.entitlementService.createEntitlement(
          event.app_user_id,
          tripId,
          event.id,
          purchasedAt,
        );

        // Only unlock trip if entitlement was actually created (not a duplicate)
        if (created) {
          await this.entitlementService.unlockTrip(tripId);
          this.logger.log(
            `${event.type}: entitlement created and trip ${tripId} unlocked for user ${event.app_user_id}`,
          );
        } else {
          this.logger.log(`${event.type}: duplicate event for revenuecat_id=${event.id}, skipped`);
        }
        break;
      }

      case 'REFUND': {
        await this.entitlementService.revokeEntitlement(event.id, 'refunded');

        // Look up trip_id from subscriber_attributes or entitlement record
        const refundTripId = tripId;
        if (refundTripId) {
          await this.entitlementService.lockTrip(refundTripId);
        } else {
          // Fallback: look up trip_id from the entitlement record
          const ent = await this.entitlementService.getEntitlementByRevenuecatId(event.id);
          if (ent) {
            await this.entitlementService.lockTrip(ent.trip_id);
          }
        }

        this.logger.log(`REFUND: entitlement revoked for revenuecat_id=${event.id}`);
        break;
      }

      case 'CANCELLATION':
      case 'EXPIRATION':
        // Log-only for consumables -- these events only affect subscription lifecycle
        this.logger.log(
          `${event.type}: logged for revenuecat_id=${event.id} (no-op for consumables)`,
        );
        break;

      default:
        this.logger.warn(`Unknown event type: ${event.type} — logged but not processed`);
        break;
    }
  }
}
