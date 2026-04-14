import { Controller, HttpException, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedResponse } from '../common/decorators/api-enveloped-response.decorator.js';
import { AnonymousAuthResponseDto } from '../shared/dto/auth.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  /**
   * POST /v1/auth/anonymous
   * Create an anonymous user session. Phase 4 implementation.
   */
  @Post('anonymous')
  @HttpCode(501)
  @ApiOperation({
    summary: 'Create anonymous user session (Phase 4)',
    description:
      'Creates an anonymous user account and returns a JWT access token. ' +
      'Anonymous users can create and view trips but cannot purchase entitlements. ' +
      'Returns 501 until Phase 4 auth implementation.',
  })
  @ApiEnvelopedResponse(AnonymousAuthResponseDto)
  @ApiResponse({ status: 501, description: 'Not implemented until Phase 4' })
  anonymousAuth(): never {
    throw new HttpException('Not Implemented', 501);
  }
}
