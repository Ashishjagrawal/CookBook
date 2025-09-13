import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';

@ObjectType()
export class Rating {
  @Field(() => ID)
  id: string;

  @Field(() => Int)
  rating: number;

  @Field({ nullable: true })
  review?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Relations
  @Field(() => User, { nullable: true })
  user?: User;
}
