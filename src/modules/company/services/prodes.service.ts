import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateProdeDto } from '../dto/create-prode.dto';
import { UpdateProdeDto } from '../dto/update-prode.dto';

@Injectable()
export class ProdesService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(companyId: string) {
        return this.prisma.prode.findMany({
            where: { company_id: companyId },
            include: {
                competition: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        start_date: true,
                        end_date: true,
                    },
                },
                prode_variable_configs: {
                    where: { is_active: true },
                    include: {
                        prediction_variable: {
                            select: {
                                id: true,
                                code: true,
                                name: true,
                            },
                        },
                    },
                },
                prode_ranking_config: true,
                _count: {
                    select: {
                        prode_participants: true,
                    },
                },
            },
            orderBy: {
                created_at: 'desc',
            },
        });
    }

    async findOne(companyId: string, id: string) {
        const prode = await this.prisma.prode.findFirst({
            where: {
                id,
                company_id: companyId,
            },
            include: {
                competition: {
                    include: {
                        matches: {
                            include: {
                                team_a: true,
                                team_b: true,
                            },
                            orderBy: {
                                match_date: 'asc',
                            },
                        },
                    },
                },
                prode_variable_configs: {
                    where: { is_active: true },
                    include: {
                        prediction_variable: true,
                    },
                },
                prode_ranking_config: true,
                prode_participants: {
                    include: {
                        employee: {
                            select: {
                                id: true,
                                first_name: true,
                                last_name: true,
                                company_area: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!prode) {
            throw new NotFoundException(`Prode with ID "${id}" not found`);
        }

        return prode;
    }

    async create(companyId: string, createProdeDto: CreateProdeDto) {
        // Verificar que la competición existe
        const competition = await this.prisma.competition.findUnique({
            where: { id: createProdeDto.competitionId },
        });

        if (!competition) {
            throw new NotFoundException(
                `Competition with ID "${createProdeDto.competitionId}" not found`
            );
        }

        // Verificar que las variables de predicción existan
        const variableIds = createProdeDto.variableConfigs.map(
            (v) => v.predictionVariableId
        );

        const variables = await this.prisma.predictionVariable.findMany({
            where: { id: { in: variableIds } },
        });

        if (variables.length !== variableIds.length) {
            throw new BadRequestException('One or more prediction variables not found');
        }

        // Validate Company Area if present
        if (createProdeDto.companyAreaId) {
            const area = await this.prisma.companyArea.findFirst({
                where: {
                    id: createProdeDto.companyAreaId,
                    company_id: companyId,
                },
            });

            if (!area) {
                throw new NotFoundException(`Company Area with ID "${createProdeDto.companyAreaId}" not found`);
            }
        }

        // Crear prode en una transacción
        return this.prisma.$transaction(async (tx) => {
            // Crear prode
            const prode = await tx.prode.create({
                data: {
                    company_id: companyId,
                    competition_id: createProdeDto.competitionId,
                    name: createProdeDto.name,
                    description: createProdeDto.description,
                    participation_mode: createProdeDto.participationMode,
                    company_area_id: createProdeDto.companyAreaId,
                    winner_count: createProdeDto.winnerCount,
                    individual_prize: createProdeDto.individualPrize,
                    reward_area_winner: createProdeDto.rewardAreaWinner,
                    area_prize: createProdeDto.areaPrize,
                },
            });

            // Crear configuración de variables
            await tx.prodeVariableConfig.createMany({
                data: createProdeDto.variableConfigs.map((config) => ({
                    prode_id: prode.id,
                    prediction_variable_id: config.predictionVariableId,
                    points: config.points,
                    is_active: config.isActive ?? true,
                })),
            });

            // Crear configuración de ranking
            const defaultShowGeneral = createProdeDto.participationMode === 'general' || createProdeDto.participationMode === 'both';
            const defaultShowByArea = createProdeDto.participationMode === 'by_area' || createProdeDto.participationMode === 'both';

            await tx.prodeRankingConfig.create({
                data: {
                    prode_id: prode.id,
                    show_individual_general:
                        createProdeDto.rankingConfig?.showIndividualGeneral ?? defaultShowGeneral,
                    show_individual_by_area:
                        createProdeDto.rankingConfig?.showIndividualByArea ?? defaultShowByArea,
                    show_area_ranking:
                        createProdeDto.showAreaRanking ?? createProdeDto.rankingConfig?.showAreaRanking ?? false,
                    area_ranking_calculation:
                        createProdeDto.areaRankingCalculation ?? createProdeDto.rankingConfig?.areaRankingCalculation ?? 'average',
                },
            });

            // Retornar prode completo
            return tx.prode.findUnique({
                where: { id: prode.id },
                include: {
                    competition: true,
                    prode_variable_configs: {
                        include: {
                            prediction_variable: true,
                        },
                    },
                    prode_ranking_config: true,
                },
            });
        });
    }

    async update(companyId: string, id: string, updateProdeDto: UpdateProdeDto) {
        // Verificar que el prode existe y pertenece a la empresa
        await this.findOne(companyId, id);

        return this.prisma.prode.update({
            where: { id },
            data: {
                name: updateProdeDto.name,
                description: updateProdeDto.description,
                is_active: updateProdeDto.isActive,
                winner_count: updateProdeDto.winnerCount,
                individual_prize: updateProdeDto.individualPrize,
                reward_area_winner: updateProdeDto.rewardAreaWinner,
                area_prize: updateProdeDto.areaPrize,
            },
        });
    }

    async remove(companyId: string, id: string) {
        // Verificar que el prode existe y pertenece a la empresa
        const prode = await this.findOne(companyId, id);

        // Verificar que no tenga participantes
        if (prode.prode_participants.length > 0) {
            throw new BadRequestException(
                `Cannot delete prode with ${prode.prode_participants.length} participant(s)`
            );
        }

        // Eliminar prode (cascade eliminará configs)
        return this.prisma.prode.delete({
            where: { id },
        });
    }
}
