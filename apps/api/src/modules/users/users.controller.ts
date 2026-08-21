import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StaffPermissionsGuard } from '../../common/guards/staff-permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentPetshop } from '../../common/decorators/current-petshop.decorator';
import { AllowedResources } from '../../common/decorators/allowed-resources.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, StaffPermissionsGuard)
@AllowedResources('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @Roles('OWNER')
  create(
    @Body() dto: CreateUserDto,
    @CurrentPetshop() petshopId: string,
  ) {
    return this.usersService.create(petshopId, dto);
  }

  @Get()
  @Roles('OWNER', 'STAFF')
  findAll(@CurrentPetshop() petshopId: string) {
    return this.usersService.findAll(petshopId);
  }

  @Get(':id')
  @Roles('OWNER', 'STAFF')
  findOne(
    @Param('id') id: string,
    @CurrentPetshop() petshopId: string,
  ) {
    return this.usersService.findOne(petshopId, id);
  }

  @Patch(':id')
  @Roles('OWNER')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentPetshop() petshopId: string,
  ) {
    return this.usersService.update(petshopId, id, dto);
  }

  @Delete(':id')
  @Roles('OWNER')
  remove(
    @Param('id') id: string,
    @CurrentPetshop() petshopId: string,
  ) {
    return this.usersService.remove(petshopId, id);
  }
}