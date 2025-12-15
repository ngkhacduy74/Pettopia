import {
  // Bỏ ConflictException, InternalServerErrorException, NotFoundException
  Injectable,
  HttpStatus, // Thêm HttpStatus
} from '@nestjs/common';
import { User, UserRole } from '../schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { RpcException } from '@nestjs/microservices'; // Chỉ cần RpcException
import { UsersRepository } from '../repositories/user.repositories';
import { CreateUserDto } from '../dto/user/create-user.dto';
import { UserStatus } from '../dto/request/update-user-status.dto';
import { UpdateUserDto } from '../dto/request/update-user.dto';
import {
  GetAllUsersDto,
  PaginatedUsersResponse,
} from '../dto/request/get-all-user.dto';

@Injectable()
export class AppService {
  constructor(private userRepositories: UsersRepository) { }

  async getUserById(id: string, role?: string | string[]): Promise<User | null> {
    try {
      let user: User | null = null;


      const userRoles = Array.isArray(role) ? role : [role];

      const isAdminOrStaff = userRoles.includes(UserRole.ADMIN) || userRoles.includes(UserRole.STAFF);

      if (isAdminOrStaff) {

        user = await this.userRepositories.findOneById(id);
      } else {

        user = await this.userRepositories.findOneByIdNotAdmin(id);
      }

      if (!user) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Không tìm thấy người dùng với id: ${id}`,
        });
      }

      return user;

    } catch (err) {

      console.error('ERROR LOG:', err);
      if (err instanceof RpcException) throw err;
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: err.message
      });
    }
  }

  async getUserByUsername(username: string): Promise<User> {
    try {
      const user = await this.userRepositories.findOneByUsername(username);
      console.log('user by username', user);
      if (!user) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Không tìm thấy người dùng với username: ${username}`,
        });
      }
      return user;
    } catch (err) {
      if (err instanceof RpcException) {
        throw err;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: err.message || 'Lỗi khi truy vấn người dùng theo username',
      });
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
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: err.message || 'Error while fetching user by email',
      });
    }
  }

  async getUserByEmailForAuth(email_address: string): Promise<User> {
    try {
      const user =
        await this.userRepositories.findOneByEmailWithPassword(email_address);
      if (!user) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Không tìm thấy người dùng với email: ${email_address}`,
        });
      }
      return user as unknown as User;
    } catch (err) {
      if (err instanceof RpcException) {
        throw err;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: err.message || 'Lỗi khi truy vấn người dùng theo email',
      });
    }
  }

  async checkPhoneExist(phone_number: string): Promise<any> {
    try {
      const exist = await this.userRepositories.checkPhoneExist(phone_number);
      return exist;
    } catch (err) {
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: err.message || 'Error checking phone number existence',
      });
    }
  }

  async checkUsernameExist(username: string): Promise<any> {
    try {
      const exist = await this.userRepositories.checkUsernameExist(username);
      return exist;
    } catch (err) {
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: err.message || 'Error checking username existence',
      });
    }
  }

  async createUser(user: CreateUserDto): Promise<User> {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashPass = await bcrypt.hash(user.password, salt);
      const new_user = { ...user, password: hashPass };

      const save_user = await this.userRepositories.createUser(new_user);

      if (!save_user) {
        throw new RpcException({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to create user',
        });
      }
      return save_user;
    } catch (err) {
      if (err.code === 11000) {
        throw new RpcException({
          status: HttpStatus.CONFLICT,
          message: 'User already exists (duplicate field)',
        });
      }

      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: err.message || 'Error creating user',
      });
    }
  }

  async deleteUserById(id: string): Promise<User> {
    try {
      const delete_user = await this.userRepositories.deleteUserById(id);

      if (!delete_user) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `User with id ${id} not found or already deleted`,
        });
      }
      return delete_user;
    } catch (err) {
      if (err instanceof RpcException) {
        throw err;
      }

      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: err.message || 'Failed to delete user',
      });
    }
  }

  async updateUserStatus(id: string, status: UserStatus): Promise<User> {
    try {
      const update_user = await this.userRepositories.updateUserStatus(
        id,
        status,
      );

      if (!update_user) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `User with id ${id} not found or could not be updated`,
        });
      }
      return update_user;
    } catch (err) {
      if (err instanceof RpcException) {
        throw err;
      }

      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: err.message || 'Something went wrong',
      });
    }
  }

  async getAllUsers(
    data: GetAllUsersDto,
  ): Promise<PaginatedUsersResponse<User>> {
    try {
      return await this.userRepositories.getAllUsers(data);
    } catch (err) {
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: err.message || 'Lỗi khi lấy danh sách người dùng',
      });
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
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Không tìm thấy người dùng với id: ${id}`,
        });
      }
      return updatedUser;
    } catch (err) {
      if (err instanceof RpcException) throw err;

      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: err.message || 'Lỗi khi thêm role cho user',
      });
    }
  }

  async removeRoleFromUser(userId: string, role: string): Promise<User> {
    try {
      const updatedUser = await this.userRepositories.removeRoleFromUser(
        userId,
        role,
      );

      if (!updatedUser) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Không tìm thấy người dùng với id: ${userId}`,
        });
      }
      return updatedUser;
    } catch (err) {
      if (err instanceof RpcException) throw err;
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: err.message || 'Lỗi khi xóa role khỏi người dùng',
      });
    }
  }

  async hasUserRole(userId: string, role: string): Promise<{ hasRole: boolean; user?: User }> {
    try {
      const user = await this.userRepositories.findOneById(userId);
      if (!user) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Không tìm thấy người dùng với id: ${userId}`,
        });
      }
      const hasRole = Array.isArray(user.role) ? user.role.includes(role) : user.role === role;
      return { hasRole, user };
    } catch (err) {
      if (err instanceof RpcException) throw err;
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: err.message || 'Lỗi khi kiểm tra role của người dùng',
      });
    }
  }
  async totalDetailAccount(): Promise<any> {
    try {
      const total_user = await this.userRepositories.totalDetailAccount();
      if (!total_user) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Không lấy được danh sách người dùng',
        });
      }
      return total_user;
    } catch (err) { }
  }

  async addRoleAutomatically(userId: string, role: string): Promise<any> {
    try {
      const updatedUser = await this.userRepositories.updateRole(userId, role);
      console.log('updatedUser auto add role', updatedUser);
      if (!updatedUser) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Không tìm thấy user với id: ${userId}`,
        });
      }

      return {
        message: `Thêm role ${role} thành công.`,
        user: updatedUser,
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;

      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Không thể thêm role cho user.',
      });
    }
  }
  async updatePasswordByEmail(email: string, newPassword: string): Promise<{ success: boolean }> {
    try {
      const user = await this.userRepositories.updatePasswordByEmail(email, newPassword);
      if (!user) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Không tìm thấy người dùng với email: ${email}`,
        });
      }
      return { success: true };
    } catch (err) {
      if (err instanceof RpcException) {
        throw err;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: err.message || 'Lỗi khi cập nhật mật khẩu',
      });
    }
  }
  async updatePasswordById(id: string, newPassword: string): Promise<{ success: boolean }> {
    try {
      const user = await this.userRepositories.updatePasswordById(id, newPassword);
      if (!user) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Không tìm thấy người dùng với id: ${id}`,
        });
      }
      return { success: true };
    } catch (err) {
      if (err instanceof RpcException) {
        throw err;
      }
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: err.message || 'Lỗi khi cập nhật mật khẩu',
      });
    }
  }
  async updateUser(id: string, updateData: UpdateUserDto): Promise<User> {
    try {
      const updatedUser = await this.userRepositories.updateUser(id, updateData);
      if (!updatedUser) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Không tìm thấy người dùng với id: ${id}`,
        });
      }
      return updatedUser;
    } catch (err) {
      if (err instanceof RpcException) throw err;
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: err.message || 'Lỗi khi cập nhật thông tin người dùng',
      });
    }
  }

  /**
   * Expire VIP status cho các user đã hết hạn
   */
  async expireVipUsers(): Promise<{ expiredCount: number }> {
    try {
      const expiredCount = await this.userRepositories.expireVipUsers();
      console.log(`Expired VIP status for ${expiredCount} users`);
      return { expiredCount };
    } catch (err) {
      console.error('Error expiring VIP users:', err);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: err.message || 'Lỗi khi expire VIP users',
      });
    }
  }
}

