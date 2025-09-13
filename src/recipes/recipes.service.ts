import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';
import { CreateRecipeInput, UpdateRecipeInput, RateRecipeInput, CreateCommentInput } from './dto';
import { Recipe, Rating, Comment } from './entities';
import { Difficulty } from './enums/difficulty.enum';

@Injectable()
export class RecipesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
  ) {}

  async create(input: CreateRecipeInput, authorId: string): Promise<Recipe> {
    const { ingredients, instructions, ...recipeData } = input;

    const recipe = await this.prisma.recipe.create({
      data: {
        ...recipeData,
        authorId,
        ingredients: {
          create: ingredients.map(ingredient => ({
            name: ingredient.name,
            amount: ingredient.amount,
            unit: ingredient.unit,
            notes: ingredient.notes,
            order: ingredient.order,
          })),
        },
        instructions: {
          create: instructions.map(instruction => ({
            step: instruction.step,
            order: instruction.order,
            imageUrl: instruction.imageUrl,
          })),
        },
      },
      include: {
        author: true,
        ingredients: {
          orderBy: { order: 'asc' },
        },
        instructions: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            ratings: true,
            comments: true,
          },
        },
      },
    });

    // Index the recipe in Elasticsearch
    try {
      await this.searchService.indexRecipe(this.formatRecipe(recipe));
    } catch (error) {
      console.error('Failed to index recipe in Elasticsearch:', error);
    }

    return this.formatRecipe(recipe);
  }

  async findAll(
    skip = 0,
    take = 10,
    search?: string,
    difficulty?: Difficulty,
    cuisine?: string,
    tags?: string[],
  ): Promise<Recipe[]> {
    const where: any = {
      isPublic: true,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }

    if (cuisine) {
      where.cuisine = { contains: cuisine, mode: 'insensitive' };
    }

    if (tags && tags.length > 0) {
      where.tags = {
        hasSome: tags,
      };
    }

    const recipes = await this.prisma.recipe.findMany({
      where,
      include: {
        author: true,
        ingredients: {
          orderBy: { order: 'asc' },
        },
        instructions: {
          orderBy: { order: 'asc' },
        },
        ratings: true,
        _count: {
          select: {
            ratings: true,
            comments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    return recipes.map(recipe => this.formatRecipe(recipe));
  }

  async findOne(id: string): Promise<Recipe | null> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: {
        author: true,
        ingredients: {
          orderBy: { order: 'asc' },
        },
        instructions: {
          orderBy: { order: 'asc' },
        },
        ratings: {
          include: {
            user: true,
          },
        },
        comments: {
          include: {
            user: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            ratings: true,
            comments: true,
          },
        },
      },
    });

    if (!recipe) {
      return null;
    }

    return this.formatRecipe(recipe);
  }

  async update(id: string, input: UpdateRecipeInput, userId: string): Promise<Recipe> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    if (recipe.authorId !== userId) {
      throw new ForbiddenException('You can only update your own recipes');
    }

    const { ingredients, instructions, ...recipeData } = input;

    const updatedRecipe = await this.prisma.recipe.update({
      where: { id },
      data: {
        ...recipeData,
        ...(ingredients && {
          ingredients: {
            deleteMany: {},
            create: ingredients.map(ingredient => ({
              name: ingredient.name,
              amount: ingredient.amount,
              unit: ingredient.unit,
              notes: ingredient.notes,
              order: ingredient.order,
            })),
          },
        }),
        ...(instructions && {
          instructions: {
            deleteMany: {},
            create: instructions.map(instruction => ({
              step: instruction.step,
              order: instruction.order,
              imageUrl: instruction.imageUrl,
            })),
          },
        }),
      },
      include: {
        author: true,
        ingredients: {
          orderBy: { order: 'asc' },
        },
        instructions: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            ratings: true,
            comments: true,
          },
        },
      },
    });

    return this.formatRecipe(updatedRecipe);
  }

  async remove(id: string, userId: string): Promise<boolean> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    if (recipe.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own recipes');
    }

    await this.prisma.recipe.delete({
      where: { id },
    });

    return true;
  }

  async rateRecipe(recipeId: string, userId: string, input: RateRecipeInput): Promise<Rating> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    // Check if user already rated this recipe
    const existingRating = await this.prisma.rating.findUnique({
      where: {
        userId_recipeId: {
          userId,
          recipeId,
        },
      },
    });

    if (existingRating) {
      // Update existing rating
      const rating = await this.prisma.rating.update({
        where: {
          userId_recipeId: {
            userId,
            recipeId,
          },
        },
        data: {
          rating: input.rating,
          review: input.review,
        },
        include: {
          user: true,
        },
      });

      return rating as Rating;
    } else {
      // Create new rating
      const rating = await this.prisma.rating.create({
        data: {
          userId,
          recipeId,
          rating: input.rating,
          review: input.review,
        },
        include: {
          user: true,
        },
      });

      return rating as Rating;
    }
  }

  async addComment(recipeId: string, userId: string, input: CreateCommentInput): Promise<Comment> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    const comment = await this.prisma.comment.create({
      data: {
        userId,
        recipeId,
        content: input.content,
      },
      include: {
        user: true,
      },
    });

    return comment as Comment;
  }

  async getRecipesByUser(userId: string, skip = 0, take = 10): Promise<Recipe[]> {
    const recipes = await this.prisma.recipe.findMany({
      where: { authorId: userId },
      include: {
        author: true,
        ingredients: {
          orderBy: { order: 'asc' },
        },
        instructions: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            ratings: true,
            comments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    return recipes.map(recipe => this.formatRecipe(recipe));
  }

  async getTopRatedRecipes(skip = 0, take = 10): Promise<Recipe[]> {
    const recipes = await this.prisma.recipe.findMany({
      where: { isPublic: true },
      include: {
        author: true,
        ingredients: {
          orderBy: { order: 'asc' },
        },
        instructions: {
          orderBy: { order: 'asc' },
        },
        ratings: true,
        _count: {
          select: {
            ratings: true,
            comments: true,
          },
        },
      },
      orderBy: [
        {
          ratings: {
            _count: 'desc',
          },
        },
        { createdAt: 'desc' },
      ],
      skip,
      take,
    });

    return recipes.map(recipe => this.formatRecipe(recipe));
  }

  async getRecipesByIngredients(ingredients: string[], skip = 0, take = 10): Promise<Recipe[]> {
    const recipes = await this.prisma.recipe.findMany({
      where: {
        isPublic: true,
        ingredients: {
          some: {
            name: {
              in: ingredients,
              mode: 'insensitive',
            },
          },
        },
      },
      include: {
        author: true,
        ingredients: {
          orderBy: { order: 'asc' },
        },
        instructions: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            ratings: true,
            comments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    return recipes.map(recipe => this.formatRecipe(recipe));
  }

  private formatRecipe(recipe: any): Recipe {
    const averageRating = recipe.ratings?.length > 0
      ? recipe.ratings.reduce((sum: number, rating: any) => sum + rating.rating, 0) / recipe.ratings.length
      : null;

    return {
      ...recipe,
      averageRating,
      ratingsCount: recipe._count?.ratings || 0,
      commentsCount: recipe._count?.comments || 0,
    };
  }
}
