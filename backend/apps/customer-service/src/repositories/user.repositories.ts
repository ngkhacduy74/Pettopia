// src/users/users.repository.ts
import { Injectable, NotFoundException } from '@nestjs/common';
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
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

  async findOneById(id: string): Promise<User | null> {
    return this.userModel.findOne({ id }).lean().exec();
  }
  async findOneByIdNotAdmin(id: string): Promise<User | null> {
    return this.userModel.findOne({ id }).select({ password: 0, __v: 0, secretKey: 0, is_active: 0, reward_point: 0, role: 0 }).lean().exec();
  }

  async findOneByUsername(username: string): Promise<User | null> {
    return this.userModel.findOne({ username }).select('+password').exec();
  }

  async findUserByEmail(email: string): Promise<any> {
    const result = await this.userModel
      .findOne({ 'email.email_address': email })
      .exec();

    return result
      ? { message: 'Email đã được sử dụng', status: false }
      : { message: 'Email chưa được đăng ký', status: true };
  }

  async findOneByEmailWithPassword(email: string): Promise<User | null> {
    return this.userModel
      .findOne({ 'email.email_address': email })
      .select('+password')
      .exec();
  }

  async checkPhoneExist(phone: string): Promise<any> {
    const result = await this.userModel
      .findOne({ 'phone.phone_number': phone })
      .exec();

    return result
      ? { message: 'Số điện thoại đã được sử dụng', status: false }
      : { message: 'Số điện thoại hợp lệ', status: true };
  }

  async createUser(user: CreateUserDto): Promise<User> {
    const userDocument = new this.userModel(user);
    return await userDocument.save();
  }

  async deleteUserById(id: string): Promise<User | null> {
    return this.userModel.findOneAndDelete({ id }).exec();
  }

  async updateUserStatus(id: string, status: UserStatus): Promise<User | null> {
    const isActive = status === UserStatus.ACTIVE;
    return this.userModel
      .findOneAndUpdate({ id }, { is_active: isActive }, { new: true })
      .exec();
  }

  async getAllUsers(
    data: GetAllUsersDto,
  ): Promise<PaginatedUsersResponse<User>> {
    const {
      page = 1,
      limit = 15,
      search,
      status,
      role,
      fullname,
      username,
      email_address,
      reward_point,
      phone_number,
      sort_field = 'createdAt',
      sort_order = 'desc',
    } = data;

    const skip = (page - 1) * limit;

    const query: any = {};

    if (search) {
      query.$or = [
        { fullname: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { 'email.email_address': { $regex: search, $options: 'i' } },
        { 'phone.phone_number': { $regex: search, $options: 'i' } },
      ];
    }

    if (status) query.is_active = status === 'active';
    if (role) query.role = role;
    if (fullname) query.fullname = { $regex: fullname, $options: 'i' };
    if (username) query.username = { $regex: username, $options: 'i' };
    if (email_address)
      query['email.email_address'] = { $regex: email_address, $options: 'i' };
    if (reward_point !== undefined) query.reward_point = reward_point;
    if (phone_number)
      query['phone.phone_number'] = { $regex: phone_number, $options: 'i' };

    const sort: any = {};
    sort[sort_field] = sort_order === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.userModel.find(query).sort(sort).skip(skip).limit(limit).exec(),
      this.userModel.countDocuments(query).exec(),
    ]);

    return { items, total, page, limit };
  }

  async addRoleToUser(id: string, newRole: string): Promise<User> {
    const validRoles = ['User', 'Admin', 'Vet', 'Staff', 'Clinic'];
    if (!validRoles.includes(newRole)) {
      throw new Error(`Role '${newRole}' không hợp lệ`);
    }

    const user = await this.userModel.findOne({ id }).exec();
    if (!user) throw new NotFoundException(`User ${id} không tồn tại`);

    if (!user.role.includes(newRole)) {
      user.role.push(newRole);
      await user.save();
    }

    return user;
  }

  async updateRole(id: string, newRole: string): Promise<User> {
    return this.addRoleToUser(id, newRole);
  }

  async removeRoleFromUser(id: string, role: string): Promise<User> {
    const user = await this.userModel.findOne({ id }).exec();
    if (!user) throw new NotFoundException('User không tồn tại');

    user.role = user.role.filter((r) => r !== role);
    await user.save();
    return user;
  }

  async totalDetailAccount(): Promise<any> {
    const result = await this.userModel.aggregate([
      { $unwind: '$role' },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    const data = {
      user: 0,
      staff: 0,
      clinic: 0,
      vet: 0,
    };

    result.forEach((item) => {
      const role = item._id.toLowerCase();
      if (data[role] !== undefined) {
        data[role] = item.count;
      }
    });

    return {
      status: true,
      message: 'Thống kê thành công',
      data,
    };
  }

  async updatePasswordByEmail(
    email: string,
    newPassword: string,
  ): Promise<User | null> {
    return this.userModel
      .findOneAndUpdate(
        { 'email.email_address': email },
        { password: newPassword },
        { new: true },
      )
      .exec();
  }

  async updatePasswordById(
    id: string,
    newPassword: string,
  ): Promise<User | null> {
    return this.userModel
      .findOneAndUpdate({ id }, { password: newPassword }, { new: true })
      .exec();
  }

  async updateUser(id: string, updateData: any): Promise<User | null> {
    console.log('UsersRepository.updateUser id:', id, 'updateData:', updateData);
    if (!updateData) {
      return this.userModel.findOne({ id }).exec();
    }
    const updateFields: any = {};
    if (updateData.fullname) updateFields.fullname = updateData.fullname;
    if (updateData.dob) updateFields.dob = updateData.dob;
    if (updateData.bio) updateFields.bio = updateData.bio;
    if (updateData.address) updateFields.address = updateData.address;
    if (updateData.is_active !== undefined) updateFields.is_active = updateData.is_active;

    // Handle nested fields update carefully
    if (updateData.phone_number) {
      updateFields['phone.phone_number'] = updateData.phone_number;
    }
    if (updateData.email_address) {
      updateFields['email.email_address'] = updateData.email_address;
    }
    console.log('UsersRepository.updateUser updateFields:', updateFields);

    return this.userModel
      .findOneAndUpdate({ id }, { $set: updateFields }, { new: true })
      .exec();
  }
}
