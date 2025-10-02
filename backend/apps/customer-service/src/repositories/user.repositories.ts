// src/users/users.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateUserDto } from 'src/dto/user/create-user.dto';

@Injectable()
export class UsersRepository {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findOneById(id: string): Promise<User | null> {
    try {
      const result = await this.userModel.findOne({ id }).exec();
      return result;
    } catch (err) {
      throw new Error(err);
    }
  }

  async findOneByUsername(username: string): Promise<User | null> {
    try {
      const result = await this.userModel
        .findOne({ username: username })
        .exec();
      return result;
    } catch (err) {
      throw new Error(err);
    }
  }

  async findUserByEmail(email: string): Promise<any> {
    try {
      const result = await this.userModel
        .findOne({ 'email.email_address': email })
        .exec();
      if (!result) {
        return {
          message: 'Email chưa được đăng kí',
          status: true,
        };
      }
      return {
        message: 'Email đã được sử dụng',
        status: false,
      };
    } catch (err) {
      throw new Error(err);
    }
  }

  async checkPhoneExist(phone_number: string): Promise<any> {
    try {
      const result = await this.userModel
        .findOne({ 'phone.phone_number': phone_number })
        .exec();
      if (!result) {
        return {
          message: 'Số điện thoại hợp lệ',
          status: true,
        };
      }
      return {
        message: 'Số điện thoại đã được sử dụng',
        status: false,
      };
    } catch (err) {
      throw new Error(err);
    }
  }

  async createUser(user: CreateUserDto): Promise<any> {
    try {
      const userDocument = new this.userModel(user);
      const result = await userDocument.save();
      return result;
    } catch (err) {
      throw new Error(err);
    }
  }
}
