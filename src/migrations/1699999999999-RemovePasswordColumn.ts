import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemovePasswordColumn1699999999999 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if password column exists before trying to drop it
    const table = await queryRunner.getTable('users');
    if (table) {
      const passwordColumn = table.findColumnByName('password');
      if (passwordColumn) {
        await queryRunner.dropColumn('users', 'password');
        console.log('✅ Password column removed from users table');
      } else {
        console.log('ℹ️  Password column does not exist - skipping');
      }
    } else {
      console.log('ℹ️  Users table does not exist - skipping');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add password column if needed (for rollback)
    const table = await queryRunner.getTable('users');
    if (table) {
      const passwordColumn = table.findColumnByName('password');
      if (!passwordColumn) {
        await queryRunner.addColumn(
          'users',
          new TableColumn({
            name: 'password',
            type: 'varchar',
            isNullable: true,
          }),
        );
        console.log('✅ Password column re-added to users table');
      }
    }
  }
}

