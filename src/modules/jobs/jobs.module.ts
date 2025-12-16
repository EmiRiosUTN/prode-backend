import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { RankingModule } from '../ranking/ranking.module';
import { ScoringService } from './services/scoring.service';
import { ScorerMatcherService } from './services/scorer-matcher.service';
import { ScoringProcessor } from './processors/scoring.processor';
import { PredictionsLockProcessor } from './processors/predictions-lock.processor';

@Module({
    imports: [
        PrismaModule,
        RankingModule,
        ScheduleModule.forRoot(),
        BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                redis: {
                    host: configService.get('cache.redis.host'),
                    port: configService.get('cache.redis.port'),
                    password: configService.get('cache.redis.password'),
                    db: configService.get('cache.redis.db') || 1, // Usar DB 1 para Bull
                },
            }),
        }),
        BullModule.registerQueue({
            name: 'scoring',
        }),
    ],
    providers: [
        ScoringService,
        ScorerMatcherService,
        ScoringProcessor,
        PredictionsLockProcessor,
    ],
    exports: [ScoringService, ScorerMatcherService, BullModule],
})
export class JobsModule { }
