import { Test } from '@nestjs/testing';
import { GoalCategory } from '@prisma/client';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';

describe('GoalsController', () => {
  let controller: GoalsController;
  const service = {
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    analyze: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [GoalsController],
      providers: [{ provide: GoalsService, useValue: service }],
    }).compile();
    controller = moduleRef.get(GoalsController);
  });

  it('delegates create() to GoalsService', async () => {
    const dto = {
      profileId: 'profile-uuid',
      title: 'Buy Apartment',
      category: GoalCategory.APARTMENT,
      targetAmount: 1000000,
      currentAmount: 250000,
      targetDate: '2034-07-01',
      expectedReturn: 0.07,
    };
    service.create.mockResolvedValue({ id: 'goal-uuid' });

    await expect(controller.create(dto)).resolves.toEqual({ id: 'goal-uuid' });
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('delegates findOne() to GoalsService with parsed id', async () => {
    service.findOne.mockResolvedValue({ id: 'abc' });
    await expect(controller.findOne('abc')).resolves.toEqual({ id: 'abc' });
    expect(service.findOne).toHaveBeenCalledWith('abc');
  });

  it('delegates update() to GoalsService with parsed id and dto', async () => {
    const dto = { title: 'Updated', currentAmount: 300 };
    service.update.mockResolvedValue({ id: 'abc', title: 'Updated' });
    await expect(controller.update('abc', dto)).resolves.toEqual({ id: 'abc', title: 'Updated' });
    expect(service.update).toHaveBeenCalledWith('abc', dto);
  });

  it('delegates remove() to GoalsService with parsed id', async () => {
    service.remove.mockResolvedValue({ id: 'abc', deleted: true });
    await expect(controller.remove('abc')).resolves.toEqual({ id: 'abc', deleted: true });
    expect(service.remove).toHaveBeenCalledWith('abc');
  });

  it('delegates analysis() to GoalsService with parsed id', async () => {
    const analysis = {
      monthlyRequired: 100,
      projectedValueAtDeadline: 1000,
      completionPercentage: 25,
      status: 'SLIGHTLY_BEHIND',
      estimatedCompletionDate: '2030-01-01',
      projection: [],
    };
    service.analyze.mockResolvedValue(analysis);
    await expect(controller.analysis('abc')).resolves.toEqual(analysis);
    expect(service.analyze).toHaveBeenCalledWith('abc');
  });
});
