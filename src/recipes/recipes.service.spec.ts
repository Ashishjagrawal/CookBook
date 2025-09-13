import { Test, TestingModule } from '@nestjs/testing';
import { RecipesService } from './recipes.service';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';
import { Difficulty } from './enums/difficulty.enum';

describe('RecipesService', () => {
  let service: RecipesService;
  let prismaService: PrismaService;
  let searchService: SearchService;

  const mockPrismaService = {
    recipe: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    rating: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    comment: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockSearchService = {
    indexRecipe: jest.fn(),
    removeRecipe: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
      ],
    }).compile();

    service = module.get<RecipesService>(RecipesService);
    prismaService = module.get<PrismaService>(PrismaService);
    searchService = module.get<SearchService>(SearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a recipe successfully', async () => {
      const createRecipeInput = {
        title: 'Test Recipe',
        description: 'A test recipe',
        prepTime: 15,
        cookTime: 30,
        servings: 4,
        difficulty: Difficulty.EASY,
        cuisine: 'Italian',
        authorId: 'user1',
        tags: ['test', 'pasta'],
        isPublic: true,
        ingredients: [
          { name: 'pasta', amount: 500, unit: 'g', order: 1 },
        ],
        instructions: [
          { step: 'Boil water', order: 1 },
        ],
      };

      const expectedRecipe = {
        id: 'recipe1',
        ...createRecipeInput,
        averageRating: null,
        commentsCount: 0,
        ratingsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.recipe.create.mockResolvedValue(expectedRecipe);
      mockSearchService.indexRecipe.mockResolvedValue(undefined);

      const result = await service.create(createRecipeInput, 'user1');

      expect(result).toEqual(expectedRecipe);
      expect(mockPrismaService.recipe.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: createRecipeInput.title,
          description: createRecipeInput.description,
        }),
        include: expect.any(Object),
      });
      expect(mockSearchService.indexRecipe).toHaveBeenCalledWith(expectedRecipe);
    });

    it('should handle recipe creation errors', async () => {
      const createRecipeInput = {
        title: 'Test Recipe',
        description: 'A test recipe',
        prepTime: 15,
        cookTime: 30,
        servings: 4,
        difficulty: Difficulty.EASY,
        cuisine: 'Italian',
        authorId: 'user1',
        tags: ['test'],
        isPublic: true,
        ingredients: [],
        instructions: [],
      };

      mockPrismaService.recipe.create.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createRecipeInput, 'user1')).rejects.toThrow('Database error');
    });
  });

  describe('findAll', () => {
    it('should return all recipes with pagination', async () => {
      const mockRecipes = [
        {
          id: 'recipe1',
          title: 'Recipe 1',
          description: 'Description 1',
          author: { username: 'user1' },
          _count: { ratings: 5, comments: 3 },
          averageRating: null,
          commentsCount: 3,
          ratingsCount: 5,
        },
        {
          id: 'recipe2',
          title: 'Recipe 2',
          description: 'Description 2',
          author: { username: 'user2' },
          _count: { ratings: 3, comments: 1 },
          averageRating: null,
          commentsCount: 1,
          ratingsCount: 3,
        },
      ];

      mockPrismaService.recipe.findMany.mockResolvedValue(mockRecipes);

      const result = await service.findAll(0, 10);

      expect(result).toEqual(mockRecipes);
      expect(mockPrismaService.recipe.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: { isPublic: true },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle empty results', async () => {
      mockPrismaService.recipe.findMany.mockResolvedValue([]);

      const result = await service.findAll(0, 10);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a recipe by id', async () => {
      const mockRecipe = {
        id: 'recipe1',
        title: 'Test Recipe',
        description: 'A test recipe',
        author: { username: 'user1' },
        _count: { ratings: 5, comments: 3 },
        averageRating: null,
        commentsCount: 3,
        ratingsCount: 5,
      };

      mockPrismaService.recipe.findUnique.mockResolvedValue(mockRecipe);

      const result = await service.findOne('recipe1');

      expect(result).toEqual(mockRecipe);
      expect(mockPrismaService.recipe.findUnique).toHaveBeenCalledWith({
        where: { id: 'recipe1' },
        include: expect.any(Object),
      });
    });

    it('should return null for non-existent recipe', async () => {
      mockPrismaService.recipe.findUnique.mockResolvedValue(null);

      const result = await service.findOne('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getTopRatedRecipes', () => {
    it('should return top rated recipes', async () => {
      const mockRecipes = [
        {
          id: 'recipe1',
          title: 'Top Recipe',
          averageRating: null,
          commentsCount: 0,
          ratingsCount: 0,
        },
      ];

      mockPrismaService.recipe.findMany.mockResolvedValue(mockRecipes);

      const result = await service.getTopRatedRecipes(0, 10);

      expect(result).toEqual(mockRecipes);
      expect(mockPrismaService.recipe.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: { isPublic: true },
        include: expect.any(Object),
        orderBy: [
          { ratings: { _count: 'desc' } },
          { createdAt: 'desc' },
        ],
      });
    });
  });

  describe('rateRecipe', () => {
    it('should create a rating successfully', async () => {
      const ratingInput = {
        rating: 5,
        review: 'Excellent recipe!',
      };

      const mockRecipe = {
        id: 'recipe1',
        title: 'Test Recipe',
      };

      const expectedRating = {
        id: 'rating1',
        recipeId: 'recipe1',
        userId: 'user1',
        ...ratingInput,
        createdAt: new Date(),
      };

      mockPrismaService.recipe.findUnique.mockResolvedValue(mockRecipe);
      mockPrismaService.rating.findUnique.mockResolvedValue(null);
      mockPrismaService.rating.create.mockResolvedValue(expectedRating);

      const result = await service.rateRecipe('recipe1', 'user1', ratingInput);

      expect(result).toEqual(expectedRating);
      expect(mockPrismaService.rating.create).toHaveBeenCalledWith({
        data: {
          recipeId: 'recipe1',
          userId: 'user1',
          ...ratingInput,
        },
        include: expect.any(Object),
      });
    });

    it('should handle duplicate rating error', async () => {
      const ratingInput = {
        rating: 5,
        review: 'Excellent recipe!',
      };

      const mockRecipe = {
        id: 'recipe1',
        title: 'Test Recipe',
      };

      mockPrismaService.recipe.findUnique.mockResolvedValue(mockRecipe);
      mockPrismaService.rating.findUnique.mockResolvedValue(null);
      mockPrismaService.rating.create.mockRejectedValue(
        new Error('Unique constraint failed')
      );

      await expect(
        service.rateRecipe('recipe1', 'user1', ratingInput)
      ).rejects.toThrow('Unique constraint failed');
    });
  });

  describe('addComment', () => {
    it('should create a comment successfully', async () => {
      const commentInput = {
        content: 'Great recipe!',
      };

      const mockRecipe = {
        id: 'recipe1',
        title: 'Test Recipe',
      };

      const expectedComment = {
        id: 'comment1',
        recipeId: 'recipe1',
        userId: 'user1',
        ...commentInput,
        createdAt: new Date(),
      };

      mockPrismaService.recipe.findUnique.mockResolvedValue(mockRecipe);
      mockPrismaService.comment.create.mockResolvedValue(expectedComment);

      const result = await service.addComment('recipe1', 'user1', commentInput);

      expect(result).toEqual(expectedComment);
      expect(mockPrismaService.comment.create).toHaveBeenCalledWith({
        data: {
          recipeId: 'recipe1',
          userId: 'user1',
          ...commentInput,
        },
        include: expect.any(Object),
      });
    });
  });
});
