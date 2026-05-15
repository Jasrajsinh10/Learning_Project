import { Controller, Get, Post, Body, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { SearchService } from './search.service';
import { AddProductDto } from './dto/create-product.dto';
import { WhisperService } from 'src/whisper/whisper.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService,
    private readonly whisperService: WhisperService,
  ) {}

  // @Post()
  // create(@Body() createSearchDto: CreateSearchDto) {
  //   return this.searchService.create(createSearchDto);
  // }

  // @Get()
  // findAll() {
  //   return this.searchService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.searchService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateSearchDto: UpdateSearchDto) {
  //   return this.searchService.update(+id, updateSearchDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.searchService.remove(+id);
  // }

  @Get()
  async search(@Query('search') search: string) {
    return await this.searchService.searchProducts(search);
  }

  
  @Get('audio')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: '/Users/ztlab58/Desktop/learning_goal_project/src/whisper/uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  async searchByAudio(@UploadedFile() file: Express.Multer.File) {
    const query = await this.whisperService.getTranslation(file.path);
    console.log("Query: ", query);
    return await this.searchService.searchProducts(query);
  }

  @Post('add-product')
  async addProduct(@Body() products: AddProductDto[]) {
    return await this.searchService.addProducts(products);
  }
}
