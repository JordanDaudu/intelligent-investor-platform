import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { GoalResponseDto } from './dto/goal-response.dto';
import { GoalAnalysisResponseDto } from './dto/goal-analysis-response.dto';
import { ProjectionPointDto } from '../calculations/dto/projection-point.dto';

@ApiExtraModels(GoalResponseDto, GoalAnalysisResponseDto, ProjectionPointDto)
@ApiTags('goals')
@Controller('api/goals')
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new financial goal for an existing profile' })
  @ApiCreatedResponse({ type: GoalResponseDto, description: 'Goal created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error — check request body fields.' })
  @ApiResponse({ status: 404, description: 'Referenced profile not found.' })
  create(@Body() dto: CreateGoalDto) {
    return this.goals.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single goal by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the goal' })
  @ApiOkResponse({ type: GoalResponseDto })
  @ApiResponse({ status: 404, description: 'Goal not found.' })
  @ApiResponse({ status: 400, description: 'ID is not a valid UUID.' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.goals.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a goal by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the goal to delete' })
  @ApiOkResponse({ description: 'Goal deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Goal not found.' })
  @ApiResponse({ status: 400, description: 'ID is not a valid UUID.' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.goals.remove(id);
  }

  @Get(':id/analysis')
  @ApiOperation({
    summary: 'Get analysis for a goal',
    description:
      'Returns required monthly contribution, projected value at deadline, completion percentage, ' +
      'status, estimated completion date, and a yearly projection.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the goal' })
  @ApiOkResponse({ type: GoalAnalysisResponseDto })
  @ApiResponse({ status: 404, description: 'Goal not found.' })
  @ApiResponse({ status: 400, description: 'ID is not a valid UUID.' })
  analysis(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.goals.analyze(id);
  }
}
