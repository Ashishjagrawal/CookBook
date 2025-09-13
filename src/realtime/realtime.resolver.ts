import { Resolver, Subscription, Root, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphQLJwtGuard } from '../auth/graphql-jwt.guard';
import { RealtimeService } from './realtime.service';

@Resolver()
export class RealtimeResolver {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Subscription(() => String, {
    filter: (payload, variables) => {
      return payload.userId === variables.userId;
    },
  })
  @UseGuards(GraphQLJwtGuard)
  async notifications(@Args('userId') userId: string, @Root() notification: any) {
    return JSON.stringify(notification);
  }

  @Subscription(() => String)
  async recipeUpdates(@Args('recipeId') recipeId: string, @Root() update: any) {
    return JSON.stringify(update);
  }

  @Subscription(() => String, {
    filter: (payload, variables) => {
      return payload.userId === variables.userId;
    },
  })
  @UseGuards(GraphQLJwtGuard)
  async userFeed(@Args('userId') userId: string, @Root() activity: any) {
    return JSON.stringify(activity);
  }
}
