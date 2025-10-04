import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { LoginDto } from './dtos/login.dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { RegisterDto } from './dtos/register.dto';
import { lastValueFrom } from 'rxjs';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AppService {
  constructor(
    @Inject('CUSTOMER_SERVICE') private customerClient: ClientProxy,
    private readonly jwtService: JwtService,
  ) {}
  async login(data: LoginDto): Promise<any> {
    console.log('data customer service', data);
    try {
      const exist_user = await lastValueFrom(
        this.customerClient.send(
          { cmd: 'getUserByUsername' },
          { username: data.username },
        ),
      );

      if (!exist_user) {
        throw new NotFoundException('Không tìm thấy user');
      }
      const isMatch = await bcrypt.compare(data.password, exist_user.password);
      if (!isMatch) {
        throw new RpcException('Mật khẩu không đúng');
      }
      const { password, ...result } = exist_user;
      const token = this.jwtService.sign(result);
      return { status: true, token: token };
    } catch (err) {
      throw new Error(err);
    }
  }

  async register(data: any): Promise<any> {
    try {
      const exist_phone = await lastValueFrom(
        this.customerClient.send(
          { cmd: 'checkPhoneExist' },
          { phone_number: data.phone_number },
        ),
      );

      const exist_email = await lastValueFrom(
        this.customerClient.send(
          { cmd: 'getUserByEmail' },
          { email_address: data.email_address },
        ),
      );

      if (exist_email.status == false) {
        throw new RpcException(
          'Email đã được đăng ký bằng 1 tài khoản khác. Vui lòng sử dụng email khác',
        );
      }

      if (exist_phone.status == false) {
        throw new RpcException('Đăng ký thất bại! Số điện thoại đã tồn tại');
      }

      const salt = await bcrypt.genSalt(10);
      const hashPass = await bcrypt.hash(data.password, salt);

      const newUser = {
        fullname: data.fullname,
        gender: data.gender,
        username: data.username,
        password: hashPass,
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
      };

      const savedUser = await lastValueFrom(
        this.customerClient.send({ cmd: 'createUser' }, newUser),
      );

      return savedUser;
    } catch (err) {
      console.error('Register error:', err);
      throw new RpcException(
        err?.message || 'Lỗi không xác định từ auth-service',
      );
    }
  }
}
