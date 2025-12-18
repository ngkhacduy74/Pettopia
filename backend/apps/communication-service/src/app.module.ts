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
          transport: Transport.RMQ,
          options: {
            urls: [
              configService.get<string>(
                'RMQ_URL',
                'amqp://guest:guest@rabbitmq:5672',
              ),
            ],
            queue: 'customer_service_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
      },

      {
        name: 'AUTH_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              configService.get<string>(
                'RMQ_URL',
                'amqp://guest:guest@rabbitmq:5672',
              ),
            ],
            queue: 'auth_service_queue',
            queueOptions: {
              durable: true,
            },
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
