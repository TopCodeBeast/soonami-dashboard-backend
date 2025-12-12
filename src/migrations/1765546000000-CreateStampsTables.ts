import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateStampsTables1765546000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for reward type
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "stamp_reward_type_enum" AS ENUM ('gems', 'backflip', 'choice_priority', 'rekall_token_airdrop');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create stamps table
    await queryRunner.createTable(
      new Table({
        name: 'stamps',
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
            isUnique: true,
          },
          {
            name: 'count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'lastStampDate',
            type: 'timestamp',
            isNullable: true,
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
          },
        ],
      }),
      true,
    );

    // Create foreign key for stamps table
    await queryRunner.createForeignKey(
      'stamps',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create index on user_id for stamps
    await queryRunner.createIndex(
      'stamps',
      new TableIndex({
        name: 'IDX_stamps_user_id',
        columnNames: ['user_id'],
      }),
    );

    // Create trigger for updatedAt
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW."updatedAt" = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_stamps_updated_at BEFORE UPDATE ON stamps
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // Create stamp_rewards table
    await queryRunner.createTable(
      new Table({
        name: 'stamp_rewards',
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
            name: 'rewardType',
            type: 'stamp_reward_type_enum',
          },
          {
            name: 'amount',
            type: 'integer',
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

    // Create foreign key for stamp_rewards table
    await queryRunner.createForeignKey(
      'stamp_rewards',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create index on user_id for stamp_rewards
    await queryRunner.createIndex(
      'stamp_rewards',
      new TableIndex({
        name: 'IDX_stamp_rewards_user_id',
        columnNames: ['user_id'],
      }),
    );

    console.log('✅ Created stamps and stamp_rewards tables');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys and indexes first
    const stampsTable = await queryRunner.getTable('stamps');
    if (stampsTable) {
      const foreignKey = stampsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('user_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('stamps', foreignKey);
      }
      const index = stampsTable.indices.find(
        (idx) => idx.name === 'IDX_stamps_user_id',
      );
      if (index) {
        await queryRunner.dropIndex('stamps', index);
      }
    }

    const stampRewardsTable = await queryRunner.getTable('stamp_rewards');
    if (stampRewardsTable) {
      const foreignKey = stampRewardsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('user_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('stamp_rewards', foreignKey);
      }
      const index = stampRewardsTable.indices.find(
        (idx) => idx.name === 'IDX_stamp_rewards_user_id',
      );
      if (index) {
        await queryRunner.dropIndex('stamp_rewards', index);
      }
    }

    // Drop trigger and function
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_stamps_updated_at ON stamps`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column()`);

    // Drop tables
    await queryRunner.dropTable('stamp_rewards', true);
    await queryRunner.dropTable('stamps', true);

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS "stamp_reward_type_enum"`);

    console.log('✅ Dropped stamps and stamp_rewards tables');
  }
}

