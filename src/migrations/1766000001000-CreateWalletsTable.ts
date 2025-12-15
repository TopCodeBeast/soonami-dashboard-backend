import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateWalletsTable1766000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'wallets',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'address',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'label',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create foreign key to users table
    await queryRunner.createForeignKey(
      'wallets',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create index on userId for faster queries
    const walletsTable = await queryRunner.getTable('wallets');
    if (walletsTable) {
      const existingIndexUserId = walletsTable.indices.find(
        (idx) => idx.name === 'IDX_wallets_userId',
      );
      if (!existingIndexUserId) {
        await queryRunner.createIndex(
          'wallets',
          new TableIndex({
            name: 'IDX_wallets_userId',
            columnNames: ['userId'],
          }),
        );
        console.log('✅ Created index IDX_wallets_userId');
      } else {
        console.log('ℹ️  Index IDX_wallets_userId already exists - skipping');
      }

      // Create index on address for faster lookups
      const existingIndexAddress = walletsTable.indices.find(
        (idx) => idx.name === 'IDX_wallets_address',
      );
      if (!existingIndexAddress) {
        await queryRunner.createIndex(
          'wallets',
          new TableIndex({
            name: 'IDX_wallets_address',
            columnNames: ['address'],
          }),
        );
        console.log('✅ Created index IDX_wallets_address');
      } else {
        console.log('ℹ️  Index IDX_wallets_address already exists - skipping');
      }
    }

    console.log('✅ Created wallets table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('wallets');
  }
}
