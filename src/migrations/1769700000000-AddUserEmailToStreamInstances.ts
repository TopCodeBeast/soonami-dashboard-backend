import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddUserEmailToStreamInstances1769700000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('stream_instances');
    if (!table) {
      return;
    }

    if (!table.findColumnByName('userEmail')) {
      await queryRunner.addColumn(
        'stream_instances',
        new TableColumn({
          name: 'userEmail',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }

    const userEmailIndex = (await queryRunner.getTable('stream_instances'))?.indices.find(
      (index) => index.name === 'IDX_stream_instances_userEmail',
    );
    if (!userEmailIndex) {
      await queryRunner.createIndex(
        'stream_instances',
        new TableIndex({
          name: 'IDX_stream_instances_userEmail',
          columnNames: ['userEmail'],
          isUnique: false,
        }),
      );
    }

    await queryRunner.query(`
      UPDATE stream_instances si
      SET "userEmail" = u.email
      FROM users u
      WHERE si."userId" IS NOT NULL
        AND si."userId" = u.id
        AND (si."userEmail" IS NULL OR si."userEmail" <> u.email)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('stream_instances');
    if (!table) {
      return;
    }

    const userEmailIndex = table.indices.find(
      (index) => index.name === 'IDX_stream_instances_userEmail',
    );
    if (userEmailIndex) {
      await queryRunner.dropIndex('stream_instances', userEmailIndex);
    }

    if (table.findColumnByName('userEmail')) {
      await queryRunner.dropColumn('stream_instances', 'userEmail');
    }
  }
}
