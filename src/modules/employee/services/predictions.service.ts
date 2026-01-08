import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePredictionDto } from '../dto/create-prediction.dto';
import { UpdatePredictionDto } from '../dto/update-prediction.dto';
import { AiService } from '../../../common/ai.service';

@Injectable()
export class PredictionsService {
    constructor(
        private prisma: PrismaService,
        private aiService: AiService,
    ) { }

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
                match_result: true,
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

            // Only override if status is NOT cancelled
            if (match.status !== 'cancelled') {
                if (now > endDate) {
                    computedStatus = 'finished';
                } else if (now >= startDate && now <= endDate) {
                    computedStatus = 'in_progress';
                }
            }

            return {
                ...match,
                status: computedStatus,
                myPrediction: match.predictions[0] || null,
                isLocked: now >= startDate || (match.predictions[0]?.locked_at ? true : false),
            };
        });
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
                predicted_yellow_cards_team_a: createDto.homeYellowCards,
                predicted_yellow_cards_team_b: createDto.awayYellowCards,
                predicted_red_cards_team_a: createDto.homeRedCards,
                predicted_red_cards_team_b: createDto.awayRedCards,
            };

            let prediction;

            if (existingPrediction) {
                // Actualizar predicción existente
                prediction = await tx.prediction.update({
                    where: { id: existingPrediction.id },
                    data: predictionData,
                });


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
        })

            ;

        if (!prediction) {
            throw new NotFoundException('Prediction not found');
        }

        return prediction;
    }

    // Get available predictions to copy from other prodes
    async getAvailableCopies(matchId: string, currentProdeId: string, employeeId: string, companyId: string) {
        // Get the match to find its competition
        const match = await this.prisma.match.findUnique({
            where: { id: matchId },
            select: { competition_id: true },
        });

        if (!match) {
            throw new NotFoundException('Match not found');
        }

        // Find all prodes of the same competition where the employee participates
        const participants = await this.prisma.prodeParticipant.findMany({
            where: {
                employee_id: employeeId,
                prode: {
                    company_id: companyId,
                    competition_id: match.competition_id,
                    id: {
                        not: currentProdeId, // Exclude current prode
                    },
                },
            },
            include: {
                prode: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                predictions: {
                    where: {
                        match_id: matchId,
                    },
                    select: {
                        predicted_goals_team_a: true,
                        predicted_goals_team_b: true,
                        predicted_yellow_cards_team_a: true,
                        predicted_yellow_cards_team_b: true,
                        predicted_red_cards_team_a: true,
                        predicted_red_cards_team_b: true,
                    },
                },
            },
        });

        // Filter to only participants with predictions for this match
        const availablePredictions = participants
            .filter(p => p.predictions.length > 0)
            .map(p => ({
                prodeId: p.prode.id,
                prodeName: p.prode.name,
                prediction: p.predictions[0],
            }));

        return { availablePredictions };
    }

    // Get AI analysis for a match
    async getMatchAnalysis(matchId: string, employeeId: string, companyId: string) {
        // Verify the match exists
        const match = await this.prisma.match.findUnique({
            where: { id: matchId },
            include: {
                team_a: true,
                team_b: true,
            },
        });

        if (!match) {
            throw new NotFoundException('Match not found');
        }

        // Check if analysis already exists
        if (match.ai_analysis) {
            return match.ai_analysis;
        }

        // Generate new analysis
        try {
            const analysis = await this.aiService.generateMatchAnalysis(
                match.team_a.name,
                match.team_b.name,
                match.match_date,
            );

            // Cache the analysis in the database
            await this.prisma.match.update({
                where: { id: matchId },
                data: { ai_analysis: analysis as any },
            });

            return analysis;
        } catch (error) {
            // If AI service fails, return null instead of throwing
            // This allows the app to continue working without AI
            return null;
        }
    }
}