import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Recipe } from '../../recipes/entities/recipe.entity';
import { Rating } from '../../recipes/entities/rating.entity';
import { Comment } from '../../recipes/entities/comment.entity';

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  username: string;

  @Field({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field({ nullable: true })
  bio?: string;

  @Field({ nullable: true })
  avatar?: string;

  @Field()
  isActive: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Relations
  @Field(() => [Recipe], { nullable: true })
  recipes?: Recipe[];

  @Field(() => [Rating], { nullable: true })
  ratings?: Rating[];

  @Field(() => [Comment], { nullable: true })
  comments?: Comment[];

  @Field(() => Int)
  followersCount?: number;

  @Field(() => Int)
  followingCount?: number;

  @Field(() => Int)
  recipesCount?: number;
}
