import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCompetitionDto } from '../dto';

@Injectable()
export class CompetitionsService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll() {
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
        const { slug, ...competitionData } = createCompetitionDto;

        // Check if slug is already taken
        const existingCompetition = await this.prisma.competition.findUnique({
            where: { slug },
        });

        if (existingCompetition) {
            throw new ConflictException(`Competition with slug "${slug}" already exists`);
        }

        return this.prisma.competition.create({
            data: {
                ...competitionData,
                slug,
                start_date: new Date(createCompetitionDto.startDate),
                end_date: new Date(createCompetitionDto.endDate),
                sport_type: createCompetitionDto.sportType || 'futbol',
                is_active: createCompetitionDto.isActive ?? true,
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
