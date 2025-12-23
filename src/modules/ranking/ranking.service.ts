import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service';
import {
    IndividualRankingEntry,
    AreaRankingEntry,
    RankingMetadata,
} from './interfaces/ranking.interface';
import { AreaRankingCalculation } from '@prisma/client';

@Injectable()
export class RankingService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) { }

    /**
     * Obtiene el ranking individual general de un prode
     */
    async getIndividualGeneralRanking(
        prodeId: string,
    ): Promise<{ metadata: RankingMetadata; ranking: IndividualRankingEntry[] }> {
        // Verificar que el prode existe y está activo
        const prode = await this.prisma.prode.findUnique({
            where: { id: prodeId },
            include: {
                prode_ranking_config: true,
                competition: true,
            },
        });

        if (!prode) {
            throw new NotFoundException('Prode no encontrado');
        }

        if (!prode.is_active) {
            throw new ForbiddenException('El prode no está activo');
        }

        // Verificar que el ranking general está habilitado
        if (!prode.prode_ranking_config?.show_individual_general) {
            throw new ForbiddenException('El ranking individual general no está habilitado para este prode');
        }

        // Intentar obtener del caché
        const cacheKey = `ranking:${prodeId}:individual_general`;
        const cached = await this.cacheManager.get<{ metadata: RankingMetadata; ranking: IndividualRankingEntry[] }>(cacheKey);

        if (cached) {
            return {
                ...cached,
                metadata: {
                    ...cached.metadata,
                    isCached: true,
                },
            };
        }

        // Calcular ranking
        const participants = await this.prisma.prodeParticipant.findMany({
            where: { prode_id: prodeId },
            include: {
                employee: {
                    include: {
                        user: true,
                        company_area: true,
                    },
                },
                predictions: {
                    include: {
                        prediction_score: true,
                    },
                },
            },
        });

        const rankingData: IndividualRankingEntry[] = participants
            .map((participant) => {
                const totalPoints = participant.predictions.reduce((sum, prediction) => {
                    return sum + (prediction.prediction_score?.total_points || 0);
                }, 0);

                const predictionsCount = participant.predictions.length;

                return {
                    employeeId: participant.employee.id,
                    employeeName: `${participant.employee.first_name} ${participant.employee.last_name}`,
                    areaName: participant.employee.company_area.name,
                    totalPoints,
                    predictionsCount,
                    position: 0, // Se asignará después de ordenar
                };
            })
            .sort((a, b) => b.totalPoints - a.totalPoints) // Ordenar por puntos descendente
            .map((entry, index) => ({
                ...entry,
                position: index + 1,
            }));

        const metadata: RankingMetadata = {
            prodeId: prode.id,
            prodeName: prode.name,
            totalParticipants: participants.length,
            lastUpdated: new Date(),
            isCached: false,
        };

        const result = { metadata, ranking: rankingData };

        // Guardar en caché por 5 minutos
        await this.cacheManager.set(cacheKey, result, 300000);

        return result;
    }

    /**
     * Obtiene el ranking individual del área de un empleado
     */
    async getIndividualAreaRanking(
        prodeId: string,
        employeeId: string,
    ): Promise<{ metadata: RankingMetadata; ranking: IndividualRankingEntry[] }> {
        // Verificar que el prode existe y está activo
        const prode = await this.prisma.prode.findUnique({
            where: { id: prodeId },
            include: {
                prode_ranking_config: true,
            },
        });

        if (!prode) {
            throw new NotFoundException('Prode no encontrado');
        }

        if (!prode.is_active) {
            throw new ForbiddenException('El prode no está activo');
        }

        // Verificar que el ranking por área está habilitado
        if (!prode.prode_ranking_config?.show_individual_by_area) {
            throw new ForbiddenException('El ranking individual por área no está habilitado para este prode');
        }

        // Obtener el área del empleado
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            include: {
                company_area: true,
            },
        });

        if (!employee) {
            throw new NotFoundException('Empleado no encontrado');
        }

        const areaId = employee.company_area_id;

        // Intentar obtener del caché
        const cacheKey = `ranking:${prodeId}:individual_by_area:${areaId}`;
        const cached = await this.cacheManager.get<{ metadata: RankingMetadata; ranking: IndividualRankingEntry[] }>(cacheKey);

        if (cached) {
            return {
                ...cached,
                metadata: {
                    ...cached.metadata,
                    isCached: true,
                },
            };
        }

        // Calcular ranking del área
        const participants = await this.prisma.prodeParticipant.findMany({
            where: {
                prode_id: prodeId,
                employee: {
                    company_area_id: areaId,
                },
            },
            include: {
                employee: {
                    include: {
                        user: true,
                        company_area: true,
                    },
                },
                predictions: {
                    include: {
                        prediction_score: true,
                    },
                },
            },
        });

        const rankingData: IndividualRankingEntry[] = participants
            .map((participant) => {
                const totalPoints = participant.predictions.reduce((sum, prediction) => {
                    return sum + (prediction.prediction_score?.total_points || 0);
                }, 0);

                const predictionsCount = participant.predictions.length;

                return {
                    employeeId: participant.employee.id,
                    employeeName: `${participant.employee.first_name} ${participant.employee.last_name}`,
                    areaName: participant.employee.company_area.name,
                    totalPoints,
                    predictionsCount,
                    position: 0,
                };
            })
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .map((entry, index) => ({
                ...entry,
                position: index + 1,
            }));

        const metadata: RankingMetadata = {
            prodeId: prode.id,
            prodeName: prode.name,
            totalParticipants: participants.length,
            lastUpdated: new Date(),
            isCached: false,
        };

        const result = { metadata, ranking: rankingData };

        // Guardar en caché por 5 minutos
        await this.cacheManager.set(cacheKey, result, 300000);

        return result;
    }

    /**
     * Obtiene el ranking entre áreas
     */
    async getAreaRanking(
        prodeId: string,
    ): Promise<{ metadata: RankingMetadata; ranking: AreaRankingEntry[] }> {
        // Verificar que el prode existe y está activo
        const prode = await this.prisma.prode.findUnique({
            where: { id: prodeId },
            include: {
                prode_ranking_config: true,
            },
        });

        if (!prode) {
            throw new NotFoundException('Prode no encontrado');
        }

        if (!prode.is_active) {
            throw new ForbiddenException('El prode no está activo');
        }

        // Verificar que el ranking de áreas está habilitado
        if (!prode.prode_ranking_config?.show_area_ranking) {
            throw new ForbiddenException('El ranking de áreas no está habilitado para este prode');
        }

        const calculationType = prode.prode_ranking_config.area_ranking_calculation;

        // Intentar obtener del caché
        const cacheKey = `ranking:${prodeId}:area`;
        const cached = await this.cacheManager.get<{ metadata: RankingMetadata; ranking: AreaRankingEntry[] }>(cacheKey);

        if (cached) {
            return {
                ...cached,
                metadata: {
                    ...cached.metadata,
                    isCached: true,
                },
            };
        }

        // Obtener todos los participantes con sus puntos
        const participants = await this.prisma.prodeParticipant.findMany({
            where: { prode_id: prodeId },
            include: {
                employee: {
                    include: {
                        user: true,
                        company_area: true,
                    },
                },
                predictions: {
                    include: {
                        prediction_score: true,
                    },
                },
            },
        });

        // Agrupar por área
        const areaMap = new Map<string, {
            areaId: string;
            areaName: string;
            participants: Array<{
                employeeId: string;
                employeeName: string;
                totalPoints: number;
            }>;
        }>();

        participants.forEach((participant) => {
            const areaId = participant.employee.company_area_id;
            const areaName = participant.employee.company_area.name;
            const totalPoints = participant.predictions.reduce((sum, prediction) => {
                return sum + (prediction.prediction_score?.total_points || 0);
            }, 0);

            if (!areaMap.has(areaId)) {
                areaMap.set(areaId, {
                    areaId,
                    areaName,
                    participants: [],
                });
            }

            areaMap.get(areaId)!.participants.push({
                employeeId: participant.employee.id,
                employeeName: `${participant.employee.first_name} ${participant.employee.last_name}`,
                totalPoints,
            });
        });

        // Calcular puntos por área según el tipo de cálculo
        const rankingData: AreaRankingEntry[] = Array.from(areaMap.values())
            .map((area) => {
                let totalPoints: number;

                if (calculationType === AreaRankingCalculation.sum) {
                    // Suma total de puntos
                    totalPoints = area.participants.reduce((sum, p) => sum + p.totalPoints, 0);
                } else {
                    // Promedio de puntos
                    const sum = area.participants.reduce((sum, p) => sum + p.totalPoints, 0);
                    totalPoints = area.participants.length > 0 ? Math.round(sum / area.participants.length) : 0;
                }

                // Obtener top 3 empleados del área
                const topEmployees = area.participants
                    .sort((a, b) => b.totalPoints - a.totalPoints)
                    .slice(0, 3);

                return {
                    areaId: area.areaId,
                    areaName: area.areaName,
                    totalPoints,
                    participantsCount: area.participants.length,
                    topEmployees,
                    position: 0,
                };
            })
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .map((entry, index) => ({
                ...entry,
                position: index + 1,
            }));

        const metadata: RankingMetadata = {
            prodeId: prode.id,
            prodeName: prode.name,
            totalParticipants: participants.length,
            lastUpdated: new Date(),
            isCached: false,
        };

        const result = { metadata, ranking: rankingData };

        // Guardar en caché por 5 minutos
        await this.cacheManager.set(cacheKey, result, 300000);

        return result;
    }

    /**
     * Invalida el caché de rankings de un prode
     * Se debe llamar cuando se actualizan puntos
     */
    async invalidateCache(prodeId: string): Promise<void> {
        const keys = [
            `ranking:${prodeId}:individual_general`,
            `ranking:${prodeId}:area`,
        ];

        // También invalidar todos los rankings por área
        // Obtener todas las áreas del prode
        const participants = await this.prisma.prodeParticipant.findMany({
            where: { prode_id: prodeId },
            include: {
                employee: {
                    select: {
                        company_area_id: true,
                    },
                },
            },
        });

        const areaIds = new Set(participants.map(p => p.employee.company_area_id));
        areaIds.forEach(areaId => {
            keys.push(`ranking:${prodeId}:individual_by_area:${areaId}`);
        });

        // Eliminar todas las keys
        await Promise.all(keys.map(key => this.cacheManager.del(key)));
    }

    /**
     * Invalida el caché de rankings para todos los prodes afectados por un partido
     */
    async invalidateCachesForMatch(matchId: string): Promise<void> {
        // Encontrar el partido y su competición
        const match = await this.prisma.match.findUnique({
            where: { id: matchId },
            include: { competition: true },
        });

        if (!match) return;

        // Encontrar todos los prodes de esa competición
        const prodes = await this.prisma.prode.findMany({
            where: { competition_id: match.competition_id },
            select: { id: true },
        });

        // Invalidar caché para cada prode
        await Promise.all(prodes.map(prode => this.invalidateCache(prode.id)));
    }
}
