import { Module } from '@nestjs/common';
import { CompaniesService, CompetitionsService, MatchesService } from './services';
import { CompaniesController, CompetitionsController, MatchesController } from './controllers';

@Module({
    controllers: [CompaniesController, CompetitionsController, MatchesController],
    providers: [CompaniesService, CompetitionsService, MatchesService],
    exports: [CompaniesService, CompetitionsService, MatchesService],
})
export class AdminGlobalModule { }
