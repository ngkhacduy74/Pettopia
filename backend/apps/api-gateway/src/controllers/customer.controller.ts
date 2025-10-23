import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppService } from '../app.service';
import { lastValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { Role, Roles } from 'src/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/guard/jwtAuth.guard';
import { RoleGuard } from 'src/guard/role.guard';

@Controller('api/v1/customer')
export class CustomerController {
  constructor(
    @Inject('CUSTOMER_SERVICE') private readonly customerService: ClientProxy,
  ) {}
  // @UseGuards(JwtAuthGuard)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getUserById(@Param('id') id: string) {
    const user = await lastValueFrom(
      this.customerService.send({ cmd: 'getUserById' }, { id }),
    );
    return user;
  }
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteUserById(@Param('id') id: string) {
    const user = await lastValueFrom(
      this.customerService.send({ cmd: 'deleteUserById' }, { id }),
    );
    return user;
  }

  // @UseGuards(JwtAuthGuard, RoleGuard)
  // @Roles(Role.ADMIN, Role.Staff)
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateUserStatus(
    @Param('id') id: string,
    @Body('status') status: 'active' | 'deactive',
  ) {
    const user = await lastValueFrom(
      this.customerService.send({ cmd: 'updateUserStatus' }, { id, status }),
    );
    return user;
  }
  // @UseGuards(JwtAuthGuard, RoleGuard)
  // @Roles(Role.ADMIN, Role.Staff)
  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(15), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'deactive',
    @Query('role') role?: string,
    @Query('sort_field') sort_field?: string,
    @Query('sort_order') sort_order?: 'asc' | 'desc',
  ) {
    const dto = { page, limit, search, status, role, sort_field, sort_order };
    return await lastValueFrom(
      this.customerService.send({ cmd: 'getAllUsers' }, dto),
    );
  }
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/add-role')
  @HttpCode(HttpStatus.OK)
  async addRoleToUser(@Param('id') id: string, @Body('role') role: string) {
    const result = await lastValueFrom(
      this.customerService.send({ cmd: 'add_user_role' }, { userId: id, role }),
    );
    return {
      message: `Đã thêm role "${role}" cho user ${id}`,
      data: result,
    };
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/remove-role')
  @HttpCode(HttpStatus.OK)
  async removeRoleFromUser(
    @Param('id') id: string,
    @Body('role') role: string,
  ) {
    const result = await lastValueFrom(
      this.customerService.send(
        { cmd: 'remove_user_role' },
        { userId: id, role },
      ),
    );
    return {
      message: `Đã xóa role "${role}" khỏi user ${id}`,
      data: result,
    };
  }
}
