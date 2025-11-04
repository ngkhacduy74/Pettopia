// src/users/users.repository.ts
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
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
      const { page, limit } = data;

      const safePage = Math.max(Number(page) || 1, 1);
      const safeLimit = Math.max(Number(limit) || 15, 1);
      const skip = (safePage - 1) * safeLimit;

      const [items, total] = await Promise.all([
        this.userModel
          .find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(safeLimit)
          .exec(),
        this.userModel.countDocuments().exec(),
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

  async addRoleToUser(id: string, newRole: string): Promise<User> {
    try {
      const validRoles = ['User', 'Admin', 'Vet', 'Staff', 'Clinic'];
      if (!validRoles.includes(newRole)) {
        throw new Error(`Role '${newRole}' không hợp lệ`);
      }
      const user = await this.userModel.findOne({ id: id }).exec();
      if (!user) {
        throw new Error(`User với id '${id}' không tồn tại`);
      }
      if (user.role.includes(newRole)) {
        return user;
      }
      user.role.push(newRole);
      await user.save();
      return user;
    } catch (err) {
      throw new Error(err.message || 'Lỗi khi thêm role cho user');
    }
  }

  async updateRole(id: string, newRole: string): Promise<User> {
    try {
      const validRoles = ['User', 'Admin', 'Vet', 'Staff', 'Clinic'];
      if (!validRoles.includes(newRole)) {
        throw new Error(`Role '${newRole}' không hợp lệ`);
      }
      const user = await this.userModel.findOne({ id: id }).exec();
      if (!user) {
        throw new Error(`User với id '${id}' không tồn tại`);
      }
      if (user.role.includes(newRole)) {
        return user;
      }
      user.role.push(newRole);
      await user.save();
      return user;
    } catch (err) {
      throw new Error(err.message || 'Lỗi khi thêm role cho user');
    }
  }
  async removeRoleFromUser(userId: string, role: string): Promise<User> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại.');
    }

    if (!user.role.includes(role)) {
      throw new NotFoundException(`Người dùng không có role: ${role}`);
    }

    user.role = user.role.filter((r) => r !== role);
    await user.save();
    return user;
  }
  async totalDetailAccount(): Promise<any> {
    const result = await this.userModel.aggregate([
      { $unwind: '$role' }, // Nếu role là array
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    const data = {
      user: 0,
      staff: 0,
      clinic: 0,
      vet: 0,
    };

    result.forEach((item) => {
      const role = item._id.toLowerCase();
      if (data.hasOwnProperty(role)) {
        data[role] = item.count;
      }
    });

    return {
      status: true,
      message: 'Đã lấy thành công tổng các account theo role',
      data,
    };
  }
}
