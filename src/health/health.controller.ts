import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check() {
    return this.healthService.getHealth();
  }

  @Get('database')
  checkDatabase() {
    return this.healthService.getDatabaseHealth();
  }

  @Get('elasticsearch')
  checkElasticsearch() {
    return this.healthService.getElasticsearchHealth();
  }

  @Get('kafka')
  checkKafka() {
    return this.healthService.getKafkaHealth();
  }
}
