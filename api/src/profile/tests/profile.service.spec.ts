import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProfileService } from '../profile.service.js';

describe('ProfileService', () => {
  const profilesRepo = {
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    save: jest.fn(),
    upsert: jest.fn(),
  };
  const usersRepo = {
    findOne: jest.fn(),
  };
  const usernameService = {
    ensureUsername: jest.fn(),
    isAvailable: jest.fn(),
    assertAvailable: jest.fn(),
    generateUniqueUsername: jest.fn(),
  };

  let service: ProfileService;

  const objectStorage = {
    isEnabled: jest.fn(() => false),
    uploadObject: jest.fn(),
    deleteObjectByPublicUrl: jest.fn(),
    isManagedPublicUrl: jest.fn(() => false),
    normalizePublicObjectUrl: jest.fn((url: string | null) => url),
  };
  const billingService = {
    syncSubscriberAttributes: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProfileService(
      profilesRepo as any,
      usersRepo as any,
      usernameService as any,
      objectStorage as any,
      billingService as any,
    );
    usersRepo.findOne.mockResolvedValue({ isPremium: false });
  });

  it('getProfile returns username as stored without auto-generation', async () => {
    profilesRepo.findOne.mockResolvedValue({
      userId: 'user-1',
      weightKg: 75,
      heightCm: 175,
      gender: 'male',
      firstName: null,
      lastName: null,
      avatarUrl: null,
      username: null,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const profile = await service.getProfile('user-1');

    expect(usernameService.ensureUsername).not.toHaveBeenCalled();
    expect(profile?.username).toBeNull();
  });

  it('updateUsername sets username when available', async () => {
    const existing = {
      userId: 'user-1',
      weightKg: 75,
      heightCm: 175,
      gender: 'male',
      firstName: null,
      lastName: null,
      avatarUrl: null,
      username: null,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    profilesRepo.findOne.mockResolvedValue(existing);
    usernameService.assertAvailable.mockResolvedValue('my_pseudo');
    profilesRepo.save.mockImplementation((profile) => Promise.resolve(profile));

    const profile = await service.updateUsername('user-1', 'my_pseudo');

    expect(usernameService.assertAvailable).toHaveBeenCalledWith(
      'my_pseudo',
      'user-1',
    );
    expect(profilesRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'my_pseudo' }),
    );
    expect(profile.username).toBe('my_pseudo');
  });

  it('updateUsername is idempotent when username unchanged', async () => {
    const existing = {
      userId: 'user-1',
      weightKg: 75,
      heightCm: 175,
      gender: 'male',
      firstName: null,
      lastName: null,
      avatarUrl: null,
      username: 'my_pseudo',
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    profilesRepo.findOne.mockResolvedValue(existing);
    usernameService.assertAvailable.mockResolvedValue('my_pseudo');

    const profile = await service.updateUsername('user-1', 'my_pseudo');

    expect(profilesRepo.save).not.toHaveBeenCalled();
    expect(profile.username).toBe('my_pseudo');
  });

  it('updateUsername throws when profile missing', async () => {
    profilesRepo.findOne.mockResolvedValue(null);

    await expect(
      service.updateUsername('user-1', 'my_pseudo'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updateUsername propagates conflict when taken', async () => {
    profilesRepo.findOne.mockResolvedValue({
      userId: 'user-1',
      username: null,
      updatedAt: new Date(),
    });
    usernameService.assertAvailable.mockRejectedValue(
      new ConflictException('Ce pseudo est déjà pris'),
    );

    await expect(
      service.updateUsername('user-1', 'taken_name'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('upsertProfile persists training fields', async () => {
    const saved = {
      userId: 'user-1',
      weightKg: 80,
      heightCm: 180,
      gender: 'male',
      ageYears: 28,
      trainingGoal: 'muscle',
      trainingExperience: 'intermediate',
      sessionsPerWeek: 'moderate',
      firstName: null,
      lastName: null,
      avatarUrl: null,
      username: null,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    profilesRepo.upsert.mockResolvedValue(undefined);
    profilesRepo.findOneOrFail.mockResolvedValue(saved);

    const profile = await service.upsertProfile('user-1', {
      weightKg: 80,
      heightCm: 180,
      gender: 'male',
      ageYears: 28,
      trainingGoal: 'muscle',
      trainingExperience: 'intermediate',
      sessionsPerWeek: 'moderate',
    });

    expect(profilesRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        ageYears: 28,
        trainingGoal: 'muscle',
        trainingExperience: 'intermediate',
        sessionsPerWeek: 'moderate',
      }),
      ['userId'],
    );
    expect(profile).toMatchObject({
      ageYears: 28,
      trainingGoal: 'muscle',
      trainingExperience: 'intermediate',
      sessionsPerWeek: 'moderate',
    });
  });
});
