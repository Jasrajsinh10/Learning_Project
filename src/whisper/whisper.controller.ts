import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { WhisperService } from './whisper.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('whisper')
export class WhisperController {
  constructor(private readonly whisperService: WhisperService) { }

  @Post('translate')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        // Generates a unique name: timestamp + extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  async translateAudio(@UploadedFile() file: Express.Multer.File) {
    return await this.whisperService.getTranslation(file.path);
  }
}