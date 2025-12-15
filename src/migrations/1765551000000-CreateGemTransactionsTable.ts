import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateGemTransactionsTable1765551000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for transaction type
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "gem_transaction_type_enum" AS ENUM ('earn', 'spend');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create gem_transactions table
    await queryRunner.createTable(
      new Table({
        name: 'gem_transactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'change',
            type: 'integer',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['earn', 'spend'],
            enumName: 'gem_transaction_type_enum',
          },
          {
            name: 'reason',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'gem_transactions',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create index on user_id for faster queries
    const gemTransactionsTable = await queryRunner.getTable('gem_transactions');
    if (gemTransactionsTable) {
      const existingIndex = gemTransactionsTable.indices.find(
        (idx) => idx.name === 'IDX_gem_transactions_user_id',
      );
      if (!existingIndex) {
        await queryRunner.createIndex(
          'gem_transactions',
          new TableIndex({
            name: 'IDX_gem_transactions_user_id',
            columnNames: ['user_id'],
          }),
        );
        console.log('✅ Created index IDX_gem_transactions_user_id');
      } else {
        console.log('ℹ️  Index IDX_gem_transactions_user_id already exists - skipping');
      }
    }

    console.log('✅ Created gem_transactions table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const gemTransactionsTable = await queryRunner.getTable('gem_transactions');
    if (gemTransactionsTable) {
      const foreignKey = gemTransactionsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('user_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('gem_transactions', foreignKey);
      }

      const index = gemTransactionsTable.indices.find(
        (idx) => idx.name === 'IDX_gem_transactions_user_id',
      );
      if (index) {
        await queryRunner.dropIndex('gem_transactions', index);
      }
    }

    await queryRunner.dropTable('gem_transactions', true);
    await queryRunner.query(`DROP TYPE IF EXISTS "gem_transaction_type_enum"`);
    console.log('✅ Dropped gem_transactions table');
  }
}
