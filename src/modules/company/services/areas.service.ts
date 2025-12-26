import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAreaDto } from '../dto/create-area.dto';
import { UpdateAreaDto } from '../dto/update-area.dto';

@Injectable()
export class AreasService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(companyId: string, includeInactive: boolean = false) {
        const where: any = {
            company_id: companyId,
        };

        if (!includeInactive) {
            where.is_active = true;
        }

        return this.prisma.companyArea.findMany({
            where,
            include: {
                _count: {
                    select: {
                        employees: true,
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });
    }

    async findOne(companyId: string, id: string) {
        const area = await this.prisma.companyArea.findFirst({
            where: {
                id,
                company_id: companyId,
            },
            include: {
                _count: {
                    select: {
                        employees: true,
                    },
                },
            },
        });

        if (!area) {
            throw new NotFoundException(`Area with ID "${id}" not found`);
        }

        return area;
    }

    async create(companyId: string, createAreaDto: CreateAreaDto) {
        // Verificar que no exista un área con el mismo nombre
        const existingArea = await this.prisma.companyArea.findFirst({
            where: {
                company_id: companyId,
                name: createAreaDto.name,
            },
        });

        if (existingArea) {
            throw new ConflictException(
                `Area with name "${createAreaDto.name}" already exists in this company`
            );
        }

        // Crear área
        return this.prisma.companyArea.create({
            data: {
                company_id: companyId,
                name: createAreaDto.name,
                description: createAreaDto.description,
            },
        });
    }

    async update(companyId: string, id: string, updateAreaDto: UpdateAreaDto) {
        // Verificar que el área existe y pertenece a la empresa
        const area = await this.findOne(companyId, id);

        // Si se está cambiando el nombre, verificar que no exista otro con ese nombre
        if (updateAreaDto.name && updateAreaDto.name !== area.name) {
            const existingArea = await this.prisma.companyArea.findFirst({
                where: {
                    company_id: companyId,
                    name: updateAreaDto.name,
                    id: { not: id },
                },
            });

            if (existingArea) {
                throw new ConflictException(
                    `Area with name "${updateAreaDto.name}" already exists in this company`
                );
            }
        }

        // Actualizar área
        return this.prisma.companyArea.update({
            where: { id },
            data: {
                name: updateAreaDto.name,
                description: updateAreaDto.description,
                is_active: updateAreaDto.isActive,
            },
        });
    }

    async remove(companyId: string, id: string) {
        // Verificar que el área existe y pertenece a la empresa
        await this.findOne(companyId, id);

        // Verificar que no tenga empleados
        const employeesCount = await this.prisma.employee.count({
            where: {
                company_area_id: id,
            },
        });

        if (employeesCount > 0) {
            throw new BadRequestException(
                `Cannot delete area with ${employeesCount} employee(s). Please reassign employees first.`
            );
        }

        // Hard delete
        return this.prisma.companyArea.delete({
            where: { id },
        });
    }
}
