import { MigrationInterface, QueryRunner } from 'typeorm';

export class ResetAllStreamAssignmentsForLoginLifecycle1769500000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    if (!usersTable) {
      console.log('users table not found - skipping stream reset');
      return;
    }

    const hasSocketPort = !!usersTable.findColumnByName('socketPort');
    const hasPixelStreamUrl = !!usersTable.findColumnByName('pixelStreamUrl');
    if (!hasSocketPort || !hasPixelStreamUrl) {
      console.log('users.socketPort / users.pixelStreamUrl missing - skipping stream reset');
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
    console.log(`Reset stream assignments for ${updatedCount} user(s)`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    console.log(
      'ResetAllStreamAssignmentsForLoginLifecycle migration is irreversible (previous assignments are not restored)',
    );
  }
}

