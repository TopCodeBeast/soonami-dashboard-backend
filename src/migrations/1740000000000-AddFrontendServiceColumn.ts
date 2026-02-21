import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddFrontendServiceColumn1740000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('user_tokens');
    
    if (table) {
      const frontendServiceColumn = table.findColumnByName('frontendService');
      
      if (!frontendServiceColumn) {
        await queryRunner.addColumn(
          'user_tokens',
          new TableColumn({
            name: 'frontendService',
            type: 'varchar',
            isNullable: true,
          }),
        );
        
        // Create index for frontendService
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS "IDX_user_tokens_frontendService" 
          ON "user_tokens" ("frontendService")
        `);
        
        console.log('✅ Added frontendService column to user_tokens table');
      } else {
        console.log('✅ frontendService column already exists');
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('user_tokens');
    
    if (table) {
      const frontendServiceColumn = table.findColumnByName('frontendService');
      
      if (frontendServiceColumn) {
        // Drop index first
        await queryRunner.query(`
          DROP INDEX IF EXISTS "IDX_user_tokens_frontendService"
        `);
        
        await queryRunner.dropColumn('user_tokens', 'frontendService');
        console.log('✅ Removed frontendService column from user_tokens table');
      }
    }
  }
}
