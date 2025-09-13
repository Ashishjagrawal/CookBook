import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { SearchService } from './search.service';
import { Recipe } from '../recipes/entities/recipe.entity';

@Resolver(() => Recipe)
export class SearchResolver {
  constructor(private readonly searchService: SearchService) {}

  @Query(() => [Recipe])
  async searchRecipes(
    @Args('query', { nullable: true }) query?: string,
    @Args('difficulty', { nullable: true }) difficulty?: string,
    @Args('cuisine', { nullable: true }) cuisine?: string,
    @Args('tags', { type: () => [String], nullable: true }) tags?: string[],
    @Args('ingredients', { type: () => [String], nullable: true }) ingredients?: string[],
    @Args('minRating', { type: () => Int, nullable: true }) minRating?: number,
    @Args('maxPrepTime', { type: () => Int, nullable: true }) maxPrepTime?: number,
    @Args('maxCookTime', { type: () => Int, nullable: true }) maxCookTime?: number,
    @Args('skip', { type: () => Int, defaultValue: 0 }) skip: number = 0,
    @Args('take', { type: () => Int, defaultValue: 10 }) take: number = 10,
  ): Promise<Recipe[]> {
    const result = await this.searchService.searchRecipes(
      query || '',
      {
        difficulty,
        cuisine,
        tags,
        ingredients,
        minRating,
        maxPrepTime,
        maxCookTime,
      },
      skip,
      take,
    );
    return result.recipes;
  }

  @Query(() => [Recipe])
  async searchByIngredients(
    @Args('ingredients', { type: () => [String] }) ingredients: string[],
    @Args('skip', { type: () => Int, defaultValue: 0 }) skip: number = 0,
    @Args('take', { type: () => Int, defaultValue: 10 }) take: number = 10,
  ): Promise<Recipe[]> {
    const result = await this.searchService.searchByIngredients(ingredients, skip, take);
    return result.recipes;
  }

  @Query(() => [String])
  async getSuggestions(
    @Args('query') query: string,
    @Args('field') field: 'ingredients' | 'cuisine' | 'tags',
  ): Promise<string[]> {
    return this.searchService.getSuggestions(query, field);
  }
}
