import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveUnusedStabilityAndSaveColumns1768000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    if (!usersTable) {
      console.log('ℹ️  users table not found - skipping cleanup migration');
      return;
    }

    const columnsToDrop = [
      'stabilitySignalS',
      'stabilitySignalM',
      'stabilitySignalL',
      'gameSaveData',
      'coreSaveJson',
      'saveFileJson',
    ];

    for (const columnName of columnsToDrop) {
      const existing = usersTable.findColumnByName(columnName);
      if (existing) {
        await queryRunner.dropColumn('users', columnName);
        console.log(`✅ Dropped users.${columnName}`);
      } else {
        console.log(`ℹ️  users.${columnName} not found - skipped`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    if (!usersTable) {
      console.log('ℹ️  users table not found - skipping rollback migration');
      return;
    }

    const integerDefaults = ['stabilitySignalS', 'stabilitySignalM', 'stabilitySignalL'];
    const textColumns = ['gameSaveData', 'coreSaveJson', 'saveFileJson'];

    for (const columnName of integerDefaults) {
      if (!usersTable.findColumnByName(columnName)) {
        await queryRunner.addColumn(
          'users',
          new TableColumn({
            name: columnName,
            type: 'int',
            default: '0',
          }),
        );
      }
    }

    for (const columnName of textColumns) {
      if (!usersTable.findColumnByName(columnName)) {
        await queryRunner.addColumn(
          'users',
          new TableColumn({
            name: columnName,
            type: 'text',
            isNullable: true,
          }),
        );
      }
    }
  }
}
