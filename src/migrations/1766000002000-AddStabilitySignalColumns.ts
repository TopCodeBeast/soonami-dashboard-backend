import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddStabilitySignalColumns1766000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    if (!usersTable) return;

    const addCol = async (name: string, type: string, defaultVal?: string | number, nullable = false) => {
      if (!usersTable.findColumnByName(name)) {
        const col = new TableColumn({ name, type, isNullable: nullable });
        if (defaultVal !== undefined) col.default = String(defaultVal);
        await queryRunner.addColumn('users', col);
        console.log(`✅ Added ${name} column to users table`);
      }
    };

    await addCol('stabilitySignalRemainingMinutes', 'double precision', 0);
    await addCol('stabilitySignalFullCapacityMinutes', 'double precision', 60);
    await addCol('stabilitySignalPausedAt', 'timestamp', undefined, true);
    await addCol('stabilitySignalLastActivityAt', 'timestamp', undefined, true);
    await addCol('stabilitySignalS', 'int', 0);
    await addCol('stabilitySignalM', 'int', 0);
    await addCol('stabilitySignalL', 'int', 0);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columns = [
      'stabilitySignalRemainingMinutes',
      'stabilitySignalFullCapacityMinutes',
      'stabilitySignalPausedAt',
      'stabilitySignalLastActivityAt',
      'stabilitySignalS',
      'stabilitySignalM',
      'stabilitySignalL',
    ];
    const table = await queryRunner.getTable('users');
    if (table) {
      for (const colName of columns) {
        const col = table.findColumnByName(colName);
        if (col) {
          await queryRunner.dropColumn('users', colName);
        }
      }
    }
  }
}
