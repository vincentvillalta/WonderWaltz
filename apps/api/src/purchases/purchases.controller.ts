import { Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SupabaseAuthGuard, type RequestUser } from '../auth/auth.guard.js';
import { AnonymousPurchaseGuard } from '../auth/anonymous-purchase.guard.js';
import { PurchasesService, type RestoreResult } from './purchases.service.js';

/**
 * PurchasesController -- purchase restore endpoint.
 *
 * POST /v1/purchases/restore -- requires authenticated non-anonymous user.
 * Calls RevenueCat to get subscriber purchase history and reconciles
 * entitlements table.
 */
@ApiTags('purchases')
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post('restore')
  @UseGuards(SupabaseAuthGuard, AnonymousPurchaseGuard)
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Restore purchases',
    description:
      "Queries RevenueCat for the authenticated user's purchase history " +
      'and reconciles the entitlements table. Returns the list of active ' +
      'trip entitlements. Requires authenticated non-anonymous user.',
  })
  @ApiResponse({ status: 200, description: 'Purchases restored successfully' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 403, description: 'Anonymous users cannot restore purchases' })
  async restore(@Req() req: { user: RequestUser }): Promise<RestoreResult> {
    return this.purchasesService.restorePurchases(req.user.id);
  }
}
