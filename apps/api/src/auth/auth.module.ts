import { Module } from '@nestjs/common';
import { AccountDeletionModule } from '../account-deletion/account-deletion.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [AccountDeletionModule],
  controllers: [AuthController, UsersController],
  providers: [AuthService, UsersService],
  exports: [AuthService, UsersService],
})
export class AuthModule {}
