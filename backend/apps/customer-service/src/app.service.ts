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
}
