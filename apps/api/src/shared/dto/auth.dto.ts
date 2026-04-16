import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class AnonymousAuthResponseDto {
  @ApiProperty({
    description:
      'JWT bearer token for authenticating subsequent requests. Pass in Authorization: Bearer header.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token!: string;

  @ApiProperty({
    description: 'User UUID for the newly-created anonymous user',
    example: 'user-uuid-here',
  })
  user_id!: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp when the access token expires',
    example: '2026-05-14T10:00:00.000Z',
  })
  expires_at!: string;
}

export class UpgradeResponseDto {
  @ApiProperty({
    description: 'Whether the upgrade was applied (always true on success)',
    example: true,
  })
  upgraded!: boolean;

  @ApiProperty({
    description: 'User UUID of the upgraded account',
    example: 'user-uuid-here',
  })
  user_id!: string;
}

export class UserMeDto {
  @ApiProperty({
    description: 'User UUID',
    example: 'user-uuid-here',
  })
  id!: string;

  @ApiPropertyOptional({
    description:
      'Email address — present only for registered (non-anonymous) users. Omitted for anonymous users.',
    example: 'user@example.com',
  })
  email?: string;

  @ApiProperty({
    description: 'ISO 8601 account creation timestamp',
    example: '2026-04-14T10:00:00.000Z',
  })
  created_at!: string;

  @ApiProperty({
    description:
      'True if the user account is anonymous (created via POST /v1/auth/anonymous). False if the user has registered with an email.',
    example: true,
  })
  is_anonymous!: boolean;
}

export class DeleteAccountDto {
  @ApiProperty({
    description:
      'Must be true to confirm account deletion (double-tap confirm). ' +
      'Prevents accidental deletions.',
    example: true,
  })
  @IsBoolean()
  confirmed!: boolean;
}

export class DeleteAccountResponseDto {
  @ApiProperty({
    description: 'Whether the account was marked for deletion',
    example: true,
  })
  deleted!: boolean;

  @ApiProperty({
    description: 'ISO 8601 timestamp when the account data will be permanently purged (30 days)',
    example: '2026-05-16T10:00:00.000Z',
  })
  purge_scheduled_at!: string;
}
