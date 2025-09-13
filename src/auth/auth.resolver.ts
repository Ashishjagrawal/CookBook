import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { RegisterInput, LoginInput } from './dto/auth.input';
import { AuthResponse } from './dto/auth.response';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthResponse)
  async register(@Args('input') input: RegisterInput) {
    return this.authService.register(input);
  }

  @Mutation(() => AuthResponse)
  async login(@Args('input') input: LoginInput) {
    return this.authService.login(input);
  }
}
