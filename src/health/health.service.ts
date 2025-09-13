import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { KafkaService } from '../realtime/kafka.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly elasticsearch: ElasticsearchService,
    private readonly kafkaService: KafkaService,
  ) {}

  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  async getDatabaseHealth() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getElasticsearchHealth() {
    try {
      const response = await this.elasticsearch.ping();
      return {
        status: 'ok',
        elasticsearch: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        elasticsearch: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getKafkaHealth() {
    try {
      // Check if Kafka producer and consumer are connected
      const isProducerConnected = this.kafkaService.isProducerConnected();
      const isConsumerConnected = this.kafkaService.isConsumerConnected();
      
      if (isProducerConnected && isConsumerConnected) {
        return {
          status: 'ok',
          kafka: 'connected',
          producer: 'connected',
          consumer: 'connected',
          timestamp: new Date().toISOString(),
        };
      } else {
        return {
          status: 'warning',
          kafka: 'partially connected',
          producer: isProducerConnected ? 'connected' : 'disconnected',
          consumer: isConsumerConnected ? 'connected' : 'disconnected',
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      return {
        status: 'error',
        kafka: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
