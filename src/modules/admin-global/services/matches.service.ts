import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateMatchDto, UpdateMatchResultDto, AddMatchScorerDto } from '../dto';

@Injectable()
export class MatchesService {
    constructor(
        private readonly prisma: PrismaService,
        @InjectQueue('scoring') private scoringQueue: Queue,
    ) { }

    async findAll(competitionId?: string) {
        const where = competitionId ? { competition_id: competitionId } : {};

        return this.prisma.match.findMany({
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

        // Verify teams exist
        const [teamA, teamB] = await Promise.all([
            this.prisma.team.findUnique({ where: { id: createMatchDto.teamAId } }),
            this.prisma.team.findUnique({ where: { id: createMatchDto.teamBId } }),
        ]);

        if (!teamA) {
            throw new NotFoundException(`Team A with ID "${createMatchDto.teamAId}" not found`);
        }

        if (!teamB) {
            throw new NotFoundException(`Team B with ID "${createMatchDto.teamBId}" not found`);
        }

        if (createMatchDto.teamAId === createMatchDto.teamBId) {
            throw new BadRequestException('Team A and Team B cannot be the same');
        }

        return this.prisma.match.create({
            data: {
                competition_id: createMatchDto.competitionId,
                team_a_id: createMatchDto.teamAId,
                team_b_id: createMatchDto.teamBId,
                match_date: new Date(createMatchDto.matchDate),
                stage: createMatchDto.stage,
                location: createMatchDto.location,
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
        });

        if (!match) {
            throw new NotFoundException(`Match with ID "${id}" not found`);
        }

        return this.prisma.match.update({
            where: { id },
            data: {
                match_date: updateData.matchDate ? new Date(updateData.matchDate) : undefined,
                stage: updateData.stage,
                location: updateData.location,
            },
            include: {
                competition: true,
                team_a: true,
                team_b: true,
            },
        });
    }

    async updateResult(matchId: string, resultDto: UpdateMatchResultDto) {
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

        // Update match status to finished
        await this.prisma.match.update({
            where: { id: matchId },
            data: { status: 'finished' },
        });

        // Trigger automatic scoring calculation
        await this.scoringQueue.add('calculate-scores', {
            matchId,
        });

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
