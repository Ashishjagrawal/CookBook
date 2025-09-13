import { registerEnumType } from '@nestjs/graphql';

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

registerEnumType(Difficulty, {
  name: 'Difficulty',
  description: 'Recipe difficulty levels',
});
