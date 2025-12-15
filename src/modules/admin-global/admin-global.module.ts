import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CompaniesService, CompetitionsService, MatchesService } from './services';
import { CompaniesController, CompetitionsController, MatchesController } from './controllers';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'scoring',
        }),
    ],
    controllers: [CompaniesController, CompetitionsController, MatchesController],
    providers: [CompaniesService, CompetitionsService, MatchesService],
    exports: [CompaniesService, CompetitionsService, MatchesService],
})
export class AdminGlobalModule { }
