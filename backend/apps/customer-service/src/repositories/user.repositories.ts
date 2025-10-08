// src/users/users.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateUserDto } from 'src/dto/user/create-user.dto';
import { UserStatus } from 'src/dto/request/update-user-status.dto';
import {
  GetAllUsersDto,
  PaginatedUsersResponse,
} from 'src/dto/request/get-all-user.dto';

@Injectable()
export class UsersRepository {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findOneById(id: string): Promise<User | null> {
    try {
      const result = await this.userModel.findOne({ id }).lean().exec();
      console.log("hello1233",result);
      return result;
    } catch (err) {
      throw new Error(err);
    }
  }

  async findOneByUsername(username: string): Promise<User | null> {
    try {
      const result = await this.userModel
        .findOne({ username: username })
        .select('+password')
        .exec();
      console.log('result findOneByUsername', result);
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

  async deleteUserById(id: string): Promise<any> {
    try {
      const result = await this.userModel
        .findOneAndDelete({ id }, { is_active: false })
        .exec();
      return result;
    } catch (err) {
      throw new Error(err);
    }
  }
  async updateUserStatus(id: string, status: UserStatus): Promise<any> {
    try {
      const result = await this.userModel
        .findOneAndUpdate({ id }, { is_active: status })
        .exec();
      return result;
    } catch (err) {
      throw new Error(err);
    }
  }

  async getAllUsers(
    data: GetAllUsersDto,
  ): Promise<PaginatedUsersResponse<User>> {
    try {
      const { page, limit, search, status, role, sort_field, sort_order } =
        data;

      const safePage = Math.max(Number(page) || 1, 1);
      const safeLimit = Math.max(Number(limit) || 15, 1);
      const skip = (safePage - 1) * safeLimit;
      const filter: any = {};
      if (search) {
        const regex = new RegExp(search, 'i');
        filter.$or = [
          { fullname: regex },
          { username: regex },
          { 'email.email_address': regex },
          { 'phone.phone_number': regex },
        ];
      }
      if (status) {
        filter.is_active = status === 'active';
      }
      if (role) {
        filter.role = role;
      }
      const sort: any = {};
      if (sort_field) {
        sort[sort_field] = sort_order === 'asc' ? 1 : -1;
      } else {
        sort['createdAt'] = -1;
      }
      const [items, total] = await Promise.all([
        this.userModel
          .find(filter)
          .sort(sort)
          .skip(skip)
          .limit(safeLimit)
          .exec(),
        this.userModel.countDocuments(filter).exec(),
      ]);

      return {
        items,
        total,
        page: safePage,
        limit: safeLimit,
      };
    } catch (err) {
      throw new Error(err);
    }
  }
}
