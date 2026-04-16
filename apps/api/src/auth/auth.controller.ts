import { Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedResponse } from '../common/decorators/api-enveloped-response.decorator.js';
import { AnonymousAuthResponseDto } from '../shared/dto/auth.dto.js';
import { AuthService } from './auth.service.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /v1/auth/anonymous
   * Create an anonymous user session and return a JWT.
   */
  @Post('anonymous')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create anonymous user session',
    description:
      'Creates an anonymous user account and returns a JWT access token. ' +
      'Anonymous users can create and view trips but cannot purchase entitlements.',
  })
  @ApiEnvelopedResponse(AnonymousAuthResponseDto)
  @ApiResponse({ status: 201, description: 'Anonymous user created' })
  @ApiResponse({ status: 500, description: 'Failed to create anonymous user' })
  async anonymousAuth(): Promise<AnonymousAuthResponseDto> {
    return this.authService.createAnonymousUser();
  }
}
