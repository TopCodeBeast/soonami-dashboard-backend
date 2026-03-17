import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddStreamAssignmentColumnsToUsers1769000003000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    if (!usersTable) {
      throw new Error('users table does not exist');
    }

    const hasSocketPort = usersTable.findColumnByName('socketPort');
    if (!hasSocketPort) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'socketPort',
          type: 'int',
          isNullable: true,
        }),
      );
    }

    const hasPixelStreamUrl = usersTable.findColumnByName('pixelStreamUrl');
    if (!hasPixelStreamUrl) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'pixelStreamUrl',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }

    const socketPortIndex = usersTable.indices.find(
      (index) => index.name === 'IDX_users_socketPort_unique',
    );
    if (!socketPortIndex) {
      await queryRunner.createIndex(
        'users',
        new TableIndex({
          name: 'IDX_users_socketPort_unique',
          columnNames: ['socketPort'],
          isUnique: true,
        }),
      );
    }

    const pixelStreamUrlIndex = usersTable.indices.find(
      (index) => index.name === 'IDX_users_pixelStreamUrl_unique',
    );
    if (!pixelStreamUrlIndex) {
      await queryRunner.createIndex(
        'users',
        new TableIndex({
          name: 'IDX_users_pixelStreamUrl_unique',
          columnNames: ['pixelStreamUrl'],
          isUnique: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    if (!usersTable) {
      return;
    }

    const socketPortIndex = usersTable.indices.find(
      (index) => index.name === 'IDX_users_socketPort_unique',
    );
    if (socketPortIndex) {
      await queryRunner.dropIndex('users', socketPortIndex);
    }

    const pixelStreamUrlIndex = usersTable.indices.find(
      (index) => index.name === 'IDX_users_pixelStreamUrl_unique',
    );
    if (pixelStreamUrlIndex) {
      await queryRunner.dropIndex('users', pixelStreamUrlIndex);
    }

    if (usersTable.findColumnByName('socketPort')) {
      await queryRunner.dropColumn('users', 'socketPort');
    }

    if (usersTable.findColumnByName('pixelStreamUrl')) {
      await queryRunner.dropColumn('users', 'pixelStreamUrl');
    }
  }
}
