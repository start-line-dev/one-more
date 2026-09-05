import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfileEntity } from '../profile/user-profile.entity.js';
import { buildInviteUrl, generateInviteCode } from './lib/invite-code.js';
import { UsernameService } from './username.service.js';

export type CreateProfileParams = {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
  weightKg?: number;
  heightCm?: number;
  gender?: 'male' | 'female';
  ageYears?: number;
  trainingGoal?: string;
  trainingExperience?: string;
  sessionsPerWeek?: string;
};

@Injectable()
export class InvitesService {
  constructor(
    @InjectRepository(UserProfileEntity)
    private readonly profilesRepo: Repository<UserProfileEntity>,
    private readonly usernameService: UsernameService,
  ) {}

  async ensureInviteCode(userId: string): Promise<string> {
    const profile = await this.profilesRepo.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Profil introuvable');
    if (profile.inviteCode) return profile.inviteCode;

    for (let attempt = 0; attempt < 5; attempt++) {
      const inviteCode = generateInviteCode();
      try {
        await this.profilesRepo.update({ userId }, { inviteCode });
        return inviteCode;
      } catch {
        // collision — retry
      }
    }
    throw new BadRequestException('Impossible de générer un code d’invitation');
  }

  async getInviteCode(userId: string) {
    const code = await this.ensureInviteCode(userId);
    return { code };
  }

  /** @deprecated Utiliser getInviteCode — conservé pour compatibilité. */
  async getInviteLink(userId: string) {
    const code = await this.ensureInviteCode(userId);
    const url = buildInviteUrl(code);
    if (!url) {
      throw new ServiceUnavailableException(
        'Lien d’invitation indisponible (OneLink non configuré)',
      );
    }
    return { code, url };
  }

  async getInvitePreview(code: string) {
    const normalized = code.trim().toLowerCase();
    const profile = await this.profilesRepo.findOne({
      where: { inviteCode: normalized },
    });
    if (!profile) throw new NotFoundException('Invitation introuvable');
    return {
      inviterUserId: profile.userId,
      firstName: profile.firstName,
      avatarUrl: profile.avatarUrl,
    };
  }

  async findInviterProfileByCode(
    code: string,
  ): Promise<UserProfileEntity | null> {
    const normalized = code.trim().toLowerCase();
    if (!normalized) return null;
    return await this.profilesRepo.findOne({
      where: { inviteCode: normalized },
    });
  }

  async createDefaultProfile(userId: string, params?: CreateProfileParams) {
    const inviteCode = await this.generateUniqueInviteCode();
    const requestedUsername = params?.username?.trim();
    const username = requestedUsername
      ? await this.usernameService.assertAvailable(requestedUsername)
      : null;

    return await this.profilesRepo.save({
      userId,
      weightKg: params?.weightKg ?? 75,
      heightCm: params?.heightCm ?? 175,
      gender: params?.gender ?? 'male',
      ageYears: params?.ageYears ?? null,
      trainingGoal: params?.trainingGoal ?? null,
      trainingExperience: params?.trainingExperience ?? null,
      sessionsPerWeek: params?.sessionsPerWeek ?? null,
      inviteCode,
      username,
      searchableByName: true,
      discoverableByUsername: true,
      firstName: params?.firstName ?? null,
      lastName: params?.lastName ?? null,
    });
  }

  async ensureUsername(userId: string): Promise<string> {
    return await this.usernameService.ensureUsername(userId);
  }

  private async generateUniqueInviteCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const inviteCode = generateInviteCode();
      const collision = await this.profilesRepo.findOne({
        where: { inviteCode },
        select: ['id'],
      });
      if (!collision) return inviteCode;
    }
    throw new BadRequestException('Impossible de générer un code d’invitation');
  }
}
