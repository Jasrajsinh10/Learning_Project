import { Controller, Post, Body, HttpException, HttpStatus, Headers } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  async register(@Body() body: any) {
    try {
      const user = await this.usersService.createUser(body.username, body.password);
      return { success: true, user };
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('login')
  async login(@Body() body: any) {
    try {
      const result = await this.usersService.authenticate(body.username, body.password);
      return { success: true, ...result };
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
    }
  }

  @Post('logout')
  async logout(@Headers('authorization') authHeader: string) {
    if (!authHeader) {
      throw new HttpException('No authorization token provided', HttpStatus.UNAUTHORIZED);
    }
    const token = authHeader.replace('Bearer ', '');
    try {
      return await this.usersService.logout(token);
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
    }
  }
}
