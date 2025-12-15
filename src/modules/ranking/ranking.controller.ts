import {
    Controller,
    Get,
    Param,
    UseGuards,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RankingService } from './ranking.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import type { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
    IndividualRankingResponseDto,
    AreaRankingResponseDto,
} from './dto/ranking-response.dto';

@ApiTags('Rankings')
@ApiBearerAuth()
@Controller('prodes/:prodeId/rankings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RankingController {
    constructor(
        private readonly rankingService: RankingService,
        private readonly prisma: PrismaService,
    ) { }

    @Get('general')
    @Roles(UserRole.empleado)
    @ApiOperation({ summary: 'Obtener ranking individual general del prode' })
    @ApiParam({ name: 'prodeId', description: 'ID del prode' })
    @ApiResponse({
        status: 200,
        description: 'Ranking individual general obtenido exitosamente',
        type: IndividualRankingResponseDto,
    })
    @ApiResponse({ status: 403, description: 'Ranking no habilitado o usuario no participa' })
    @ApiResponse({ status: 404, description: 'Prode no encontrado' })
    async getGeneralRanking(
        @Param('prodeId') prodeId: string,
        @CurrentUser() user: User,
    ) {
        // Verificar que el usuario es empleado y participa en el prode
        const employee = await this.prisma.employee.findUnique({
            where: { user_id: user.id },
        });

        if (!employee) {
            throw new ForbiddenException('Usuario no es un empleado');
        }

        const participant = await this.prisma.prodeParticipant.findUnique({
            where: {
                prode_id_employee_id: {
                    prode_id: prodeId,
                    employee_id: employee.id,
                },
            },
        });

        if (!participant) {
            throw new ForbiddenException('No estás participando en este prode');
        }

        return this.rankingService.getIndividualGeneralRanking(prodeId);
    }

    @Get('my-area')
    @Roles(UserRole.empleado)
    @ApiOperation({ summary: 'Obtener ranking individual de mi área' })
    @ApiParam({ name: 'prodeId', description: 'ID del prode' })
    @ApiResponse({
        status: 200,
        description: 'Ranking del área obtenido exitosamente',
        type: IndividualRankingResponseDto,
    })
    @ApiResponse({ status: 403, description: 'Ranking no habilitado o usuario no participa' })
    @ApiResponse({ status: 404, description: 'Prode no encontrado' })
    async getMyAreaRanking(
        @Param('prodeId') prodeId: string,
        @CurrentUser() user: User,
    ) {
        // Verificar que el usuario es empleado y participa en el prode
        const employee = await this.prisma.employee.findUnique({
            where: { user_id: user.id },
        });

        if (!employee) {
            throw new ForbiddenException('Usuario no es un empleado');
        }

        const participant = await this.prisma.prodeParticipant.findUnique({
            where: {
                prode_id_employee_id: {
                    prode_id: prodeId,
                    employee_id: employee.id,
                },
            },
        });

        if (!participant) {
            throw new ForbiddenException('No estás participando en este prode');
        }

        return this.rankingService.getIndividualAreaRanking(prodeId, employee.id);
    }

    @Get('areas')
    @Roles(UserRole.empleado)
    @ApiOperation({ summary: 'Obtener ranking entre áreas' })
    @ApiParam({ name: 'prodeId', description: 'ID del prode' })
    @ApiResponse({
        status: 200,
        description: 'Ranking de áreas obtenido exitosamente',
        type: AreaRankingResponseDto,
    })
    @ApiResponse({ status: 403, description: 'Ranking no habilitado o usuario no participa' })
    @ApiResponse({ status: 404, description: 'Prode no encontrado' })
    async getAreasRanking(
        @Param('prodeId') prodeId: string,
        @CurrentUser() user: User,
    ) {
        // Verificar que el usuario es empleado y participa en el prode
        const employee = await this.prisma.employee.findUnique({
            where: { user_id: user.id },
        });

        if (!employee) {
            throw new ForbiddenException('Usuario no es un empleado');
        }

        const participant = await this.prisma.prodeParticipant.findUnique({
            where: {
                prode_id_employee_id: {
                    prode_id: prodeId,
                    employee_id: employee.id,
                },
            },
        });

        if (!participant) {
            throw new ForbiddenException('No estás participando en este prode');
        }

        return this.rankingService.getAreaRanking(prodeId);
    }
}
