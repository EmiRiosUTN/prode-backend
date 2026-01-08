import { Module } from '@nestjs/common';
import { ProdesController, PredictionsController } from './controllers';
import { ProdesService, PredictionsService } from './services';
import { RankingModule } from '../ranking/ranking.module';
import { AiService } from '../../common/ai.service';

@Module({
    imports: [RankingModule],
    controllers: [
        ProdesController,
        PredictionsController,
    ],
    providers: [
        ProdesService,
        PredictionsService,
        AiService,
    ],
    exports: [
        ProdesService,
        PredictionsService,
    ],
})
export class EmployeeModule { }