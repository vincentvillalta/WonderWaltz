import { Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedResponse } from '../common/decorators/api-enveloped-response.decorator.js';
import { AnonymousAuthResponseDto, UpgradeResponseDto } from '../shared/dto/auth.dto.js';
import { AuthService } from './auth.service.js';
import { SupabaseAuthGuard, type RequestUser } from './auth.guard.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /v1/auth/anonymous
   * Create an anonymous user session and return a JWT.
   */
  @Post('anonymous')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Create anonymous user session',
    description:
      'Creates an anonymous user account and returns a JWT access token. ' +
      'Anonymous users can create and view trips but cannot purchase entitlements.',
  })
  @ApiEnvelopedResponse(AnonymousAuthResponseDto)
  @ApiResponse({ status: 200, description: 'Anonymous user created' })
  @ApiResponse({ status: 500, description: 'Failed to create anonymous user' })
  async anonymousAuth(): Promise<AnonymousAuthResponseDto> {
    return this.authService.createAnonymousUser();
  }

  /**
   * POST /v1/auth/upgrade
   * Called AFTER the client completes OAuth via Supabase linkIdentity.
   * Syncs the upgraded identity to public.users.
   */
  @Post('upgrade')
  @HttpCode(200)
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Sync account upgrade to public.users',
    description:
      'Called after the client completes the OAuth merge via Supabase linkIdentity. ' +
      'The backend validates the new merged JWT, then syncs is_anonymous=false and email ' +
      'to public.users. Idempotent — calling on an already-upgraded user returns 200.',
  })
  @ApiEnvelopedResponse(UpgradeResponseDto)
  @ApiResponse({ status: 200, description: 'Upgrade synced' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  async upgrade(@Req() req: { user: RequestUser }): Promise<UpgradeResponseDto> {
    return this.authService.upgradeUser(req.user.id, req.user.email);
  }
}
