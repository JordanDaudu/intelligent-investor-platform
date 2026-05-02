import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CalculationsService,
  type ProjectionPoint,
} from '../calculations/calculations.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import type { ProfileResponseDto } from './dto/profile-response.dto';

function toProjectionPoints(raw: Prisma.JsonValue): ProjectionPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (
      entry &&
      typeof entry === 'object' &&
      'year' in entry &&
      'value' in entry &&
      typeof (entry as { year: unknown }).year === 'number' &&
      typeof (entry as { value: unknown }).value === 'number'
    ) {
      const { year, value } = entry as { year: number; value: number };
      return [{ year, value }];
    }
    return [];
  });
}

type ProfileWithPlan = Prisma.FinancialProfileGetPayload<{
  include: { spendingPlan: true };
}>;

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculations: CalculationsService,
  ) {}

  async create(dto: CreateProfileDto): Promise<ProfileResponseDto> {
    const plan = this.calculations.calculateFullPlan(dto.grossSalary, dto.bankNet);

    const created = await this.prisma.financialProfile.create({
      data: {
        name: dto.name,
        grossSalary: new Prisma.Decimal(dto.grossSalary),
        bankNet: new Prisma.Decimal(dto.bankNet),
        spendingPlan: {
          create: {
            fixedCosts: new Prisma.Decimal(plan.buckets.fixedCosts),
            savingsGoals: new Prisma.Decimal(plan.buckets.savingsGoals),
            activeInvestments: new Prisma.Decimal(plan.buckets.activeInvestments),
            guiltFreeSpending: new Prisma.Decimal(plan.buckets.guiltFreeSpending),
            annualReturnRate: new Prisma.Decimal(plan.annualReturnRate),
            projectionYears: plan.projectionYears,
            projectionData: plan.projection as unknown as Prisma.InputJsonValue,
          },
        },
      },
      include: { spendingPlan: true },
    });

    return this.toResponse(created);
  }

  async findAll(): Promise<ProfileResponseDto[]> {
    const rows = await this.prisma.financialProfile.findMany({
      include: { spendingPlan: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toResponse(row));
  }

  async findOne(id: string): Promise<ProfileResponseDto> {
    const row = await this.prisma.financialProfile.findUnique({
      where: { id },
      include: { spendingPlan: true },
    });
    if (!row) {
      throw new NotFoundException(`Profile ${id} not found`);
    }
    return this.toResponse(row);
  }

  async remove(id: string): Promise<{ id: string; deleted: true }> {
    try {
      await this.prisma.financialProfile.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException(`Profile ${id} not found`);
      }
      throw err;
    }
    return { id, deleted: true };
  }

  private toResponse(row: ProfileWithPlan): ProfileResponseDto {
    return {
      id: row.id,
      name: row.name,
      grossSalary: Number(row.grossSalary),
      bankNet: Number(row.bankNet),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      spendingPlan: row.spendingPlan
        ? {
            fixedCosts: Number(row.spendingPlan.fixedCosts),
            savingsGoals: Number(row.spendingPlan.savingsGoals),
            activeInvestments: Number(row.spendingPlan.activeInvestments),
            guiltFreeSpending: Number(row.spendingPlan.guiltFreeSpending),
            annualReturnRate: Number(row.spendingPlan.annualReturnRate),
            projectionYears: row.spendingPlan.projectionYears,
            projectionData: toProjectionPoints(row.spendingPlan.projectionData),
          }
        : null,
    };
  }
}
