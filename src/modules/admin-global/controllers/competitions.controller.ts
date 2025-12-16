import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { CompetitionsService } from '../services';
import { CreateCompetitionDto } from '../dto';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { Roles } from '../../../common/decorators';

@Controller('admin/competitions')
export class CompetitionsController {
    constructor(private readonly competitionsService: CompetitionsService) { }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin_global')
    findAll() {
        return this.competitionsService.findAll();
    }

    // Public endpoint for listing competitions (accessible to all authenticated users)
    // Must come BEFORE :id route to avoid conflict
    @Get('public')
    @UseGuards(JwtAuthGuard)
    findAllPublic() {
        return this.competitionsService.findAll();
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin_global')
    findOne(@Param('id') id: string) {
        return this.competitionsService.findOne(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin_global')
    create(@Body() createCompetitionDto: CreateCompetitionDto) {
        return this.competitionsService.create(createCompetitionDto);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin_global')
    update(@Param('id') id: string, @Body() updateData: Partial<CreateCompetitionDto>) {
        return this.competitionsService.update(id, updateData);
    }
}
