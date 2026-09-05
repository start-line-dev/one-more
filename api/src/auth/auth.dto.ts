import {
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  MAX_AGE_YEARS,
  MIN_AGE_YEARS,
  SESSIONS_PER_WEEK_BANDS,
  TRAINING_EXPERIENCE_LEVELS,
  TRAINING_GOALS,
} from '../profile/profile-training-fields.js';

export class IdentifyDto {
  @IsEmail()
  email!: string;
}

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  inviteCode?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'Le pseudo doit contenir 3 à 20 caractères (lettres minuscules, chiffres, underscore).',
  })
  username!: string;

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(300)
  weightKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(250)
  heightCm?: number;

  @IsOptional()
  @IsIn(['male', 'female'])
  gender?: 'male' | 'female';

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
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class LogoutDto {
  @IsString()
  refreshToken!: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}
