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

// --- REDIS IMPORT ---
import redisClient from '../common/redis/redis.module';

@Injectable()
export class UsersRepository {
  private redis: typeof redisClient;
  private readonly cacheTTL = 1800; // Cache 30 phút

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {
    this.redis = redisClient;
  }

  // ========================================================================
  // SAFE CACHE HELPERS
  // ========================================================================

  private get isRedisReady(): boolean {
    return !!this.redis && (this.redis as any).isOpen === true;
  }

  private async safeCacheGet<T>(key: string): Promise<T | null> {
    if (!this.isRedisReady) return null;
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.warn(`[Redis GET Ignored] Key: ${key} - Err: ${err.message}`);
      return null;
    }
  }

  private async safeCacheSet(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.isRedisReady) return;
    try {
      await this.redis.set(key, JSON.stringify(value), {
        EX: ttl || this.cacheTTL,
      });
    } catch (err) {
      console.warn(`[Redis SET Ignored] Key: ${key} - Err: ${err.message}`);
    }
  }

  private async safeCacheDel(keys: string | string[]): Promise<void> {
    if (!this.isRedisReady) return;
    try {
      await this.redis.del(keys);
    } catch (err) {
      console.warn(`[Redis DEL Ignored] Err: ${err.message}`);
    }
  }

  // ========================================================================
  // KEY GENERATORS & INVALIDATION
  // ========================================================================

  private getKeyById(id: string): string {
    return `user:id:${id}`;
  }
  private getKeyByUsername(username: string): string {
    return `user:username:${username}`;
  }
  private getKeyByEmail(email: string): string {
    return `user:email:${email}`;
  }

  /**
   * Xóa tất cả cache liên quan đến 1 user (ID, Email, Username)
   */
  private async invalidateUserCache(user: User | UserDocument | null) {
    if (!user) return;
    const keys: string[] = [];

    if (user.id) keys.push(this.getKeyById(user.id));
    if (user.username) keys.push(this.getKeyByUsername(user.username));
    
    // Check cả structure email vì trong schema nó là object nested
    const email = user.email?.email_address;
    if (email) keys.push(this.getKeyByEmail(email));

    if (keys.length > 0) {
      await this.safeCacheDel(keys);
    }
  }

  // ========================================================================
  // MAIN METHODS
  // ========================================================================

  async findOneById(id: string): Promise<User | null> {
    const key = this.getKeyById(id);
    
    // 1. Redis
    const cached = await this.safeCacheGet<User>(key);
    if (cached) return cached;

    // 2. Mongo
    const user = await this.userModel.findOne({ id }).select('+password').lean().exec();

    // 3. Set Redis
    if (user) {
      await this.safeCacheSet(key, user);
    }
    return user;
  }

  async findOneByIdNotAdmin(id: string): Promise<User | null> {
    // Không cache hàm này hoặc dùng key riêng vì nó select field khác (-role, -secretKey...)
    // Để an toàn và đơn giản, ta cứ query DB trực tiếp cho hàm ít dùng này
    // Hoặc nếu muốn cache, phải tạo key `user:id:no-admin:${id}`
    return this.userModel.findOne({ id }).select('+password -__v -secretKey -is_active -reward_point -role').lean().exec();
  }

  async findOneByUsername(username: string): Promise<User | null> {
    const key = this.getKeyByUsername(username);
    const cached = await this.safeCacheGet<User>(key);
    if (cached) return cached;

    const user = await this.userModel.findOne({ username }).select('+password').lean().exec();

    if (user) {
      await this.safeCacheSet(key, user);
    }
    return user;
  }

  async findUserByEmail(email: string): Promise<any> {
    // Hàm này trả về custom object {message, status} chứ không phải User
    // Nên không cache hoặc cache với key riêng nếu cần thiết.
    // Hiện tại để trực tiếp DB để đảm bảo tính real-time khi đăng ký.
    const result = await this.userModel
      .findOne({ 'email.email_address': email })
      .exec();

    return result
      ? { message: 'Email đã được sử dụng', status: false }
      : { message: 'Email chưa được đăng ký', status: true };
  }

  async findOneByEmailWithPassword(email: string): Promise<User | null> {
    const key = this.getKeyByEmail(email);
    const cached = await this.safeCacheGet<User>(key);
    if (cached) return cached;

    const user = await this.userModel
      .findOne({ 'email.email_address': email })
      .select('+password')
      .lean()
      .exec();

    if (user) {
      await this.safeCacheSet(key, user);
    }
    return user;
  }

  async findUserByPhoneNumber(phone: string): Promise<User | null> {
    // Find user by phone number and return the actual User object
    const user = await this.userModel
      .findOne({ 'phone.phone_number': phone })
      .lean()
      .exec();
    return user;
  }

  async findActualUserByEmail(email: string): Promise<User | null> {
    // Find user by email and return the actual User object (not custom response)
    const user = await this.userModel
      .findOne({ 'email.email_address': email })
      .lean()
      .exec();
    return user;
  }

  async checkPhoneExist(phone: string): Promise<any> {
    const result = await this.userModel
      .findOne({ 'phone.phone_number': phone })
      .exec();

    return result
      ? { message: 'Số điện thoại đã được sử dụng', status: false }
      : { message: 'Số điện thoại hợp lệ', status: true };
  }

  async checkUsernameExist(username: string): Promise<any> {
    const result = await this.userModel
      .findOne({ username })
      .exec();

    return result
      ? { message: 'Tên đăng nhập đã được sử dụng', status: false }
      : { message: 'Tên đăng nhập hợp lệ', status: true };
  }

  async createUser(user: CreateUserDto): Promise<User> {
    const userDocument = new this.userModel(user);
    return await userDocument.save();
  }

  async deleteUserById(id: string): Promise<User | null> {
    const deletedUser = await this.userModel.findOneAndDelete({ id }).exec();
    if (deletedUser) {
      await this.invalidateUserCache(deletedUser);
    }
    return deletedUser;
  }

  async updateUserStatus(id: string, status: UserStatus): Promise<User | null> {
    const isActive = status === UserStatus.ACTIVE;
    const updatedUser = await this.userModel
      .findOneAndUpdate({ id }, { is_active: isActive }, { new: true })
      .exec();
    
    await this.invalidateUserCache(updatedUser);
    return updatedUser;
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
      // Invalidate cache
      await this.invalidateUserCache(user);
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
    
    // Invalidate cache
    await this.invalidateUserCache(user);
    
    return user;
  }

  async totalDetailAccount(): Promise<any> {
    // Có thể cache kết quả thống kê này trong thời gian ngắn (ví dụ 5 phút) nếu query nặng
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
    const updatedUser = await this.userModel
      .findOneAndUpdate(
        { 'email.email_address': email },
        { password: newPassword },
        { new: true },
      )
      .exec();

    await this.invalidateUserCache(updatedUser);
    return updatedUser;
  }

  async updatePasswordById(
    id: string,
    newPassword: string,
  ): Promise<User | null> {
    const updatedUser = await this.userModel
      .findOneAndUpdate({ id }, { password: newPassword }, { new: true })
      .exec();

    await this.invalidateUserCache(updatedUser);
    return updatedUser;
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
    if (updateData.is_vip !== undefined) updateFields.is_vip = updateData.is_vip;
    if (updateData.vip_expires_at !== undefined) updateFields.vip_expires_at = updateData.vip_expires_at;
    if (updateData.clinic_id) updateFields.clinic_id = updateData.clinic_id;

    // Handle nested fields update carefully
    if (updateData.phone_number) {
      updateFields['phone.phone_number'] = updateData.phone_number;
    }
    if (updateData.email_address) {
      updateFields['email.email_address'] = updateData.email_address;
    }
    console.log('UsersRepository.updateUser updateFields:', updateFields);

    const updatedUser = await this.userModel
      .findOneAndUpdate({ id }, { $set: updateFields }, { new: true })
      .exec();
    
    // Quan trọng: Xóa cache cũ đi để lần sau get ra data mới
    await this.invalidateUserCache(updatedUser);

    return updatedUser;
  }

  /**
   * Expire VIP status cho các user đã hết hạn
   * @returns Số lượng user đã được expire
   */
  async expireVipUsers(): Promise<number> {
    const now = new Date();
    // 1. Tìm các user sẽ bị expire để xóa cache
    const usersToExpire = await this.userModel.find({
      is_vip: true,
      vip_expires_at: { $lte: now },
    }).select('id username email').exec();

    if (usersToExpire.length === 0) return 0;

    // 2. Update DB
    const result = await this.userModel
      .updateMany(
        {
          is_vip: true,
          vip_expires_at: { $lte: now },
        },
        {
          $set: {
            is_vip: false,
            vip_expires_at: null,
          },
        },
      )
      .exec();

    // 3. Xóa cache cho danh sách user này
    // Vì số lượng có thể nhiều, ta dùng Promise.all hoặc loop
    // Lưu ý: loop này không await để tránh block, hoặc await nếu cần tuần tự
    for (const user of usersToExpire) {
        await this.invalidateUserCache(user);
    }

    return result.modifiedCount;
  }
}