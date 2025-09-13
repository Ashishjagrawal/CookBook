import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';

@InputType()
export class CreateInstructionInput {
  @Field()
  @IsString()
  step: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  order: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
