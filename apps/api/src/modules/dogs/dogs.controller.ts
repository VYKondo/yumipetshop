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
import { DogsService } from './dogs.service';
import { CreateDogDto } from './dto/create-dog.dto';
import { UpdateDogDto } from './dto/update-dog.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { StaffPermissionsGuard } from '../../common/guards/staff-permissions.guard';
import { CurrentPetshop } from '../../common/decorators/current-petshop.decorator';
import { AllowedResources } from '../../common/decorators/allowed-resources.decorator';

@Controller('dogs')
@UseGuards(JwtAuthGuard, TenantGuard, StaffPermissionsGuard)
@AllowedResources('dogs')
export class DogsController {
  constructor(private readonly dogsService: DogsService) {}

  @Post()
  create(@CurrentPetshop() petshopId: string, @Body() dto: CreateDogDto) {
    return this.dogsService.create(petshopId, dto);
  }

  @Get()
  findAll(@CurrentPetshop() petshopId: string) {
    return this.dogsService.findAll(petshopId);
  }

  @Get(':id')
  findOne(@CurrentPetshop() petshopId: string, @Param('id') id: string) {
    return this.dogsService.findOne(petshopId, id);
  }

  @Patch(':id')
  update(
    @CurrentPetshop() petshopId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDogDto,
  ) {
    return this.dogsService.update(petshopId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentPetshop() petshopId: string, @Param('id') id: string) {
    return this.dogsService.remove(petshopId, id);
  }
}
