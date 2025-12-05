import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MatchesService } from '../services';
import { CreateMatchDto, UpdateMatchResultDto, AddMatchScorerDto } from '../dto';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { Roles } from '../../../common/decorators';

@Controller('admin/matches')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin_global')
export class MatchesController {
    constructor(private readonly matchesService: MatchesService) { }

    @Get()
    findAll(@Query('competitionId') competitionId?: string) {
        return this.matchesService.findAll(competitionId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.matchesService.findOne(id);
    }

    @Post()
    create(@Body() createMatchDto: CreateMatchDto) {
        return this.matchesService.create(createMatchDto);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() updateData: Partial<CreateMatchDto>) {
        return this.matchesService.update(id, updateData);
    }

    @Put(':id/result')
    updateResult(@Param('id') id: string, @Body() resultDto: UpdateMatchResultDto) {
        return this.matchesService.updateResult(id, resultDto);
    }

    @Post(':id/scorers')
    addScorer(@Param('id') id: string, @Body() scorerDto: AddMatchScorerDto) {
        return this.matchesService.addScorer(id, scorerDto);
    }
}
