import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsQueryDto } from './dto/metrics-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentPetshop } from '../../common/decorators/current-petshop.decorator';

@Controller('metrics')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get()
  @Roles('OWNER', 'STAFF')
  getMetrics(
    @CurrentPetshop() petshopId: string,
    @Query() query: MetricsQueryDto,
  ) {
    return this.metricsService.getMetrics(petshopId, query);
  }
}