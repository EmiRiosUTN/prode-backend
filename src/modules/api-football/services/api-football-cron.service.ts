import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ApiFootballImportService } from './api-football-import.service';

@Injectable()
export class ApiFootballCronService {
    private readonly logger = new Logger(ApiFootballCronService.name);

    constructor(
        private readonly importService: ApiFootballImportService,
    ) { }

    /**
     * Disabled: The user requested not to use the automated cron job. 
     * Results will be updated manually via the admin dashboard button.
     * Run daily at 06:00 UTC (03:00 ARG) to update match results
     * for all active competitions linked to API-Football.
     */
    // @Cron('0 6 * * *')
    async handleDailyResultsUpdate() {
        this.logger.log('=== Starting daily API-Football results update ===');

        try {
            const result = await this.importService.updatePendingResults();
            this.logger.log(`Daily update completed: ${result.totalUpdated} results updated across ${result.competitions} competitions`);
        } catch (error) {
            this.logger.error(`Daily results update failed: ${error.message}`, error.stack);
        }

        this.logger.log('=== Daily API-Football results update finished ===');
    }
}
