import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { User, UserDocument } from './schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import { UsersRepository } from './repositories/user.repositories';
import { CreateUserDto } from './dto/user/create-user.dto';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private userRepositories: UsersRepository,
  ) {}
  async getUserById(id: string): Promise<User> {
    const user = await this.userRepositories.findOneById(id);
    if (!user) {
      throw new RpcException(
        new NotFoundException(`User with id '${id}' not found.`),
      );
    }
    return user;
  }
  async getUserByUsername(username: string): Promise<User> {
    const user = await this.userRepositories.findOneByUsername(username);
    if (!user) {
      throw new NotFoundException(
        `Không tìm thấy người dùng với username : ${username}`,
      );
    }
    return user;
  }

  async getUserByEmail(email_address: string): Promise<User | Boolean> {
    try {
      const user = await this.userRepositories.findUserByEmail(email_address);
      if (!user) {
        return false;
      }
      return true;
    } catch (err) {
      throw new Error(err);
    }
  }

  async checkPhoneExist(phone_number: string): Promise<Boolean> {
    try {
      const exist = await this.userRepositories.checkPhoneExist(phone_number);
      if (exist) {
        return true;
      }
      return false;
    } catch (err) {
      throw new Error(err);
    }
  }
  async createUser(user: CreateUserDto): Promise<User> {
    try {
      const save_user = await this.userRepositories.createUser(user);
      return save_user || null;
    } catch (err) {
      throw new Error(err);
    }
  }
}