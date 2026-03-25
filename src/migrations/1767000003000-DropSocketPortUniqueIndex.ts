import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropSocketPortUniqueIndex1767000003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Allow duplicate socket ports for now (requested behavior).
    await queryRunner.query(`
      DROP INDEX IF EXISTS "public"."IDX_users_socketPort_unique";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore unique index if rollback is needed.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_socketPort_unique"
      ON "users" ("socketPort")
      WHERE "socketPort" IS NOT NULL;
    `);
  }
}
