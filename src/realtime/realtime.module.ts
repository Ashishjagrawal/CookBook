import { Module, forwardRef } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RealtimeService } from './realtime.service';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeResolver } from './realtime.resolver';
import { KafkaService } from './kafka.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN') || '7d',
        },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => AuthModule),
  ],
  providers: [RealtimeService, RealtimeGateway, RealtimeResolver, KafkaService],
  exports: [RealtimeService, KafkaService],
})
export class RealtimeModule {}
