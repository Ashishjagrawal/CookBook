import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { GraphQLJwtGuard } from '../auth/graphql-jwt.guard';
import { RecipesService } from '../recipes/recipes.service';
import { 
  ImproveRecipeResponse, 
  SuggestSubstitutionsResponse, 
  SuggestPairingsResponse, 
  GeneratedRecipe,
  TrendingRecipe,
  NutritionAnalysis
} from './dto/ai.response';

@Resolver()
export class AiResolver {
  constructor(
    private readonly aiService: AiService,
    private readonly recipesService: RecipesService,
  ) {}

  @Query(() => ImproveRecipeResponse)
  @UseGuards(GraphQLJwtGuard)
  async improveRecipe(@Args('recipeId') recipeId: string): Promise<ImproveRecipeResponse> {
    const recipe = await this.recipesService.findOne(recipeId);
    if (!recipe) {
      throw new Error('Recipe not found');
    }
    return this.aiService.improveRecipe(recipe);
  }

  @Query(() => SuggestSubstitutionsResponse)
  async suggestSubstitutions(@Args('ingredients', { type: () => [String] }) ingredients: string[]): Promise<SuggestSubstitutionsResponse> {
    return this.aiService.suggestSubstitutions(ingredients);
  }

  @Query(() => SuggestPairingsResponse)
  async suggestPairings(@Args('recipeId') recipeId: string): Promise<SuggestPairingsResponse> {
    const recipe = await this.recipesService.findOne(recipeId);
    if (!recipe) {
      throw new Error('Recipe not found');
    }
    return this.aiService.suggestPairings(recipe);
  }

  @Mutation(() => GeneratedRecipe)
  @UseGuards(GraphQLJwtGuard)
  async generateRecipeFromIngredients(
    @Args('ingredients', { type: () => [String] }) ingredients: string[],
    @Args('cuisine', { nullable: true }) cuisine?: string,
    @Args('difficulty', { nullable: true }) difficulty?: string,
    @Args('dietaryRestrictions', { type: () => [String], nullable: true }) dietaryRestrictions?: string[],
  ): Promise<GeneratedRecipe> {
    return this.aiService.generateRecipeFromIngredients(ingredients, {
      cuisine,
      difficulty,
      dietaryRestrictions,
    });
  }

  @Query(() => [TrendingRecipe])
  async getTrendingRecipes(@Args('limit', { type: () => Int, nullable: true }) limit?: number): Promise<TrendingRecipe[]> {
    return this.aiService.getTrendingRecipes(limit);
  }

  @Query(() => NutritionAnalysis)
  async analyzeNutrition(@Args('recipeId') recipeId: string): Promise<NutritionAnalysis> {
    const recipe = await this.recipesService.findOne(recipeId);
    if (!recipe) {
      throw new Error('Recipe not found');
    }
    return this.aiService.analyzeNutrition(recipe);
  }
}
