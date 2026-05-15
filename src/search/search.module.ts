import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { RedisModule } from 'src/redis/redis.module';
import { WhisperModule } from 'src/whisper/whisper.module';
import { AiService } from './ai.service';

@Module({
  imports: [RedisModule, WhisperModule],
  controllers: [SearchController],
  providers: [SearchService, AiService],
})
export class SearchModule { }
