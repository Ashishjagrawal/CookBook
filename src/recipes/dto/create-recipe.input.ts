import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsOptional, IsInt, IsArray, IsEnum, IsBoolean, Min, Max } from 'class-validator';
import { Difficulty } from '../enums/difficulty.enum';
import { CreateIngredientInput } from './create-ingredient.input';
import { CreateInstructionInput } from './create-instruction.input';

@InputType()
export class CreateRecipeInput {
  @Field()
  @IsString()
  title: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  prepTime?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  cookTime?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  servings?: number;

  @Field(() => Difficulty, { defaultValue: Difficulty.EASY })
  @IsEnum(Difficulty)
  difficulty: Difficulty;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  cuisine?: string;

  @Field(() => [String], { defaultValue: [] })
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @Field({ defaultValue: true })
  @IsBoolean()
  isPublic: boolean;

  @Field(() => [CreateIngredientInput], { defaultValue: [] })
  @IsArray()
  ingredients: CreateIngredientInput[];

  @Field(() => [CreateInstructionInput], { defaultValue: [] })
  @IsArray()
  instructions: CreateInstructionInput[];
}
