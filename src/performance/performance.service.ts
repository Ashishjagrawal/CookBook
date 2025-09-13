import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PerformanceService {
  private readonly prisma: PrismaClient;
  
  constructor(prismaService: PrismaService) {
    this.prisma = prismaService as PrismaClient;
  }

  async recordQueryPerformance(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: any
  ) {
    try {
      await this.prisma.performanceMetrics.create({
        data: {
          operation,
          duration,
          success,
          metadata: JSON.stringify(metadata || {}),
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to record performance metrics:', error);
    }
  }

  async getPerformanceStats(operation?: string, hours = 24) {
    try {
      const where: any = {
        timestamp: {
          gte: new Date(Date.now() - hours * 60 * 60 * 1000),
        },
      };

      if (operation) {
        where.operation = operation;
      }

      // Get all metrics and calculate stats manually
      const metrics = await this.prisma.performanceMetrics.findMany({
        where,
        select: {
          operation: true,
          duration: true,
          success: true,
        },
      });

      // Group by operation
      const grouped = metrics.reduce((acc, metric) => {
        if (!acc[metric.operation]) {
          acc[metric.operation] = {
            operation: metric.operation,
            durations: [],
            totalCalls: 0,
            successCount: 0,
          };
        }
        acc[metric.operation].durations.push(metric.duration);
        acc[metric.operation].totalCalls++;
        if (metric.success) {
          acc[metric.operation].successCount++;
        }
        return acc;
      }, {} as any);

      return Object.values(grouped).map((stat: any) => ({
        operation: stat.operation,
        averageDuration: stat.durations.reduce((a: number, b: number) => a + b, 0) / stat.durations.length,
        totalCalls: stat.totalCalls,
        successCount: stat.successCount,
        successRate: (stat.successCount / stat.totalCalls) * 100,
      }));
    } catch (error) {
      console.error('Failed to get performance stats:', error);
      return [];
    }
  }

  async getSlowQueries(threshold = 1000, hours = 24) {
    try {
      return await this.prisma.performanceMetrics.findMany({
        where: {
          duration: {
            gte: threshold,
          },
          timestamp: {
            gte: new Date(Date.now() - hours * 60 * 60 * 1000),
          },
        },
        orderBy: {
          duration: 'desc',
        },
        take: 50,
      });
    } catch (error) {
      console.error('Failed to get slow queries:', error);
      return [];
    }
  }
}
