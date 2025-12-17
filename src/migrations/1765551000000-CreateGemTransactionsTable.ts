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

    // Check if gem_transactions table already exists
    let gemTransactionsTable = await queryRunner.getTable('gem_transactions');
    const tableExists = !!gemTransactionsTable;

    // Create gem_transactions table (if it doesn't exist)
    if (!tableExists) {
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
      // Refetch table after creation
      gemTransactionsTable = await queryRunner.getTable('gem_transactions');
    } else {
      console.log('ℹ️  gem_transactions table already exists - cleaning up orphaned records...');
      // Clean up orphaned records (transactions with user_id that doesn't exist in users table)
      await queryRunner.query(`
        DELETE FROM gem_transactions
        WHERE user_id NOT IN (SELECT id FROM users)
      `);
      console.log('✅ Cleaned up orphaned gem_transactions records');
      // Refetch table after cleanup
      gemTransactionsTable = await queryRunner.getTable('gem_transactions');
    }

    // Check if foreign key already exists before creating it
    if (gemTransactionsTable) {
      const existingForeignKey = gemTransactionsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('user_id') !== -1 && fk.referencedTableName === 'users',
      );
      
      if (!existingForeignKey) {
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
        console.log('✅ Created foreign key constraint on gem_transactions.user_id');
        // Refetch table after adding foreign key
        gemTransactionsTable = await queryRunner.getTable('gem_transactions');
      } else {
        console.log('ℹ️  Foreign key constraint already exists - skipping');
      }
    }

    // Create index on user_id for faster queries
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
