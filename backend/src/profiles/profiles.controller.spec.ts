import { Test } from '@nestjs/testing';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { GoalsService } from '../goals/goals.service';

describe('ProfilesController', () => {
  let controller: ProfilesController;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };
  const goalsService = {
    findByProfile: jest.fn(),
    summarizeForProfile: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [
        { provide: ProfilesService, useValue: service },
        { provide: GoalsService, useValue: goalsService },
      ],
    }).compile();
    controller = moduleRef.get(ProfilesController);
  });

  it('delegates create() to ProfilesService', async () => {
    const dto = { name: 'A', grossSalary: 100, bankNet: 68 };
    service.create.mockResolvedValue({ id: '1' });
    await expect(controller.create(dto)).resolves.toEqual({ id: '1' });
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('delegates findAll() to ProfilesService', async () => {
    service.findAll.mockResolvedValue([]);
    await expect(controller.findAll()).resolves.toEqual([]);
  });

  it('delegates findOne() with the parsed id', async () => {
    service.findOne.mockResolvedValue({ id: 'abc' });
    await expect(controller.findOne('abc')).resolves.toEqual({ id: 'abc' });
    expect(service.findOne).toHaveBeenCalledWith('abc');
  });

  it('delegates remove() with the parsed id', async () => {
    service.remove.mockResolvedValue({ id: 'abc', deleted: true });
    await expect(controller.remove('abc')).resolves.toEqual({ id: 'abc', deleted: true });
    expect(service.remove).toHaveBeenCalledWith('abc');
  });

  it('delegates listGoals() with the parsed id to GoalsService.findByProfile', async () => {
    goalsService.findByProfile.mockResolvedValue([{ id: 'g1' }]);
    await expect(controller.listGoals('abc')).resolves.toEqual([{ id: 'g1' }]);
    expect(goalsService.findByProfile).toHaveBeenCalledWith('abc');
  });

  it('delegates goalsSummary() with the parsed id to GoalsService.summarizeForProfile', async () => {
    const summary = { goalCount: 0 };
    goalsService.summarizeForProfile.mockResolvedValue(summary);
    await expect(controller.goalsSummary('abc')).resolves.toEqual(summary);
    expect(goalsService.summarizeForProfile).toHaveBeenCalledWith('abc');
  });
});
