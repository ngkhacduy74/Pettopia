import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  InternalServerErrorException,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { Role, Roles } from 'src/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/guard/jwtAuth.guard';
import { RoleGuard } from 'src/guard/role.guard';
import { UserToken } from 'src/decorators/user.decorator';

@Controller('api/v1/customer')
export class CustomerController {
  constructor(
    @Inject('CUSTOMER_SERVICE') private readonly customerService: ClientProxy,
  ) { }
  @UseGuards(JwtAuthGuard)
  @Get('/profile')
  @HttpCode(HttpStatus.OK)
  async getUserProfile(@UserToken('id') id: string) {
    const user = await lastValueFrom(
      this.customerService.send({ cmd: 'getUserById' }, { id }),
    );
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('/profile/vip-remaining-days')
  @HttpCode(HttpStatus.OK)
  async getVipRemainingDays(@UserToken('id') id: string) {
    return await lastValueFrom(
      this.customerService.send({ cmd: 'getVipRemainingDays' }, { id }),
    );
  }
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.STAFF, Role.CLINIC)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getUserById(
    @Param('id') idUser: string,
    @UserToken('role') roles: string | string[]
  ) {
    try {
      const roleArray = Array.isArray(roles) ? roles : [roles];

      const user = await lastValueFrom(
        this.customerService.send(
          { cmd: 'getUserById' },
          {
            id: idUser,
            role: roleArray
          }
        )
      );

      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng');
      }

      return user;
    } catch (error) {
      console.error('Lỗi khi lấy thông tin người dùng:', error);
      throw new InternalServerErrorException('Có lỗi xảy ra khi xử lý yêu cầu');
    }
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.ADMIN)
  @Get(':id/has-role')
  @HttpCode(HttpStatus.OK)
  async hasRole(
    @Param('id') id: string,
    @Query('role') role: string,
  ) {
    if (!role) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Thiếu tham số role',
      };
    }
    const result = await lastValueFrom(
      this.customerService.send(
        { cmd: 'check_user_role' },
        { userId: id, role },
      ),
    );
    return {
      message: `Kiểm tra role ${role} cho user ${id}`,
      data: result,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteUserById(@Param('id') id: string) {
    const user = await lastValueFrom(
      this.customerService.send({ cmd: 'deleteUserById' }, { id }),
    );
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateMyProfile(
    @UserToken('id') id: string,
    @Body() body: any,
  ) {
    console.log('CustomerController.updateMyProfile id:', id, 'body:', body);
    return await lastValueFrom(
      this.customerService.send({ cmd: 'updateUser' }, { id, updateData: body }),
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param('id') id: string,
    @Body() body: any,
    @UserToken('role') requesterRole: string | string[],
    @UserToken('id') requesterId: string,
  ) {
    try {
      // Check if target user exists and get their role
      const targetUser = await lastValueFrom(
        this.customerService.send({ cmd: 'getUserById' }, { id, role: requesterRole })
      );

      if (!targetUser) {
        throw new NotFoundException('User not found');
      }

      // Check permission
      const roles = Array.isArray(requesterRole) ? requesterRole : [requesterRole];
      const isStaff = roles.includes(Role.STAFF);
      const isAdmin = roles.includes(Role.ADMIN);
      const targetRoles = Array.isArray(targetUser.role) ? targetUser.role : [targetUser.role];
      const isTargetAdmin = targetRoles.includes(Role.ADMIN);

      // Staff không được update Admin
      if (isStaff && !isAdmin && isTargetAdmin) {
        throw new ForbiddenException('Staff cannot update Admin account');
      }

      // Admin chỉ được update chính mình, không được update admin khác
      if (isAdmin && isTargetAdmin && id !== requesterId) {
        throw new ForbiddenException(
          'Admin chỉ được sửa đổi thông tin của chính mình',
        );
      }

      // Proceed to update
      return await lastValueFrom(
        this.customerService.send({ cmd: 'updateUser' }, { id, updateData: body })
      );
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.STAFF)
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
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.STAFF)
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
    @Query('fullname') fullname?: string,
    @Query('username') username?: string,
    @Query('email_address') email_address?: string,
    @Query('reward_point', new ParseIntPipe({ optional: true }))
    reward_point?: number,
    @Query('phone_number') phone_number?: string,
    @Query('is_active') is_active?: string,
  ) {
    if (is_active !== undefined) {
      status = is_active === 'true' ? 'active' : 'deactive';
    }
    const dto = {
      page,
      limit,
      search,
      status,
      role,
      sort_field,
      sort_order,
      fullname,
      username,
      email_address,
      reward_point,
      phone_number,
    };

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

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.ADMIN)
  @Get('total/detail')
  async totalDetailAccount() {
    const result = await lastValueFrom(
      this.customerService.send({ cmd: 'total-detail-account' }, {}),
    );
    return {
      message: `Lấy tổng chi tiết user thành công`,
      data: result,
    };
  }
}
