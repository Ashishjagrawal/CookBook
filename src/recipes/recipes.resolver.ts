import { Resolver, Query, Mutation, Args, Int, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { Recipe, Rating, Comment } from './entities';
import { CreateRecipeInput, UpdateRecipeInput, RateRecipeInput, CreateCommentInput } from './dto';
import { Difficulty } from './enums/difficulty.enum';
import { GraphQLJwtGuard } from '../auth/graphql-jwt.guard';

@Resolver(() => Recipe)
export class RecipesResolver {
  constructor(private readonly recipesService: RecipesService) {}

  @Query(() => [Recipe])
  async recipes(
    @Args('skip', { type: () => Int, defaultValue: 0 }) skip: number,
    @Args('take', { type: () => Int, defaultValue: 10 }) take: number,
    @Args('search', { nullable: true }) search?: string,
    @Args('difficulty', { type: () => Difficulty, nullable: true }) difficulty?: Difficulty,
    @Args('cuisine', { nullable: true }) cuisine?: string,
    @Args('tags', { type: () => [String], nullable: true }) tags?: string[],
  ): Promise<Recipe[]> {
    return this.recipesService.findAll(skip, take, search, difficulty, cuisine, tags);
  }

  @Query(() => Recipe, { nullable: true })
  async recipe(@Args('id') id: string): Promise<Recipe | null> {
    return this.recipesService.findOne(id);
  }

  @Query(() => [Recipe])
  async recipesByUser(
    @Args('userId') userId: string,
    @Args('skip', { type: () => Int, defaultValue: 0 }) skip: number,
    @Args('take', { type: () => Int, defaultValue: 10 }) take: number,
  ): Promise<Recipe[]> {
    return this.recipesService.getRecipesByUser(userId, skip, take);
  }

  @Query(() => [Recipe])
  async topRatedRecipes(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('skip', { type: () => Int, defaultValue: 0 }) skip: number,
  ): Promise<Recipe[]> {
    return this.recipesService.getTopRatedRecipes(skip, limit);
  }

  @Query(() => [Recipe])
  async recipesByIngredients(
    @Args('ingredients', { type: () => [String] }) ingredients: string[],
    @Args('skip', { type: () => Int, defaultValue: 0 }) skip: number,
    @Args('take', { type: () => Int, defaultValue: 10 }) take: number,
  ): Promise<Recipe[]> {
    return this.recipesService.getRecipesByIngredients(ingredients, skip, take);
  }

  @Mutation(() => Recipe)
  @UseGuards(GraphQLJwtGuard)
  async createRecipe(
    @Args('input') input: CreateRecipeInput,
    @Context() context:any,
  ): Promise<Recipe> {
    return this.recipesService.create(input, context.req.user.id);
  }

  @Mutation(() => Recipe)
  @UseGuards(GraphQLJwtGuard)
  async updateRecipe(
    @Args('id') id: string,
    @Args('input') input: UpdateRecipeInput,
    @Context() context:any,
  ): Promise<Recipe> {
    return this.recipesService.update(id, input, context.req.user.id);
  }

  @Mutation(() => Boolean)
  @UseGuards(GraphQLJwtGuard)
  async deleteRecipe(
    @Args('id') id: string,
    @Context() context:any,
  ): Promise<boolean> {
    return this.recipesService.remove(id, context.req.user.id);
  }

  @Mutation(() => Rating)
  @UseGuards(GraphQLJwtGuard)
  async rateRecipe(
    @Args('recipeId') recipeId: string,
    @Args('input') input: RateRecipeInput,
    @Context() context:any,
  ): Promise<Rating> {
    return this.recipesService.rateRecipe(recipeId, context.req.user.id, input);
  }

  @Mutation(() => Comment)
  @UseGuards(GraphQLJwtGuard)
  async addComment(
    @Args('recipeId') recipeId: string,
    @Args('input') input: CreateCommentInput,
    @Context() context:any,
  ): Promise<Comment> {
    return this.recipesService.addComment(recipeId, context.req.user.id, input);
  }
}
