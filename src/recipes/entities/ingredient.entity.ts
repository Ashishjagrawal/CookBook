import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class Ingredient {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => Float, { nullable: true })
  amount?: number;

  @Field({ nullable: true })
  unit?: string;

  @Field({ nullable: true })
  notes?: string;

  @Field(() => Int)
  order: number;
}
