import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class Instruction {
  @Field(() => ID)
  id: string;

  @Field()
  step: string;

  @Field(() => Int)
  order: number;

  @Field({ nullable: true })
  imageUrl?: string;
}
