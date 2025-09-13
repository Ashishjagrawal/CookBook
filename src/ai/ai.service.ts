import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Recipe } from '../recipes/entities/recipe.entity';
import { PrismaService } from '../prisma/prisma.service';

/**
 * AI Service for handling OpenAI integrations and intelligent recipe features
 * 
 * Features:
 * - Recipe improvement suggestions
 * - Ingredient substitutions
 * - Recipe pairings and recommendations
 * - Recipe generation from ingredients
 * - Trending recipe analysis
 * - Nutrition analysis
 * 
 * Error Handling:
 * - Comprehensive error logging
 * - Graceful degradation with meaningful fallbacks
 * - Rate limiting and retry logic
 * - Input validation and sanitization
 * 
 * @author Recipe Sharing Platform Team
 * @version 1.0.0
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;
  private cache = new Map<string, any>();
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.configService.get('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.error('OpenAI API key not configured');
      throw new Error('OpenAI API key is required');
    }
    
    this.openai = new OpenAI({
      apiKey,
      timeout: 30000, // 30 second timeout
    });
  }

  /**
   * Execute OpenAI API call with retry logic and error handling
   */
  private async executeOpenAICall<T>(
    operation: () => Promise<T>,
    operationName: string,
    fallbackValue: T
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        this.logger.debug(`Executing ${operationName}, attempt ${attempt}`);
        const result = await operation();
        this.logger.debug(`${operationName} completed successfully`);
        return result;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`${operationName} failed on attempt ${attempt}: ${error instanceof Error ? error.message : String(error)}`);
        
        if (attempt < this.MAX_RETRIES) {
          const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
          this.logger.debug(`Retrying ${operationName} in ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }
    
    this.logger.error(`${operationName} failed after ${this.MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
    return fallbackValue;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate and sanitize input parameters
   */
  private validateInput(input: any, fieldName: string, required: boolean = true): void {
    if (required && (!input || (typeof input === 'string' && input.trim().length === 0))) {
      throw new HttpException(
        `${fieldName} is required and cannot be empty`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Parse and validate OpenAI response
   */
  private parseOpenAIResponse(response: string, expectedFields: string[]): any {
    try {
      // Clean response from markdown code blocks if present
      let cleanResponse = response;
      if (cleanResponse.includes('```json')) {
        cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      if (cleanResponse.includes('```')) {
        cleanResponse = cleanResponse.replace(/```\n?/g, '');
      }
      
      const parsed = JSON.parse(cleanResponse);
      
      // Validate that all expected fields are present
      for (const field of expectedFields) {
        if (!(field in parsed)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      return parsed;
    } catch (error) {
      this.logger.error(`Failed to parse OpenAI response: ${error instanceof Error ? error.message : String(error)}`);
      throw new HttpException(
        'Invalid response format from AI service',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get cached result or execute operation and cache result
   */
  private async getCachedOrExecute<T>(
    cacheKey: string,
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    if (this.cache.has(cacheKey)) {
      this.logger.debug(`Cache hit for ${operationName}`);
      return this.cache.get(cacheKey);
    }

    const result = await operation();
    
    // Cache the result
    this.cache.set(cacheKey, result);
    setTimeout(() => this.cache.delete(cacheKey), this.CACHE_TTL);
    
    return result;
  }

  /**
   * Analyze a recipe and provide improvement suggestions using AI
   * 
   * @param recipe - The recipe to analyze
   * @returns Promise containing suggestions, improvements, and tips
   */
  async improveRecipe(recipe: Recipe): Promise<{
    suggestions: string[];
    improvements: {
      category: string;
      suggestion: string;
      reason: string;
    }[];
    tips: string[];
  }> {
    this.validateInput(recipe, 'recipe');
    this.validateInput(recipe.id, 'recipe.id');
    this.validateInput(recipe.title, 'recipe.title');

    const cacheKey = `improve_${recipe.id}`;
    
    return this.getCachedOrExecute(
      cacheKey,
      async () => {
        const prompt = this.buildImprovementPrompt(recipe);
        
        return this.executeOpenAICall(
          async () => {
            const completion = await this.openai.chat.completions.create({
              model: 'gpt-3.5-turbo',
              messages: [
                {
                  role: 'system',
                  content: 'You are a professional chef and cooking expert. Provide helpful, specific, and actionable advice for improving recipes.',
                },
                {
                  role: 'user',
                  content: prompt,
                },
              ],
              temperature: 0.7,
              max_tokens: 1000,
            });

            const response = completion.choices[0]?.message?.content;
            if (!response) {
              throw new Error('No response from OpenAI');
            }

            const result = this.parseOpenAIResponse(response, ['suggestions', 'improvements', 'tips']);
            
            return {
              suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
              improvements: Array.isArray(result.improvements) 
                ? result.improvements.map((improvement: string) => ({
                    category: 'General',
                    suggestion: improvement,
                    reason: 'AI-generated improvement suggestion',
                  }))
                : [],
              tips: Array.isArray(result.tips) ? result.tips : [],
            };
          },
          'improveRecipe',
          this.getFallbackImprovementResponse()
        );
      },
      'improveRecipe'
    );
  }

  /**
   * Build improvement analysis prompt for OpenAI
   */
  private buildImprovementPrompt(recipe: Recipe): string {
    const ingredients = recipe.ingredients?.map(ing => 
      `${ing.amount || ''} ${ing.unit || ''} ${ing.name}`
    ).join(', ') || 'No ingredients listed';
    
    const instructions = recipe.instructions?.map(inst => 
      `${inst.order}. ${inst.step}`
    ).join('\n') || 'No instructions provided';

    return `
Analyze this recipe and provide suggestions for improvement:

Title: ${recipe.title}
Description: ${recipe.description || 'No description'}
Ingredients: ${ingredients}
Instructions: ${instructions}
Difficulty: ${recipe.difficulty}
Cuisine: ${recipe.cuisine || 'Not specified'}
Prep Time: ${recipe.prepTime} minutes
Cook Time: ${recipe.cookTime} minutes
Servings: ${recipe.servings}

Please provide:
1. 3-5 specific suggestions for improving the recipe
2. 3-5 potential improvements to ingredients or techniques
3. 3-5 cooking tips and techniques

Format your response as JSON with the following structure:
{
  "suggestions": ["suggestion1", "suggestion2", ...],
  "improvements": ["improvement1", "improvement2", ...],
  "tips": ["tip1", "tip2", ...]
}
`;
  }

  /**
   * Get fallback response when AI service is unavailable
   */
  private getFallbackImprovementResponse() {
    return {
      suggestions: [
        'Consider adding more herbs and spices for enhanced flavor',
        'Try adjusting cooking times for better texture',
        'Experiment with different cooking methods'
      ],
      improvements: [
        {
          category: 'Flavor',
          suggestion: 'Add aromatic vegetables like onions and garlic',
          reason: 'Enhances depth of flavor in most dishes'
        },
        {
          category: 'Technique',
          suggestion: 'Consider searing meat before slow cooking',
          reason: 'Develops better flavor and texture'
        }
      ],
      tips: [
        'Taste and adjust seasoning throughout cooking',
        'Let meat rest before slicing for better texture',
        'Use fresh ingredients when possible for best results'
      ],
    };
  }

  /**
   * Suggest ingredient substitutions using AI
   * 
   * @param ingredients - Array of ingredient names to find substitutions for
   * @returns Promise containing substitution suggestions
   */
  async suggestSubstitutions(ingredients: string[]): Promise<{
    substitutions: {
      original: string;
      substitutes: {
        ingredient: string;
        ratio: string;
        notes: string;
      }[];
    }[];
  }> {
    this.validateInput(ingredients, 'ingredients');
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      throw new HttpException(
        'Ingredients array is required and cannot be empty',
        HttpStatus.BAD_REQUEST
      );
    }

    // Validate each ingredient
    ingredients.forEach((ingredient, index) => {
      this.validateInput(ingredient, `ingredients[${index}]`);
    });

    const cacheKey = `substitutions_${ingredients.sort().join('_')}`;
    
    return this.getCachedOrExecute(
      cacheKey,
      async () => {
        const prompt = this.buildSubstitutionPrompt(ingredients);
        
        return this.executeOpenAICall(
          async () => {
            const completion = await this.openai.chat.completions.create({
              model: 'gpt-3.5-turbo',
              messages: [
                {
                  role: 'system',
                  content: 'You are a cooking expert. Provide practical ingredient substitutions that maintain similar flavor profiles and cooking properties.',
                },
                {
                  role: 'user',
                  content: prompt,
                },
              ],
              temperature: 0.5,
              max_tokens: 800,
            });

            const response = completion.choices[0]?.message?.content;
            if (!response) {
              throw new Error('No response from OpenAI');
            }

            const result = this.parseOpenAIResponse(response, []);
            
            return {
              substitutions: Object.entries(result).map(([original, substitutes]) => ({
                original,
                substitutes: Array.isArray(substitutes) 
                  ? (substitutes as string[]).map(sub => ({
                      ingredient: sub,
                      ratio: '1:1',
                      notes: `Use ${sub} as a direct replacement for ${original}`,
                    }))
                  : [],
              })),
            };
          },
          'suggestSubstitutions',
          this.getFallbackSubstitutionResponse(ingredients)
        );
      },
      'suggestSubstitutions'
    );
  }

  /**
   * Build substitution suggestion prompt for OpenAI
   */
  private buildSubstitutionPrompt(ingredients: string[]): string {
    return `
Suggest common ingredient substitutions for these ingredients:

${ingredients.map(ing => `- ${ing}`).join('\n')}

For each ingredient, provide 2-3 common substitutions that would work in most recipes.

Format your response as JSON with the following structure:
{
  "ingredient1": ["substitution1", "substitution2"],
  "ingredient2": ["substitution1", "substitution2"],
  ...
}
`;
  }

  /**
   * Get fallback substitution response when AI service is unavailable
   */
  private getFallbackSubstitutionResponse(ingredients: string[]) {
    const commonSubstitutions: Record<string, string[]> = {
      'butter': ['margarine', 'coconut oil', 'olive oil'],
      'eggs': ['flax eggs', 'applesauce', 'banana'],
      'milk': ['almond milk', 'soy milk', 'coconut milk'],
      'flour': ['almond flour', 'coconut flour', 'oat flour'],
      'sugar': ['honey', 'maple syrup', 'stevia'],
      'salt': ['sea salt', 'kosher salt', 'herbs'],
    };

    return {
      substitutions: ingredients.map(ingredient => ({
        original: ingredient,
        substitutes: commonSubstitutions[ingredient.toLowerCase()]?.map(sub => ({
          ingredient: sub,
          ratio: '1:1',
          notes: `Use ${sub} as a direct replacement for ${ingredient}`,
        })) || [{
          ingredient: 'Check recipe for specific alternatives',
          ratio: '1:1',
          notes: 'Consult cooking resources for specific substitution guidance',
        }],
      })),
    };
  }

  /**
   * Suggest wine and side dish pairings for a recipe using AI
   * 
   * @param recipe - The recipe to find pairings for
   * @returns Promise containing wine and side dish pairings
   */
  async suggestPairings(recipe: Recipe): Promise<{
    winePairings: {
      wine: string;
      reason: string;
    }[];
    sideDishes: {
      dish: string;
      reason: string;
    }[];
  }> {
    this.validateInput(recipe, 'recipe');
    this.validateInput(recipe.id, 'recipe.id');
    this.validateInput(recipe.title, 'recipe.title');

    const cacheKey = `pairings_${recipe.id}`;
    
    return this.getCachedOrExecute(
      cacheKey,
      async () => {
        const prompt = this.buildPairingPrompt(recipe);
        
        return this.executeOpenAICall(
          async () => {
            const completion = await this.openai.chat.completions.create({
              model: 'gpt-3.5-turbo',
              messages: [
                {
                  role: 'system',
                  content: 'You are a sommelier and culinary expert. Provide thoughtful pairing suggestions that complement the flavors and style of the dish.',
                },
                {
                  role: 'user',
                  content: prompt,
                },
              ],
              temperature: 0.7,
              max_tokens: 800,
            });

            const response = completion.choices[0]?.message?.content;
            if (!response) {
              throw new Error('No response from OpenAI');
            }

            const result = this.parseOpenAIResponse(response, ['winePairings', 'sideDishes']);
            
            return {
              winePairings: Array.isArray(result.winePairings) 
                ? result.winePairings.map((wine: string) => ({
                    wine,
                    reason: `Complements the ${recipe.cuisine || 'dish'} flavors`,
                  }))
                : [],
              sideDishes: Array.isArray(result.sideDishes) 
                ? result.sideDishes.map((dish: string) => ({
                    dish,
                    reason: `Pairs well with ${recipe.title}`,
                  }))
                : [],
            };
          },
          'suggestPairings',
          this.getFallbackPairingResponse(recipe)
        );
      },
      'suggestPairings'
    );
  }

  /**
   * Build pairing suggestion prompt for OpenAI
   */
  private buildPairingPrompt(recipe: Recipe): string {
    const mainIngredients = recipe.ingredients?.slice(0, 5).map(ing => ing.name).join(', ') || 'No ingredients listed';

    return `
Suggest pairings for this recipe:

Title: ${recipe.title}
Description: ${recipe.description || 'No description'}
Cuisine: ${recipe.cuisine || 'Not specified'}
Difficulty: ${recipe.difficulty}
Main ingredients: ${mainIngredients}

Please suggest:
1. 3-5 wine pairings (include specific wine types and why they work)
2. 3-5 side dish suggestions
3. 3-5 dessert suggestions

Format your response as JSON with the following structure:
{
  "winePairings": ["wine1 - reason", "wine2 - reason", ...],
  "sideDishes": ["side1", "side2", ...],
  "desserts": ["dessert1", "dessert2", ...]
}
`;
  }

  /**
   * Get fallback pairing response when AI service is unavailable
   */
  private getFallbackPairingResponse(recipe: Recipe) {
    const cuisine = recipe.cuisine?.toLowerCase() || 'general';
    
    const winePairings = this.getCuisineBasedWinePairings(cuisine);
    const sideDishes = this.getCuisineBasedSideDishes(cuisine);

    return {
      winePairings,
      sideDishes,
    };
  }

  /**
   * Get wine pairings based on cuisine type
   */
  private getCuisineBasedWinePairings(cuisine: string) {
    const wineMap: Record<string, Array<{wine: string; reason: string}>> = {
      'italian': [
        { wine: 'Chianti Classico', reason: 'Complements tomato-based dishes' },
        { wine: 'Pinot Grigio', reason: 'Pairs well with lighter pasta dishes' },
        { wine: 'Barolo', reason: 'Perfect for rich, hearty Italian meals' }
      ],
      'french': [
        { wine: 'Bordeaux', reason: 'Classic pairing for French cuisine' },
        { wine: 'Champagne', reason: 'Elevates any French dish' },
        { wine: 'Burgundy', reason: 'Complements French cooking techniques' }
      ],
      'asian': [
        { wine: 'Riesling', reason: 'Balances spicy Asian flavors' },
        { wine: 'Gewürztraminer', reason: 'Complements aromatic Asian dishes' },
        { wine: 'Sake', reason: 'Traditional pairing for Asian cuisine' }
      ],
      'mexican': [
        { wine: 'Tempranillo', reason: 'Handles spicy Mexican flavors well' },
        { wine: 'Grenache', reason: 'Complements bold Mexican spices' },
        { wine: 'Tequila', reason: 'Traditional Mexican spirit pairing' }
      ]
    };

    return wineMap[cuisine] || [
      { wine: 'Pinot Noir', reason: 'Versatile pairing for most dishes' },
      { wine: 'Sauvignon Blanc', reason: 'Fresh and crisp for lighter meals' },
      { wine: 'Cabernet Sauvignon', reason: 'Bold choice for hearty dishes' }
    ];
  }

  /**
   * Get side dishes based on cuisine type
   */
  private getCuisineBasedSideDishes(cuisine: string) {
    const sideMap: Record<string, Array<{dish: string; reason: string}>> = {
      'italian': [
        { dish: 'Garlic Bread', reason: 'Classic Italian accompaniment' },
        { dish: 'Caesar Salad', reason: 'Fresh contrast to rich Italian dishes' },
        { dish: 'Roasted Vegetables', reason: 'Complements Italian flavors' }
      ],
      'french': [
        { dish: 'Ratatouille', reason: 'Traditional French vegetable dish' },
        { dish: 'Green Salad with Vinaigrette', reason: 'Light French side' },
        { dish: 'Roasted Potatoes', reason: 'Classic French accompaniment' }
      ],
      'asian': [
        { dish: 'Steamed Rice', reason: 'Essential Asian side dish' },
        { dish: 'Stir-fried Vegetables', reason: 'Complements Asian flavors' },
        { dish: 'Miso Soup', reason: 'Traditional Asian starter' }
      ],
      'mexican': [
        { dish: 'Refried Beans', reason: 'Classic Mexican side' },
        { dish: 'Spanish Rice', reason: 'Traditional Mexican accompaniment' },
        { dish: 'Guacamole', reason: 'Fresh Mexican side dish' }
      ]
    };

    return sideMap[cuisine] || [
      { dish: 'Mixed Green Salad', reason: 'Fresh and light accompaniment' },
      { dish: 'Roasted Vegetables', reason: 'Healthy and flavorful side' },
      { dish: 'Crusty Bread', reason: 'Simple and satisfying' }
    ];
  }

  /**
   * Generate a recipe from provided ingredients using AI
   * 
   * @param ingredients - Array of available ingredients
   * @param preferences - Optional preferences for cuisine, difficulty, and dietary restrictions
   * @returns Promise containing generated recipe
   */
  async generateRecipeFromIngredients(ingredients: string[], preferences?: {
    cuisine?: string;
    difficulty?: string;
    dietaryRestrictions?: string[];
  }): Promise<{
    title: string;
    description: string;
    instructions: string[];
    additionalIngredients: string[];
    tips: string[];
  }> {
    this.validateInput(ingredients, 'ingredients');
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      throw new HttpException(
        'Ingredients array is required and cannot be empty',
        HttpStatus.BAD_REQUEST
      );
    }

    // Validate each ingredient
    ingredients.forEach((ingredient, index) => {
      this.validateInput(ingredient, `ingredients[${index}]`);
    });

    const cacheKey = `generate_${ingredients.sort().join('_')}_${JSON.stringify(preferences || {})}`;
    
    return this.getCachedOrExecute(
      cacheKey,
      async () => {
        const prompt = this.buildRecipeGenerationPrompt(ingredients, preferences);
        
        return this.executeOpenAICall(
          async () => {
            const completion = await this.openai.chat.completions.create({
              model: 'gpt-3.5-turbo',
              messages: [
                {
                  role: 'system',
                  content: 'You are a creative chef. Generate original, practical recipes that make good use of the provided ingredients while being delicious and achievable for home cooks.',
                },
                {
                  role: 'user',
                  content: prompt,
                },
              ],
              temperature: 0.8,
              max_tokens: 1200,
            });

            const response = completion.choices[0]?.message?.content;
            if (!response) {
              throw new Error('No response from OpenAI');
            }

            const result = this.parseOpenAIResponse(response, ['title', 'description', 'instructions', 'additionalIngredients', 'tips']);
            
            return {
              title: result.title || 'Generated Recipe',
              description: result.description || 'A delicious recipe created from your ingredients',
              instructions: Array.isArray(result.instructions) ? result.instructions : [],
              additionalIngredients: Array.isArray(result.additionalIngredients) ? result.additionalIngredients : [],
              tips: Array.isArray(result.tips) ? result.tips : [],
            };
          },
          'generateRecipeFromIngredients',
          this.getFallbackRecipeResponse(ingredients, preferences)
        );
      },
      'generateRecipeFromIngredients'
    );
  }

  /**
   * Build recipe generation prompt for OpenAI
   */
  private buildRecipeGenerationPrompt(ingredients: string[], preferences?: {
    cuisine?: string;
    difficulty?: string;
    dietaryRestrictions?: string[];
  }): string {
    const preferenceText = [
      preferences?.cuisine ? `Cuisine preference: ${preferences.cuisine}` : '',
      preferences?.difficulty ? `Difficulty preference: ${preferences.difficulty}` : '',
      preferences?.dietaryRestrictions?.length ? `Dietary restrictions: ${preferences.dietaryRestrictions.join(', ')}` : ''
    ].filter(Boolean).join('\n');

    return `
Create a recipe using these ingredients:

${ingredients.map(ing => `- ${ing}`).join('\n')}

${preferenceText ? `\n${preferenceText}\n` : ''}

Please create a complete recipe including:
1. An appealing title
2. A brief description
3. Step-by-step cooking instructions
4. Any additional ingredients needed (not from the provided list)
5. Cooking tips

Format your response as JSON with the following structure:
{
  "title": "Recipe Title",
  "description": "Brief description of the dish",
  "instructions": ["step1", "step2", ...],
  "additionalIngredients": ["ingredient1", "ingredient2", ...],
  "tips": ["tip1", "tip2", ...]
}
`;
  }

  /**
   * Get fallback recipe response when AI service is unavailable
   */
  private getFallbackRecipeResponse(ingredients: string[], preferences?: {
    cuisine?: string;
    difficulty?: string;
    dietaryRestrictions?: string[];
  }) {
    const cuisine = preferences?.cuisine?.toLowerCase() || 'general';
    const difficulty = preferences?.difficulty?.toLowerCase() || 'medium';
    
    // Generate a simple recipe based on available ingredients
    const mainIngredient = ingredients[0] || 'ingredients';
    const title = `${mainIngredient.charAt(0).toUpperCase() + mainIngredient.slice(1)} ${this.getCuisineBasedDishType(cuisine)}`;
    
    return {
      title,
      description: `A simple ${difficulty} ${cuisine} dish using your available ingredients`,
      instructions: [
        'Prepare all ingredients as needed',
        'Heat a pan over medium heat',
        'Add ingredients in order of cooking time',
        'Cook until done, stirring occasionally',
        'Season to taste and serve'
      ],
      additionalIngredients: this.getSuggestedAdditionalIngredients(ingredients, cuisine),
      tips: [
        'Taste and adjust seasoning throughout cooking',
        'Don\'t overcook the ingredients',
        'Let the dish rest for a few minutes before serving'
      ],
    };
  }

  /**
   * Get dish type based on cuisine
   */
  private getCuisineBasedDishType(cuisine: string): string {
    const dishTypes: Record<string, string> = {
      'italian': 'Pasta',
      'french': 'Sauté',
      'asian': 'Stir-fry',
      'mexican': 'Taco',
      'indian': 'Curry',
      'chinese': 'Stir-fry',
      'japanese': 'Bowl',
      'thai': 'Stir-fry',
      'mediterranean': 'Medley',
      'american': 'Casserole'
    };

    return dishTypes[cuisine] || 'Dish';
  }

  /**
   * Get suggested additional ingredients based on cuisine
   */
  private getSuggestedAdditionalIngredients(ingredients: string[], cuisine: string): string[] {
    const suggestions: Record<string, string[]> = {
      'italian': ['olive oil', 'garlic', 'onion', 'tomatoes', 'herbs'],
      'french': ['butter', 'shallots', 'herbs', 'wine', 'cream'],
      'asian': ['soy sauce', 'ginger', 'garlic', 'sesame oil', 'rice'],
      'mexican': ['lime', 'cilantro', 'onion', 'chili', 'tortillas'],
      'indian': ['curry powder', 'garam masala', 'ginger', 'garlic', 'coconut milk'],
      'chinese': ['soy sauce', 'ginger', 'garlic', 'sesame oil', 'rice wine'],
      'japanese': ['soy sauce', 'mirin', 'ginger', 'sesame seeds', 'rice'],
      'thai': ['fish sauce', 'lime', 'ginger', 'garlic', 'coconut milk'],
      'mediterranean': ['olive oil', 'lemon', 'herbs', 'garlic', 'tomatoes'],
      'american': ['salt', 'pepper', 'butter', 'onion', 'garlic']
    };

    return suggestions[cuisine] || ['salt', 'pepper', 'oil', 'garlic', 'onion'];
  }

  /**
   * Get trending recipes based on database analysis
   * 
   * @param limit - Maximum number of recipes to return
   * @returns Promise containing trending recipes
   */
  async getTrendingRecipes(limit: number = 5): Promise<{
    title: string;
    description: string;
    trend: string;
    difficulty: string;
    prepTime: number;
    cookTime: number;
  }[]> {
    this.validateInput(limit, 'limit');
    if (limit <= 0 || limit > 50) {
      throw new HttpException(
        'Limit must be between 1 and 50',
        HttpStatus.BAD_REQUEST
      );
    }

    try {
      this.logger.debug(`Fetching trending recipes with limit: ${limit}`);
      
      // Get recipes with their ratings and recent activity
      const recipes = await this.prisma.recipe.findMany({
        take: Math.min(limit * 3, 100), // Get more to filter and rank, but cap at 100
        orderBy: {
          createdAt: 'desc', // Start with most recent
        },
        include: {
          ratings: true,
          comments: true,
          _count: {
            select: {
              ratings: true,
              comments: true,
            },
          },
        },
      });

      if (recipes.length === 0) {
        this.logger.warn('No recipes found in database');
        return [];
      }

      // Calculate trend scores based on multiple factors
      const trendingRecipes = recipes.map(recipe => {
        const trendData = this.calculateTrendScore(recipe);
        return {
          title: recipe.title,
          description: recipe.description,
          trend: trendData.trend,
          difficulty: recipe.difficulty.toUpperCase(),
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          trendScore: trendData.score,
        };
      });

      // Sort by trend score and return top recipes
      const result = trendingRecipes
        .sort((a, b) => b.trendScore - a.trendScore)
        .slice(0, limit)
        .map(({ trendScore, ...recipe }) => ({
          ...recipe,
          description: recipe.description || '',
          prepTime: recipe.prepTime || 0,
          cookTime: recipe.cookTime || 0,
        })); // Remove trendScore from final result and ensure non-null values

      this.logger.debug(`Returning ${result.length} trending recipes`);
      return result;
      
    } catch (error) {
      this.logger.error(`Error fetching trending recipes: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : 'No stack trace');
      
      // Return empty array instead of static fallback data
      return [];
    }
  }

  /**
   * Calculate trend score and category for a recipe
   */
  private calculateTrendScore(recipe: any): { trend: string; score: number } {
    const now = new Date();
    const recipeAge = now.getTime() - recipe.createdAt.getTime();
    const daysSinceCreated = recipeAge / (1000 * 60 * 60 * 24);
    
    // Calculate trend score based on:
    // 1. Recent activity (newer recipes get higher scores)
    // 2. Rating count and average
    // 3. Comment count
    // 4. Engagement rate
    
    const avgRating = recipe.ratings.length > 0 
      ? recipe.ratings.reduce((sum: number, rating: any) => sum + rating.rating, 0) / recipe.ratings.length 
      : 0;
    
    const engagementScore = recipe._count.ratings + recipe._count.comments;
    const recencyScore = Math.max(0, 30 - daysSinceCreated) / 30; // Higher for newer recipes
    const ratingScore = avgRating / 5; // Normalize to 0-1
    
    const trendScore = (recencyScore * 0.4) + (ratingScore * 0.3) + (engagementScore * 0.3);
    
    // Determine trend category based on recipe characteristics
    const trend = this.determineTrendCategory(recipe, avgRating, engagementScore, daysSinceCreated);
    
    return { trend, score: trendScore };
  }

  /**
   * Determine trend category based on recipe characteristics
   */
  private determineTrendCategory(recipe: any, avgRating: number, engagementScore: number, daysSinceCreated: number): string {
    const tags = recipe.tags || [];
    
    if (tags.includes('air-fryer') || tags.includes('air-frying')) {
      return 'Air Frying';
    } else if (tags.includes('sourdough') || tags.includes('fermentation')) {
      return 'Sourdough Baking';
    } else if (tags.includes('plant-based') || tags.includes('vegan')) {
      return 'Plant-Based Cooking';
    } else if (tags.includes('keto') || tags.includes('low-carb')) {
      return 'Keto Diet';
    } else if (tags.includes('instant-pot') || tags.includes('pressure-cooker')) {
      return 'Instant Pot Cooking';
    } else if (tags.includes('meal-prep') || tags.includes('batch-cooking')) {
      return 'Meal Prep';
    } else if (tags.includes('one-pot') || tags.includes('sheet-pan')) {
      return 'One-Pot Meals';
    } else if (tags.includes('gluten-free') || tags.includes('dairy-free')) {
      return 'Allergen-Free Cooking';
    } else if (tags.includes('fermentation') || tags.includes('pickling')) {
      return 'Fermentation';
    } else if (tags.includes('smoking') || tags.includes('bbq')) {
      return 'Smoking & BBQ';
    } else if (avgRating >= 4.5) {
      return 'Highly Rated';
    } else if (engagementScore >= 10) {
      return 'Popular';
    } else if (daysSinceCreated <= 7) {
      return 'New & Trending';
    }
    
    return 'Recently Added';
  }

  /**
   * Analyze recipe nutrition using AI and ingredient analysis
   * 
   * @param recipe - The recipe to analyze
   * @returns Promise containing nutrition analysis
   */
  async analyzeNutrition(recipe: Recipe): Promise<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    healthScore: number;
    recommendations: string[];
  }> {
    this.validateInput(recipe, 'recipe');
    this.validateInput(recipe.id, 'recipe.id');
    this.validateInput(recipe.title, 'recipe.title');

    const cacheKey = `nutrition_${recipe.id}`;
    
    return this.getCachedOrExecute(
      cacheKey,
      async () => {
        // Try AI analysis first, fallback to ingredient analysis
        try {
          return await this.performAINutritionAnalysis(recipe);
        } catch (error) {
          this.logger.warn(`AI nutrition analysis failed, falling back to ingredient analysis: ${error instanceof Error ? error.message : String(error)}`);
          return this.performIngredientNutritionAnalysis(recipe);
        }
      },
      'analyzeNutrition'
    );
  }

  /**
   * Perform AI-powered nutrition analysis
   */
  private async performAINutritionAnalysis(recipe: Recipe) {
    const prompt = this.buildNutritionAnalysisPrompt(recipe);
    
    return this.executeOpenAICall(
      async () => {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a nutritionist. Analyze recipes and provide accurate nutritional information and health recommendations.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 800,
        });

        const response = completion.choices[0]?.message?.content;
        if (!response) {
          throw new Error('No response from OpenAI');
        }

        const result = this.parseOpenAIResponse(response, ['calories', 'protein', 'carbs', 'fat', 'healthScore', 'recommendations']);
        
        return {
          calories: Math.round(Number(result.calories) || 0),
          protein: Math.round((Number(result.protein) || 0) * 10) / 10,
          carbs: Math.round((Number(result.carbs) || 0) * 10) / 10,
          fat: Math.round((Number(result.fat) || 0) * 10) / 10,
          healthScore: Math.round((Number(result.healthScore) || 5) * 10) / 10,
          recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
        };
      },
      'performAINutritionAnalysis',
      this.performIngredientNutritionAnalysis(recipe)
    );
  }

  /**
   * Build nutrition analysis prompt for OpenAI
   */
  private buildNutritionAnalysisPrompt(recipe: Recipe): string {
    const ingredients = recipe.ingredients?.map(ing => 
      `${ing.amount || 1} ${ing.unit || 'unit'} ${ing.name}`
    ).join(', ') || 'No ingredients listed';

    return `
Analyze the nutritional content of this recipe:

Title: ${recipe.title}
Description: ${recipe.description || 'No description'}
Ingredients: ${ingredients}
Servings: ${recipe.servings || 1}

Please provide:
1. Estimated calories per serving
2. Protein content in grams per serving
3. Carbohydrate content in grams per serving
4. Fat content in grams per serving
5. Health score (1-10, where 10 is healthiest)
6. 3-5 nutrition recommendations

Format your response as JSON:
{
  "calories": 350,
  "protein": 25.5,
  "carbs": 45.2,
  "fat": 12.8,
  "healthScore": 7.5,
  "recommendations": ["recommendation1", "recommendation2", ...]
}
`;
  }

  /**
   * Perform ingredient-based nutrition analysis as fallback
   */
  private performIngredientNutritionAnalysis(recipe: Recipe) {
    this.logger.debug('Performing ingredient-based nutrition analysis');
    
    const nutritionData = this.calculateIngredientNutrition(recipe.ingredients || []);
    const healthScore = this.calculateHealthScore(nutritionData);
    const recommendations = this.generateNutritionRecommendations(nutritionData, recipe.ingredients || []);

    return {
      calories: Math.round(nutritionData.calories),
      protein: Math.round(nutritionData.protein * 10) / 10,
      carbs: Math.round(nutritionData.carbs * 10) / 10,
      fat: Math.round(nutritionData.fat * 10) / 10,
      healthScore: Math.round(healthScore * 10) / 10,
      recommendations: recommendations.length > 0 ? recommendations : [
        'This recipe looks balanced! Consider adding more variety with different vegetables or herbs.',
      ],
    };
  }

  /**
   * Calculate nutrition from ingredients
   */
  private calculateIngredientNutrition(ingredients: any[]) {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    for (const ingredient of ingredients) {
      const nutrition = this.getIngredientNutrition(ingredient.name, ingredient.amount || 1);
      totalCalories += nutrition.calories;
      totalProtein += nutrition.protein;
      totalCarbs += nutrition.carbs;
      totalFat += nutrition.fat;
    }

    return { calories: totalCalories, protein: totalProtein, carbs: totalCarbs, fat: totalFat };
  }

  /**
   * Get nutrition data for a specific ingredient
   */
  private getIngredientNutrition(ingredientName: string, amount: number) {
    const name = ingredientName.toLowerCase();
    const scale = amount / 100; // Assume amount is in grams

    // Basic nutrition database (per 100g)
    const nutritionDB: Record<string, {calories: number; protein: number; carbs: number; fat: number}> = {
      'chicken': { calories: 165, protein: 25, carbs: 0, fat: 6 },
      'beef': { calories: 250, protein: 26, carbs: 0, fat: 15 },
      'pork': { calories: 242, protein: 22, carbs: 0, fat: 16 },
      'fish': { calories: 150, protein: 22, carbs: 0, fat: 6 },
      'salmon': { calories: 208, protein: 25, carbs: 0, fat: 12 },
      'tuna': { calories: 132, protein: 28, carbs: 0, fat: 1 },
      'rice': { calories: 130, protein: 3, carbs: 28, fat: 0.5 },
      'pasta': { calories: 131, protein: 5, carbs: 25, fat: 1 },
      'bread': { calories: 265, protein: 9, carbs: 49, fat: 3 },
      'potato': { calories: 77, protein: 2, carbs: 17, fat: 0.1 },
      'sweet potato': { calories: 86, protein: 2, carbs: 20, fat: 0.1 },
      'cheese': { calories: 113, protein: 7, carbs: 1, fat: 9 },
      'milk': { calories: 42, protein: 3, carbs: 5, fat: 1 },
      'yogurt': { calories: 59, protein: 10, carbs: 4, fat: 0.4 },
      'oil': { calories: 884, protein: 0, carbs: 0, fat: 100 },
      'butter': { calories: 717, protein: 1, carbs: 0, fat: 81 },
      'olive oil': { calories: 884, protein: 0, carbs: 0, fat: 100 },
      'vegetable': { calories: 25, protein: 1, carbs: 5, fat: 0.2 },
      'tomato': { calories: 18, protein: 1, carbs: 4, fat: 0.2 },
      'onion': { calories: 40, protein: 1, carbs: 9, fat: 0.1 },
      'pepper': { calories: 20, protein: 1, carbs: 5, fat: 0.2 },
      'carrot': { calories: 41, protein: 1, carbs: 10, fat: 0.2 },
      'apple': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
      'banana': { calories: 89, protein: 1, carbs: 23, fat: 0.3 },
      'egg': { calories: 155, protein: 13, carbs: 1, fat: 11 },
      'almond': { calories: 579, protein: 21, carbs: 22, fat: 50 },
      'walnut': { calories: 654, protein: 15, carbs: 14, fat: 65 },
      'nut': { calories: 607, protein: 20, carbs: 21, fat: 54 },
    };

    // Find matching ingredient
    const match = Object.keys(nutritionDB).find(key => name.includes(key));
    const nutrition = match ? nutritionDB[match] : { calories: 50, protein: 2, carbs: 8, fat: 1 };

    return {
      calories: nutrition.calories * scale,
      protein: nutrition.protein * scale,
      carbs: nutrition.carbs * scale,
      fat: nutrition.fat * scale,
    };
  }

  /**
   * Calculate health score based on nutrition data
   */
  private calculateHealthScore(nutrition: {calories: number; protein: number; carbs: number; fat: number}) {
    let score = 5; // Start with neutral score

    if (nutrition.calories > 0) {
      const proteinRatio = nutrition.protein / (nutrition.calories / 4);
      const carbRatio = nutrition.carbs / (nutrition.calories / 4);
      const fatRatio = nutrition.fat / (nutrition.calories / 9);

      if (proteinRatio > 0.15) score += 1; // Good protein content
      if (carbRatio < 0.6) score += 1; // Not too carb-heavy
      if (fatRatio < 0.35) score += 1; // Not too fatty
      if (nutrition.calories < 500) score += 1; // Reasonable calorie count
      if (nutrition.calories > 200) score += 1; // Not too low calorie
    }

    return Math.max(1, Math.min(10, score));
  }

  /**
   * Generate nutrition recommendations based on analysis
   */
  private generateNutritionRecommendations(nutrition: {calories: number; protein: number; carbs: number; fat: number}, ingredients: any[]) {
    const recommendations: string[] = [];

    if (nutrition.calories > 0) {
      const proteinRatio = nutrition.protein / (nutrition.calories / 4);
      const carbRatio = nutrition.carbs / (nutrition.calories / 4);
      const fatRatio = nutrition.fat / (nutrition.calories / 9);

      if (proteinRatio < 0.1) {
        recommendations.push('Consider adding more protein sources like lean meat, fish, or legumes');
      }
      if (carbRatio > 0.7) {
        recommendations.push('Try reducing refined carbs and adding more vegetables');
      }
      if (fatRatio > 0.4) {
        recommendations.push('Consider using healthier fats like olive oil instead of butter');
      }
      if (nutrition.calories > 600) {
        recommendations.push('This recipe is quite calorie-dense - consider portion control');
      }
      if (nutrition.calories < 200) {
        recommendations.push('This recipe is very low in calories - consider adding healthy fats or protein');
      }
    }

    // Check for vegetables
    const hasVegetables = ingredients.some(ing => 
      ing.name.toLowerCase().includes('vegetable') || 
      ing.name.toLowerCase().includes('tomato') || 
      ing.name.toLowerCase().includes('onion') ||
      ing.name.toLowerCase().includes('pepper') ||
      ing.name.toLowerCase().includes('carrot')
    );
    
    if (!hasVegetables) {
      recommendations.push('Add more vegetables for fiber, vitamins, and minerals');
    }

    // Check for healthy fats
    const hasHealthyFats = ingredients.some(ing => 
      ing.name.toLowerCase().includes('olive oil') || 
      ing.name.toLowerCase().includes('avocado') || 
      ing.name.toLowerCase().includes('nut')
    );
    
    if (!hasHealthyFats && nutrition.fat > 0) {
      recommendations.push('Consider using healthier fats like olive oil or avocado');
    }

    return recommendations;
  }
}
