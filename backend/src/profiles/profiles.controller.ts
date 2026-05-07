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
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { DeleteProfileResponseDto } from './dto/delete-profile-response.dto';
import { SpendingPlanResponseDto } from './dto/spending-plan-response.dto';
import { ProjectionPointDto } from '../calculations/dto/projection-point.dto';
import { GoalsService } from '../goals/goals.service';
import { GoalResponseDto } from '../goals/dto/goal-response.dto';

@ApiExtraModels(ProfileResponseDto, SpendingPlanResponseDto, ProjectionPointDto, DeleteProfileResponseDto, GoalResponseDto)
@ApiTags('profiles')
@Controller('api/profiles')
export class ProfilesController {
  constructor(
    private readonly profiles: ProfilesService,
    private readonly goals: GoalsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new financial profile' })
  @ApiCreatedResponse({ type: ProfileResponseDto, description: 'Profile created successfully with full spending plan.' })
  @ApiResponse({ status: 400, description: 'Validation error — check request body fields.' })
  create(@Body() dto: CreateProfileDto) {
    return this.profiles.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all saved financial profiles' })
  @ApiOkResponse({ type: ProfileResponseDto, isArray: true, description: 'Array of all profiles, each including their spending plan.' })
  findAll() {
    return this.profiles.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single financial profile by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the profile', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiOkResponse({ type: ProfileResponseDto, description: 'Profile found.' })
  @ApiResponse({ status: 404, description: 'Profile not found.' })
  @ApiResponse({ status: 400, description: 'ID is not a valid UUID.' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.profiles.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a financial profile by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the profile to delete', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiOkResponse({ type: DeleteProfileResponseDto, description: 'Profile deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Profile not found.' })
  @ApiResponse({ status: 400, description: 'ID is not a valid UUID.' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.profiles.remove(id);
  }

  @Get(':id/goals')
  @ApiOperation({ summary: 'List all financial goals for a profile' })
  @ApiParam({ name: 'id', description: 'UUID of the profile', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiOkResponse({ type: GoalResponseDto, isArray: true, description: 'Array of goals belonging to the profile.' })
  @ApiResponse({ status: 404, description: 'Profile not found.' })
  @ApiResponse({ status: 400, description: 'ID is not a valid UUID.' })
  listGoals(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.goals.findByProfile(id);
  }
}
