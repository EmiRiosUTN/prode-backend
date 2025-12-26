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

import { PublicCompanyController } from './controllers/public-company.controller';

@Module({
    controllers: [
        ConfigController,
        AreasController,
        EmployeesController,
        ProdesController,
        PublicCompanyController,
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
