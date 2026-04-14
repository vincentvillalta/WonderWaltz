import { Controller, Get, HttpException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedResponse } from '../common/decorators/api-enveloped-response.decorator.js';
import { UserMeDto } from '../shared/dto/auth.dto.js';

@ApiTags('users')
@Controller('users')
export class UsersController {
  /**
   * GET /v1/users/me
   * Return the current authenticated user. Phase 4 implementation.
   */
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user profile (Phase 4)',
    description:
      'Returns the profile for the authenticated user. ' +
      'Requires a valid JWT bearer token from POST /v1/auth/anonymous or a registered login. ' +
      'Returns 501 until Phase 4 auth implementation.',
  })
  @ApiEnvelopedResponse(UserMeDto)
  @ApiResponse({ status: 501, description: 'Not implemented until Phase 4' })
  getMe(): never {
    throw new HttpException('Not Implemented', 501);
  }
}
