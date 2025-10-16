import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import { Mail, MailSchema } from './schemas/mail.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { InviteController } from './controllers/invite.controller';
import { InviteService } from './services/invite.service';
import {
  VetInviteToken,
  VetInviteTokenSchema,
} from './schemas/vet.inviteToken';
import { MailService } from './services/mail.services';
import { VetInviteRepository } from './repositories/invite.repositories';
const customer_port = parseInt(process.env.TCP_CUSTOMER_PORT || '5002', 10);
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forFeature([
      { name: Mail.name, schema: MailSchema },
      { name: VetInviteToken.name, schema: VetInviteTokenSchema },
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
          port: 5002,
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

  controllers: [AuthController, InviteController],
  providers: [AuthService, InviteService, MailService, VetInviteRepository],
})
export class AppModule {}
