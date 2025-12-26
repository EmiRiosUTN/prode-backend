import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PredictionsService } from '../services/predictions.service';
import { CreatePredictionDto } from '../dto/create-prediction.dto';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { Roles, CurrentUser, CurrentTenant } from '../../../common/decorators';

@Controller('employee')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('empleado')
export class PredictionsController {
    constructor(private readonly predictionsService: PredictionsService) { }

    @Get('prodes/:prodeId/matches')
    findProdeMatches(
        @Param('prodeId') prodeId: string,
        @CurrentTenant() tenant: { id: string },
        @CurrentUser() user: { id: string; employee: { id: string } },
    ) {
        return this.predictionsService.findProdeMatches(prodeId, tenant.id, user.employee.id);
    }

    @Get('predictions/my')
    findMyPredictions(
        @CurrentUser() user: { id: string; employee: { id: string } },
        @Query('prodeId') prodeId?: string,
    ) {
        return this.predictionsService.findMyPredictions(user.employee.id, prodeId);
    }

    @Post('predictions')
    upsertPrediction(
        @CurrentUser() user: { id: string; employee: { id: string } },
        @CurrentTenant() tenant: { id: string },
        @Body() createDto: CreatePredictionDto,
    ) {
        return this.predictionsService.upsertPrediction(user.employee.id, tenant.id, createDto);
    }

    @Get('predictions/match/:matchId/available-copies')
    getAvailableCopies(
        @Param('matchId') matchId: string,
        @Query('prodeId') prodeId: string,
        @CurrentUser() user: { id: string; employee: { id: string } },
        @CurrentTenant() tenant: { id: string },
    ) {
        console.log('[getAvailableCopies] Called with:', { matchId, prodeId, userId: user?.employee?.id, tenantId: tenant?.id });
        return this.predictionsService.getAvailableCopies(matchId, prodeId, user.employee.id, tenant.id);
    }

    @Get('predictions/:id')
    findOne(
        @Param('id') id: string,
        @CurrentUser() user: { id: string; employee: { id: string } },
    ) {
        return this.predictionsService.findOne(id, user.employee.id);
    }
}