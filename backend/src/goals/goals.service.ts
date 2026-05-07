import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import type { GoalResponseDto } from './dto/goal-response.dto';
import type { GoalAnalysisResponseDto, GoalStatus } from './dto/goal-analysis-response.dto';
import type { ProjectionPoint } from '../calculations/calculations.service';

const round2 = (n: number): number => Math.round(n * 100) / 100;

const DEFAULT_EXPECTED_RETURN = 0.07;

/** Status thresholds — anything within 15% of target is "slightly behind", beyond that is "at risk". */
const SHORTFALL_AT_RISK_THRESHOLD = 0.15;

type GoalRow = Prisma.FinancialGoalGetPayload<Record<string, never>>;

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGoalDto): Promise<GoalResponseDto> {
    const targetDate = new Date(dto.targetDate);
    if (Number.isNaN(targetDate.getTime())) {
      throw new BadRequestException('targetDate must be a valid ISO 8601 date');
    }
    if (targetDate.getTime() <= Date.now()) {
      throw new BadRequestException('targetDate must be in the future');
    }

    const profile = await this.prisma.financialProfile.findUnique({
      where: { id: dto.profileId },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException(`Profile ${dto.profileId} not found`);
    }

    const created = await this.prisma.financialGoal.create({
      data: {
        profileId: dto.profileId,
        title: dto.title,
        category: dto.category,
        targetAmount: new Prisma.Decimal(dto.targetAmount),
        currentAmount: new Prisma.Decimal(dto.currentAmount),
        targetDate,
        expectedReturn: new Prisma.Decimal(dto.expectedReturn ?? DEFAULT_EXPECTED_RETURN),
      },
    });

    return this.toResponse(created);
  }

  async findByProfile(profileId: string): Promise<GoalResponseDto[]> {
    const profile = await this.prisma.financialProfile.findUnique({
      where: { id: profileId },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException(`Profile ${profileId} not found`);
    }

    const rows = await this.prisma.financialGoal.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toResponse(row));
  }

  async findOne(id: string): Promise<GoalResponseDto> {
    const row = await this.prisma.financialGoal.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Goal ${id} not found`);
    }
    return this.toResponse(row);
  }

  async remove(id: string): Promise<{ id: string; deleted: true }> {
    try {
      await this.prisma.financialGoal.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException(`Goal ${id} not found`);
      }
      throw err;
    }
    return { id, deleted: true };
  }

  async analyze(id: string, now: Date = new Date()): Promise<GoalAnalysisResponseDto> {
    const row = await this.prisma.financialGoal.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Goal ${id} not found`);
    }

    const targetAmount = Number(row.targetAmount);
    const currentAmount = Number(row.currentAmount);
    const expectedReturn = Number(row.expectedReturn);
    const targetDate = row.targetDate;

    const months = this.monthsBetween(now, targetDate);
    const yearsFloor = Math.max(1, Math.floor(months / 12));

    const projection = this.buildYearlyProjection(currentAmount, expectedReturn, yearsFloor);

    const monthlyRequired = this.calculateMonthlyRequired(
      currentAmount,
      targetAmount,
      expectedReturn,
      months,
    );

    const projectedValueAtDeadline = this.futureValueAtMonths(currentAmount, expectedReturn, months);

    const completionPercentage = this.calculateCompletionPercentage(currentAmount, targetAmount);

    const status = this.calculateStatus(projectedValueAtDeadline, targetAmount);

    const estimatedCompletionDate = this.estimateCompletionDate(
      currentAmount,
      targetAmount,
      expectedReturn,
      monthlyRequired,
      now,
    );

    return {
      monthlyRequired,
      projectedValueAtDeadline,
      completionPercentage,
      status,
      estimatedCompletionDate,
      projection,
    };
  }

  // ---------- Pure calculation helpers (also exported via spec) ----------

  /**
   * Completion percentage = (current / target) × 100, clamped 0–100, rounded.
   * Safe at target <= 0 — returns 0 instead of dividing by zero.
   */
  calculateCompletionPercentage(current: number, target: number): number {
    if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) {
      return 0;
    }
    const raw = (current / target) * 100;
    if (raw <= 0) return 0;
    if (raw >= 100) return 100;
    return Math.round(raw);
  }

  /**
   * Yearly projection of current amount compounding annually at expectedReturn,
   * one point per year for `years` years.
   */
  buildYearlyProjection(
    currentAmount: number,
    expectedReturn: number,
    years: number,
  ): ProjectionPoint[] {
    const out: ProjectionPoint[] = [];
    if (years <= 0) return out;
    for (let n = 1; n <= years; n++) {
      out.push({ year: n, value: round2(currentAmount * Math.pow(1 + expectedReturn, n)) });
    }
    return out;
  }

  /**
   * Required monthly contribution (PMT) to reach `targetAmount` from `currentAmount`
   * over `months` months at annual rate `expectedReturn`, with monthly compounding.
   *
   * Returns 0 when:
   *  - the goal is already funded (currentAmount × growth ≥ targetAmount)
   *  - months ≤ 0
   *
   * Falls back to linear `remaining / months` when expectedReturn === 0.
   */
  calculateMonthlyRequired(
    currentAmount: number,
    targetAmount: number,
    expectedReturn: number,
    months: number,
  ): number {
    if (months <= 0) return 0;

    const fvOfCurrent = this.futureValueAtMonths(currentAmount, expectedReturn, months);
    const remaining = targetAmount - fvOfCurrent;
    if (remaining <= 0) return 0;

    if (expectedReturn === 0) {
      return round2(remaining / months);
    }

    const monthlyRate = expectedReturn / 12;
    const annuityFactor = (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
    if (annuityFactor === 0) return 0;
    return round2(remaining / annuityFactor);
  }

  /**
   * Status based on shortfall percentage relative to the target.
   * - ON_TRACK: projected ≥ target
   * - SLIGHTLY_BEHIND: shortfall < 15%
   * - AT_RISK: shortfall ≥ 15%
   */
  calculateStatus(projectedValueAtDeadline: number, targetAmount: number): GoalStatus {
    if (targetAmount <= 0) return 'ON_TRACK';
    if (projectedValueAtDeadline >= targetAmount) return 'ON_TRACK';
    const shortfall = (targetAmount - projectedValueAtDeadline) / targetAmount;
    return shortfall < SHORTFALL_AT_RISK_THRESHOLD ? 'SLIGHTLY_BEHIND' : 'AT_RISK';
  }

  /**
   * Estimate the date the user reaches the target given:
   *  - current amount compounding monthly at expectedReturn
   *  - the calculated monthlyRequired contribution applied each month
   *
   * Returns today's ISO date if already complete, or null if it cannot be estimated.
   */
  estimateCompletionDate(
    currentAmount: number,
    targetAmount: number,
    expectedReturn: number,
    monthlyContribution: number,
    now: Date,
  ): string | null {
    if (currentAmount >= targetAmount) {
      return now.toISOString().slice(0, 10);
    }
    if (monthlyContribution <= 0 && expectedReturn <= 0) return null;

    const monthlyRate = expectedReturn / 12;
    let balance = currentAmount;
    const maxMonths = 12 * 100; // hard cap to avoid runaway loops
    for (let m = 1; m <= maxMonths; m++) {
      balance = balance * (1 + monthlyRate) + monthlyContribution;
      if (balance >= targetAmount) {
        const completion = new Date(now.getTime());
        completion.setMonth(completion.getMonth() + m);
        return completion.toISOString().slice(0, 10);
      }
    }
    return null;
  }

  // ---------- Private helpers ----------

  private futureValueAtMonths(
    principal: number,
    expectedReturn: number,
    months: number,
  ): number {
    if (months <= 0) return round2(principal);
    if (expectedReturn === 0) return round2(principal);
    const monthlyRate = expectedReturn / 12;
    return round2(principal * Math.pow(1 + monthlyRate, months));
  }

  private monthsBetween(from: Date, to: Date): number {
    const ms = to.getTime() - from.getTime();
    if (ms <= 0) return 0;
    // Average month length keeps this stable across leap years and varying month lengths.
    const avgMonthMs = (365.25 / 12) * 24 * 60 * 60 * 1000;
    return Math.max(0, Math.round(ms / avgMonthMs));
  }

  private toResponse(row: GoalRow): GoalResponseDto {
    return {
      id: row.id,
      profileId: row.profileId,
      title: row.title,
      category: row.category,
      targetAmount: Number(row.targetAmount),
      currentAmount: Number(row.currentAmount),
      targetDate: row.targetDate.toISOString(),
      expectedReturn: Number(row.expectedReturn),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
