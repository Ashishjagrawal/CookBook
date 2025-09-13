# GraphQL Schema Documentation

## Overview

This document provides comprehensive documentation for the Recipe Sharing Platform GraphQL API. The API is built with NestJS and Apollo Server, providing type-safe operations for recipe management, user authentication, search functionality, and real-time features.

## Base URL

- **Development**: `http://localhost:4323/graphql`
- **GraphQL Playground**: `http://localhost:4323/graphql`

## Authentication

The API uses JWT-based authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Schema Types

### Core Types

#### User
```graphql
type User {
  id: ID!
  email: String!
  username: String!
  firstName: String
  lastName: String
  bio: String
  avatar: String
  isActive: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
  recipes: [Recipe!]!
  followers: [User!]!
  following: [User!]!
}
```

#### Recipe
```graphql
type Recipe {
  id: ID!
  title: String!
  description: String
  imageUrl: String
  prepTime: Int
  cookTime: Int
  servings: Int
  difficulty: Difficulty!
  cuisine: String
  tags: [String!]!
  isPublic: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
  author: User!
  ingredients: [Ingredient!]!
  instructions: [Instruction!]!
  ratings: [Rating!]!
  comments: [Comment!]!
  averageRating: Float
  totalRatings: Int
}
```

#### Ingredient
```graphql
type Ingredient {
  id: ID!
  name: String!
  amount: Float
  unit: String
  notes: String
  order: Int!
  recipe: Recipe!
}
```

#### Instruction
```graphql
type Instruction {
  id: ID!
  step: String!
  order: Int!
  imageUrl: String
  recipe: Recipe!
}
```

#### Rating
```graphql
type Rating {
  id: ID!
  rating: Int!
  review: String
  createdAt: DateTime!
  updatedAt: DateTime!
  user: User!
  recipe: Recipe!
}
```

#### Comment
```graphql
type Comment {
  id: ID!
  content: String!
  createdAt: DateTime!
  updatedAt: DateTime!
  user: User!
  recipe: Recipe!
}
```

### Enums

#### Difficulty
```graphql
enum Difficulty {
  EASY
  MEDIUM
  HARD
}
```

#### NotificationType
```graphql
enum NotificationType {
  NEW_RECIPE
  NEW_RATING
  NEW_COMMENT
  NEW_FOLLOWER
  RECIPE_APPROVED
  RECIPE_REJECTED
}
```

## Queries

### Authentication Queries

#### Me
Get current user information.

```graphql
query Me {
  me {
    id
    email
    username
    firstName
    lastName
    bio
    avatar
  }
}
```

**Authentication**: Required

### Recipe Queries

#### Recipes
Get paginated list of recipes.

```graphql
query GetRecipes($take: Int, $skip: Int, $where: RecipeWhereInput) {
  recipes(take: $take, skip: $skip, where: $where) {
    id
    title
    description
    prepTime
    cookTime
    difficulty
    author {
      id
      username
      firstName
      lastName
    }
    averageRating
    totalRatings
  }
}
```

**Parameters**:
- `take`: Number of recipes to return (default: 10)
- `skip`: Number of recipes to skip (default: 0)
- `where`: Filter conditions

#### Recipe
Get a single recipe by ID.

```graphql
query GetRecipe($id: ID!) {
  recipe(id: $id) {
    id
    title
    description
    prepTime
    cookTime
    servings
    difficulty
    cuisine
    tags
    author {
      id
      username
      firstName
      lastName
    }
    ingredients {
      id
      name
      amount
      unit
      notes
      order
    }
    instructions {
      id
      step
      order
      imageUrl
    }
    ratings {
      id
      rating
      review
      user {
        username
      }
    }
    comments {
      id
      content
      user {
        username
      }
      createdAt
    }
  }
}
```

#### Top Rated Recipes
Get top-rated recipes.

```graphql
query GetTopRatedRecipes($limit: Int) {
  topRatedRecipes(limit: $limit) {
    id
    title
    description
    averageRating
    totalRatings
    author {
      username
    }
  }
}
```

#### Recipes by Ingredients
Find recipes by ingredients.

```graphql
query GetRecipesByIngredients($ingredients: [String!]!, $take: Int) {
  recipesByIngredients(ingredients: $ingredients, take: $take) {
    id
    title
    description
    ingredients {
      name
      amount
      unit
    }
  }
}
```

### Search Queries

#### Search Recipes
Search recipes with text and filters.

```graphql
query SearchRecipes($query: String!, $filters: RecipeFilters, $take: Int, $skip: Int) {
  searchRecipes(query: $query, filters: $filters, take: $take, skip: $skip) {
    total
    recipes {
      id
      title
      description
      score
      author {
        username
      }
    }
  }
}
```

#### Search by Ingredients
Search recipes by ingredients.

```graphql
query SearchByIngredients($ingredients: [String!]!, $take: Int) {
  searchByIngredients(ingredients: $ingredients, take: $take) {
    total
    recipes {
      id
      title
      description
      ingredients {
        name
        amount
        unit
      }
    }
  }
}
```

### User Queries

#### Users
Get paginated list of users.

```graphql
query GetUsers($take: Int, $skip: Int) {
  users(take: $take, skip: $skip) {
    id
    username
    firstName
    lastName
    bio
    avatar
  }
}
```

## Mutations

### Authentication Mutations

#### Register
Register a new user.

```graphql
mutation Register($input: RegisterInput!) {
  register(input: $input) {
    token
    user {
      id
      email
      username
      firstName
      lastName
    }
  }
}
```

**Input**:
```graphql
input RegisterInput {
  email: String!
  password: String!
  username: String!
  firstName: String!
  lastName: String!
}
```

#### Login
Login with email and password.

```graphql
mutation Login($input: LoginInput!) {
  login(input: $input) {
    token
    user {
      id
      email
      username
      firstName
      lastName
    }
  }
}
```

**Input**:
```graphql
input LoginInput {
  email: String!
  password: String!
}
```

### Recipe Mutations

#### Create Recipe
Create a new recipe.

```graphql
mutation CreateRecipe($input: CreateRecipeInput!) {
  createRecipe(input: $input) {
    id
    title
    description
    author {
      username
    }
  }
}
```

**Input**:
```graphql
input CreateRecipeInput {
  title: String!
  description: String
  prepTime: Int
  cookTime: Int
  servings: Int
  difficulty: Difficulty!
  cuisine: String
  tags: [String!]!
  isPublic: Boolean!
  ingredients: [CreateIngredientInput!]!
  instructions: [CreateInstructionInput!]!
}

input CreateIngredientInput {
  name: String!
  amount: Float
  unit: String
  notes: String
  order: Int!
}

input CreateInstructionInput {
  step: String!
  order: Int!
  imageUrl: String
}
```

#### Update Recipe
Update an existing recipe.

```graphql
mutation UpdateRecipe($id: ID!, $input: UpdateRecipeInput!) {
  updateRecipe(id: $id, input: $input) {
    id
    title
    description
    updatedAt
  }
}
```

#### Delete Recipe
Delete a recipe.

```graphql
mutation DeleteRecipe($id: ID!) {
  deleteRecipe(id: $id) {
    id
    title
  }
}
```

#### Rate Recipe
Rate a recipe.

```graphql
mutation RateRecipe($input: RateRecipeInput!) {
  rateRecipe(input: $input) {
    id
    rating
    review
    recipe {
      id
      averageRating
      totalRatings
    }
  }
}
```

**Input**:
```graphql
input RateRecipeInput {
  recipeId: ID!
  rating: Int!
  review: String
}
```

#### Add Comment
Add a comment to a recipe.

```graphql
mutation AddComment($input: CreateCommentInput!) {
  addComment(input: $input) {
    id
    content
    user {
      username
    }
    createdAt
  }
}
```

**Input**:
```graphql
input CreateCommentInput {
  recipeId: ID!
  content: String!
}
```

### AI Mutations

#### Improve Recipe
Get AI suggestions to improve a recipe.

```graphql
mutation ImproveRecipe($recipeId: ID!) {
  improveRecipe(recipeId: $recipeId) {
    suggestions
    improvedRecipe {
      title
      description
      ingredients {
        name
        amount
        unit
      }
      instructions {
        step
        order
      }
    }
  }
}
```

#### Suggest Substitutions
Get ingredient substitution suggestions.

```graphql
mutation SuggestSubstitutions($ingredients: [String!]!) {
  suggestSubstitutions(ingredients: $ingredients) {
    substitutions {
      original
      substitute
      reason
      ratio
    }
  }
}
```

#### Generate Recipe from Ingredients
Generate a recipe from available ingredients.

```graphql
mutation GenerateRecipeFromIngredients($ingredients: [String!]!, $cuisine: String, $dietary: String) {
  generateRecipeFromIngredients(ingredients: $ingredients, cuisine: $cuisine, dietary: $dietary) {
    title
    description
    prepTime
    cookTime
    servings
    difficulty
    ingredients {
      name
      amount
      unit
    }
    instructions {
      step
      order
    }
  }
}
```

## Subscriptions

### Real-time Updates

#### Recipe Updates
Subscribe to recipe updates.

```graphql
subscription OnRecipeUpdate($recipeId: ID!) {
  recipeUpdated(recipeId: $recipeId) {
    id
    title
    updatedAt
  }
}
```

#### User Feed
Subscribe to user feed updates.

```graphql
subscription OnUserFeed($userId: ID!) {
  userFeedUpdated(userId: $userId) {
    type
    data
    timestamp
  }
}
```

#### Notifications
Subscribe to user notifications.

```graphql
subscription OnNotification($userId: ID!) {
  notificationAdded(userId: $userId) {
    id
    type
    title
    message
    isRead
    createdAt
  }
}
```

## Error Handling

The API uses standard GraphQL error handling with meaningful error messages:

- **Authentication errors**: `UNAUTHORIZED`
- **Validation errors**: `BAD_USER_INPUT`
- **Not found errors**: `NOT_FOUND`
- **Conflict errors**: `CONFLICT`
- **Internal errors**: `INTERNAL_ERROR`

## Rate Limiting

- **Search queries**: 100 requests per minute per user
- **AI operations**: 20 requests per minute per user
- **General queries**: 1000 requests per minute per user

## Examples

### Complete Recipe Creation Flow

```graphql
# 1. Register user
mutation {
  register(input: {
    email: "chef@example.com"
    password: "securepassword"
    username: "chef123"
    firstName: "John"
    lastName: "Doe"
  }) {
    token
    user { id }
  }
}

# 2. Create recipe (with token in Authorization header)
mutation {
  createRecipe(input: {
    title: "Chocolate Chip Cookies"
    description: "Classic homemade cookies"
    prepTime: 15
    cookTime: 12
    servings: 24
    difficulty: EASY
    cuisine: "American"
    tags: ["dessert", "cookies", "chocolate"]
    isPublic: true
    ingredients: [
      { name: "Flour", amount: 2.25, unit: "cups", order: 1 }
      { name: "Chocolate Chips", amount: 2, unit: "cups", order: 2 }
    ]
    instructions: [
      { step: "Mix dry ingredients", order: 1 }
      { step: "Add chocolate chips", order: 2 }
    ]
  }) {
    id
    title
  }
}

# 3. Search for the recipe
query {
  searchRecipes(query: "chocolate cookies") {
    total
    recipes {
      id
      title
      score
    }
  }
}
```

This comprehensive GraphQL API provides all the functionality needed for a modern recipe sharing platform with advanced features like AI integration, real-time updates, and sophisticated search capabilities.
