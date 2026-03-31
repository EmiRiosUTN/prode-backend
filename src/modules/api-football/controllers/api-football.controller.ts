import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiFootballService } from '../services/api-football.service';
import { ApiFootballImportService } from '../services/api-football-import.service';
import { ImportFixturesDto, ImportCompetitionDto } from '../dto';

import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { Roles } from '../../../common/decorators';

@Controller('admin/api-football')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin_global')
export class ApiFootballController {
    constructor(
        private readonly apiFootballService: ApiFootballService,
        private readonly importService: ApiFootballImportService,
    ) { }

    /**
     * Import a FULL competition from API-Football.
     * Creates the Competition automatically (or reuses existing by league_id),
     * creates/links Teams with their logos, and creates all Matches.
     *
     * If the competition already exists (same league_id), it re-imports
     * any missing fixtures without duplicating existing ones.
     *
     * POST /admin/api-football/import-competition
     * Body: { apiFootballLeagueId, apiFootballSeason, competitionName?, slug? }
     */
    @Post('import-competition')
    async importCompetition(@Body() dto: ImportCompetitionDto) {
        return this.importService.importCompetition(dto);
    }

    /**
     * Import all fixtures from API-Football for a league/season
     * into an existing local competition.
     *
     * POST /admin/api-football/import-fixtures
     * Body: { competitionId, apiFootballLeagueId, apiFootballSeason }
     */
    @Post('import-fixtures')
    async importFixtures(@Body() dto: ImportFixturesDto) {
        return this.importService.importFixtures(dto);
    }

    /**
     * Manually trigger results update for all active competitions
     * linked to API-Football.
     * 
     * POST /admin/api-football/update-results
     */
    @Post('update-results')
    async updateResults() {
        return this.importService.updatePendingResults();
    }

    /**
     * Check the API-Football account status (remaining requests, etc.)
     * 
     * GET /admin/api-football/status
     */
    @Get('status')
    async getStatus() {
        return this.apiFootballService.getStatus();
    }
}
