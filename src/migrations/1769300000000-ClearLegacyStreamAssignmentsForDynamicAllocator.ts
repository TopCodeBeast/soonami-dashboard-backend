import { MigrationInterface, QueryRunner } from 'typeorm';

export class ClearLegacyStreamAssignmentsForDynamicAllocator1769300000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    if (!usersTable) {
      console.log('ℹ️ users table not found - skipping legacy stream assignment cleanup');
      return;
    }

    const hasSocketPort = !!usersTable.findColumnByName('socketPort');
    const hasPixelStreamUrl = !!usersTable.findColumnByName('pixelStreamUrl');
    if (!hasSocketPort || !hasPixelStreamUrl) {
      console.log('ℹ️ users.socketPort / users.pixelStreamUrl missing - skipping cleanup');
      return;
    }

    const result = await queryRunner.query(`
      UPDATE users
      SET "socketPort" = NULL,
          "pixelStreamUrl" = NULL
      WHERE "socketPort" IS NOT NULL
         OR "pixelStreamUrl" IS NOT NULL
      RETURNING id
    `);

    const updatedCount = Array.isArray(result) ? result.length : 0;
    console.log(
      `✅ Cleared legacy stream assignment fields for ${updatedCount} user(s) to enable dynamic allocation on login`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    console.log(
      'ℹ️ ClearLegacyStreamAssignmentsForDynamicAllocator migration is irreversible (previous assignments are not restored)',
    );
  }
}
