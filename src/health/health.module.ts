import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    ElasticsearchModule.register({
      node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    }),
    RealtimeModule,
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
