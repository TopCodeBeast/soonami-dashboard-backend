import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateUsersTable1699999999998 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if users table already exists
    const table = await queryRunner.getTable('users');
    const usersTableExists = !!table;

    // Create UserRole enum type
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "users_role_enum" AS ENUM ('manager', 'admin', 'user');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create users table (if it doesn't exist)
    if (!usersTableExists) {
      await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'gem',
            type: 'int',
            default: 0,
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['manager', 'admin', 'user'],
            enumName: 'users_role_enum',
            default: "'user'",
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'lastLoginAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'stampsCollected',
            type: 'int',
            default: 0,
          },
          {
            name: 'lastStampClaimDate',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'firstStampClaimDate',
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

      // Create index on email for faster lookups
      await queryRunner.createIndex(
        'users',
        new TableIndex({
          name: 'IDX_users_email',
          columnNames: ['email'],
          isUnique: true,
        }),
      );

      // Create trigger for updatedAt
      await queryRunner.query(`
        CREATE OR REPLACE FUNCTION update_users_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW."updatedAt" = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);

      await queryRunner.query(`
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_users_updated_at_column();
      `);

      console.log('✅ Created users table');
    } else {
      console.log('ℹ️  Users table already exists - skipping creation');
    }

    // Create wallets table (depends on users table)
    const walletsTable = await queryRunner.getTable('wallets');
    if (walletsTable) {
      console.log('ℹ️  Wallets table already exists - skipping creation');
    } else {
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
              isUnique: true,
              isNullable: false,
            },
            {
              name: 'label',
              type: 'varchar',
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
              isNullable: false,
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

      // Create indexes
      await queryRunner.createIndex(
        'wallets',
        new TableIndex({
          name: 'IDX_wallets_userId',
          columnNames: ['userId'],
        }),
      );

      await queryRunner.createIndex(
        'wallets',
        new TableIndex({
          name: 'IDX_wallets_address',
          columnNames: ['address'],
          isUnique: true,
        }),
      );

      // Create trigger for updatedAt
      await queryRunner.query(`
        CREATE OR REPLACE FUNCTION update_wallets_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW."updatedAt" = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);

      await queryRunner.query(`
        CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
        FOR EACH ROW EXECUTE FUNCTION update_wallets_updated_at_column();
      `);

      console.log('✅ Created wallets table');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger and function
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_users_updated_at ON users`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_users_updated_at_column()`);

    // Drop table
    const table = await queryRunner.getTable('users');
    if (table) {
      await queryRunner.dropTable('users', true);
      console.log('✅ Dropped users table');
    }

    // Drop wallets table
    const walletsTable = await queryRunner.getTable('wallets');
    if (walletsTable) {
      // Drop trigger and function
      await queryRunner.query(`DROP TRIGGER IF EXISTS update_wallets_updated_at ON wallets`);
      await queryRunner.query(`DROP FUNCTION IF EXISTS update_wallets_updated_at_column()`);

      // Drop indexes
      const index1 = walletsTable.indices.find((idx) => idx.name === 'IDX_wallets_userId');
      if (index1) {
        await queryRunner.dropIndex('wallets', index1);
      }
      const index2 = walletsTable.indices.find((idx) => idx.name === 'IDX_wallets_address');
      if (index2) {
        await queryRunner.dropIndex('wallets', index2);
      }

      // Drop foreign key
      const foreignKey = walletsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('userId') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('wallets', foreignKey);
      }

      await queryRunner.dropTable('wallets', true);
      console.log('✅ Dropped wallets table');
    }

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`);
  }
}

