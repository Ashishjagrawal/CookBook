import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiResolver } from './ai.resolver';
import { RecipesModule } from '../recipes/recipes.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule, RecipesModule, forwardRef(() => AuthModule)],
  providers: [AiService, AiResolver],
  exports: [AiService],
})
export class AiModule {}
