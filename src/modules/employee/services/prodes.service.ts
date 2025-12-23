import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ProdesService {
    constructor(private prisma: PrismaService) { }

    // Listar prodes donde el empleado participa
    async findMyProdes(employeeId: string) {
        const participants = await this.prisma.prodeParticipant.findMany({
            where: {
                employee_id: employeeId,
            },
            include: {
                prode: {
                    include: {
                        competition: {
                            select: {
                                id: true,
                                name: true,
                                start_date: true,
                                end_date: true,
                                sport_type: true,
                            },
                        },
                        _count: {
                            select: {
                                prode_participants: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                joined_at: 'desc',
            },
        });

        return participants.map(p => ({
            ...p.prode,
            joinedAt: p.joined_at,
            participantCount: p.prode._count.prode_participants,
            matchCount: 0, // Note: Matches are not directly linked to prodes in the schema
        }));
    }

    // Listar prodes disponibles para unirse
    async findAvailableProdes(companyId: string, employeeId: string) {
        // Obtener IDs de prodes donde ya participa
        const myProdes = await this.prisma.prodeParticipant.findMany({
            where: { employee_id: employeeId },
            select: { prode_id: true },
        });

        const myProdeIds = myProdes.map(p => p.prode_id);

        // Obtener datos del empleado para saber su área
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            select: { company_area_id: true },
        });

        // Buscar prodes activos de la empresa donde NO participa y que sean accesibles (general o de su área)
        return this.prisma.prode.findMany({
            where: {
                company_id: companyId,
                is_active: true,
                id: {
                    notIn: myProdeIds,
                },
                OR: [
                    { company_area_id: null }, // Prodes generales
                    { company_area_id: employee?.company_area_id }, // Prodes de su área
                ],
            },
            include: {
                competition: {
                    select: {
                        id: true,
                        name: true,
                        start_date: true,
                        end_date: true,
                        sport_type: true,
                    },
                },
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

    // Ver detalle de un prode
    async findOne(prodeId: string, companyId: string, employeeId: string) {
        const prode = await this.prisma.prode.findFirst({
            where: {
                id: prodeId,
                company_id: companyId,
            },
            include: {
                competition: true,
                prode_variable_configs: {
                    include: {
                        prediction_variable: true,
                    },
                },
                prode_ranking_config: true,
                _count: {
                    select: {
                        prode_participants: true,
                    },
                },
            },
        });

        if (!prode) {
            throw new NotFoundException('Prode not found');
        }

        // Verificar si el empleado participa
        const participant = await this.prisma.prodeParticipant.findUnique({
            where: {
                prode_id_employee_id: {
                    prode_id: prodeId,
                    employee_id: employeeId,
                },
            },
        });

        return {
            ...prode,
            isParticipating: !!participant,
            joinedAt: participant?.joined_at || null,
        };
    }

    // Unirse a un prode
    async joinProde(prodeId: string, companyId: string, employeeId: string) {
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            select: { company_area_id: true },
        });

        // Verificar que el prode existe, pertenece a la empresa y es accesible
        const prode = await this.prisma.prode.findFirst({
            where: {
                id: prodeId,
                company_id: companyId,
                is_active: true,
                OR: [
                    { company_area_id: null },
                    { company_area_id: employee?.company_area_id },
                ],
            },
        });

        if (!prode) {
            throw new NotFoundException('Prode not found or not active');
        }

        // Verificar que no esté ya participando
        const existing = await this.prisma.prodeParticipant.findUnique({
            where: {
                prode_id_employee_id: {
                    prode_id: prodeId,
                    employee_id: employeeId,
                },
            },
        });

        if (existing) {
            throw new BadRequestException('Already participating in this prode');
        }

        // Crear participante
        const participant = await this.prisma.prodeParticipant.create({
            data: {
                prode_id: prodeId,
                employee_id: employeeId,
            },
            include: {
                prode: {
                    include: {
                        competition: true,
                    },
                },
            },
        });

        return {
            message: 'Successfully joined prode',
            participant,
        };
    }
}