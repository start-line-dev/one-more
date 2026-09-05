import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfileTrainingFields2020000000000 implements MigrationInterface {
  name = 'ProfileTrainingFields2020000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "ageYears" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "trainingGoal" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "trainingExperience" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "sessionsPerWeek" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "sessionsPerWeek"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "trainingExperience"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "trainingGoal"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "ageYears"`,
    );
  }
}
