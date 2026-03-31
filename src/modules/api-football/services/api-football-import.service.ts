import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApiFootballService, ApiFootballFixture } from './api-football.service';
import { MatchesService } from '../../admin-global/services/matches.service';
import { ImportFixturesDto, ImportCompetitionDto } from '../dto';


@Injectable()
export class ApiFootballImportService {
    private readonly logger = new Logger(ApiFootballImportService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly apiFootballService: ApiFootballService,
        private readonly matchesService: MatchesService,
    ) { }

    /**
     * Import a FULL competition from API-Football:
     * creates the Competition record automatically (or reuses existing),
     * creates/links all Teams with their logo URLs, and creates all Matches.
     *
     * POST /admin/api-football/import-competition
     */
    async importCompetition(dto: ImportCompetitionDto) {
        // 1. Fetch fixtures from the API
        this.logger.log(
            `Fetching fixtures for league ${dto.apiFootballLeagueId}, season ${dto.apiFootballSeason}...`,
        );
        const fixtures = await this.apiFootballService.fetchFixtures(
            dto.apiFootballLeagueId,
            dto.apiFootballSeason,
        );

        if (!fixtures || fixtures.length === 0) {
            throw new BadRequestException(
                `No fixtures found for league ${dto.apiFootballLeagueId}, season ${dto.apiFootballSeason}`,
            );
        }

        // 2. Extract league metadata from the first fixture
        const leagueMeta = fixtures[0].league;
        const competitionName = dto.competitionName ?? leagueMeta.name;

        // Calculate start/end dates from fixture dates
        const dates = fixtures.map(f => new Date(f.fixture.date).getTime());
        const startDate = new Date(Math.min(...dates));
        const endDate = new Date(Math.max(...dates));

        // Build a URL-safe slug
        const slugBase = dto.slug ??
            `${competitionName}-${dto.apiFootballSeason}`
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');

        // 3. Find or create the Competition
        let competition = await this.prisma.competition.findUnique({
            where: { api_football_league_id: dto.apiFootballLeagueId },
        });

        let competitionCreated = false;

        if (!competition) {
            // Make sure slug is unique
            let slug = slugBase;
            let slugSuffix = 0;
            while (await this.prisma.competition.findUnique({ where: { slug } })) {
                slugSuffix++;
                slug = `${slugBase}-${slugSuffix}`;
            }

            competition = await this.prisma.competition.create({
                data: {
                    name: competitionName,
                    slug,
                    api_football_league_id: dto.apiFootballLeagueId,
                    api_football_season: dto.apiFootballSeason,
                    start_date: startDate,
                    end_date: endDate,
                    sport_type: 'futbol',
                    is_active: true,
                },
            });
            competitionCreated = true;
            this.logger.log(
                `Created competition "${competition.name}" (slug: ${competition.slug}, id: ${competition.id})`,
            );
        } else {
            // Update season/dates in case the data has changed
            competition = await this.prisma.competition.update({
                where: { id: competition.id },
                data: {
                    api_football_season: dto.apiFootballSeason,
                    start_date: startDate,
                    end_date: endDate,
                },
            });
            this.logger.log(
                `Reusing existing competition "${competition.name}" (id: ${competition.id}), importing missing fixtures...`,
            );
        }

        // 4. Process fixtures
        let created = 0;
        let skipped = 0;
        let resultsImported = 0;
        const errors: string[] = [];

        for (const fixture of fixtures) {
            try {
                const existingMatch = await this.prisma.match.findUnique({
                    where: { api_football_id: fixture.fixture.id },
                });

                if (existingMatch) {
                    skipped++;
                    continue;
                }

                const teamA = await this.findOrCreateTeam(
                    fixture.teams.home.id,
                    fixture.teams.home.name,
                    fixture.teams.home.logo,
                );
                const teamB = await this.findOrCreateTeam(
                    fixture.teams.away.id,
                    fixture.teams.away.name,
                    fixture.teams.away.logo,
                );

                const location = [fixture.fixture.venue?.name, fixture.fixture.venue?.city]
                    .filter(Boolean)
                    .join(', ') || null;

                const status = this.mapFixtureStatus(fixture.fixture.status.short);

                const match = await this.prisma.match.create({
                    data: {
                        api_football_id: fixture.fixture.id,
                        competition_id: competition.id,
                        team_a_id: teamA.id,
                        team_b_id: teamB.id,
                        match_date: new Date(fixture.fixture.date),
                        stage: fixture.league.round || 'Regular',
                        location,
                        status,
                    },
                });

                created++;

                // The user requested NOT to import results automatically during initial import.
                // Results will be imported later via the "Cargar Resultados" button.
                /*
                if (
                    this.isFinished(fixture.fixture.status.short) &&
                    fixture.goals.home !== null &&
                    fixture.goals.away !== null
                ) {
                    await this.importResultForFixture(match.id, fixture);
                    resultsImported++;
                }
                */
            } catch (error) {
                const errorMsg = `Error importing fixture ${fixture.fixture.id}: ${error.message}`;
                this.logger.error(errorMsg);
                errors.push(errorMsg);
            }
        }

        const summary = {
            competitionId: competition.id,
            competitionName: competition.name,
            competitionCreated,
            total: fixtures.length,
            created,
            skipped,
            resultsImported,
            errors: errors.length,
            errorDetails: errors.slice(0, 10),
        };

        this.logger.log(`Competition import complete: ${JSON.stringify(summary)}`);
        return summary;
    }

    /**
     * Import all fixtures from API-Football for a given league/season
     * into an existing local competition.
     */
    async importFixtures(dto: ImportFixturesDto) {
        // 1. Validate competition exists
        const competition = await this.prisma.competition.findUnique({
            where: { id: dto.competitionId },
        });

        if (!competition) {
            throw new NotFoundException(`Competition with ID "${dto.competitionId}" not found`);
        }

        // 2. Fetch fixtures from API-Football
        this.logger.log(`Fetching fixtures for league ${dto.apiFootballLeagueId}, season ${dto.apiFootballSeason}...`);
        const fixtures = await this.apiFootballService.fetchFixtures(
            dto.apiFootballLeagueId,
            dto.apiFootballSeason,
        );

        if (!fixtures || fixtures.length === 0) {
            throw new BadRequestException('No fixtures found for the given league and season');
        }

        this.logger.log(`Found ${fixtures.length} fixtures. Starting import...`);

        // 3. Update competition with API-Football league info
        await this.prisma.competition.update({
            where: { id: dto.competitionId },
            data: {
                api_football_league_id: dto.apiFootballLeagueId,
                api_football_season: dto.apiFootballSeason,
            },
        });

        let created = 0;
        let skipped = 0;
        let resultsImported = 0;
        const errors: string[] = [];

        // 4. Process each fixture
        for (const fixture of fixtures) {
            try {
                // Check if match already exists by api_football_id
                const existingMatch = await this.prisma.match.findUnique({
                    where: { api_football_id: fixture.fixture.id },
                });

                if (existingMatch) {
                    skipped++;
                    continue;
                }

                // Find or create teams
                const teamA = await this.findOrCreateTeam(
                    fixture.teams.home.id,
                    fixture.teams.home.name,
                    fixture.teams.home.logo,
                );
                const teamB = await this.findOrCreateTeam(
                    fixture.teams.away.id,
                    fixture.teams.away.name,
                    fixture.teams.away.logo,
                );

                // Build location string
                const location = [fixture.fixture.venue?.name, fixture.fixture.venue?.city]
                    .filter(Boolean)
                    .join(', ') || null;

                // Map API status to local status
                const status = this.mapFixtureStatus(fixture.fixture.status.short);

                // Create the match
                const match = await this.prisma.match.create({
                    data: {
                        api_football_id: fixture.fixture.id,
                        competition_id: dto.competitionId,
                        team_a_id: teamA.id,
                        team_b_id: teamB.id,
                        match_date: new Date(fixture.fixture.date),
                        stage: fixture.league.round || 'Regular',
                        location: location,
                        status: status,
                    },
                });

                created++;

                // The user requested NOT to import results automatically during initial import.
                // Results will be imported later via the "Cargar Resultados" button.
                /*
                // If match is finished, import the result
                if (this.isFinished(fixture.fixture.status.short) &&
                    fixture.goals.home !== null &&
                    fixture.goals.away !== null) {

                    await this.importResultForFixture(match.id, fixture);
                    resultsImported++;
                }
                */
            } catch (error) {
                const errorMsg = `Error importing fixture ${fixture.fixture.id}: ${error.message}`;
                this.logger.error(errorMsg);
                errors.push(errorMsg);
            }
        }

        const summary = {
            total: fixtures.length,
            created,
            skipped,
            resultsImported,
            errors: errors.length,
            errorDetails: errors.slice(0, 10), // Limit error details
        };

        this.logger.log(`Import complete: ${JSON.stringify(summary)}`);
        return summary;
    }

    /**
     * Update results for all finished matches that don't have results yet.
     * Called by the cron job or manually via the controller.
     */
    async updatePendingResults() {
        // Find active competitions with API-Football IDs
        const competitions = await this.prisma.competition.findMany({
            where: {
                is_active: true,
                api_football_league_id: { not: null },
                api_football_season: { not: null },
            },
        });

        if (competitions.length === 0) {
            this.logger.log('No active competitions with API-Football IDs found');
            return { competitions: 0, totalUpdated: 0, details: [] as any[] };
        }

        let totalUpdated = 0;
        const competitionResults: any[] = [];

        for (const competition of competitions) {
            try {
                this.logger.log(`Updating results for "${competition.name}" (league: ${competition.api_football_league_id}, season: ${competition.api_football_season})...`);

                // Fetch all fixtures for this competition from the API
                const fixtures = await this.apiFootballService.fetchFixtures(
                    competition.api_football_league_id!,
                    competition.api_football_season!,
                );

                // Get local matches that have api_football_id, including their results
                const matchesWithApiId = await this.prisma.match.findMany({
                    where: {
                        competition_id: competition.id,
                        api_football_id: { not: null },
                    },
                    include: { match_result: true },
                });

                // Filter to only those without a result, then build lookup map
                const pendingMatchMap = new Map(
                    matchesWithApiId
                        .filter(m => !m.match_result)
                        .map(m => [m.api_football_id!, m.id]),
                );

                let updated = 0;

                for (const fixture of fixtures) {
                    // Only process finished matches that we have locally without a result
                    if (!this.isFinished(fixture.fixture.status.short)) continue;
                    if (fixture.goals.home === null || fixture.goals.away === null) continue;

                    const localMatchId = pendingMatchMap.get(fixture.fixture.id);
                    if (!localMatchId) continue;

                    try {
                        await this.importResultForFixture(localMatchId as string, fixture);
                        updated++;
                    } catch (error) {
                        this.logger.error(`Error updating result for match ${localMatchId}: ${error.message}`);
                    }
                }

                totalUpdated += updated;
                competitionResults.push({
                    competition: competition.name,
                    pendingMatches: pendingMatchMap.size,
                    updated,
                });
            } catch (error) {
                this.logger.error(`Error updating results for competition "${competition.name}": ${error.message}`);
                competitionResults.push({
                    competition: competition.name,
                    error: error.message,
                });
            }
        }

        const summary = {
            competitions: competitions.length,
            totalUpdated,
            details: competitionResults,
        };

        this.logger.log(`Results update complete: ${JSON.stringify(summary)}`);
        return summary;
    }

    /**
     * Find team by API-Football ID, or create if not found.
     */
    private async findOrCreateTeam(apiFootballId: number, name: string, logoUrl: string) {
        // Try to find by API-Football ID first
        let team = await this.prisma.team.findUnique({
            where: { api_football_id: apiFootballId },
        });

        if (team) {
            // Update logo if changed
            if (logoUrl && team.flag_url !== logoUrl) {
                team = await this.prisma.team.update({
                    where: { id: team.id },
                    data: { flag_url: logoUrl },
                });
            }
            return team;
        }

        // Try to find by name (might exist from manual creation)
        team = await this.prisma.team.findFirst({
            where: { name: name },
        });

        if (team) {
            // Link the existing team to the API-Football ID
            team = await this.prisma.team.update({
                where: { id: team.id },
                data: {
                    api_football_id: apiFootballId,
                    flag_url: logoUrl || team.flag_url,
                },
            });
            return team;
        }

        // Create new team
        const code = this.generateTeamCode(name);
        team = await this.prisma.team.create({
            data: {
                name: name,
                code: code,
                api_football_id: apiFootballId,
                flag_url: logoUrl || null,
            },
        });

        return team;
    }

    /**
     * Generate a unique team code from the name.
     */
    private generateTeamCode(name: string): string {
        // Take first 3 chars uppercase, add random suffix if needed
        const base = name
            .replace(/[^a-zA-Z0-9]/g, '')
            .substring(0, 3)
            .toUpperCase();

        // Add a random numeric suffix to avoid collisions
        const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${base}${suffix}`;
    }

    /**
     * Import result for a finished fixture.
     * Uses MatchesService.updateResult to trigger scoring pipeline.
     */
    private async importResultForFixture(localMatchId: string, fixture: ApiFootballFixture) {
        const goalsHome = fixture.goals.home ?? 0;
        const goalsAway = fixture.goals.away ?? 0;

        // Try to get card statistics
        let yellowCardsHome = 0;
        let yellowCardsAway = 0;
        let redCardsHome = 0;
        let redCardsAway = 0;

        try {
            const stats = await this.apiFootballService.fetchFixtureStatistics(fixture.fixture.id);
            if (stats && stats.length >= 2) {
                // stats[0] = home team, stats[1] = away team
                for (const teamStats of stats) {
                    const isHome = teamStats.team.id === fixture.teams.home.id;
                    for (const stat of teamStats.statistics) {
                        if (stat.type === 'Yellow Cards') {
                            const val = typeof stat.value === 'number' ? stat.value : parseInt(String(stat.value)) || 0;
                            if (isHome) yellowCardsHome = val;
                            else yellowCardsAway = val;
                        }
                        if (stat.type === 'Red Cards') {
                            const val = typeof stat.value === 'number' ? stat.value : parseInt(String(stat.value)) || 0;
                            if (isHome) redCardsHome = val;
                            else redCardsAway = val;
                        }
                    }
                }
            }
        } catch (error) {
            this.logger.warn(`Could not fetch statistics for fixture ${fixture.fixture.id}: ${error.message}. Using 0 for cards.`);
        }

        // Use the existing updateResult which also triggers scoring
        await this.matchesService.updateResult(localMatchId, {
            goalsTeamA: goalsHome,
            goalsTeamB: goalsAway,
            yellowCardsTeamA: yellowCardsHome,
            yellowCardsTeamB: yellowCardsAway,
            redCardsTeamA: redCardsHome,
            redCardsTeamB: redCardsAway,
        });

        // Also update the match status to 'finished'
        await this.prisma.match.update({
            where: { id: localMatchId },
            data: { status: 'finished' },
        });
    }

    /**
     * Map API-Football status codes to local MatchStatus.
     */
    private mapFixtureStatus(apiStatus: string): any {
        const finishedStatuses = ['FT', 'AET', 'PEN', 'WO', 'AWD'];
        const inProgressStatuses = ['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE', 'INT'];

        if (finishedStatuses.includes(apiStatus)) return 'finished';
        if (inProgressStatuses.includes(apiStatus)) return 'in_progress';
        return 'scheduled';
    }

    /**
     * Check if fixture is finished.
     */
    private isFinished(apiStatus: string): boolean {
        return ['FT', 'AET', 'PEN', 'WO', 'AWD'].includes(apiStatus);
    }
}
