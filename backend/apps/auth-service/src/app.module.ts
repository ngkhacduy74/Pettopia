import {
  MiddlewareConsumer,
  Module,
  NestModule,
  ValidationPipe,
} from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import { Mail, MailSchema } from './schemas/mail.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { InviteController } from './controllers/invite.controller';
import { InviteService } from './services/invite.service';
import { CloudinaryController } from './controllers/cloudinary.controller';
import { CloudinaryService } from './services/cloudinary.service';
import {
  VetInviteToken,
  VetInviteTokenSchema,
} from './schemas/vet.inviteToken';
import { MailService } from './services/mail.services';
import { VetInviteRepository } from './repositories/invite.repositories';
import { OtpRepository } from './repositories/otp.repositories';
import { Otp, OtpSchema } from './schemas/otp.schema';
import { OtpService } from './services/otp.service';
import { APP_PIPE } from '@nestjs/core';
import { MailTemplateService } from './services/mail.template.service';
import { MailController } from './controllers/mail.controller';
import { PrometheusService } from './services/prometheus.service';
import { PrometheusController } from './controllers/prometheus.controller';
import { PrometheusMiddleware } from './middleware/prometheus.middleware';
const customer_port = parseInt(process.env.TCP_CUSTOMER_PORT || '5002', 10);
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forFeature([
      { name: Mail.name, schema: MailSchema },
      { name: VetInviteToken.name, schema: VetInviteTokenSchema },
      { name: Otp.name, schema: OtpSchema },
    ]),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('AUTH_DB_URI'),
      }),
    }),
    ClientsModule.register([
      {
        name: 'CUSTOMER_SERVICE',
        transport: Transport.TCP,
        options: {
          host:
            process.env.NODE_ENV === 'production'
              ? 'customer-service'
              : 'localhost',
          port: 5002,
        },
      },
      {
        name: 'PARTNER_SERVICE',
        transport: Transport.TCP,
        options: {
          host:
            process.env.NODE_ENV === 'production'
              ? 'partner-service'
              : 'localhost',
          port: 5004,
        },
      },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],

  controllers: [
    AuthController,
    InviteController,
    CloudinaryController,
    MailController,
    PrometheusController,
  ],
  providers: [
    AuthService,
    InviteService,
    MailService,
    VetInviteRepository,
    OtpRepository,
    OtpService,
    CloudinaryService,
    MailTemplateService,
    PrometheusService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        forbidUnknownValues: true,
      }),
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PrometheusMiddleware).forRoutes('*');
  }
}
