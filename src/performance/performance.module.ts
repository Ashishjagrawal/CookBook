import { Module } from '@nestjs/common';
import { PerformanceService } from './performance.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PerformanceService],
  exports: [PerformanceService],
})
export class PerformanceModule {}
