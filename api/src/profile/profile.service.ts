import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import {
  assertValidUsername,
  normalizeUsername,
  suggestUsernameFromProfile,
} from '../social/lib/username.js';
import { BillingService } from '../billing/billing.service.js';
import { UserEntity } from '../auth/entities/user.entity.js';
import { UsernameService } from '../social/username.service.js';
import { ObjectStorageService } from '../storage/object-storage.service.js';
import { UserProfileEntity } from './user-profile.entity.js';
import type { UpsertProfileDto, UpsertAttributionDto } from './profile.dto.js';

const MAX_AVATAR_BYTES = 512 * 1024;
const ALLOWED_AVATAR_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(UserProfileEntity)
    private readonly profilesRepo: Repository<UserProfileEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    private readonly usernameService: UsernameService,
    private readonly objectStorage: ObjectStorageService,
    private readonly billingService: BillingService,
  ) {}

  async getProfile(userId: string) {
    const profile = await this.profilesRepo.findOne({
      where: { userId },
      relations: ['user'],
    });
    if (!profile) return null;
    return await this.toProfileDto(profile);
  }

  async checkUsernameAvailability(username: string, excludeUserId?: string) {
    const normalized = normalizeUsername(username);
    if (!normalized) {
      return { available: false, username: '', reason: 'empty' as const };
    }
    try {
      assertValidUsername(normalized);
    } catch {
      return {
        available: false,
        username: normalized,
        reason: 'invalid' as const,
      };
    }
    const available = await this.usernameService.isAvailable(
      normalized,
      excludeUserId,
    );
    return {
      available,
      username: normalized,
      reason: available ? null : ('taken' as const),
    };
  }

  async suggestAvailableUsername(params: {
    firstName?: string;
    lastName?: string;
    email?: string;
  }) {
    const suggested = suggestUsernameFromProfile({
      firstName: params.firstName ?? null,
      lastName: params.lastName ?? null,
      email: params.email ?? null,
    });
    const available = await this.usernameService.generateUniqueUsername({
      firstName: params.firstName ?? null,
      lastName: params.lastName ?? null,
      email: params.email ?? null,
    });
    return { suggested, available };
  }

  private async toProfileDto(profile: UserProfileEntity) {
    const isPremium =
      profile.user?.isPremium ??
      (
        await this.usersRepo.findOne({
          where: { id: profile.userId },
          select: ['isPremium'],
        })
      )?.isPremium ??
      false;

    return {
      weightKg: profile.weightKg,
      heightCm: profile.heightCm,
      gender: profile.gender,
      ageYears: profile.ageYears,
      trainingGoal: profile.trainingGoal,
      trainingExperience: profile.trainingExperience,
      sessionsPerWeek: profile.sessionsPerWeek,
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatarUrl: this.objectStorage.normalizePublicObjectUrl(profile.avatarUrl),
      username: profile.username,
      isPremium,
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  async updateUsername(userId: string, rawUsername: string) {
    const profile = await this.profilesRepo.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Profil introuvable');

    const username = await this.usernameService.assertAvailable(
      rawUsername,
      userId,
    );

    if (profile.username === username) {
      return await this.toProfileDto(profile);
    }

    profile.username = username;
    await this.profilesRepo.save(profile);
    void this.billingService.syncSubscriberAttributes(userId);
    return await this.toProfileDto(profile);
  }

  async upsertProfile(userId: string, body: UpsertProfileDto) {
    const payload: Partial<UserProfileEntity> & { userId: string } = {
      userId,
      weightKg: body.weightKg,
      heightCm: body.heightCm,
      gender: body.gender,
    };
    if (body.ageYears !== undefined) {
      payload.ageYears = body.ageYears ?? null;
    }
    if (body.trainingGoal !== undefined) {
      payload.trainingGoal = body.trainingGoal ?? null;
    }
    if (body.trainingExperience !== undefined) {
      payload.trainingExperience = body.trainingExperience ?? null;
    }
    if (body.sessionsPerWeek !== undefined) {
      payload.sessionsPerWeek = body.sessionsPerWeek ?? null;
    }
    if (body.firstName !== undefined) {
      payload.firstName = body.firstName ?? null;
    }
    if (body.lastName !== undefined) {
      payload.lastName = body.lastName ?? null;
    }
    if (body.avatarUrl !== undefined) {
      if (
        this.objectStorage.isEnabled() &&
        body.avatarUrl?.startsWith('data:')
      ) {
        throw new BadRequestException(
          'Utilise POST /profile/avatar pour changer ta photo en production',
        );
      }
      payload.avatarUrl = body.avatarUrl;
    }
    await this.profilesRepo.upsert(payload, ['userId']);
    const profile = await this.profilesRepo.findOneOrFail({
      where: { userId },
    });
    void this.billingService.syncSubscriberAttributes(userId);
    return await this.toProfileDto(profile);
  }

  async upsertAttribution(
    userId: string,
    body: UpsertAttributionDto,
  ): Promise<{ ok: true }> {
    const profile = await this.profilesRepo.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Profil introuvable');

    // Write-once : on conserve l’attribution initiale de l’install.
    if (profile.attributionRecordedAt) return { ok: true };

    const now = new Date();
    profile.afMediaSource = body.mediaSource?.trim()
      ? body.mediaSource.trim()
      : null;
    profile.afCampaign = body.campaign?.trim() ? body.campaign.trim() : null;
    profile.afAdset = body.adset?.trim() ? body.adset.trim() : null;
    profile.afAdgroup = body.adgroup?.trim() ? body.adgroup.trim() : null;
    profile.afKeywords = body.keywords?.trim() ? body.keywords.trim() : null;
    profile.afIsRetargeting =
      typeof body.isRetargeting === 'boolean' ? body.isRetargeting : null;
    profile.afSub1 = body.afSub1?.trim() ? body.afSub1.trim() : null;
    profile.afDeepLinkValue = body.deepLinkValue?.trim()
      ? body.deepLinkValue.trim()
      : null;
    profile.attributionRecordedAt = now;

    await this.profilesRepo.save(profile);
    void this.billingService.syncSubscriberAttributes(userId);
    return { ok: true };
  }

  async uploadAvatar(
    userId: string,
    file: { buffer: Buffer; mimetype: string; size: number },
  ) {
    if (!file.buffer?.length) {
      throw new BadRequestException('Fichier image requis');
    }
    if (file.size > MAX_AVATAR_BYTES) {
      throw new BadRequestException('Image trop lourde (max 512 Ko)');
    }
    if (!ALLOWED_AVATAR_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Format image non supporté');
    }

    const profile = await this.profilesRepo.findOne({ where: { userId } });
    const previousAvatarUrl = profile?.avatarUrl ?? null;

    let avatarUrl: string;
    if (this.objectStorage.isEnabled()) {
      const ext =
        file.mimetype === 'image/png'
          ? 'png'
          : file.mimetype === 'image/webp'
            ? 'webp'
            : 'jpg';
      const key = `avatars/${userId}/${randomUUID()}.${ext}`;
      avatarUrl = await this.objectStorage.uploadObject({
        key,
        body: file.buffer,
        contentType: file.mimetype,
      });
      if (this.objectStorage.isManagedPublicUrl(previousAvatarUrl)) {
        await this.objectStorage
          .deleteObjectByPublicUrl(previousAvatarUrl)
          .catch(() => undefined);
      }
    } else {
      avatarUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    }

    await this.profilesRepo.upsert({ userId, avatarUrl }, ['userId']);
    const saved = await this.profilesRepo.findOneOrFail({ where: { userId } });
    void this.billingService.syncSubscriberAttributes(userId);
    return this.toProfileDto(saved);
  }
}
