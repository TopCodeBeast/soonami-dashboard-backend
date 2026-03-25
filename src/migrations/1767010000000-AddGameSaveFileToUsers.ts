import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGameSaveFileToUsers1767010000000 implements MigrationInterface {
  name = 'AddGameSaveFileToUsers1767010000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "gameSaveFile" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "gameSaveFile"`);
  }
}
