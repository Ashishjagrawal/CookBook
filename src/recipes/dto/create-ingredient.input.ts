import { InputType, Field, Int, Float } from '@nestjs/graphql';
import { IsString, IsOptional, IsInt, IsNumber, Min } from 'class-validator';

@InputType()
export class CreateIngredientInput {
  @Field()
  @IsString()
  name: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  unit?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  order: number;
}
