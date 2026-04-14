import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
  ],
  providers: [
    {
      // Register as global interceptor via DI (allows Reflector injection)
      provide: APP_INTERCEPTOR,
      useClass: ResponseEnvelopeInterceptor,
    },
  ],
})
export class AppModule {}
