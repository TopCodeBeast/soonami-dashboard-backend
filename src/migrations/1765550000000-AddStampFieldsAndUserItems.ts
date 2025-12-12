import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class AddStampFieldsAndUserItems1765550000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add stamp fields to users table
    const usersTable = await queryRunner.getTable('users');
    if (usersTable) {
      const stampsCollectedColumn = usersTable.findColumnByName('stampsCollected');
      if (!stampsCollectedColumn) {
        await queryRunner.query(`
          ALTER TABLE "users" 
          ADD COLUMN "stampsCollected" integer NOT NULL DEFAULT 0;
        `);
        console.log('✅ Added stampsCollected column to users table');
      }

      const lastStampClaimDateColumn = usersTable.findColumnByName('lastStampClaimDate');
      if (!lastStampClaimDateColumn) {
        await queryRunner.query(`
          ALTER TABLE "users" 
          ADD COLUMN "lastStampClaimDate" timestamp;
        `);
        console.log('✅ Added lastStampClaimDate column to users table');
      }

      const firstStampClaimDateColumn = usersTable.findColumnByName('firstStampClaimDate');
      if (!firstStampClaimDateColumn) {
        await queryRunner.query(`
          ALTER TABLE "users" 
          ADD COLUMN "firstStampClaimDate" timestamp;
        `);
        console.log('✅ Added firstStampClaimDate column to users table');
      }
    }

    // Create enum type for user item type
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "user_item_type_enum" AS ENUM ('backflip', 'choicePriority', 'rekallTokenAirdrop');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create user_items table
    const userItemsTable = await queryRunner.getTable('user_items');
    if (!userItemsTable) {
      await queryRunner.createTable(
        new Table({
          name: 'user_items',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'uuid_generate_v4()',
            },
            {
              name: 'userId',
              type: 'uuid',
            },
            {
              name: 'itemType',
              type: 'user_item_type_enum',
            },
            {
              name: 'amount',
              type: 'int',
              default: 0,
            },
            {
              name: 'description',
              type: 'varchar',
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

      // Create foreign key
      await queryRunner.createForeignKey(
        'user_items',
        new TableForeignKey({
          columnNames: ['userId'],
          referencedColumnNames: ['id'],
          referencedTableName: 'users',
          onDelete: 'CASCADE',
        }),
      );

      // Create index on userId and itemType for faster lookups
      await queryRunner.createIndex(
        'user_items',
        new TableIndex({
          name: 'IDX_user_items_userId',
          columnNames: ['userId'],
        }),
      );

      await queryRunner.createIndex(
        'user_items',
        new TableIndex({
          name: 'IDX_user_items_userId_itemType',
          columnNames: ['userId', 'itemType'],
          isUnique: true,
        }),
      );

      // Create trigger for updatedAt
      await queryRunner.query(`
        CREATE OR REPLACE FUNCTION update_user_items_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW."updatedAt" = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);

      await queryRunner.query(`
        CREATE TRIGGER update_user_items_updated_at BEFORE UPDATE ON user_items
        FOR EACH ROW EXECUTE FUNCTION update_user_items_updated_at_column();
      `);

      console.log('✅ Created user_items table');
    } else {
      console.log('ℹ️  user_items table already exists - skipping creation');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop user_items table
    const userItemsTable = await queryRunner.getTable('user_items');
    if (userItemsTable) {
      // Drop trigger and function
      await queryRunner.query(`DROP TRIGGER IF EXISTS update_user_items_updated_at ON user_items`);
      await queryRunner.query(`DROP FUNCTION IF EXISTS update_user_items_updated_at_column()`);

      // Drop foreign keys and indexes
      const foreignKey = userItemsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('userId') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('user_items', foreignKey);
      }

      const index1 = userItemsTable.indices.find((idx) => idx.name === 'IDX_user_items_userId');
      if (index1) {
        await queryRunner.dropIndex('user_items', index1);
      }

      const index2 = userItemsTable.indices.find(
        (idx) => idx.name === 'IDX_user_items_userId_itemType',
      );
      if (index2) {
        await queryRunner.dropIndex('user_items', index2);
      }

      // Drop table
      await queryRunner.dropTable('user_items', true);
      console.log('✅ Dropped user_items table');
    }

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS "user_item_type_enum"`);

    // Remove stamp fields from users table
    const usersTable = await queryRunner.getTable('users');
    if (usersTable) {
      if (usersTable.findColumnByName('stampsCollected')) {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "stampsCollected"`);
      }
      if (usersTable.findColumnByName('lastStampClaimDate')) {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lastStampClaimDate"`);
      }
      if (usersTable.findColumnByName('firstStampClaimDate')) {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "firstStampClaimDate"`);
      }
      console.log('✅ Removed stamp fields from users table');
    }
  }
}

