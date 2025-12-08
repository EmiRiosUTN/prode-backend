import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class EmployeesService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(companyId: string, areaId?: string) {
        return this.prisma.employee.findMany({
            where: {
                company_id: companyId,
                ...(areaId && { company_area_id: areaId }),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        is_active: true,
                    },
                },
                company_area: {
                    select: {
                        id: true,
                        name: true,
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

    async findOne(companyId: string, id: string) {
        const employee = await this.prisma.employee.findFirst({
            where: {
                id,
                company_id: companyId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        is_active: true,
                        created_at: true,
                    },
                },
                company_area: true,
                prode_participants: {
                    include: {
                        prode: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        if (!employee) {
            throw new NotFoundException(`Employee with ID "${id}" not found`);
        }

        return employee;
    }

    async block(companyId: string, id: string) {
        // Verificar que el empleado existe y pertenece a la empresa
        await this.findOne(companyId, id);

        return this.prisma.employee.update({
            where: { id },
            data: { is_blocked: true },
        });
    }

    async unblock(companyId: string, id: string) {
        // Verificar que el empleado existe y pertenece a la empresa
        await this.findOne(companyId, id);

        return this.prisma.employee.update({
            where: { id },
            data: { is_blocked: false },
        });
    }
}
