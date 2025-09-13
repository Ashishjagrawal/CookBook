import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class ImprovementSuggestion {
  @Field()
  category: string;

  @Field()
  suggestion: string;

  @Field()
  reason: string;
}

@ObjectType()
export class ImproveRecipeResponse {
  @Field(() => [String])
  suggestions: string[];

  @Field(() => [ImprovementSuggestion])
  improvements: ImprovementSuggestion[];

  @Field(() => [String])
  tips: string[];
}

@ObjectType()
export class Substitution {
  @Field()
  ingredient: string;

  @Field()
  ratio: string;

  @Field()
  notes: string;
}

@ObjectType()
export class IngredientSubstitution {
  @Field()
  original: string;

  @Field(() => [Substitution])
  substitutes: Substitution[];
}

@ObjectType()
export class SuggestSubstitutionsResponse {
  @Field(() => [IngredientSubstitution])
  substitutions: IngredientSubstitution[];
}

@ObjectType()
export class WinePairing {
  @Field()
  wine: string;

  @Field()
  reason: string;
}

@ObjectType()
export class SideDish {
  @Field()
  dish: string;

  @Field()
  reason: string;
}

@ObjectType()
export class SuggestPairingsResponse {
  @Field(() => [WinePairing])
  winePairings: WinePairing[];

  @Field(() => [SideDish])
  sideDishes: SideDish[];
}

@ObjectType()
export class GeneratedRecipe {
  @Field()
  title: string;

  @Field()
  description: string;

  @Field(() => [String])
  instructions: string[];

  @Field(() => [String])
  additionalIngredients: string[];

  @Field(() => [String])
  tips: string[];
}

@ObjectType()
export class TrendingRecipe {
  @Field()
  title: string;

  @Field()
  description: string;

  @Field()
  trend: string;

  @Field()
  difficulty: string;

  @Field()
  prepTime: number;

  @Field()
  cookTime: number;
}

@ObjectType()
export class NutritionAnalysis {
  @Field()
  calories: number;

  @Field()
  protein: number;

  @Field()
  carbs: number;

  @Field()
  fat: number;

  @Field()
  healthScore: number;

  @Field(() => [String])
  recommendations: string[];
}
