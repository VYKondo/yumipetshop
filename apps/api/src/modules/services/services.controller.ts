import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { StaffPermissionsGuard } from '../../common/guards/staff-permissions.guard';
import { CurrentPetshop } from '../../common/decorators/current-petshop.decorator';
import { AllowedResources } from '../../common/decorators/allowed-resources.decorator';

@Controller('services')
@UseGuards(JwtAuthGuard, TenantGuard, StaffPermissionsGuard)
@AllowedResources('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  create(@CurrentPetshop() petshopId: string, @Body() dto: CreateServiceDto) {
    return this.servicesService.create(petshopId, dto);
  }

  @Get()
  findAll(@CurrentPetshop() petshopId: string) {
    return this.servicesService.findAll(petshopId);
  }

  @Get(':id')
  findOne(@CurrentPetshop() petshopId: string, @Param('id') id: string) {
    return this.servicesService.findOne(petshopId, id);
  }

  @Patch(':id')
  update(
    @CurrentPetshop() petshopId: string,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(petshopId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentPetshop() petshopId: string, @Param('id') id: string) {
    return this.servicesService.remove(petshopId, id);
  }
}
