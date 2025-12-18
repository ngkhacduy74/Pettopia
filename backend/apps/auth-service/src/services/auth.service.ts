import {
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LoginDto } from '../dtos/login.dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { RegisterDto } from '../dtos/register.dto';
import { lastValueFrom } from 'rxjs';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { createRpcError } from 'src/common/error.detail';
import axios from 'axios';
import { ForgotPasswordDto } from 'src/dtos/forgot-password.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { OtpService } from './otp.service';
import { MailTemplateService } from './mail.template.service';
@Injectable()
export class AuthService {
  constructor(
    @Inject('CUSTOMER_SERVICE') private customerClient: ClientProxy,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly mailTemplateService: MailTemplateService,
  ) { }

  async login(data: LoginDto): Promise<any> {
    console.log('data customer service', data);
    try {
      const identifier = data.username;
      const isEmail =
        typeof identifier === 'string' &&
        /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(identifier);

      const exist_user = await lastValueFrom(
        this.customerClient.send(
          isEmail
            ? { cmd: 'getUserByEmailForAuth' }
            : { cmd: 'getUserByUsername' },
          isEmail ? { email_address: identifier } : { username: identifier },
        ),
      ).catch((error) => {
        console.error(
          `Error from customerClient[${isEmail ? 'getUserByEmailForAuth' : 'getUserByUsername'}]:`,
          error.message,
        );
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Tài khoản không tồn tại',
          'Not Found',
          error.message,
        );
      });

      if (!exist_user) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Tài khoản không tồn tại',
          'Not Found',
        );
      }

      if (exist_user.is_active === false) {
        throw createRpcError(
          HttpStatus.FORBIDDEN,
          'Tài khoản đã bị khóa',
          'Forbidden',
        );
      }

      const isMatch = await bcrypt.compare(data.password, exist_user.password);
      console.log('isMatch123132', isMatch);
      if (!isMatch) {
        throw createRpcError(
          HttpStatus.UNAUTHORIZED,
          'Mật khẩu không đúng',
          'Unauthorized',
        );
      }

      const { password, ...result } = exist_user;
      const token = this.jwtService.sign(result);
      return { status: 'success', token };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi đăng nhập',
        'Internal Server Error',
        error.message,
      );
    }
  }

  async register(data: RegisterDto): Promise<any> {
    try {
      // Check username
      const exist_username = await lastValueFrom(
        this.customerClient.send(
          { cmd: 'checkUsernameExist' },
          { username: data.username },
        ),
      ).catch((error) => {
        console.error('Error checking username:', error);
        throw createRpcError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Lỗi khi kiểm tra tên đăng nhập',
          'Internal Server Error',
          error.message,
        );
      });

      // Check email
      const exist_email = await lastValueFrom(
        this.customerClient.send(
          { cmd: 'getUserByEmail' },
          { email_address: data.email_address },
        ),
      ).catch((error) => {
        console.error('Error checking email:', error);
        throw createRpcError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Lỗi khi kiểm tra email',
          'Internal Server Error',
          error.message,
        );
      });

      // Check phone
      const exist_phone = await lastValueFrom(
        this.customerClient.send(
          { cmd: 'checkPhoneExist' },
          { phone_number: data.phone_number },
        ),
      ).catch((error) => {
        console.error('Error checking phone:', error);
        throw createRpcError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Lỗi khi kiểm tra số điện thoại',
          'Internal Server Error',
          error.message,
        );
      });

      // Validate username
      if (exist_username?.status === false) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Tên đăng nhập đã được sử dụng',
          'Bad Request',
          'Vui lòng chọn tên đăng nhập khác',
        );
      }

      // Validate email
      if (exist_email?.status === false) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Email đã được đăng ký bằng tài khoản khác',
          'Bad Request',
          'Vui lòng sử dụng email khác',
        );
      }

      // Validate phone
      if (exist_phone?.status === false) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Số điện thoại đã được đăng ký',
          'Bad Request',
          'Vui lòng sử dụng số điện thoại khác',
        );
      }

      const newUser = {
        id: uuidv4(),
        fullname: data.fullname,
        gender: data.gender,
        username: data.username,
        password: data.password,
        dob: data.dob,
        avatar_url: data.avatar_url,
        email: {
          email_address: data.email_address,
          verified: false,
        },
        phone: {
          phone_number: data.phone_number,
          verified: false,
        },
        is_active: true,
        address: data.address,
      };
      const savedUser = await lastValueFrom(
        this.customerClient.send({ cmd: 'createUser' }, newUser),
      ).catch((error) => {
        console.error('Error creating user:', error);
        // Fallback error handling in case validation was bypassed
        if (
          error.message?.includes('E11000 duplicate key error') &&
          error.message?.includes('username_1')
        ) {
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Tên đăng nhập đã được sử dụng',
            'Bad Request',
            'Vui lòng chọn tên đăng nhập khác',
          );
        }
        if (
          error.message?.includes('E11000 duplicate key error') &&
          error.message?.includes('email')
        ) {
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Email đã được đăng ký',
            'Bad Request',
            'Vui lòng sử dụng email khác',
          );
        }
        if (
          error.message?.includes('E11000 duplicate key error') &&
          error.message?.includes('phone')
        ) {
          throw createRpcError(
            HttpStatus.BAD_REQUEST,
            'Số điện thoại đã được đăng ký',
            'Bad Request',
            'Vui lòng sử dụng số điện thoại khác',
          );
        }
        throw createRpcError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Lỗi khi tạo tài khoản',
          'Internal Server Error',
          error.message,
        );
      });

      const { password, ...userWithoutPassword } = savedUser;
      try {
        await this.mailTemplateService.sendUserWelcomeEmail(
          userWithoutPassword.email?.email_address || data.email_address,
          data.fullname,
          data.username,
          data.password,
        );
      } catch (e) {
        console.error('Failed to send welcome email:', e?.message || e);
      }
      const token = this.jwtService.sign(userWithoutPassword);

      return {
        status: 'success',
        message: 'Đăng ký tài khoản thành công',
        data: {
          user: userWithoutPassword,
          token,
        },
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Đã xảy ra lỗi khi đăng ký tài khoản',
        'Internal Server Error',
        error.message,
      );
    }
  }
  async forgotPassword(data: ForgotPasswordDto) {
    try {
      const user = await lastValueFrom(
        this.customerClient.send(
          { cmd: 'getUserByEmail' },
          { email_address: data.email },
        ),
      );

      // if (user?.status === false) {
      //   throw createRpcError(HttpStatus.NOT_FOUND, 'Email không tồn tại', 'Not Found');
      // }

      await this.otpService.sendEmailOtp(data.email);

      return {
        status: 'success',
        message: 'OTP đã được gửi đến email của bạn',
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Lỗi khi gửi OTP',
        'Internal Server Error',
        error.message,
      );
    }
  }

  async resetPassword(data: ResetPasswordDto): Promise<any> {
    try {
      // Verify OTP
      const verifyResult = await this.otpService.verifyEmailOtp(
        data.email,
        data.otp,
      );
      if (!verifyResult.success) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'OTP không hợp lệ',
          'Bad Request',
        );
      }

      // Hash password mới với salt rounds = 12 (bảo mật cao hơn)
      const salt = await bcrypt.genSalt(12);
      const hashPass = await bcrypt.hash(data.newPassword, salt);

      const updateResult = await lastValueFrom(
        this.customerClient.send(
          { cmd: 'updateUserPassword' },
          { email: data.email, newPassword: hashPass },
        ),
      ).catch((error) => {
        throw createRpcError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Lỗi khi cập nhật password',
          'Internal Server Error',
          error.message,
        );
      });

      if (!updateResult || !updateResult.success) {
        throw createRpcError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Không thể cập nhật password',
          'Internal Server Error',
        );
      }

      return {
        status: 'success',
        message: 'Reset password thành công',
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'thành lỗi Khi reset password hoặc sai OTP',
        'Internal Server Error',
        error.message,
      );
    }
  }
  async changePassword(data: ChangePasswordDto & { userId: string }) {
    try {
      const user = await lastValueFrom(
        this.customerClient.send({ cmd: 'getUserById' }, { id: data.userId }),
      );

      if (!user) {
        throw createRpcError(
          HttpStatus.NOT_FOUND,
          'Người dùng không tồn tại',
          'Not Found',
        );
      }

      const isMatch = await bcrypt.compare(data.oldPassword, user.password);
      if (!isMatch) {
        throw createRpcError(
          HttpStatus.UNAUTHORIZED,
          'Mật khẩu cũ không đúng',
          'Unauthorized',
        );
      }

      const salt = await bcrypt.genSalt(12);
      const hashPass = await bcrypt.hash(data.newPassword, salt);

      await lastValueFrom(
        this.customerClient.send(
          { cmd: 'updateUserPasswordById' },
          { id: data.userId, newPassword: hashPass },
        ),
      );

      return {
        status: 'success',
        message: 'Đổi mật khẩu thành công',
      };
    } catch (error) {
      console.error('Change password error detail:', error); // ← Thêm log để debug

      // Nếu là RpcException từ Customer service (validation fail, user not found, v.v.)
      if (error instanceof RpcException) {
        throw error; // Throw nguyên để gateway trả đúng status code + message
      }

      // Nếu là lỗi timeout hoặc connection từ microservice
      if (error.message && error.message.includes('timeout') || error.name === 'TimeoutError') {
        throw createRpcError(
          HttpStatus.GATEWAY_TIMEOUT,
          'Hệ thống đang bận, vui lòng thử lại sau',
          'Gateway Timeout',
        );
      }

      // Các lỗi khác
      throw createRpcError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Lỗi khi đổi mật khẩu',
        'Internal Server Error',
        error.message || 'Unknown error',
      );
    }
  }
}
