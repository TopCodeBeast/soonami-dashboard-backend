import { MigrationInterface, QueryRunner } from 'typeorm';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

type StreamPair = {
  socketPort: number;
  pixelStreamUrl: string;
};

type UserRow = {
  id: string;
  socketPort: number | null;
  pixelStreamUrl: string | null;
};

function readPoolFileLines(fileName: string): string[] {
  const candidates = [
    resolve(process.cwd(), 'streaming', fileName),
    resolve(process.cwd(), '..', 'streaming', fileName),
    resolve(process.cwd(), '..', '..', 'streaming', fileName),
    resolve(process.cwd(), 'data', 'streaming', fileName),
    resolve(process.cwd(), '..', 'data', 'streaming', fileName),
    resolve(process.cwd(), '..', '..', 'data', 'streaming', fileName),
    // Legacy root fallback during migration period
    resolve(process.cwd(), fileName),
    resolve(process.cwd(), '..', fileName),
    resolve(process.cwd(), '..', '..', fileName),
  ];

  const filePath = candidates.find((candidate) => existsSync(candidate));
  if (!filePath) {
    throw new Error(`Pool file not found: ${fileName}`);
  }

  return readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function loadStreamPool(): StreamPair[] {
  const ports = readPoolFileLines('socket_ports_list.txt');
  const urls = readPoolFileLines('pixelstream_urls.txt');

  if (ports.length === 0 || urls.length === 0) {
    throw new Error('Stream assignment pool files must not be empty');
  }
  if (ports.length !== urls.length) {
    throw new Error(
      `Pool size mismatch: ${ports.length} ports vs ${urls.length} URLs`,
    );
  }

  return ports.map((portValue, index) => {
    const socketPort = Number.parseInt(portValue, 10);
    if (!Number.isFinite(socketPort) || socketPort <= 0) {
      throw new Error(`Invalid socket port in pool: "${portValue}"`);
    }
    const pixelStreamUrl = urls[index];
    if (!/^https?:\/\//i.test(pixelStreamUrl)) {
      throw new Error(`Invalid pixel stream URL in pool: "${pixelStreamUrl}"`);
    }
    return { socketPort, pixelStreamUrl };
  });
}

export class BackfillStreamAssignmentsForExistingUsers1769000004000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    if (!usersTable) {
      throw new Error('users table does not exist');
    }

    const hasSocketPort = !!usersTable.findColumnByName('socketPort');
    const hasPixelStreamUrl = !!usersTable.findColumnByName('pixelStreamUrl');
    if (!hasSocketPort || !hasPixelStreamUrl) {
      throw new Error(
        'users.socketPort and users.pixelStreamUrl columns must exist before backfill',
      );
    }

    const pool = loadStreamPool();

    const users = (await queryRunner.query(
      `SELECT id, "socketPort", "pixelStreamUrl" FROM users ORDER BY "createdAt" ASC`,
    )) as UserRow[];

    const usedPorts = new Set<number>();
    const usedUrls = new Set<string>();

    for (const user of users) {
      if (typeof user.socketPort === 'number') {
        usedPorts.add(user.socketPort);
      }
      if (user.pixelStreamUrl) {
        usedUrls.add(user.pixelStreamUrl);
      }
    }

    for (const user of users) {
      if (user.socketPort && user.pixelStreamUrl) {
        continue;
      }

      const available = pool.find(
        (pair) =>
          !usedPorts.has(pair.socketPort) &&
          !usedUrls.has(pair.pixelStreamUrl),
      );

      if (!available) {
        throw new Error(
          'Not enough available stream assignments to backfill all existing users',
        );
      }

      await queryRunner.query(
        `UPDATE users SET "socketPort" = $1, "pixelStreamUrl" = $2 WHERE id = $3`,
        [available.socketPort, available.pixelStreamUrl, user.id],
      );

      usedPorts.add(available.socketPort);
      usedUrls.add(available.pixelStreamUrl);
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op: do not clear user assignments on rollback to avoid data loss.
  }
}
