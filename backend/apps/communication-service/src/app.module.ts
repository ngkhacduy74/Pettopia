import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PostController } from './controllers/post.controller';
import { PostService } from './services/post.service';
import { PostRepository } from './repositories/post.repository';
import { Post, PostSchema } from './schemas/post.schemas';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrometheusController } from './controllers/prometheus.controller';
import { PrometheusService } from './services/prometheus.service';
import { PrometheusMiddleware } from './middleware/prometheus.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('POST_DB_URI'),
      }),
    }),
    MongooseModule.forFeature([{ name: Post.name, schema: PostSchema }]),
    ClientsModule.registerAsync([
      {
        name: 'CUSTOMER_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('CUSTOMER_HOST') || 'customer-service',
            port: configService.get<number>('TCP_CUSTOMER_PORT') || 5002,
          },
        }),
      },

      {
        name: 'AUTH_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('AUTH_HOST') || 'auth-service',
            port: configService.get<number>('TCP_AUTH_PORT') || 5001,
          },
        }),
      },
    ]),
  ],
  controllers: [PostController, PrometheusController],
  providers: [PostService, PostRepository, PrometheusService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PrometheusMiddleware).forRoutes('*');
  }
}
