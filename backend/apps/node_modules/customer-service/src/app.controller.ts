import { Controller, Get, UsePipes, ValidationPipe } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { User } from './schemas/user.schema';
import { GetUserByIdDto } from './dto/request/get-user-by-id.dto';
import { GetUserByUsernameDto } from './dto/request/get-user-by-username.dto';
import { GetUserByEmailDto } from './dto/request/get-user-by-email.dto';
import { CheckPhoneExistDto } from './dto/request/check-phone-exist.dto';
import { CreateUserDto } from './dto/user/create-user.dto';

@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  @MessagePattern({ cmd: 'getUserById' })
  async getUserById(@Payload() data: GetUserByIdDto): Promise<User> {
    try {
      const result = await this.appService.getUserById(data.id);
    return result;
    } catch (err) {
      throw new Error(err);
    }
  }
  @MessagePattern({ cmd: 'getUserByUsername' })
  async getUserByUsername(@Payload() data: GetUserByUsernameDto): Promise<User> {
    try {
      const result = await this.appService.getUserByUsername(data.username);
      return result;
    } catch (err) {
      throw new Error(err);
    }
  }
  @MessagePattern({ cmd: 'getUserByEmail' })
  async getUserByEmail(@Payload() data: GetUserByEmailDto): Promise<any> {
    try {
      const result = await this.appService.getUserByEmail(data.email_address);
      return result;
    } catch (err) {
      throw new Error(err);
    }
  }
  @MessagePattern({ cmd: 'checkPhoneExist' })
  async checkPhoneExist(@Payload() data: CheckPhoneExistDto): Promise<Boolean> {
    try {
      const result = await this.appService.checkPhoneExist(data.phone_number);
      return result;
    } catch (err) {
      throw new Error(err);
    }
  }
  @MessagePattern({ cmd: 'createUser' })
  async createUser(@Payload() data: CreateUserDto): Promise<User> {
    try {
      const result = await this.appService.createUser(data);
      return result
    } catch (err) {
      throw new Error(err);
    }
  }
}
