import {
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsIn,
  Min,
  Max,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  MAX_AGE_YEARS,
  MIN_AGE_YEARS,
  SESSIONS_PER_WEEK_BANDS,
  TRAINING_EXPERIENCE_LEVELS,
  TRAINING_GOALS,
} from './profile-training-fields.js';

export class UpsertProfileDto {
  @IsNumber()
  weightKg!: number;

  @IsNumber()
  heightCm!: number;

  @IsString()
  gender!: string;

  @IsOptional()
  @IsNumber()
  @Min(MIN_AGE_YEARS)
  @Max(MAX_AGE_YEARS)
  ageYears?: number;

  @IsOptional()
  @IsIn([...TRAINING_GOALS])
  trainingGoal?: (typeof TRAINING_GOALS)[number];

  @IsOptional()
  @IsIn([...TRAINING_EXPERIENCE_LEVELS])
  trainingExperience?: (typeof TRAINING_EXPERIENCE_LEVELS)[number];

  @IsOptional()
  @IsIn([...SESSIONS_PER_WEEK_BANDS])
  sessionsPerWeek?: (typeof SESSIONS_PER_WEEK_BANDS)[number];

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string | null;
}

export class UpdateUsernameDto {
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-z0-9_]+$/)
  username!: string;
}

export class UpsertAttributionDto {
  @IsOptional()
  @IsString()
  mediaSource?: string | null;

  @IsOptional()
  @IsString()
  campaign?: string | null;

  @IsOptional()
  @IsString()
  adset?: string | null;

  @IsOptional()
  @IsString()
  adgroup?: string | null;

  @IsOptional()
  @IsString()
  keywords?: string | null;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isRetargeting?: boolean | null;

  @IsOptional()
  @IsString()
  afSub1?: string | null;

  @IsOptional()
  @IsString()
  deepLinkValue?: string | null;
}
