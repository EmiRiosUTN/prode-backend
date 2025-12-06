import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { CompetitionsService } from '../services';
import { CreateCompetitionDto } from '../dto';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { Roles } from '../../../common/decorators';

@Controller('admin/competitions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin_global')
export class CompetitionsController {
    constructor(private readonly competitionsService: CompetitionsService) { }

    @Get()
    findAll() {
        return this.competitionsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.competitionsService.findOne(id);
    }

    @Post()
    create(@Body() createCompetitionDto: CreateCompetitionDto) {
        return this.competitionsService.create(createCompetitionDto);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() updateData: Partial<CreateCompetitionDto>) {
        return this.competitionsService.update(id, updateData);
    }
}
