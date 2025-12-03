import { Controller, Get, UsePipes, ValidationPipe } from '@nestjs/common';

import { AppService } from '../services/app.service';

import { MessagePattern, Payload } from '@nestjs/microservices';
import { User } from '../schemas/user.schema';
import { GetUserByIdDto } from '../dto/request/get-user-by-id.dto';
import { GetUserByUsernameDto } from '../dto/request/get-user-by-username.dto';
import { GetUserByEmailDto } from '../dto/request/get-user-by-email.dto';
import { CheckPhoneExistDto } from '../dto/request/check-phone-exist.dto';
import { CreateUserDto } from '../dto/user/create-user.dto';
import { DeleteUserByIdDto } from '../dto/request/delete-user-by-id.dto';
import { UpdateUserStatusDto } from '../dto/request/update-user-status.dto';
import {
  GetAllUsersDto,
  PaginatedUsersResponse,
} from '../dto/request/get-all-user.dto';
import { UpdateUserDto } from '../dto/request/update-user.dto';
import { handleRpcError } from '../common/error.detail';

@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }
  @MessagePattern({ cmd: 'getUserById' })
  async getUserById(@Payload() data: any): Promise<User | null> {
    try {
      console.log('Received getUserById request with data:', data);
      const result = await this.appService.getUserById(data.id, data.role);
      return result;
    } catch (err) {
      throw handleRpcError('AppController.getUserById', err);
    }
  }

  @MessagePattern({ cmd: 'getUserByUsername' })
  async getUserByUsername(
    @Payload() data: GetUserByUsernameDto,
  ): Promise<User | null> {
    try {
      const result = await this.appService.getUserByUsername(data.username);
      return result;
    } catch (err) {
      handleRpcError('AppController.getUserByUsername', err);
      return null;
    }
  }
  @MessagePattern({ cmd: 'getUserByEmail' })
  async getUserByEmail(@Payload() data: GetUserByEmailDto): Promise<any> {
    try {
      const result = await this.appService.getUserByEmail(data.email_address);
      return result;
    } catch (err) {
      handleRpcError('AppController.getUserByEmail', err);
    }
  }
  @MessagePattern({ cmd: 'getUserByEmailForAuth' })
  async getUserByEmailForAuth(
    @Payload() data: GetUserByEmailDto,
  ): Promise<User> {
    try {
      const result = await this.appService.getUserByEmailForAuth(
        data.email_address,
      );
      return result;
    } catch (err) {
      handleRpcError('AppController.getUserByEmailForAuth', err);
    }
  }
  @MessagePattern({ cmd: 'checkPhoneExist' })
  async checkPhoneExist(@Payload() data: CheckPhoneExistDto): Promise<Boolean> {
    try {
      const result = await this.appService.checkPhoneExist(data.phone_number);
      return result;
    } catch (err) {
      handleRpcError('AppController.checkPhoneExist', err);
    }
  }
  @MessagePattern({ cmd: 'createUser' })
  async createUser(@Payload() data: any): Promise<User> {
    try {
      const result = await this.appService.createUser(data);
      return result;
    } catch (err) {
      handleRpcError('AppController.createUser', err);
    }
  }
  @MessagePattern({ cmd: 'updateUserStatus' })
  async updateUserStatus(@Payload() data: UpdateUserStatusDto): Promise<User> {
    try {
      const result = await this.appService.updateUserStatus(
        data.id,
        data.status,
      );
      return result;
    } catch (err) {
      handleRpcError('AppController.updateUserStatus', err);
    }
  }
  @MessagePattern({ cmd: 'deleteUserById' })
  async deleteUserById(@Payload() data: DeleteUserByIdDto): Promise<User> {
    try {
      const result = await this.appService.deleteUserById(data.id);
      return result;
    } catch (err) {
      handleRpcError('AppController.deleteUserById', err);
    }
  }
  @MessagePattern({ cmd: 'test' })
  async test(@Payload() data: any): Promise<any> {
    return { message: 'đã chạy vào custoemr serrvice' };
  }

  @MessagePattern({ cmd: 'getAllUsers' })
  async getAllUsers(
    @Payload() data: GetAllUsersDto,
  ): Promise<PaginatedUsersResponse<User>> {
    try {
      return await this.appService.getAllUsers(data);
    } catch (err) {
      handleRpcError('AppController.getAllUsers', err);
    }
  }
  @MessagePattern({ cmd: 'add_user_role' })
  async addRoleToUser(
    @Payload() payload: { userId: string; role: string },
  ): Promise<any> {
    try {
      const { userId, role } = payload;
      const result = await this.appService.addRoleToUser(userId, role);
      return result;
    } catch (err) {
      handleRpcError('UserController.addRoleToUser', err);
    }
  }
  @MessagePattern({ cmd: 'auto_add_user_role' })
  async autoAddUserRole(
    @Payload() payload: { userId: string; role: string },
  ): Promise<any> {
    try {
      const { userId, role } = payload;
      const result = await this.appService.addRoleAutomatically(userId, role);
      return result;
    } catch (err) {
      handleRpcError('UserController.autoAddUserRole', err);
    }
  }

  @MessagePattern({ cmd: 'remove_user_role' })
  async removeRoleFromUser(
    @Payload() payload: { userId: string; role: string },
  ): Promise<any> {
    try {
      const { userId, role } = payload;
      const result = await this.appService.removeRoleFromUser(userId, role);
      return result;
    } catch (err) {
      handleRpcError('UserController.removeRoleFromUser', err);
    }
  }

  @MessagePattern({ cmd: 'check_user_role' })
  async checkUserRole(
    @Payload() payload: { userId: string; role: string },
  ): Promise<any> {
    try {
      const { userId, role } = payload;
      const result = await this.appService.hasUserRole(userId, role);
      return result;
    } catch (err) {
      handleRpcError('UserController.checkUserRole', err);
    }
  }
  @MessagePattern({ cmd: 'total-detail-account' })
  async totalDetailAccount(): Promise<any> {
    try {
      const result = await this.appService.totalDetailAccount();
      return result;
    } catch (err) {
      handleRpcError('UserController.totalDetailAccount', err);
    }
  }
  @MessagePattern({ cmd: 'updateUserPassword' })
  async updateUserPassword(
    @Payload() data: { email: string; newPassword: string },
  ): Promise<{ success: boolean }> {
    try {
      return await this.appService.updatePasswordByEmail(
        data.email,
        data.newPassword,
      );
    } catch (err) {
      handleRpcError('AppController.updateUserPassword', err);
    }
  }

  @MessagePattern({ cmd: 'updateUser' })
  async updateUser(
    @Payload() payload: any,
  ): Promise<User> {
    try {
      console.log('AppController.updateUser payload:', payload);
      const { id, updateData } = payload;
      return await this.appService.updateUser(id, updateData);
    } catch (err) {
      handleRpcError('AppController.updateUser', err);
    }
  }
}
