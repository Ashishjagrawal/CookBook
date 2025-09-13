import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class ImproveRecipeInput {
  @Field()
  recipeId: string;
}

@InputType()
export class SuggestSubstitutionsInput {
  @Field(() => [String])
  ingredients: string[];
}

@InputType()
export class SuggestPairingsInput {
  @Field()
  recipeId: string;
}

@InputType()
export class GenerateRecipeInput {
  @Field(() => [String])
  ingredients: string[];

  @Field({ nullable: true })
  cuisine?: string;

  @Field({ nullable: true })
  difficulty?: string;

  @Field(() => [String], { nullable: true })
  dietaryRestrictions?: string[];
}
