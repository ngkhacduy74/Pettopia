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
@Injectable()
export class AuthService {
  constructor(
    @Inject('CUSTOMER_SERVICE') private customerClient: ClientProxy,
    private readonly jwtService: JwtService,
  ) {}

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
          isEmail
            ? { email_address: identifier }
            : { username: identifier },
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

      if (exist_email?.status === false) {
        throw createRpcError(
          HttpStatus.BAD_REQUEST,
          'Email đã được đăng ký bằng tài khoản khác',
          'Bad Request',
          'Vui lòng sử dụng email khác',
        );
      }

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
        throw createRpcError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Lỗi khi tạo tài khoản',
          'Internal Server Error',
          error.message,
        );
      });

      const { password, ...userWithoutPassword } = savedUser;
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
}
