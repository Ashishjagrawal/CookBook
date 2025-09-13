import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'recipe-sharing-platform',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
    });
    
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'recipe-sharing-group' });
  }

  async onModuleInit() {
    try {
      // Check if Kafka is available
      await this.producer.connect();
      await this.consumer.connect();
      
      // Subscribe to topics
      await this.consumer.subscribe({ 
        topic: 'notifications', 
        fromBeginning: false 
      });
      await this.consumer.subscribe({ 
        topic: 'recipe-updates', 
        fromBeginning: false 
      });
      await this.consumer.subscribe({ 
        topic: 'user-feed', 
        fromBeginning: false 
      });

      // Start consuming messages
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
          const messageData = JSON.parse(message.value?.toString() || '{}');
          console.log(`Received message on topic ${topic}:`, messageData);
          
          // Here you would typically emit events to WebSocket clients
          // This will be handled by the RealtimeGateway
        },
      });

      console.log('Kafka service initialized successfully');
    } catch (error) {
      console.warn('Kafka service not available, falling back to event emitter only:', error instanceof Error ? error.message : 'Unknown error');
      // Don't throw error - allow app to continue without Kafka
    }
  }

  async onModuleDestroy() {
    try {
      await this.producer.disconnect();
      await this.consumer.disconnect();
      console.log('Kafka service disconnected');
    } catch (error) {
      console.error('Error disconnecting Kafka service:', error);
    }
  }

  // Publish notification
  async publishNotification(userId: string, notification: any) {
    try {
      await this.producer.send({
        topic: 'notifications',
        messages: [{
          key: userId,
          value: JSON.stringify({
            userId,
            notification,
            timestamp: new Date().toISOString(),
          }),
        }],
      });
      console.log(`Published notification for user ${userId}`);
    } catch (error) {
      console.warn('Kafka not available, notification not published:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Publish recipe update
  async publishRecipeUpdate(recipeId: string, update: any) {
    try {
      await this.producer.send({
        topic: 'recipe-updates',
        messages: [{
          key: recipeId,
          value: JSON.stringify({
            recipeId,
            update,
            timestamp: new Date().toISOString(),
          }),
        }],
      });
      console.log(`Published recipe update for recipe ${recipeId}`);
    } catch (error) {
      console.warn('Kafka not available, recipe update not published:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Publish user feed activity
  async publishUserFeed(userId: string, activity: any) {
    try {
      await this.producer.send({
        topic: 'user-feed',
        messages: [{
          key: userId,
          value: JSON.stringify({
            userId,
            activity,
            timestamp: new Date().toISOString(),
          }),
        }],
      });
      console.log(`Published user feed activity for user ${userId}`);
    } catch (error) {
      console.warn('Kafka not available, user feed activity not published:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Get consumer for real-time gateway
  getConsumer() {
    return this.consumer;
  }

  // Health check methods
  isProducerConnected(): boolean {
    try {
      return this.producer !== null && this.producer !== undefined;
    } catch {
      return false;
    }
  }

  isConsumerConnected(): boolean {
    try {
      return this.consumer !== null && this.consumer !== undefined;
    } catch {
      return false;
    }
  }

  async checkKafkaConnection(): Promise<boolean> {
    try {
      // Try to get cluster metadata to verify connection
      const admin = this.kafka.admin();
      await admin.connect();
      const metadata = await admin.describeCluster();
      await admin.disconnect();
      return metadata.brokers.length > 0;
    } catch {
      return false;
    }
  }
}
