import { PrismaClient, Difficulty, NotificationType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'chef@example.com' },
      update: {},
      create: {
        email: 'chef@example.com',
        username: 'chef_master',
        password: hashedPassword,
        firstName: 'Chef',
        lastName: 'Master',
        bio: 'Professional chef with 10+ years of experience',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      },
    }),
    prisma.user.upsert({
      where: { email: 'baker@example.com' },
      update: {},
      create: {
        email: 'baker@example.com',
        username: 'sweet_baker',
        password: hashedPassword,
        firstName: 'Sweet',
        lastName: 'Baker',
        bio: 'Passionate baker specializing in desserts and pastries',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      },
    }),
    prisma.user.upsert({
      where: { email: 'homecook@example.com' },
      update: {},
      create: {
        email: 'homecook@example.com',
        username: 'home_cook',
        password: hashedPassword,
        firstName: 'Home',
        lastName: 'Cook',
        bio: 'Love cooking for family and friends',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create recipes
  const recipes = await Promise.all([
    prisma.recipe.create({
      data: {
        title: 'Classic Chocolate Chip Cookies',
        description: 'Soft and chewy chocolate chip cookies that are perfect for any occasion. This recipe has been passed down through generations.',
        imageUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&h=600&fit=crop',
        prepTime: 15,
        cookTime: 12,
        servings: 24,
        difficulty: Difficulty.EASY,
        cuisine: 'American',
        tags: ['dessert', 'cookies', 'chocolate', 'baking'],
        isPublic: true,
        authorId: users[1].id, // Sweet Baker
        ingredients: {
          create: [
            { name: 'All-purpose flour', amount: 2.25, unit: 'cups', order: 1 },
            { name: 'Baking soda', amount: 1, unit: 'teaspoon', order: 2 },
            { name: 'Salt', amount: 1, unit: 'teaspoon', order: 3 },
            { name: 'Butter', amount: 1, unit: 'cup', order: 4 },
            { name: 'Brown sugar', amount: 0.75, unit: 'cup', order: 5 },
            { name: 'White sugar', amount: 0.5, unit: 'cup', order: 6 },
            { name: 'Vanilla extract', amount: 2, unit: 'teaspoons', order: 7 },
            { name: 'Eggs', amount: 2, unit: 'large', order: 8 },
            { name: 'Chocolate chips', amount: 2, unit: 'cups', order: 9 },
          ],
        },
        instructions: {
          create: [
            { step: 'Preheat oven to 375°F (190°C)', order: 1 },
            { step: 'Mix flour, baking soda, and salt in a bowl', order: 2 },
            { step: 'Cream butter and both sugars until fluffy', order: 3 },
            { step: 'Beat in vanilla and eggs one at a time', order: 4 },
            { step: 'Gradually blend in flour mixture', order: 5 },
            { step: 'Stir in chocolate chips', order: 6 },
            { step: 'Drop rounded tablespoons onto ungreased cookie sheets', order: 7 },
            { step: 'Bake 9-11 minutes until golden brown', order: 8 },
            { step: 'Cool on baking sheet for 2 minutes before removing', order: 9 },
          ],
        },
      },
    }),
    prisma.recipe.create({
      data: {
        title: 'Spaghetti Carbonara',
        description: 'Authentic Italian carbonara with creamy sauce, crispy pancetta, and perfectly cooked pasta. A classic Roman dish.',
        imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=800&h=600&fit=crop',
        prepTime: 10,
        cookTime: 15,
        servings: 4,
        difficulty: Difficulty.MEDIUM,
        cuisine: 'Italian',
        tags: ['pasta', 'italian', 'dinner', 'comfort food'],
        isPublic: true,
        authorId: users[0].id, // Chef Master
        ingredients: {
          create: [
            { name: 'Spaghetti', amount: 1, unit: 'pound', order: 1 },
            { name: 'Pancetta', amount: 8, unit: 'ounces', order: 2 },
            { name: 'Eggs', amount: 4, unit: 'large', order: 3 },
            { name: 'Parmesan cheese', amount: 1, unit: 'cup', order: 4 },
            { name: 'Black pepper', amount: 1, unit: 'teaspoon', order: 5 },
            { name: 'Salt', amount: 1, unit: 'teaspoon', order: 6 },
          ],
        },
        instructions: {
          create: [
            { step: 'Bring large pot of salted water to boil', order: 1 },
            { step: 'Cut pancetta into small cubes', order: 2 },
            { step: 'Cook pancetta in large skillet until crispy', order: 3 },
            { step: 'Whisk eggs, cheese, and pepper in bowl', order: 4 },
            { step: 'Cook pasta according to package directions', order: 5 },
            { step: 'Reserve 1 cup pasta water, drain pasta', order: 6 },
            { step: 'Add hot pasta to pancetta, remove from heat', order: 7 },
            { step: 'Quickly stir in egg mixture, adding pasta water as needed', order: 8 },
            { step: 'Serve immediately with extra cheese and pepper', order: 9 },
          ],
        },
      },
    }),
    prisma.recipe.create({
      data: {
        title: 'Grilled Salmon with Lemon Herb Butter',
        description: 'Perfectly grilled salmon fillets with a delicious lemon herb butter sauce. Healthy, flavorful, and easy to make.',
        imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&h=600&fit=crop',
        prepTime: 20,
        cookTime: 12,
        servings: 4,
        difficulty: Difficulty.EASY,
        cuisine: 'Mediterranean',
        tags: ['fish', 'healthy', 'grilled', 'mediterranean'],
        isPublic: true,
        authorId: users[2].id, // Home Cook
        ingredients: {
          create: [
            { name: 'Salmon fillets', amount: 4, unit: '6-ounce pieces', order: 1 },
            { name: 'Butter', amount: 4, unit: 'tablespoons', order: 2 },
            { name: 'Lemon', amount: 2, unit: 'medium', order: 3 },
            { name: 'Fresh dill', amount: 2, unit: 'tablespoons', order: 4 },
            { name: 'Fresh parsley', amount: 2, unit: 'tablespoons', order: 5 },
            { name: 'Garlic', amount: 2, unit: 'cloves', order: 6 },
            { name: 'Salt', amount: 1, unit: 'teaspoon', order: 7 },
            { name: 'Black pepper', amount: 0.5, unit: 'teaspoon', order: 8 },
            { name: 'Olive oil', amount: 2, unit: 'tablespoons', order: 9 },
          ],
        },
        instructions: {
          create: [
            { step: 'Preheat grill to medium-high heat', order: 1 },
            { step: 'Season salmon with salt and pepper', order: 2 },
            { step: 'Melt butter in small saucepan', order: 3 },
            { step: 'Add minced garlic, cook 1 minute', order: 4 },
            { step: 'Remove from heat, add lemon juice and herbs', order: 5 },
            { step: 'Brush salmon with olive oil', order: 6 },
            { step: 'Grill salmon 4-5 minutes per side', order: 7 },
            { step: 'Serve with lemon herb butter drizzled on top', order: 8 },
          ],
        },
      },
    }),
    prisma.recipe.create({
      data: {
        title: 'Vegetarian Buddha Bowl',
        description: 'A nutritious and colorful Buddha bowl packed with quinoa, roasted vegetables, and a tahini dressing. Perfect for a healthy lunch.',
        imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop',
        prepTime: 30,
        cookTime: 25,
        servings: 2,
        difficulty: Difficulty.EASY,
        cuisine: 'Mediterranean',
        tags: ['vegetarian', 'healthy', 'quinoa', 'bowl'],
        isPublic: true,
        authorId: users[2].id, // Home Cook
        ingredients: {
          create: [
            { name: 'Quinoa', amount: 1, unit: 'cup', order: 1 },
            { name: 'Sweet potato', amount: 1, unit: 'large', order: 2 },
            { name: 'Broccoli', amount: 1, unit: 'head', order: 3 },
            { name: 'Chickpeas', amount: 1, unit: 'can', order: 4 },
            { name: 'Avocado', amount: 1, unit: 'medium', order: 5 },
            { name: 'Tahini', amount: 3, unit: 'tablespoons', order: 6 },
            { name: 'Lemon juice', amount: 2, unit: 'tablespoons', order: 7 },
            { name: 'Olive oil', amount: 3, unit: 'tablespoons', order: 8 },
            { name: 'Salt', amount: 1, unit: 'teaspoon', order: 9 },
            { name: 'Black pepper', amount: 0.5, unit: 'teaspoon', order: 10 },
          ],
        },
        instructions: {
          create: [
            { step: 'Preheat oven to 400°F (200°C)', order: 1 },
            { step: 'Cook quinoa according to package directions', order: 2 },
            { step: 'Cut sweet potato into cubes, toss with oil and salt', order: 3 },
            { step: 'Roast sweet potato for 20-25 minutes', order: 4 },
            { step: 'Steam broccoli until tender-crisp', order: 5 },
            { step: 'Drain and rinse chickpeas', order: 6 },
            { step: 'Make tahini dressing: whisk tahini, lemon juice, oil, salt', order: 7 },
            { step: 'Slice avocado', order: 8 },
            { step: 'Assemble bowls with quinoa, vegetables, and dressing', order: 9 },
          ],
        },
      },
    }),
    prisma.recipe.create({
      data: {
        title: 'Beef Wellington',
        description: 'An elegant and impressive dish perfect for special occasions. Tender beef fillet wrapped in puff pastry with mushroom duxelles.',
        imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&h=600&fit=crop',
        prepTime: 60,
        cookTime: 45,
        servings: 6,
        difficulty: Difficulty.HARD,
        cuisine: 'British',
        tags: ['beef', 'special occasion', 'elegant', 'pastry'],
        isPublic: true,
        authorId: users[0].id, // Chef Master
        ingredients: {
          create: [
            { name: 'Beef fillet', amount: 2, unit: 'pounds', order: 1 },
            { name: 'Puff pastry', amount: 1, unit: 'package', order: 2 },
            { name: 'Mushrooms', amount: 1, unit: 'pound', order: 3 },
            { name: 'Shallots', amount: 2, unit: 'medium', order: 4 },
            { name: 'Garlic', amount: 3, unit: 'cloves', order: 5 },
            { name: 'Prosciutto', amount: 8, unit: 'slices', order: 6 },
            { name: 'Dijon mustard', amount: 2, unit: 'tablespoons', order: 7 },
            { name: 'Egg', amount: 1, unit: 'large', order: 8 },
            { name: 'Salt', amount: 2, unit: 'teaspoons', order: 9 },
            { name: 'Black pepper', amount: 1, unit: 'teaspoon', order: 10 },
            { name: 'Thyme', amount: 2, unit: 'teaspoons', order: 11 },
          ],
        },
        instructions: {
          create: [
            { step: 'Season beef with salt and pepper, sear all sides', order: 1 },
            { step: 'Brush beef with mustard, let cool', order: 2 },
            { step: 'Make mushroom duxelles: finely chop mushrooms', order: 3 },
            { step: 'Sauté shallots and garlic until soft', order: 4 },
            { step: 'Add mushrooms, cook until dry, season with thyme', order: 5 },
            { step: 'Lay prosciutto on plastic wrap', order: 6 },
            { step: 'Spread mushroom mixture on prosciutto', order: 7 },
            { step: 'Wrap beef in prosciutto-mushroom mixture', order: 8 },
            { step: 'Roll in puff pastry, seal edges', order: 9 },
            { step: 'Brush with egg wash, score top', order: 10 },
            { step: 'Bake at 400°F for 25-30 minutes until golden', order: 11 },
            { step: 'Rest 10 minutes before slicing', order: 12 },
          ],
        },
      },
    }),
  ]);

  console.log(`✅ Created ${recipes.length} recipes`);

  // Create ratings
  const ratings = await Promise.all([
    prisma.rating.create({
      data: {
        rating: 5,
        review: 'Absolutely delicious! The best chocolate chip cookies I\'ve ever made.',
        userId: users[0].id,
        recipeId: recipes[0].id,
      },
    }),
    prisma.rating.create({
      data: {
        rating: 4,
        review: 'Great recipe, very authentic carbonara taste.',
        userId: users[1].id,
        recipeId: recipes[1].id,
      },
    }),
    prisma.rating.create({
      data: {
        rating: 5,
        review: 'Perfect salmon! The lemon herb butter is amazing.',
        userId: users[2].id,
        recipeId: recipes[2].id,
      },
    }),
    prisma.rating.create({
      data: {
        rating: 4,
        review: 'Healthy and delicious. Great for meal prep!',
        userId: users[0].id,
        recipeId: recipes[3].id,
      },
    }),
    prisma.rating.create({
      data: {
        rating: 5,
        review: 'Impressive dish! Perfect for special occasions.',
        userId: users[1].id,
        recipeId: recipes[4].id,
      },
    }),
  ]);

  console.log(`✅ Created ${ratings.length} ratings`);

  // Create comments
  const comments = await Promise.all([
    prisma.comment.create({
      data: {
        content: 'Love this recipe! I added some nuts for extra crunch.',
        userId: users[2].id,
        recipeId: recipes[0].id,
      },
    }),
    prisma.comment.create({
      data: {
        content: 'The key is to not overcook the eggs. Great instructions!',
        userId: users[0].id,
        recipeId: recipes[1].id,
      },
    }),
    prisma.comment.create({
      data: {
        content: 'I used fresh herbs from my garden. So good!',
        userId: users[1].id,
        recipeId: recipes[2].id,
      },
    }),
  ]);

  console.log(`✅ Created ${comments.length} comments`);

  // Create follow relationships
  await prisma.follow.createMany({
    data: [
      { followerId: users[2].id, followingId: users[0].id },
      { followerId: users[2].id, followingId: users[1].id },
      { followerId: users[1].id, followingId: users[0].id },
    ],
  });

  console.log('✅ Created follow relationships');

  // Create notifications
  await prisma.notification.createMany({
    data: [
      {
        type: NotificationType.NEW_RECIPE,
        title: 'New Recipe Added',
        message: 'Chef Master added a new recipe: Beef Wellington',
        userId: users[2].id,
        data: { recipeId: recipes[4].id },
      },
      {
        type: NotificationType.NEW_RATING,
        title: 'New Rating',
        message: 'Your Chocolate Chip Cookies recipe received a 5-star rating!',
        userId: users[1].id,
        data: { recipeId: recipes[0].id, rating: 5 },
      },
      {
        type: NotificationType.NEW_COMMENT,
        title: 'New Comment',
        message: 'Someone commented on your Spaghetti Carbonara recipe',
        userId: users[0].id,
        data: { recipeId: recipes[1].id, commentId: comments[1].id },
      },
    ],
  });

  console.log('✅ Created notifications');

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
