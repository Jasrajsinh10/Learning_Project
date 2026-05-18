import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SearchModule } from './search/search.module';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';
import { WhisperModule } from './whisper/whisper.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SearchModule, 
    RedisModule, 
    UsersModule, 
    WhisperModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
