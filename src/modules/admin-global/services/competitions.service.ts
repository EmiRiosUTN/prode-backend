import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCompetitionDto } from '../dto';

@Injectable()
export class CompetitionsService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll() {
        // First, auto-update expired competitions to inactive
        const now = new Date();
        await this.prisma.competition.updateMany({
            where: {
                end_date: {
                    lt: now,
                },
                is_active: true,
            },
            data: {
                is_active: false,
            },
        });

        return this.prisma.competition.findMany({
            include: {
                _count: {
                    select: {
                        matches: true,
                        prodes: true,
                    },
                },
            },
            orderBy: {
                start_date: 'desc',
            },
        });
    }

    async findOne(id: string) {
        const competition = await this.prisma.competition.findUnique({
            where: { id },
            include: {
                matches: {
                    include: {
                        team_a: true,
                        team_b: true,
                        match_result: true,
                    },
                    orderBy: {
                        match_date: 'asc',
                    },
                },
                _count: {
                    select: {
                        prodes: true,
                    },
                },
            },
        });

        if (!competition) {
            throw new NotFoundException(`Competition with ID "${id}" not found`);
        }

        return competition;
    }

    async create(createCompetitionDto: CreateCompetitionDto) {
        const { slug } = createCompetitionDto;

        // Check if slug is already taken
        const existingCompetition = await this.prisma.competition.findUnique({
            where: { slug },
        });

        if (existingCompetition) {
            throw new ConflictException(`Competition with slug "${slug}" already exists`);
        }

        // Determine if competition should be active based on dates
        const now = new Date();
        const startDate = new Date(createCompetitionDto.startDate);
        const endDate = new Date(createCompetitionDto.endDate);

        // Competition is active if current date is between start and end dates
        const isWithinDateRange = now >= startDate && now <= endDate;
        const shouldBeActive = createCompetitionDto.isActive ?? isWithinDateRange;

        // MAPEO CORREGIDO DE CAMPOS
        return this.prisma.competition.create({
            data: {
                name: createCompetitionDto.name,
                slug: createCompetitionDto.slug,
                start_date: startDate,
                end_date: endDate,
                sport_type: createCompetitionDto.sportType || 'futbol',
                is_active: shouldBeActive,
            },
        });
    }

    async update(id: string, updateData: Partial<CreateCompetitionDto>) {
        // Check if competition exists
        const competition = await this.prisma.competition.findUnique({
            where: { id },
        });

        if (!competition) {
            throw new NotFoundException(`Competition with ID "${id}" not found`);
        }

        // MAPEO CORREGIDO DE CAMPOS
        return this.prisma.competition.update({
            where: { id },
            data: {
                name: updateData.name,
                start_date: updateData.startDate ? new Date(updateData.startDate) : undefined,
                end_date: updateData.endDate ? new Date(updateData.endDate) : undefined,
                sport_type: updateData.sportType,
                is_active: updateData.isActive,
            },
        });
    }
}