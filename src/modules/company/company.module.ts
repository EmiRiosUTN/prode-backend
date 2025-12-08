import { Module } from '@nestjs/common';
import {
    ConfigController,
    AreasController,
    EmployeesController,
    ProdesController
} from './controllers';
import {
    ConfigService,
    AreasService,
    EmployeesService,
    ProdesService
} from './services';

@Module({
    controllers: [
        ConfigController,
        AreasController,
        EmployeesController,
        ProdesController,
    ],
    providers: [
        ConfigService,
        AreasService,
        EmployeesService,
        ProdesService,
    ],
    exports: [
        ConfigService,
        AreasService,
        EmployeesService,
        ProdesService,
    ],
})
export class CompanyModule { }
