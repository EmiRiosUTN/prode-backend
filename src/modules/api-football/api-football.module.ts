import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminGlobalModule } from '../admin-global/admin-global.module';
import { ApiFootballService } from './services/api-football.service';
import { ApiFootballImportService } from './services/api-football-import.service';
import { ApiFootballCronService } from './services/api-football-cron.service';
import { ApiFootballController } from './controllers/api-football.controller';

@Module({
    imports: [
        ConfigModule,
        PrismaModule,
        AdminGlobalModule,
        BullModule.registerQueue({
            name: 'scoring',
        }),
    ],
    controllers: [ApiFootballController],
    providers: [
        ApiFootballService,
        ApiFootballImportService,
        ApiFootballCronService,
    ],
    exports: [ApiFootballService, ApiFootballImportService],
})
export class ApiFootballModule { }
