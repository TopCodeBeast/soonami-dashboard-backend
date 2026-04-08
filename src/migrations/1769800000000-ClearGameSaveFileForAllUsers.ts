import { MigrationInterface, QueryRunner } from 'typeorm';

export class ClearGameSaveFileForAllUsers1769800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    if (!usersTable) {
      console.log('ℹ️ users table not found - skipping clear game save migration');
      return;
    }

    const setParts: string[] = [];
    if (usersTable.findColumnByName('gameSaveFile')) {
      setParts.push('"gameSaveFile" = NULL');
    }
    if (usersTable.findColumnByName('gameSaveData')) {
      setParts.push('"gameSaveData" = NULL');
    }

    if (setParts.length === 0) {
      console.log('ℹ️ users has no gameSaveFile / gameSaveData columns - skipping');
      return;
    }

    await queryRunner.query(`UPDATE users SET ${setParts.join(', ')}`);

    console.log(
      `✅ Cleared game save columns for all users (${setParts.map((s) => s.split(' = ')[0]).join(', ')})`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    console.log(
      'ℹ️ ClearGameSaveFileForAllUsers migration is irreversible (save payloads are not restored)',
    );
  }
}
