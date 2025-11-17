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
import redisClient from '../common/redis/redis.module.js';
import {
  GetAllUsersDto,
  PaginatedUsersResponse,
} from 'src/dto/request/get-all-user.dto';

@Injectable()
export class UsersRepository {
  private redis: typeof redisClient;
  private readonly userCacheTTL = 3600;
  private readonly totalCacheTTL = 600;
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {
    this.redis = redisClient;
  }
  private getUserKeyById(id: string): string {
    return `user:${id}`;
  }

  /**
   * Helper tạo key cache cho user bằng Email
   */
  private getUserKeyByEmail(email: string): string {
    return `user:email:${email}`;
  }

  /**
   * Helper tạo key cache cho user bằng Username
   */
  private getUserKeyByUsername(username: string): string {
    return `user:username:${username}`;
  }

  /**
   * Helper tạo key cache cho user bằng Phone
   */
  private getUserKeyByPhone(phone: string): string {
    return `user:phone:${phone}`;
  }
  private async invalidateUserCache(user: UserDocument | User) {
    if (!user) return;

    // Xóa cache bằng ID
    if (user.id) {
      await this.redis.del(this.getUserKeyById(user.id));
    }
    // Xóa cache bằng Username
    if (user.username) {
      await this.redis.del(this.getUserKeyByUsername(user.username));
    }
    // Xóa cache bằng Email
    // Giả định cấu trúc email
    const email = (user.email as any)?.email_address || user.email;
    if (email) {
      await this.redis.del(this.getUserKeyByEmail(email));
    }
    // Xóa cache bằng Phone
    const phone = (user.phone as any)?.phone_number || user.phone;
    if (phone) {
      await this.redis.del(this.getUserKeyByPhone(phone));
    }
  }
  private async invalidateTotalAccountCache() {
    await this.redis.del('users:total_detail');
  }
  async findOneById(id: string): Promise<User | null> {
    const key = this.getUserKeyById(id);
    try {
      const cachedUser = await this.redis.get(key);
      if (cachedUser) {
        return JSON.parse(cachedUser); // Cache Hit
      }
      const result = await this.userModel.findOne({ id }).lean().exec();
      if (result) {
        await this.redis.set(key, JSON.stringify(result), {
          EX: this.userCacheTTL,
        });
      }

      return result;
    } catch (err) {
      throw new Error(err);
    }
  }

  async findOneByUsername(username: string): Promise<User | null> {
    const key = this.getUserKeyByUsername(username);
    try {
      const cachedUser = await this.redis.get(key);
      if (cachedUser) {
        return JSON.parse(cachedUser);
      }
      const result = await this.userModel
        .findOne({ username: username })
        .select('+password')
        .exec();
      if (result) {
        await this.redis.set(key, JSON.stringify(result), {
          EX: this.userCacheTTL,
        });
      }
      return result;
    } catch (err) {
      throw new Error(err);
    }
  }

  async findUserByEmail(email: string): Promise<any> {
    const key = this.getUserKeyByEmail(email);
    try {
      const cachedResult = await this.redis.get(key);
      if (cachedResult) {
        return JSON.parse(cachedResult);
      }
      
      const result = await this.userModel
        .findOne({ 'email.email_address': email })
        .exec();
      
      const response = !result ? {
        message: 'Email chưa được đăng kí',
        status: true,
      } : {
        message: 'Email đã được sử dụng',
        status: false,
      };
      
      await this.redis.set(key, JSON.stringify(response), {
        EX: this.userCacheTTL,
      });
      
      return response;
    } catch (err) {
      throw new Error(err);
    }
  }

  async findOneByEmailWithPassword(email: string): Promise<User | null> {
    const key = `user:email:password:${email}`;
    try {
      const cachedUser = await this.redis.get(key);
      if (cachedUser) {
        return JSON.parse(cachedUser);
      }
      
      const result = await this.userModel
        .findOne({ 'email.email_address': email })
        .select('+password')
        .exec();
      
      if (result) {
        await this.redis.set(key, JSON.stringify(result), {
          EX: this.userCacheTTL,
        });
      }
      
      return result;
    } catch (err) {
      throw new Error(err);
    }
  }

  async checkPhoneExist(phone_number: string): Promise<any> {
    const key = this.getUserKeyByPhone(phone_number);
    try {
      const cachedResult = await this.redis.get(key);
      if (cachedResult) {
        return JSON.parse(cachedResult);
      }
      
      const result = await this.userModel
        .findOne({ 'phone.phone_number': phone_number })
        .exec();
      
      const response = !result ? {
        message: 'Số điện thoại hợp lệ',
        status: true,
      } : {
        message: 'Số điện thoại đã được sử dụng',
        status: false,
      };
      
      await this.redis.set(key, JSON.stringify(response), {
        EX: this.userCacheTTL,
      });
      
      return response;
    } catch (err) {
      throw new Error(err);
    }
  }

  async createUser(user: CreateUserDto): Promise<any> {
    try {
      const userDocument = new this.userModel(user);
      const result = await userDocument.save();
      
      // Invalidate relevant caches when creating new user
      await this.invalidateTotalAccountCache();
      
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
      
      // Invalidate user cache and total account cache when deleting user
      if (result) {
        await this.invalidateUserCache(result);
        await this.invalidateTotalAccountCache();
      }
      
      return result;
    } catch (err) {
      throw new Error(err);
    }
  }
  async updateUserStatus(id: string, status: UserStatus): Promise<any> {
    try {
      const isActive = status === UserStatus.ACTIVE;
      const result = await this.userModel
        .findOneAndUpdate({ id: id }, { is_active: isActive }, { new: true })
        .exec();
      
      // Invalidate user cache when status changes
      if (result) {
        await this.invalidateUserCache(result);
      }
      
      return result;
    } catch (err) {
      throw new Error(err.message);
    }
  }

  async getAllUsers(
    data: GetAllUsersDto,
  ): Promise<PaginatedUsersResponse<User>> {
    const cacheKey = `users:all:${JSON.stringify(data)}`;
    try {
      const cachedData = await this.redis.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData); 
        }
      const {
        page,
        limit,
        search,
        status,
        role,
        sort_field = 'createdAt',
        sort_order = 'desc',
        fullname,
        username,
        email_address,
        reward_point,
        phone_number,
      } = data;

      const safePage = Math.max(Number(page) || 1, 1);
      const safeLimit = Math.max(Number(limit) || 15, 1);
      const skip = (safePage - 1) * safeLimit;

      // Build the query
      const query: any = {};

      // Apply search filter if provided
      if (search) {
        query.$or = [
          { fullname: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } },
          { 'email.email_address': { $regex: search, $options: 'i' } },
          { 'phone.phone_number': { $regex: search, $options: 'i' } },
        ];
      }

      // Apply status filter if provided
      if (status) {
        query.is_active = status === 'active';
      }

      // Apply role filter if provided
      if (role) {
        query.role = role;
      }

      // Apply individual field filters if provided
      if (fullname) {
        query.fullname = { $regex: fullname, $options: 'i' };
      }

      if (username) {
        query.username = { $regex: username, $options: 'i' };
      }

      if (email_address) {
        query['email.email_address'] = { $regex: email_address, $options: 'i' };
      }

      if (reward_point !== undefined) {
        query.reward_point = reward_point;
      }

      if (phone_number) {
        query['phone.phone_number'] = { $regex: phone_number, $options: 'i' };
      }

      // Build sort object
      const sort: any = {};
      if (sort_field) {
        sort[sort_field] = sort_order === 'asc' ? 1 : -1;
      } else {
        sort['createdAt'] = -1; // Default sort by createdAt desc
      }

      const [items, total] = await Promise.all([
        this.userModel
          .find(query)
          .sort(sort)
          .skip(skip)
          .limit(safeLimit)
          .exec(),
        this.userModel.countDocuments(query).exec(),
      ]);
await this.redis.set(cacheKey, JSON.stringify({ items,
        total,
        page: safePage,
        limit: safeLimit,}), {
            EX: this.totalCacheTTL, 
        });
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
      
      // Invalidate user cache and total account cache when role changes
      await this.invalidateUserCache(user);
      await this.invalidateTotalAccountCache();
      
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
      
      // Invalidate user cache and total account cache when role changes
      await this.invalidateUserCache(user);
      await this.invalidateTotalAccountCache();
      
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
    
    // Invalidate user cache and total account cache when role changes
    await this.invalidateUserCache(user);
    await this.invalidateTotalAccountCache();
    
    return user;
  }
  async totalDetailAccount(): Promise<any> {
    const cacheKey = 'users:total_detail';
    try {
      const cachedResult = await this.redis.get(cacheKey);
      if (cachedResult) {
        return JSON.parse(cachedResult);
      }
      
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

      const response = {
        status: true,
        message: 'Đã lấy thành công tổng các account theo role',
        data,
      };
      
      // Cache the result with shorter TTL since this is aggregate data
      await this.redis.set(cacheKey, JSON.stringify(response), {
        EX: this.totalCacheTTL,
      });

      return response;
    } catch (err) {
      throw new Error(err);
    }
  }
  async updatePasswordByEmail(
    email: string,
    newPassword: string,
  ): Promise<User | null> {
    try {
      const result = await this.userModel
        .findOneAndUpdate(
          { 'email.email_address': email },
          { password: newPassword },
          { new: true },
        )
        .exec();
      
      // Invalidate user cache when password changes
      if (result) {
        await this.invalidateUserCache(result);
        // Also invalidate the email:password cache key
        await this.redis.del(`user:email:password:${email}`);
      }
      
      return result;
    } catch (err) {
      throw new Error(err);
    }
  }
  async updatePasswordById(
    id: string,
    newPassword: string,
  ): Promise<User | null> {
    try {
      const result = await this.userModel
        .findOneAndUpdate({ id }, { password: newPassword }, { new: true })
        .exec();
      
      // Invalidate user cache when password changes
      if (result) {
        await this.invalidateUserCache(result);
        // Also invalidate the email:password cache key
        const email = (result.email as any)?.email_address || result.email;
        if (email) {
          await this.redis.del(`user:email:password:${email}`);
        }
      }
      
      return result;
    } catch (err) {
      throw new Error(err);
    }
  }
}
