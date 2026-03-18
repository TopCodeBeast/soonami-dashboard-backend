import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddGameSaveDataColumn1769100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    if (!usersTable) {
      throw new Error('users table does not exist');
    }

    const hasGameSaveData = usersTable.findColumnByName('gameSaveData');
    if (!hasGameSaveData) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'gameSaveData',
          type: 'text',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    if (!usersTable) {
      return;
    }

    if (usersTable.findColumnByName('gameSaveData')) {
      await queryRunner.dropColumn('users', 'gameSaveData');
    }
  }
}
