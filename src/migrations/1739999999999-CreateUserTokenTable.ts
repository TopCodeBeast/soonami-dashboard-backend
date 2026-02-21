import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateUserTokenTable1739999999999 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('user_tokens');
    
    if (!tableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'user_tokens',
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
              type: 'varchar',
              isNullable: false,
            },
            {
              name: 'username',
              type: 'varchar',
              isNullable: false,
            },
            {
              name: 'token',
              type: 'varchar',
              isUnique: true,
              isNullable: false,
            },
            {
              name: 'createdAt',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'lastActivityAt',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'expiresAt',
              type: 'timestamp',
              isNullable: false,
            },
            {
              name: 'isActive',
              type: 'boolean',
              default: true,
            },
          ],
        }),
      );

      // Create indexes for better query performance
      await queryRunner.createIndex(
        'user_tokens',
        new TableIndex({
          name: 'IDX_user_tokens_userId',
          columnNames: ['userId'],
        }),
      );

      await queryRunner.createIndex(
        'user_tokens',
        new TableIndex({
          name: 'IDX_user_tokens_username',
          columnNames: ['username'],
        }),
      );

      await queryRunner.createIndex(
        'user_tokens',
        new TableIndex({
          name: 'IDX_user_tokens_token',
          columnNames: ['token'],
        }),
      );

      await queryRunner.createIndex(
        'user_tokens',
        new TableIndex({
          name: 'IDX_user_tokens_isActive',
          columnNames: ['isActive'],
        }),
      );

      console.log('✅ Created user_tokens table');
    } else {
      // Table exists, check if columns need to be added
      const table = await queryRunner.getTable('user_tokens');
      const columns = table?.columns.map(col => col.name) || [];
      
      // Add missing columns
      if (!columns.includes('userId')) {
        await queryRunner.query(`ALTER TABLE "user_tokens" ADD COLUMN "userId" varchar NOT NULL DEFAULT ''`);
        console.log('✅ Added userId column to user_tokens table');
      }
      if (!columns.includes('username')) {
        await queryRunner.query(`ALTER TABLE "user_tokens" ADD COLUMN "username" varchar NOT NULL DEFAULT ''`);
        console.log('✅ Added username column to user_tokens table');
      }
      if (!columns.includes('token')) {
        await queryRunner.query(`ALTER TABLE "user_tokens" ADD COLUMN "token" varchar NOT NULL UNIQUE DEFAULT ''`);
        console.log('✅ Added token column to user_tokens table');
      }
      if (!columns.includes('createdAt')) {
        await queryRunner.query(`ALTER TABLE "user_tokens" ADD COLUMN "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP`);
        console.log('✅ Added createdAt column to user_tokens table');
      }
      if (!columns.includes('lastActivityAt')) {
        await queryRunner.query(`ALTER TABLE "user_tokens" ADD COLUMN "lastActivityAt" timestamp DEFAULT CURRENT_TIMESTAMP`);
        console.log('✅ Added lastActivityAt column to user_tokens table');
      }
      if (!columns.includes('expiresAt')) {
        await queryRunner.query(`ALTER TABLE "user_tokens" ADD COLUMN "expiresAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        console.log('✅ Added expiresAt column to user_tokens table');
      }
      if (!columns.includes('isActive')) {
        await queryRunner.query(`ALTER TABLE "user_tokens" ADD COLUMN "isActive" boolean DEFAULT true`);
        console.log('✅ Added isActive column to user_tokens table');
      }

      // Create indexes if they don't exist
      try {
        await queryRunner.createIndex(
          'user_tokens',
          new TableIndex({
            name: 'IDX_user_tokens_userId',
            columnNames: ['userId'],
          }),
        );
      } catch (e) {
        // Index might already exist
      }

      try {
        await queryRunner.createIndex(
          'user_tokens',
          new TableIndex({
            name: 'IDX_user_tokens_username',
            columnNames: ['username'],
          }),
        );
      } catch (e) {
        // Index might already exist
      }

      try {
        await queryRunner.createIndex(
          'user_tokens',
          new TableIndex({
            name: 'IDX_user_tokens_token',
            columnNames: ['token'],
          }),
        );
      } catch (e) {
        // Index might already exist
      }

      try {
        await queryRunner.createIndex(
          'user_tokens',
          new TableIndex({
            name: 'IDX_user_tokens_isActive',
            columnNames: ['isActive'],
          }),
        );
      } catch (e) {
        // Index might already exist
      }

      console.log('⚠️ user_tokens table already exists, checked and updated columns');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('user_tokens');
    if (tableExists) {
      await queryRunner.dropTable('user_tokens');
      console.log('✅ Dropped user_tokens table');
    }
  }
}
