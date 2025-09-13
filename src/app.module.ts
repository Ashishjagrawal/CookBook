import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RecipesModule } from './recipes/recipes.module';
import { SearchModule } from './search/search.module';
import { RealtimeModule } from './realtime/realtime.module';
import { AiModule } from './ai/ai.module';
import { HealthModule } from './health/health.module';
import { PerformanceModule } from './performance/performance.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
      introspection: true,
      context: ({ req }: { req: any }) => ({ req }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RecipesModule,
    SearchModule,
    RealtimeModule,
    AiModule,
    HealthModule,
    PerformanceModule,
  ],
})
export class AppModule {}
