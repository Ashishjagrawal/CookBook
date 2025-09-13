import { Injectable, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { PrismaService } from '../prisma/prisma.service';
import { Recipe } from '../recipes/entities/recipe.entity';
import { PrismaClient } from '@prisma/client';

/**
 * SearchService handles all search-related functionality using Elasticsearch
 * 
 * Features:
 * - Full-text search across recipe titles, descriptions, and ingredients
 * - Ingredient-based recipe discovery
 * - Advanced filtering by difficulty, cuisine, tags, and time
 * - Performance-optimized queries for sub-100ms response times
 * - Fallback to database search if Elasticsearch is unavailable
 * 
 * @author Recipe Sharing Platform Team
 * @version 1.0.0
 */
@Injectable()
export class SearchService implements OnModuleInit {
  /** Elasticsearch index name for recipes */
  private readonly indexName = 'recipes';
  
  /** Prisma client instance for database fallback */
  private readonly prisma: PrismaClient;

  constructor(
    private readonly elasticsearch: ElasticsearchService,
    prismaService: PrismaService,
  ) {
    this.prisma = prismaService as PrismaClient;
  }

  /**
   * Initialize the search service on module startup
   * Creates Elasticsearch index and indexes all existing recipes
   */
  async onModuleInit() {
    try {
      await this.createIndex();
      await this.indexAllRecipes();
    } catch (error) {
      console.error('Search service initialization failed:', error);
      console.log('Continuing without search indexing...');
    }
  }

  /**
   * Create Elasticsearch index with optimized settings for recipe search
   * 
   * Index Configuration:
   * - Single shard for better performance on small datasets
   * - No replicas for development environment
   * - Custom analyzer for recipe text processing
   * - Optimized field mappings for search performance
   */
  private async createIndex() {
    try {
      const indexExists = await this.elasticsearch.indices.exists({
        index: this.indexName,
      });

      if (!indexExists) {
        await this.elasticsearch.indices.create({
          index: this.indexName,
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            refresh_interval: '1s', // Faster refresh for better search experience
            max_result_window: 10000,
            analysis: {
              analyzer: {
                recipe_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'stop', 'snowball']
                }
              }
            }
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              title: { 
                type: 'text', 
                analyzer: 'recipe_analyzer',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              description: { 
                type: 'text', 
                analyzer: 'recipe_analyzer',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              ingredients: { 
                type: 'text', 
                analyzer: 'recipe_analyzer',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              instructions: { 
                type: 'text', 
                analyzer: 'recipe_analyzer'
              },
              tags: { type: 'keyword' },
              difficulty: { type: 'keyword' },
              cuisine: { type: 'keyword' },
              prepTime: { type: 'integer' },
              cookTime: { type: 'integer' },
              servings: { type: 'integer' },
              authorId: { type: 'keyword' },
              isPublic: { type: 'boolean' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
            },
          },
        });
        console.log(`Elasticsearch index '${this.indexName}' created successfully`);
      }
    } catch (error) {
      console.error('Error creating Elasticsearch index:', error);
      throw error;
    }
  }

  async indexRecipe(recipe: any) {
    try {
      const recipeData = {
        id: recipe.id,
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients?.map((ing: any) => ing.name).join(' ') || '',
        instructions: recipe.instructions?.map((inst: any) => inst.step).join(' ') || '',
        tags: recipe.tags || [],
        difficulty: recipe.difficulty,
        cuisine: recipe.cuisine,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        authorId: recipe.authorId,
        isPublic: recipe.isPublic,
        createdAt: recipe.createdAt,
        updatedAt: recipe.updatedAt,
      };

      await this.elasticsearch.index({
        index: this.indexName,
        id: recipe.id,
        document: recipeData,
      });

      console.log(`Recipe ${recipe.id} indexed successfully`);
    } catch (error) {
      console.error(`Error indexing recipe ${recipe.id}:`, error);
      throw error;
    }
  }

  async indexAllRecipes() {
    try {
      // Check if database is connected
      await this.prisma.$queryRaw`SELECT 1`;
      
      const recipes = await this.prisma.recipe.findMany({
        include: {
          ingredients: true,
          instructions: true,
        },
      });

      const operations = recipes.flatMap((recipe) => [
        { index: { _index: this.indexName, _id: recipe.id } },
        {
          id: recipe.id,
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients?.map((ing) => ing.name).join(' ') || '',
          instructions: recipe.instructions?.map((inst) => inst.step).join(' ') || '',
          tags: recipe.tags || [],
          difficulty: recipe.difficulty,
          cuisine: recipe.cuisine,
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          servings: recipe.servings,
          authorId: recipe.authorId,
          isPublic: recipe.isPublic,
          createdAt: recipe.createdAt,
          updatedAt: recipe.updatedAt,
        },
      ]);

      if (operations.length > 0) {
        await this.elasticsearch.bulk({ operations });
        console.log(`Indexed ${recipes.length} recipes successfully`);
      }
    } catch (error) {
      if ((error as any).code === 'P1010' || (error as any).message?.includes('denied access')) {
        console.log('Database not accessible, skipping recipe indexing');
        return;
      }
      console.error('Error bulk indexing recipes:', error);
      throw error;
    }
  }

  /**
   * Search recipes using Elasticsearch with advanced filtering
   * 
   * @param query - Search text for titles, descriptions, and ingredients
   * @param filters - Advanced filtering options
   * @param skip - Number of results to skip (pagination)
   * @param take - Number of results to return (pagination)
   * @returns Promise containing recipes and total count
   * 
   * Performance: Optimized for sub-100ms response times
   * Fallback: Automatically falls back to database search if Elasticsearch fails
   */
  async searchRecipes(
    query: string,
    filters: {
      difficulty?: string;
      cuisine?: string;
      tags?: string[];
      ingredients?: string[];
      minRating?: number;
      maxPrepTime?: number;
      maxCookTime?: number;
    } = {},
    skip = 0,
    take = 10
  ): Promise<{ recipes: Recipe[]; total: number }> {
      // Track search analytics (async, don't wait) - disabled for performance
      // this.trackSearchQuery(query, filters).catch(console.error);
    
    try {
      const mustQueries: any[] = [];
      const shouldQueries: any[] = [];

      // Ultra-fast text search using simple multi-match
      if (query) {
        shouldQueries.push(
          {
            multi_match: {
              query: query,
              fields: ['title^3', 'description^2', 'ingredients^1.5'],
              type: 'best_fields',
              fuzziness: '1',
              operator: 'or'
            }
          }
        );
      }

      // Optimized filters
      if (filters.difficulty) {
        mustQueries.push({ term: { difficulty: filters.difficulty } });
      }

      if (filters.cuisine) {
        mustQueries.push({ term: { cuisine: filters.cuisine } });
      }

      if (filters.tags && filters.tags.length > 0) {
        mustQueries.push({ terms: { tags: filters.tags } });
      }

      if (filters.ingredients && filters.ingredients.length > 0) {
        mustQueries.push({
          bool: {
            should: filters.ingredients.map((ingredient) => ({
              term: { 
                'ingredients.keyword': {
                  value: ingredient.toLowerCase(),
                  boost: 1.0
                }
              },
            })),
            minimum_should_match: 1,
          },
        });
      }

      if (filters.maxPrepTime) {
        mustQueries.push({ range: { prepTime: { lte: filters.maxPrepTime } } });
      }

      if (filters.maxCookTime) {
        mustQueries.push({ range: { cookTime: { lte: filters.maxCookTime } } });
      }

      // Always filter for public recipes
      mustQueries.push({ term: { isPublic: true } });

      const searchBody: any = {
        query: {
          bool: {
            must: mustQueries,
            should: shouldQueries,
            minimum_should_match: query ? 1 : 0,
          },
        },
        from: skip,
        size: Math.min(take, 50), // Reasonable result limit
        sort: [{ _score: 'desc' }],
        // Performance optimizations
        _source: ['id', 'title', 'description', 'prepTime', 'cookTime', 'servings', 'difficulty', 'cuisine', 'tags', 'authorId', 'isPublic'],
        track_total_hits: true, // Enable total hits for proper pagination
        _source_excludes: ['instructions'], // Exclude heavy fields
        // Elasticsearch optimizations
        preference: '_local', // Use local shard
        terminate_after: 10000, // Reasonable limit
      };

      const response = await this.elasticsearch.search({
        index: this.indexName,
        ...searchBody,
      });

      const recipes = response.hits?.hits?.map((hit: any) => hit._source) || [];
      const total = typeof response.hits?.total === 'number' 
        ? response.hits.total 
        : response.hits?.total?.value || 0;

      // Log performance for monitoring
      if (response.took > 50) {
        console.log(`Elasticsearch search took ${response.took}ms`);
      }

      return { recipes, total };
    } catch (error) {
      console.error('Elasticsearch search error:', error);
      // Fallback to database search
      return this.searchRecipesInDatabase(query, filters, skip, take);
    }
  }

  private async searchRecipesInDatabase(
    query: string,
    filters: {
      difficulty?: string;
      cuisine?: string;
      tags?: string[];
      ingredients?: string[];
      minRating?: number;
      maxPrepTime?: number;
      maxCookTime?: number;
    } = {},
    skip = 0,
    take = 10
  ): Promise<{ recipes: Recipe[]; total: number }> {
    const where: any = {
      isPublic: true,
    };

    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (filters.difficulty) {
      where.difficulty = filters.difficulty;
    }

    if (filters.cuisine) {
      where.cuisine = { contains: filters.cuisine, mode: 'insensitive' };
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags,
      };
    }

    if (filters.ingredients && filters.ingredients.length > 0) {
      where.ingredients = {
        some: {
          name: {
            in: filters.ingredients,
            mode: 'insensitive',
          },
        },
      };
    }

    if (filters.maxPrepTime) {
      where.prepTime = { lte: filters.maxPrepTime };
    }

    if (filters.maxCookTime) {
      where.cookTime = { lte: filters.maxCookTime };
    }

    const [recipes, total] = await Promise.all([
      this.prisma.recipe.findMany({
        where,
        include: {
          author: true,
          ingredients: {
            orderBy: { order: 'asc' }
          },
          instructions: {
            orderBy: { order: 'asc' }
          },
          ratings: true,
          _count: {
            select: {
              ratings: true,
              comments: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.recipe.count({ where })
    ]);

    return {
      recipes: recipes.map(recipe => this.formatRecipe(recipe)),
      total
    };
  }

  async searchByIngredients(
    ingredients: string[],
    skip = 0,
    take = 10
  ): Promise<{ recipes: Recipe[]; total: number }> {
    try {
      const searchBody = {
        query: {
          bool: {
            must: [
              { term: { isPublic: true } },
              {
                bool: {
                  should: ingredients.map((ingredient) => ({
                    multi_match: {
                      query: ingredient,
                      fields: ['ingredients^2', 'title^1.5'],
                      type: 'best_fields',
                      fuzziness: 'AUTO'
                    }
                  })),
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
        from: skip,
        size: Math.min(take, 50), // Reasonable result limit
        sort: [{ _score: 'desc' }],
        // Performance optimizations
        _source: ['id', 'title', 'description', 'prepTime', 'cookTime', 'servings', 'difficulty', 'cuisine', 'tags', 'authorId', 'isPublic'],
        track_total_hits: true, // Enable total hits for proper pagination
        _source_excludes: ['instructions'], // Exclude heavy fields
        // Elasticsearch optimizations
        preference: '_local', // Use local shard
        terminate_after: 10000, // Reasonable limit
      };

      const response = await this.elasticsearch.search({
        index: this.indexName,
        ...searchBody,
      });

      const recipes = response.hits?.hits?.map((hit: any) => hit._source) || [];
      const total = typeof response.hits?.total === 'number' 
        ? response.hits.total 
        : response.hits?.total?.value || 0;

      return { recipes, total };
    } catch (error) {
      console.error('Elasticsearch search by ingredients error:', error);
      // Fallback to database search
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
            orderBy: { order: 'asc' }
          },
          instructions: {
            orderBy: { order: 'asc' }
          },
          ratings: true,
          _count: {
            select: {
              ratings: true,
              comments: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      });

      const total = await this.prisma.recipe.count({
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
      });

      return {
        recipes: recipes.map(recipe => this.formatRecipe(recipe)),
        total
      };
    }
  }

  async getSuggestions(query: string, field: 'ingredients' | 'cuisine' | 'tags'): Promise<string[]> {
    try {
      if (!query || query.length < 2) {
        return [];
      }

      // Get suggestions from database based on field type
      let suggestions: string[] = [];

      switch (field) {
        case 'ingredients':
          // Get unique ingredient names that match the query
          const ingredientResults = await this.prisma.ingredient.findMany({
            where: {
              name: {
                contains: query,
                mode: 'insensitive',
              },
            },
            select: {
              name: true,
            },
            distinct: ['name'],
            take: 10,
          });
          suggestions = ingredientResults.map(ing => ing.name);
          break;

        case 'cuisine':
          // Get unique cuisine values that match the query
          const cuisineResults = await this.prisma.recipe.findMany({
            where: {
              cuisine: {
                contains: query,
                mode: 'insensitive',
              },
            },
            select: {
              cuisine: true,
            },
            distinct: ['cuisine'],
            take: 10,
          });
          suggestions = cuisineResults
            .map(recipe => recipe.cuisine)
            .filter(cuisine => cuisine !== null) as string[];
          break;

        case 'tags':
          // Get unique tags that match the query
          const tagResults = await this.prisma.recipe.findMany({
            where: {
              tags: {
                hasSome: [query],
              },
            },
            select: {
              tags: true,
            },
            take: 20,
          });
          
          // Extract all tags and filter by query
          const allTags = tagResults.flatMap(recipe => recipe.tags);
          const uniqueTags = [...new Set(allTags)];
          suggestions = uniqueTags
            .filter(tag => tag.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 10);
          break;
      }

      return suggestions;
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  }

  async deleteRecipe(id: string) {
    try {
      await this.elasticsearch.delete({
        index: this.indexName,
        id: id,
      });
      console.log(`Recipe ${id} deleted from Elasticsearch index`);
    } catch (error) {
      console.error(`Error deleting recipe ${id} from Elasticsearch:`, error);
      throw error;
    }
  }

  private formatRecipe(recipe: any): Recipe {
    const averageRating = recipe.ratings?.length > 0
      ? recipe.ratings.reduce((sum: number, rating: any) => sum + rating.rating, 0) / recipe.ratings.length
      : null;

    return {
      ...recipe,
      averageRating,
      ratingsCount: recipe._count?.ratings || 0,
      commentsCount: recipe._count?.comments || 0
    };
  }

  private async trackSearchQuery(query: string, filters: any) {
    // Search analytics tracking disabled - table not in schema
    // TODO: Add searchAnalytics table to Prisma schema if needed
    console.log(`Search query: ${query}, filters:`, filters);
  }

  async getSearchAnalytics(limit = 100) {
    // Search analytics disabled - table not in schema
    // TODO: Add searchAnalytics table to Prisma schema if needed
    return [];
  }
}
