import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
} from 'typeorm';

export class CreateStreamInstancesTable1769600000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('stream_instances');
    if (!hasTable) {
      await queryRunner.createTable(
        new Table({
          name: 'stream_instances',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'uuid_generate_v4()',
            },
            {
              name: 'socketPort',
              type: 'int',
              isNullable: false,
            },
            {
              name: 'pixelStreamUrl',
              type: 'varchar',
              isNullable: false,
            },
            {
              name: 'userId',
              type: 'uuid',
              isNullable: true,
            },
            {
              name: 'createdAt',
              type: 'timestamp',
              default: 'now()',
            },
            {
              name: 'updatedAt',
              type: 'timestamp',
              default: 'now()',
            },
          ],
        }),
      );
    }

    const table = await queryRunner.getTable('stream_instances');
    if (!table) {
      throw new Error('stream_instances table was not created');
    }

    const uniqueSocketIndex = table.indices.find(
      (index) => index.name === 'IDX_stream_instances_socketPort_unique',
    );
    if (!uniqueSocketIndex) {
      await queryRunner.createIndex(
        'stream_instances',
        new TableIndex({
          name: 'IDX_stream_instances_socketPort_unique',
          columnNames: ['socketPort'],
          isUnique: true,
        }),
      );
    }

    const uniquePixelStreamIndex = table.indices.find(
      (index) => index.name === 'IDX_stream_instances_pixelStreamUrl_unique',
    );
    if (!uniquePixelStreamIndex) {
      await queryRunner.createIndex(
        'stream_instances',
        new TableIndex({
          name: 'IDX_stream_instances_pixelStreamUrl_unique',
          columnNames: ['pixelStreamUrl'],
          isUnique: true,
        }),
      );
    }

    const uniqueUserIndex = table.indices.find(
      (index) => index.name === 'IDX_stream_instances_userId_unique',
    );
    if (!uniqueUserIndex) {
      await queryRunner.createIndex(
        'stream_instances',
        new TableIndex({
          name: 'IDX_stream_instances_userId_unique',
          columnNames: ['userId'],
          isUnique: true,
        }),
      );
    }

    // Preserve any assignments that were still stored on users.
    await queryRunner.query(`
      INSERT INTO stream_instances ("socketPort", "pixelStreamUrl", "userId")
      SELECT DISTINCT ON (u."socketPort")
        u."socketPort",
        u."pixelStreamUrl",
        u."id"
      FROM users u
      WHERE u."socketPort" IS NOT NULL
        AND u."pixelStreamUrl" IS NOT NULL
      ORDER BY
        u."socketPort" ASC,
        u."updatedAt" DESC NULLS LAST,
        u."createdAt" DESC NULLS LAST
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('stream_instances');
    if (!table) {
      return;
    }

    const uniqueUserIndex = table.indices.find(
      (index) => index.name === 'IDX_stream_instances_userId_unique',
    );
    if (uniqueUserIndex) {
      await queryRunner.dropIndex('stream_instances', uniqueUserIndex);
    }

    const uniquePixelStreamIndex = table.indices.find(
      (index) => index.name === 'IDX_stream_instances_pixelStreamUrl_unique',
    );
    if (uniquePixelStreamIndex) {
      await queryRunner.dropIndex('stream_instances', uniquePixelStreamIndex);
    }

    const uniqueSocketIndex = table.indices.find(
      (index) => index.name === 'IDX_stream_instances_socketPort_unique',
    );
    if (uniqueSocketIndex) {
      await queryRunner.dropIndex('stream_instances', uniqueSocketIndex);
    }

    await queryRunner.dropTable('stream_instances');
  }
}
