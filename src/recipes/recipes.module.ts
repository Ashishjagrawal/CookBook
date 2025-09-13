import { Module, forwardRef } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { RecipesResolver } from './recipes.resolver';
import { SearchModule } from '../search/search.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SearchModule, forwardRef(() => AuthModule)],
  providers: [RecipesService, RecipesResolver],
  exports: [RecipesService],
})
export class RecipesModule {}
