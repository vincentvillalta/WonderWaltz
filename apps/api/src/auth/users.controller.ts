import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopedResponse } from '../common/decorators/api-enveloped-response.decorator.js';
import { DeleteAccountDto, DeleteAccountResponseDto, UserMeDto } from '../shared/dto/auth.dto.js';
import { SupabaseAuthGuard, type RequestUser } from './auth.guard.js';
import { UsersService } from './users.service.js';
import { AccountDeletionService } from '../account-deletion/account-deletion.service.js';

@ApiTags('users')
@Controller('users')
@UseGuards(SupabaseAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly accountDeletionService: AccountDeletionService,
  ) {}

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

  /**
   * DELETE /v1/users/me
   * Soft-delete the current user, revoke entitlements, schedule 30-day purge.
   * Requires confirmed:true in request body (double-tap confirm).
   */
  @Delete('me')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete current user account',
    description:
      'Soft-deletes the authenticated user account, revokes all active entitlements, ' +
      'and schedules a 30-day data purge. Requires confirmed:true in the request body ' +
      '(double-tap confirmation). After deletion, the user will be blocked from all API access.',
  })
  @ApiEnvelopedResponse(DeleteAccountResponseDto)
  @ApiResponse({ status: 200, description: 'Account marked for deletion' })
  @ApiResponse({ status: 400, description: 'Missing confirmed:true in request body' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  async deleteMe(
    @Req() req: { user: RequestUser },
    @Body() body: DeleteAccountDto,
  ): Promise<DeleteAccountResponseDto> {
    return this.accountDeletionService.requestDeletion(req.user.id, body.confirmed);
  }
}
