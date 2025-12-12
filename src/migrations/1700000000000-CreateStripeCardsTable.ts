import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateStripeCardsTable1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table already exists
    const table = await queryRunner.getTable('stripe_cards');
    if (!table) {
      await queryRunner.createTable(
        new Table({
          name: 'stripe_cards',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'gen_random_uuid()',
            },
            {
              name: 'stripeSessionId',
              type: 'varchar',
              isUnique: true,
            },
            {
              name: 'stripePaymentIntentId',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'stripeCustomerId',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'userEmail',
              type: 'varchar',
            },
            {
              name: 'userId',
              type: 'uuid',
              isNullable: true,
            },
            {
              name: 'amount',
              type: 'decimal',
              precision: 10,
              scale: 2,
            },
            {
              name: 'currency',
              type: 'varchar',
            },
            {
              name: 'cardLast4',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'cardBrand',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'cardExpMonth',
              type: 'integer',
              isNullable: true,
            },
            {
              name: 'cardExpYear',
              type: 'integer',
              isNullable: true,
            },
            {
              name: 'cardFunding',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'cardCountry',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'metadata',
              type: 'jsonb',
              isNullable: true,
            },
            {
              name: 'stripeMetadata',
              type: 'jsonb',
              isNullable: true,
            },
            {
              name: 'paymentStatus',
              type: 'varchar',
              default: "'pending'",
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
            {
              name: 'paidAt',
              type: 'timestamp',
              isNullable: true,
            },
          ],
        }),
        true,
      );
      console.log('✅ Stripe cards table created');
    } else {
      console.log('ℹ️  Stripe cards table already exists - skipping creation');
    }

    // Get the table (either newly created or existing)
    const stripeCardsTable = await queryRunner.getTable('stripe_cards');
    if (!stripeCardsTable) {
      throw new Error('Failed to get stripe_cards table');
    }

    // Create indexes only if they don't exist
    const indexNames = [
      'IDX_stripe_cards_stripeSessionId',
      'IDX_stripe_cards_userEmail',
      'IDX_stripe_cards_stripeCustomerId',
      'IDX_stripe_cards_createdAt',
    ];

    const existingIndexes = stripeCardsTable.indices.map((idx) => idx.name);

    if (!existingIndexes.includes('IDX_stripe_cards_stripeSessionId')) {
      await queryRunner.createIndex(
        'stripe_cards',
        new TableIndex({
          name: 'IDX_stripe_cards_stripeSessionId',
          columnNames: ['stripeSessionId'],
          isUnique: true,
        }),
      );
      console.log('✅ Created index IDX_stripe_cards_stripeSessionId');
    } else {
      console.log('ℹ️  Index IDX_stripe_cards_stripeSessionId already exists - skipping');
    }

    if (!existingIndexes.includes('IDX_stripe_cards_userEmail')) {
      await queryRunner.createIndex(
        'stripe_cards',
        new TableIndex({
          name: 'IDX_stripe_cards_userEmail',
          columnNames: ['userEmail'],
        }),
      );
      console.log('✅ Created index IDX_stripe_cards_userEmail');
    } else {
      console.log('ℹ️  Index IDX_stripe_cards_userEmail already exists - skipping');
    }

    if (!existingIndexes.includes('IDX_stripe_cards_stripeCustomerId')) {
      await queryRunner.createIndex(
        'stripe_cards',
        new TableIndex({
          name: 'IDX_stripe_cards_stripeCustomerId',
          columnNames: ['stripeCustomerId'],
        }),
      );
      console.log('✅ Created index IDX_stripe_cards_stripeCustomerId');
    } else {
      console.log('ℹ️  Index IDX_stripe_cards_stripeCustomerId already exists - skipping');
    }

    if (!existingIndexes.includes('IDX_stripe_cards_createdAt')) {
      await queryRunner.createIndex(
        'stripe_cards',
        new TableIndex({
          name: 'IDX_stripe_cards_createdAt',
          columnNames: ['createdAt'],
        }),
      );
      console.log('✅ Created index IDX_stripe_cards_createdAt');
    } else {
      console.log('ℹ️  Index IDX_stripe_cards_createdAt already exists - skipping');
    }

    // Create foreign key only if it doesn't exist
    const existingForeignKeys = stripeCardsTable.foreignKeys.map((fk) => fk.name);
    const userIdForeignKey = stripeCardsTable.foreignKeys.find(
      (fk) => fk.columnNames.includes('userId') && fk.referencedTableName === 'users',
    );

    if (!userIdForeignKey) {
      await queryRunner.createForeignKey(
        'stripe_cards',
        new TableForeignKey({
          columnNames: ['userId'],
          referencedColumnNames: ['id'],
          referencedTableName: 'users',
          onDelete: 'SET NULL',
        }),
      );
      console.log('✅ Created foreign key for userId');
    } else {
      console.log('ℹ️  Foreign key for userId already exists - skipping');
    }

    console.log('✅ Stripe cards table migration completed successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('stripe_cards');
    if (table) {
      // Drop foreign keys first
      const foreignKeys = table.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('stripe_cards', fk);
      }

      // Drop indexes
      await queryRunner.dropIndex('stripe_cards', 'IDX_stripe_cards_stripeSessionId');
      await queryRunner.dropIndex('stripe_cards', 'IDX_stripe_cards_userEmail');
      await queryRunner.dropIndex('stripe_cards', 'IDX_stripe_cards_stripeCustomerId');
      await queryRunner.dropIndex('stripe_cards', 'IDX_stripe_cards_createdAt');

      // Drop table
      await queryRunner.dropTable('stripe_cards');
      console.log('✅ Stripe cards table dropped successfully');
    }
  }
}

