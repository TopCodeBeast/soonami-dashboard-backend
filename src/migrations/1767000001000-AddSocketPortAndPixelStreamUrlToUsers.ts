import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSocketPortAndPixelStreamUrlToUsers1767000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    if (!usersTable) {
      console.log('ℹ️  users table not found - skipping socket/pixel columns migration');
      return;
    }

    const socketPortColumn = usersTable.findColumnByName('socketPort');
    if (!socketPortColumn) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'socketPort',
          type: 'integer',
          isNullable: true,
        }),
      );
      console.log('✅ Added socketPort column to users table');
    } else {
      console.log('ℹ️  socketPort column already exists - skipping');
    }

    const pixelStreamUrlColumn = usersTable.findColumnByName('pixelStreamUrl');
    if (!pixelStreamUrlColumn) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'pixelStreamUrl',
          type: 'varchar',
          isNullable: true,
        }),
      );
      console.log('✅ Added pixelStreamUrl column to users table');
    } else {
      console.log('ℹ️  pixelStreamUrl column already exists - skipping');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    if (!usersTable) {
      return;
    }

    const pixelStreamUrlColumn = usersTable.findColumnByName('pixelStreamUrl');
    if (pixelStreamUrlColumn) {
      await queryRunner.dropColumn('users', 'pixelStreamUrl');
      console.log('✅ Removed pixelStreamUrl column from users table');
    }

    const socketPortColumn = usersTable.findColumnByName('socketPort');
    if (socketPortColumn) {
      await queryRunner.dropColumn('users', 'socketPort');
      console.log('✅ Removed socketPort column from users table');
    }
  }
}
