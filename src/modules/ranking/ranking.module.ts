import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';
import { RankingController } from './ranking.controller';
import { RankingService } from './ranking.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [
        PrismaModule,
        CacheModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                store: redisStore,
                host: configService.get('cache.redis.host'),
                port: configService.get('cache.redis.port'),
                password: configService.get('cache.redis.password'),
                db: configService.get('cache.redis.db'),
                ttl: configService.get('cache.ttl'),
            }),
        }),
    ],
    controllers: [RankingController],
    providers: [RankingService],
    exports: [RankingService],
})
export class RankingModule { }
