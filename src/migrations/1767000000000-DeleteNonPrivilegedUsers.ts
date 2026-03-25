import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeleteNonPrivilegedUsers1767000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const usersTableExists = await queryRunner.hasTable('users');
    if (!usersTableExists) {
      console.log('ℹ️  users table not found - skipping user cleanup migration');
      return;
    }

    const usersToDelete: Array<{ id: string; email: string }> = await queryRunner.query(
      `
        SELECT "id", "email"
        FROM "users"
        WHERE "role" IS NULL OR "role" NOT IN ('admin', 'manager')
      `,
    );

    if (!usersToDelete.length) {
      console.log('ℹ️  No non-admin/manager users found - nothing to delete');
      return;
    }

    const userIds = usersToDelete.map((user) => user.id);
    const userEmails = usersToDelete.map((user) => user.email).filter(Boolean);

    if (await queryRunner.hasTable('user_tokens')) {
      await queryRunner.query(
        `
          DELETE FROM "user_tokens"
          WHERE "userId" = ANY($1::text[])
        `,
        [userIds],
      );
    }

    if (await queryRunner.hasTable('stripe_cards')) {
      await queryRunner.query(
        `
          DELETE FROM "stripe_cards"
          WHERE "userId" = ANY($1::uuid[])
             OR ("userEmail" IS NOT NULL AND "userEmail" = ANY($2::text[]))
        `,
        [userIds, userEmails],
      );
    }

    // Most related records are removed via FK cascade from users.
    await queryRunner.query(
      `
        DELETE FROM "users"
        WHERE "id" = ANY($1::uuid[])
      `,
      [userIds],
    );

    console.log(
      `✅ Deleted ${userIds.length} non-admin/manager user(s) and their related auth/payment records`,
    );
  }

  public async down(): Promise<void> {
    // Data cleanup migration cannot be reversed safely.
    console.log('ℹ️  DeleteNonPrivilegedUsers migration is irreversible');
  }
}
