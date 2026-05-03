import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthResponse {
  status: 'ok';
  database: 'connected';
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Check backend and database health' })
  @ApiOkResponse({ description: 'Backend is up and the database is reachable.' })
  @ApiResponse({ status: 503, description: 'Database is unreachable.' })
  async check(): Promise<HealthResponse> {
    const dbOk = await this.prisma.ping();
    if (!dbOk) {
      throw new HttpException(
        { status: 'error', database: 'disconnected' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return { status: 'ok', database: 'connected' };
  }
}
