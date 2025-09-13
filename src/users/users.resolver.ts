import { Resolver, Query, Mutation, Args, Int, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UpdateUserInput } from './dto/update-user.input';
import { GraphQLJwtGuard } from '../auth/graphql-jwt.guard';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => [User])
  async users(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Query(() => User, { nullable: true })
  async user(@Args('id') id: string): Promise<User | null> {
    return this.usersService.findById(id);
  }

  @Query(() => User, { nullable: true })
  @UseGuards(GraphQLJwtGuard)
  async me(@Context() context: any): Promise<User | null> {
    return this.usersService.findById(context.req.user.id);
  }

  @Mutation(() => User)
  @UseGuards(GraphQLJwtGuard)
  async updateUser(
    @Args('id') id: string,
    @Args('input') input: UpdateUserInput,
    @Context() context:any,
  ): Promise<User> {
    // Users can only update their own profile
    if (context.req.user.id !== id) {
      throw new Error('Unauthorized');
    }
    return this.usersService.update(id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(GraphQLJwtGuard)
  async deleteUser(@Args('id') id: string, @Context() context:any): Promise<boolean> {
    // Users can only delete their own account
    if (context.req.user.id !== id) {
      throw new Error('Unauthorized');
    }
    return this.usersService.delete(id);
  }

  @Mutation(() => Boolean)
  @UseGuards(GraphQLJwtGuard)
  async followUser(
    @Args('userId') userId: string,
    @Context() context:any,
  ): Promise<boolean> {
    return this.usersService.followUser(context.req.user.id, userId);
  }

  @Mutation(() => Boolean)
  @UseGuards(GraphQLJwtGuard)
  async unfollowUser(
    @Args('userId') userId: string,
    @Context() context:any,
  ): Promise<boolean> {
    return this.usersService.unfollowUser(context.req.user.id, userId);
  }

  @Query(() => [User])
  async followers(
    @Args('userId') userId: string,
    @Args('skip', { type: () => Int, defaultValue: 0 }) skip: number,
    @Args('take', { type: () => Int, defaultValue: 10 }) take: number,
  ): Promise<User[]> {
    return this.usersService.getFollowers(userId, skip, take);
  }

  @Query(() => [User])
  async following(
    @Args('userId') userId: string,
    @Args('skip', { type: () => Int, defaultValue: 0 }) skip: number,
    @Args('take', { type: () => Int, defaultValue: 10 }) take: number,
  ): Promise<User[]> {
    return this.usersService.getFollowing(userId, skip, take);
  }
}
