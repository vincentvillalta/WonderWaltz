import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipEnvelope } from '../common/decorators/skip-envelope.decorator.js';
import { WebhookAuthGuard } from './webhook.guard.js';
import { WebhookService } from './webhook.service.js';

/**
 * WebhookController -- POST /v1/webhooks/revenuecat
 *
 * Receives RevenueCat webhook events. Does NOT use SupabaseAuthGuard
 * because the caller is RevenueCat's server, not a user.
 * Auth is handled by WebhookAuthGuard (bearer token verification).
 *
 * @SkipEnvelope() returns raw { ok: true } without response wrapper.
 */
@Controller('webhooks')
@ApiTags('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('revenuecat')
  @SkipEnvelope()
  @HttpCode(200)
  @UseGuards(WebhookAuthGuard)
  async handleRevenuecat(@Body() body: Record<string, unknown>): Promise<{ ok: boolean }> {
    await this.webhookService.processEvent(body as never);
    return { ok: true };
  }
}
