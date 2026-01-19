import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CompaniesService, CompetitionsService, MatchesService } from './services';
import { CompaniesController, CompetitionsController, MatchesController } from './controllers';
import { PredictionVariablesController } from './controllers/prediction-variables.controller';
import { EmailModule } from '../email/email.module';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'scoring',
        }),
        EmailModule,
    ],
    controllers: [CompaniesController, CompetitionsController, MatchesController, PredictionVariablesController],
    providers: [CompaniesService, CompetitionsService, MatchesService],
    exports: [CompaniesService, CompetitionsService, MatchesService],
})
export class AdminGlobalModule { }
