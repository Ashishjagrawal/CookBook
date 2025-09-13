import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';
import { Ingredient } from './ingredient.entity';
import { Instruction } from './instruction.entity';
import { Rating } from './rating.entity';
import { Comment } from './comment.entity';
import { Difficulty } from '../enums/difficulty.enum';

@ObjectType()
export class RecipeCount {
  @Field(() => Int)
  ratings: number;

  @Field(() => Int)
  comments: number;
}

@ObjectType()
export class Recipe {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  imageUrl?: string;

  @Field(() => Int, { nullable: true })
  prepTime?: number;

  @Field(() => Int, { nullable: true })
  cookTime?: number;

  @Field(() => Int, { nullable: true })
  servings?: number;

  @Field(() => Difficulty)
  difficulty: Difficulty;

  @Field({ nullable: true })
  cuisine?: string;

  @Field(() => [String])
  tags: string[];

  @Field()
  isPublic: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Relations
  @Field(() => User, { nullable: true })
  author?: User;

  @Field(() => [Ingredient], { nullable: true })
  ingredients?: Ingredient[];

  @Field(() => [Instruction], { nullable: true })
  instructions?: Instruction[];

  @Field(() => [Rating], { nullable: true })
  ratings?: Rating[];

  @Field(() => [Comment], { nullable: true })
  comments?: Comment[];

  // Computed fields
  @Field(() => Float, { nullable: true })
  averageRating?: number;

  @Field(() => Int)
  ratingsCount?: number;

  @Field(() => Int)
  commentsCount?: number;

  // Count object for GraphQL queries
  @Field(() => RecipeCount, { nullable: true })
  _count?: RecipeCount;
}
