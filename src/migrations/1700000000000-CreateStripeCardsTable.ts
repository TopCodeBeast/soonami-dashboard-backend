import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateStripeCardsTable1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
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

    // Create indexes
    await queryRunner.createIndex(
      'stripe_cards',
      new TableIndex({
        name: 'IDX_stripe_cards_stripeSessionId',
        columnNames: ['stripeSessionId'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'stripe_cards',
      new TableIndex({
        name: 'IDX_stripe_cards_userEmail',
        columnNames: ['userEmail'],
      }),
    );

    await queryRunner.createIndex(
      'stripe_cards',
      new TableIndex({
        name: 'IDX_stripe_cards_stripeCustomerId',
        columnNames: ['stripeCustomerId'],
      }),
    );

    await queryRunner.createIndex(
      'stripe_cards',
      new TableIndex({
        name: 'IDX_stripe_cards_createdAt',
        columnNames: ['createdAt'],
      }),
    );

    // Create foreign key to users table
    await queryRunner.createForeignKey(
      'stripe_cards',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    console.log('✅ Stripe cards table created successfully');
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

