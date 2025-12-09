import { Module } from '@nestjs/common';
import { ProdesController, PredictionsController } from './controllers';
import { ProdesService, PredictionsService } from './services';

@Module({
    controllers: [
        ProdesController,
        PredictionsController,
    ],
    providers: [
        ProdesService,
        PredictionsService,
    ],
    exports: [
        ProdesService,
        PredictionsService,
    ],
})
export class EmployeeModule { }