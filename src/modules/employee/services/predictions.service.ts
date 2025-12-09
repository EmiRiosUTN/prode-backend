import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePredictionDto } from '../dto/create-prediction.dto';
import { UpdatePredictionDto } from '../dto/update-prediction.dto';

@Injectable()
export class PredictionsService {
    constructor(private prisma: PrismaService) { }

    // Listar partidos de un prode
    async findProdeMatches(prodeId: string, companyId: string, employeeId: string) {
        // Verificar que el prode existe y que el empleado participa
        const participant = await this.prisma.prodeParticipant.findFirst({
            where: {
                prode_id: prodeId,
                employee_id: employeeId,
                prode: {
                    company_id: companyId,
                },
            },
        });

        if (!participant) {
            throw new ForbiddenException('You are not participating in this prode');
        }

        // Obtener el prode para verificar la competición
        const prode = await this.prisma.prode.findUnique({
            where: { id: prodeId },
            select: { competition_id: true },
        });

        if (!prode) {
            throw new NotFoundException('Prode not found');
        }

        // Obtener partidos de la competición con predicciones del empleado
        const matches = await this.prisma.match.findMany({
            where: {
                competition_id: prode.competition_id,
            },
            include: {
                team_a: true,
                team_b: true,
                competition: true,
                predictions: {
                    where: {
                        prode_participant_id: participant.id,
                    },
                    include: {
                        predicted_scorers: {
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

        return matches.map(match => ({
            ...match,
            myPrediction: match.predictions[0] || null,
            isLocked: match.predictions[0]?.locked_at ? true : false,
        }));
    }

    // Ver mis predicciones
    async findMyPredictions(employeeId: string, prodeId?: string) {
        const where: any = {
            prode_participant: {
                employee_id: employeeId,
            },
        };

        if (prodeId) {
            where.prode_participant = {
                ...where.prode_participant,
                prode_id: prodeId,
            };
        }

        return this.prisma.prediction.findMany({
            where,
            include: {
                match: {
                    include: {
                        team_a: true,
                        team_b: true,
                        competition: true,
                    },
                },
                prode_participant: {
                    include: {
                        prode: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                predicted_scorers: {
                    include: {
                        team: true,
                    },
                },
            },
            orderBy: {
                created_at: 'desc',
            },
        });
    }

    // Crear o actualizar predicción (UPSERT)
    async upsertPrediction(
        employeeId: string,
        companyId: string,
        createDto: CreatePredictionDto,
    ) {
        // Verificar que participa en el prode
        const participant = await this.prisma.prodeParticipant.findFirst({
            where: {
                prode_id: createDto.prodeId,
                employee_id: employeeId,
                prode: {
                    company_id: companyId,
                },
            },
        });

        if (!participant) {
            throw new ForbiddenException('You are not participating in this prode');
        }

        // Verificar que el partido existe y pertenece a la competición del prode
        const prode = await this.prisma.prode.findUnique({
            where: { id: createDto.prodeId },
            select: { competition_id: true },
        });

        if (!prode) {
            throw new NotFoundException('Prode not found');
        }

        const match = await this.prisma.match.findFirst({
            where: {
                id: createDto.matchId,
                competition_id: prode.competition_id,
            },
        });

        if (!match) {
            throw new NotFoundException('Match not found in this prode competition');
        }

        // Verificar que el partido no haya comenzado
        const matchDate = new Date(match.match_date);
        const now = new Date();
        if (matchDate <= now) {
            throw new BadRequestException('Match has already started');
        }

        // Buscar predicción existente
        const existingPrediction = await this.prisma.prediction.findUnique({
            where: {
                prode_participant_id_match_id: {
                    prode_participant_id: participant.id,
                    match_id: createDto.matchId,
                },
            },
        });

        // Verificar si la predicción está bloqueada
        if (existingPrediction?.locked_at) {
            throw new BadRequestException('Prediction is locked, cannot modify');
        }

        // Usar transacción para crear/actualizar predicción y goleadores
        return this.prisma.$transaction(async (tx) => {
            const predictionData = {
                predicted_goals_team_a: createDto.homeScore,
                predicted_goals_team_b: createDto.awayScore,
            };

            let prediction;

            if (existingPrediction) {
                // Actualizar predicción existente
                prediction = await tx.prediction.update({
                    where: { id: existingPrediction.id },
                    data: predictionData,
                });

                // Eliminar goleadores anteriores si se proporcionan nuevos
                if (createDto.scorers) {
                    await tx.predictedScorer.deleteMany({
                        where: { prediction_id: prediction.id },
                    });
                }
            } else {
                // Crear nueva predicción
                prediction = await tx.prediction.create({
                    data: {
                        ...predictionData,
                        prode_participant_id: participant.id,
                        match_id: createDto.matchId,
                    },
                });
            }

            // Crear goleadores si se proporcionan
            if (createDto.scorers && createDto.scorers.length > 0) {
                // Note: The DTO structure doesn't match the Prisma schema well
                // DTO has: playerId (UUID), minute (number)
                // Prisma expects: player_full_name (string), predicted_goals (number), team_id (UUID)
                // This needs to be reviewed and fixed in the DTO or the mapping logic
                await tx.predictedScorer.createMany({
                    data: createDto.scorers
                        .filter(scorer => scorer.minute !== undefined) // Filter out scorers without goals
                        .map(scorer => ({
                            prediction_id: prediction.id,
                            player_full_name: scorer.playerId, // FIXME: This should be player name, not ID
                            predicted_goals: scorer.minute || 1, // FIXME: This should be goals count, not minute
                            team_id: createDto.winnerId || match.team_a_id, // FIXME: Needs proper team_id from scorer data
                        })),
                });
            }

            // Retornar predicción completa
            return tx.prediction.findUnique({
                where: { id: prediction.id },
                include: {
                    match: {
                        include: {
                            team_a: true,
                            team_b: true,
                        },
                    },
                    predicted_scorers: {
                        include: {
                            team: true,
                        },
                    },
                },
            });
        });
    }

    // Ver detalle de una predicción
    async findOne(predictionId: string, employeeId: string) {
        const prediction = await this.prisma.prediction.findFirst({
            where: {
                id: predictionId,
                prode_participant: {
                    employee_id: employeeId,
                },
            },
            include: {
                match: {
                    include: {
                        team_a: true,
                        team_b: true,
                        competition: true,
                    },
                },
                prode_participant: {
                    include: {
                        prode: true,
                    },
                },
                predicted_scorers: {
                    include: {
                        team: true,
                    },
                },
            },
        });

        if (!prediction) {
            throw new NotFoundException('Prediction not found');
        }

        return prediction;
    }
}