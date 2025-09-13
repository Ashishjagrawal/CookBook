import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { KafkaService } from './kafka.service';

@Injectable()
export class RealtimeService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly kafkaService: KafkaService,
  ) {}

  async publishNotification(userId: string, notification: any) {
    await this.kafkaService.publishNotification(userId, notification);
  }

  async publishRecipeUpdate(recipeId: string, update: any) {
    await this.kafkaService.publishRecipeUpdate(recipeId, update);
  }

  async publishUserFeed(userId: string, activity: any) {
    await this.kafkaService.publishUserFeed(userId, activity);
  }

  async subscribeToNotifications(userId: string, callback: (notification: any) => void) {
    // Kafka consumer will handle this in the gateway
    // This method is kept for compatibility
    console.log(`Subscribing to notifications for user ${userId}`);
  }

  async subscribeToRecipe(recipeId: string, callback: (update: any) => void) {
    // Kafka consumer will handle this in the gateway
    // This method is kept for compatibility
    console.log(`Subscribing to recipe updates for recipe ${recipeId}`);
  }

  async subscribeToUserFeed(userId: string, callback: (activity: any) => void) {
    // Kafka consumer will handle this in the gateway
    // This method is kept for compatibility
    console.log(`Subscribing to user feed for user ${userId}`);
  }

  async emitRecipeCreated(recipe: any) {
    this.eventEmitter.emit('recipe.created', recipe);
  }

  async emitRecipeUpdated(recipe: any) {
    this.eventEmitter.emit('recipe.updated', recipe);
  }

  async emitRecipeRated(recipe: any, rating: any) {
    this.eventEmitter.emit('recipe.rated', { recipe, rating });
  }

  async emitRecipeCommented(recipe: any, comment: any) {
    this.eventEmitter.emit('recipe.commented', { recipe, comment });
  }

  async emitUserFollowed(follower: any, following: any) {
    this.eventEmitter.emit('user.followed', { follower, following });
  }
}
