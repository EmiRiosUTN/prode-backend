import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Controller('admin/prediction-variables')
export class PredictionVariablesController {
    constructor(private readonly prisma: PrismaService) { }

    // Public endpoint - no authentication required
    // This is needed for the frontend to fetch available prediction variables
    @Get()
    async findAll() {
        const variables = await this.prisma.predictionVariable.findMany({
            where: { is_active: true },
            orderBy: { code: 'asc' },
        });

        return {
            success: true,
            data: variables,
        };
    }
}
