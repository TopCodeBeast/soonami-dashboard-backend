import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class RemoveLastDailyRewardClaimDate1766000000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if column exists before dropping
        const table = await queryRunner.getTable('users');
        if (table) {
            const column = table.findColumnByName('lastDailyRewardClaimDate');
            if (column) {
                await queryRunner.dropColumn('users', 'lastDailyRewardClaimDate');
                console.log('✅ Removed lastDailyRewardClaimDate column from users table');
            } else {
                console.log('ℹ️  Column lastDailyRewardClaimDate does not exist - skipping');
            }
        } else {
            console.log('ℹ️  Users table does not exist - skipping');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Re-add the column if rolling back
        const table = await queryRunner.getTable('users');
        if (table) {
            const column = table.findColumnByName('lastDailyRewardClaimDate');
            if (!column) {
                await queryRunner.addColumn(
                    'users',
                    new TableColumn({
                        name: 'lastDailyRewardClaimDate',
                        type: 'timestamp',
                        isNullable: true,
                    }),
                );
                console.log('✅ Re-added lastDailyRewardClaimDate column to users table');
            } else {
                console.log('ℹ️  Column lastDailyRewardClaimDate already exists - skipping');
            }
        }
    }

}

