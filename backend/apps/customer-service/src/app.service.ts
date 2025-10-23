import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { User, UserDocument } from './schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { UsersRepository } from './repositories/user.repositories';
import { CreateUserDto } from './dto/user/create-user.dto';
import { UserStatus } from './dto/request/update-user-status.dto';
import {
  GetAllUsersDto,
  PaginatedUsersResponse,
} from './dto/request/get-all-user.dto';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private userRepositories: UsersRepository,
  ) {}
  async getUserById(id: string): Promise<User> {
    try {
      const user = await this.userRepositories.findOneById(id);
      console.log('userReopsasd', user);
      if (!user) {
        throw new RpcException(
          new NotFoundException(`Không tìm thấy người dùng với id: ${id}`),
        );
      }

      return user;
    } catch (err) {
      if (err instanceof RpcException) {
        throw err;
      }
      throw new RpcException(
        new InternalServerErrorException(
          err.message || `Lỗi khi lấy thông tin người dùng với id: ${id}`,
        ),
      );
    }
  }
  async getUserByUsername(username: string): Promise<User> {
    try {
      const user = await this.userRepositories.findOneByUsername(username);
      console.log('user by username', user);
      if (!user) {
        throw new NotFoundException(
          `Không tìm thấy người dùng với username: ${username}`,
        );
      }

      return user;
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      throw new InternalServerErrorException(
        err.message || 'Lỗi khi truy vấn người dùng theo username',
      );
    }
  }

  async getUserByEmail(email_address: string): Promise<User | boolean> {
    try {
      const user = await this.userRepositories.findUserByEmail(email_address);

      if (!user) {
        return false;
      }
      return user;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Error while fetching user by email',
      );
    }
  }

  async checkPhoneExist(phone_number: string): Promise<boolean> {
    try {
      const exist = await this.userRepositories.checkPhoneExist(phone_number);
      return !!exist;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Error checking phone number existence',
      );
    }
  }
  async createUser(user: CreateUserDto): Promise<User> {
    try {
      const save_user = await this.userRepositories.createUser(user);

      if (!save_user) {
        throw new InternalServerErrorException('Failed to create user');
      }

      return save_user;
    } catch (err) {
      if (err.code === 11000) {
        throw new ConflictException('User already exists (duplicate field)');
      }

      throw new InternalServerErrorException(
        err.message || 'Error creating user',
      );
    }
  }
  async deleteUserById(id: string): Promise<User> {
    try {
      const delete_user = await this.userRepositories.deleteUserById(id);

      if (!delete_user) {
        throw new NotFoundException(
          `User with id ${id} not found or already deleted`,
        );
      }

      return delete_user;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Failed to delete user',
      );
    }
  }
  async updateUserStatus(id: string, status: UserStatus): Promise<User> {
    try {
      const update_user = await this.userRepositories.updateUserStatus(
        id,
        status,
      );

      if (!update_user) {
        throw new NotFoundException(
          `User with id ${id} not found or could not be updated`,
        );
      }

      return update_user;
    } catch (err) {
      throw new InternalServerErrorException(
        err.message || 'Something went wrong',
      );
    }
  }
  async getAllUsers(
    data: GetAllUsersDto,
  ): Promise<PaginatedUsersResponse<User>> {
    try {
      return await this.userRepositories.getAllUsers(data);
    } catch (err) {
      throw new Error(err);
    }
  }
  async test(): Promise<any> {
    return { message: 'đã chạy connect được vào customer' };
  }
  async addRoleToUser(id: string, newRole: string): Promise<User> {
    try {
      const updatedUser = await this.userRepositories.addRoleToUser(
        id,
        newRole,
      );

      if (!updatedUser) {
        throw new RpcException(
          new NotFoundException(`Không tìm thấy người dùng với id: ${id}`),
        );
      }

      return updatedUser;
    } catch (err) {
      if (err instanceof RpcException) throw err;

      throw new RpcException(
        new InternalServerErrorException(
          err.message || 'Lỗi khi thêm role cho user',
        ),
      );
    }
  }
  async removeRoleFromUser(userId: string, role: string): Promise<User> {
    try {
      const updatedUser = await this.userRepositories.removeRoleFromUser(
        userId,
        role,
      );

      if (!updatedUser) {
        throw new RpcException(
          new NotFoundException(`Không tìm thấy người dùng với id: ${userId}`),
        );
      }

      return updatedUser;
    } catch (err) {
      if (err instanceof RpcException) throw err;

      throw new RpcException(
        new InternalServerErrorException(
          err.message || 'Lỗi khi xóa role khỏi người dùng',
        ),
      );
    }
  }
  async addRoleAutomatically(userId: string, role: string): Promise<any> {
    try {
      const updatedUser = await this.userRepositories.updateRole(userId, role);

      if (!updatedUser) {
        throw new NotFoundException(`Không tìm thấy user với id: ${userId}`);
      }

      return {
        message: `Thêm role ${role} thành công.`,
        user: updatedUser,
      };
    } catch (error) {
      throw new InternalServerErrorException('Không thể thêm role cho user.');
    }
  }
}
