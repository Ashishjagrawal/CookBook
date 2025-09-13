import { InputType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

@InputType()
export class RateRecipeInput {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  review?: string;
}
