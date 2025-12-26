import { Injectable, NotFoundException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateMatchDto, UpdateMatchResultDto, AddMatchScorerDto } from '../dto';

@Injectable()
export class MatchesService {
    private readonly logger = new Logger(MatchesService.name);

    constructor(
        private readonly prisma: PrismaService,
        @InjectQueue('scoring') private scoringQueue: Queue,
    ) { }

    async findAll(competitionId?: string) {
        const where = competitionId ? { competition_id: competitionId } : {};

        const matches = await this.prisma.match.findMany({
            where,
            include: {
                competition: true,
                team_a: true,
                team_b: true,
                match_result: {
                    include: {
                        match_scorers: {
                            include: {
                                team: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                match_date: 'asc',
            },
        });

        return matches.map(match => {
            const startDate = new Date(match.match_date);
            const now = new Date();

            // Determine duration based on sport type (default to 120 mins for futbol)
            let durationMinutes = 120;
            if (match.competition?.sport_type === 'basketball') {
                durationMinutes = 150;
            }

            const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

            let computedStatus = match.status;

            // Dynamic status logic:
            // Only automaticaly update if status is 'scheduled'.
            // If it's 'in_progress', 'finished', or 'cancelled' (manually set), respect the DB value.
            if (match.status === 'scheduled') {
                if (now > endDate) {
                    computedStatus = 'finished';
                } else if (now >= startDate && now <= endDate) {
                    computedStatus = 'in_progress';
                }
            }

            return {
                ...match,
                status: computedStatus,
            };
        });
    }

    async findOne(id: string) {
        const match = await this.prisma.match.findUnique({
            where: { id },
            include: {
                competition: true,
                team_a: true,
                team_b: true,
                match_result: {
                    include: {
                        match_scorers: {
                            include: {
                                team: true,
                            },
                        },
                    },
                },
                predictions: {
                    include: {
                        prode_participant: {
                            include: {
                                employee: {
                                    select: {
                                        first_name: true,
                                        last_name: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!match) {
            throw new NotFoundException(`Match with ID "${id}" not found`);
        }

        return match;
    }

    async create(createMatchDto: CreateMatchDto) {
        // Verify competition exists
        const competition = await this.prisma.competition.findUnique({
            where: { id: createMatchDto.competitionId },
        });

        if (!competition) {
            throw new NotFoundException(`Competition with ID "${createMatchDto.competitionId}" not found`);
        }

        // Find or create Team A
        let teamA = await this.prisma.team.findFirst({
            where: { name: createMatchDto.teamA },
        });

        if (!teamA) {
            // Create team with a simple code (first 3 letters uppercase)
            const teamCode = createMatchDto.teamA.substring(0, 3).toUpperCase();
            teamA = await this.prisma.team.create({
                data: {
                    name: createMatchDto.teamA,
                    code: teamCode,
                    flag_url: createMatchDto.teamAFlagUrl || null,
                },
            });
        } else if (createMatchDto.teamAFlagUrl && teamA.flag_url !== createMatchDto.teamAFlagUrl) {
            // Update flag URL if provided and different
            teamA = await this.prisma.team.update({
                where: { id: teamA.id },
                data: { flag_url: createMatchDto.teamAFlagUrl },
            });
        }

        // Find or create Team B
        let teamB = await this.prisma.team.findFirst({
            where: { name: createMatchDto.teamB },
        });

        if (!teamB) {
            const teamCode = createMatchDto.teamB.substring(0, 3).toUpperCase();
            teamB = await this.prisma.team.create({
                data: {
                    name: createMatchDto.teamB,
                    code: teamCode,
                    flag_url: createMatchDto.teamBFlagUrl || null,
                },
            });
        } else if (createMatchDto.teamBFlagUrl && teamB.flag_url !== createMatchDto.teamBFlagUrl) {
            // Update flag URL if provided and different
            teamB = await this.prisma.team.update({
                where: { id: teamB.id },
                data: { flag_url: createMatchDto.teamBFlagUrl },
            });
        }

        if (teamA.id === teamB.id) {
            throw new BadRequestException('Team A and Team B cannot be the same');
        }

        return this.prisma.match.create({
            data: {
                competition_id: createMatchDto.competitionId,
                team_a_id: teamA.id,
                team_b_id: teamB.id,
                match_date: new Date(createMatchDto.matchDate),
                stage: createMatchDto.stage || 'Regular',
                location: createMatchDto.location,
                status: createMatchDto.status || 'scheduled',
            },
            include: {
                competition: true,
                team_a: true,
                team_b: true,
            },
        });
    }

    async update(id: string, updateData: Partial<CreateMatchDto>) {
        const match = await this.prisma.match.findUnique({
            where: { id },
            include: {
                team_a: true,
                team_b: true,
            },
        });

        if (!match) {
            throw new NotFoundException(`Match with ID "${id}" not found`);
        }

        // Update team A flag if provided
        if (updateData.teamAFlagUrl !== undefined && match.team_a) {
            await this.prisma.team.update({
                where: { id: match.team_a.id },
                data: { flag_url: updateData.teamAFlagUrl || null },
            });
        }

        // Update team B flag if provided
        if (updateData.teamBFlagUrl !== undefined && match.team_b) {
            await this.prisma.team.update({
                where: { id: match.team_b.id },
                data: { flag_url: updateData.teamBFlagUrl || null },
            });
        }

        const updatedMatch = await this.prisma.match.update({
            where: { id },
            data: {
                match_date: updateData.matchDate ? new Date(updateData.matchDate) : undefined,
                stage: updateData.stage,
                location: updateData.location,
                status: updateData.status,
            },
            include: {
                competition: true,
                team_a: true,
                team_b: true,
            },
        });

        return updatedMatch;
    }

    async updateResult(matchId: string, resultDto: UpdateMatchResultDto) {
        this.logger.log(`Updating result for match ${matchId}`);
        const match = await this.prisma.match.findUnique({
            where: { id: matchId },
            include: {
                match_result: true,
            },
        });

        if (!match) {
            throw new NotFoundException(`Match with ID "${matchId}" not found`);
        }

        // Update or create match result
        const result = await this.prisma.matchResult.upsert({
            where: { match_id: matchId },
            create: {
                match_id: matchId,
                goals_team_a: resultDto.goalsTeamA,
                goals_team_b: resultDto.goalsTeamB,
                yellow_cards_team_a: resultDto.yellowCardsTeamA,
                yellow_cards_team_b: resultDto.yellowCardsTeamB,
                red_cards_team_a: resultDto.redCardsTeamA,
                red_cards_team_b: resultDto.redCardsTeamB,
                finalized_at: new Date(),
            },
            update: {
                goals_team_a: resultDto.goalsTeamA,
                goals_team_b: resultDto.goalsTeamB,
                yellow_cards_team_a: resultDto.yellowCardsTeamA,
                yellow_cards_team_b: resultDto.yellowCardsTeamB,
                red_cards_team_a: resultDto.redCardsTeamA,
                red_cards_team_b: resultDto.redCardsTeamB,
                finalized_at: new Date(),
            },
        });

        console.error(`[[DEBUG]] Result upserted for match ${matchId}. Triggering scoring job...`);

        // Trigger scoring calculation
        try {
            // Check queue status
            const queueClient = this.scoringQueue.client;
            const clientStatus = (queueClient as any).status;
            console.error(`[[DEBUG]] Scoring Queue Client Status: ${clientStatus}`);

            // Check if client is ready
            if (clientStatus !== 'ready') {
                console.error(`[[DEBUG]] Redis client is NOT ready. It is in state: ${clientStatus}. Attempting to proceed anyway but expecting failure.`);
            }

            console.error(`[[DEBUG]] Adding job to scoring queue for match ${matchId}`);

            // Race condition constraint: 
            const jobPromise = this.scoringQueue.add('calculate-scores', { matchId }, { timeout: 3000 });
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Queue Add Timeout')), 3000));

            await Promise.race([jobPromise, timeoutPromise]);

            console.error(`[[DEBUG]] Job added successfully`);
        } catch (error) {
            console.error(`[[DEBUG]] Error adding job to queue:`, error);
            // Non-blocking error for client, but critical for system
        }

        return result;
    }

    async addScorer(matchId: string, scorerDto: AddMatchScorerDto) {
        const match = await this.prisma.match.findUnique({
            where: { id: matchId },
            include: {
                match_result: true,
            },
        });

        if (!match) {
            throw new NotFoundException(`Match with ID "${matchId}" not found`);
        }

        if (!match.match_result) {
            throw new BadRequestException('Match result must be created before adding scorers');
        }

        // Verify team exists and is part of the match
        const team = await this.prisma.team.findUnique({
            where: { id: scorerDto.teamId },
        });

        if (!team) {
            throw new NotFoundException(`Team with ID "${scorerDto.teamId}" not found`);
        }

        if (scorerDto.teamId !== match.team_a_id && scorerDto.teamId !== match.team_b_id) {
            throw new BadRequestException('Team must be one of the teams playing in this match');
        }

        return this.prisma.matchScorer.create({
            data: {
                match_result_id: match.match_result.id,
                player_full_name: scorerDto.playerFullName,
                team_id: scorerDto.teamId,
                goals_count: scorerDto.goalsCount,
            },
            include: {
                team: true,
            },
        });
    }
}
