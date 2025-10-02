import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RolesService } from './services/roles.service';
import { PermissionsService } from './services/permissions.service';
import { PasswordService } from '../auth/services/password.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, RolesService, PermissionsService, PasswordService],
  exports: [UsersService, RolesService, PermissionsService],
})
export class UsersModule {}
