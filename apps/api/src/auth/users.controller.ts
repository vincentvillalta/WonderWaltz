import { Controller, Get, NotFoundException, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedResponse } from '../common/decorators/api-enveloped-response.decorator.js';
import { UserMeDto } from '../shared/dto/auth.dto.js';
import { SupabaseAuthGuard, type RequestUser } from './auth.guard.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@Controller('users')
@UseGuards(SupabaseAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /v1/users/me
   * Return the current authenticated user's profile.
   */
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Returns the profile for the authenticated user including is_anonymous status, ' +
      'email (if registered), and account creation date. ' +
      'Requires a valid JWT bearer token.',
  })
  @ApiEnvelopedResponse(UserMeDto)
  @ApiResponse({ status: 200, description: 'User profile returned' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getMe(@Req() req: { user: RequestUser }): Promise<UserMeDto> {
    const profile = await this.usersService.getUserProfile(req.user.id);

    if (!profile) {
      throw new NotFoundException('User not found');
    }

    const dto: UserMeDto = {
      id: profile.id,
      is_anonymous: profile.is_anonymous,
      created_at: profile.created_at,
    };
    if (profile.email) {
      dto.email = profile.email;
    }
    return dto;
  }
}
