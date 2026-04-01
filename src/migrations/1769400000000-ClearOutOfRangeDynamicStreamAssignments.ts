import { MigrationInterface, QueryRunner } from 'typeorm';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

type UserStreamRow = {
  id: string;
  socketPort: number | null;
  pixelStreamUrl: string | null;
};

const DEFAULT_MAX_STREAM_INSTANCES = 3;

function getMaxStreamInstances(): number {
  const rawValue = process.env.PIXEL_STREAM_MAX_INSTANCES;
  if (!rawValue || !rawValue.trim()) {
    return DEFAULT_MAX_STREAM_INSTANCES;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_STREAM_INSTANCES;
  }

  return parsed;
}

function readPoolFileLines(fileName: string): string[] {
  const candidates = [
    resolve(process.cwd(), 'streaming', fileName),
    resolve(process.cwd(), '..', 'streaming', fileName),
    resolve(process.cwd(), '..', '..', 'streaming', fileName),
    resolve(process.cwd(), 'data', 'streaming', fileName),
    resolve(process.cwd(), '..', 'data', 'streaming', fileName),
    resolve(process.cwd(), '..', '..', 'data', 'streaming', fileName),
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

function buildAllowedSlotPairs(): Set<string> {
  const ports = readPoolFileLines('socket_ports_list.txt');
  const urls = readPoolFileLines('pixelstream_urls.txt');

  if (ports.length === 0 || urls.length === 0) {
    throw new Error('Stream pool files must not be empty');
  }
  if (ports.length !== urls.length) {
    throw new Error(`Stream pool mismatch: ${ports.length} ports vs ${urls.length} URLs`);
  }

  const maxInstances = getMaxStreamInstances();
  const slotCount = Math.min(maxInstances, ports.length);
  const pairs = new Set<string>();

  for (let i = 0; i < slotCount; i += 1) {
    const parsedPort = Number.parseInt(ports[i], 10);
    if (!Number.isFinite(parsedPort) || parsedPort <= 0) {
      throw new Error(`Invalid stream socket port: "${ports[i]}"`);
    }
    const url = urls[i];
    if (!/^https?:\/\//i.test(url)) {
      throw new Error(`Invalid stream url: "${url}"`);
    }
    pairs.add(`${parsedPort}|${url}`);
  }

  return pairs;
}

export class ClearOutOfRangeDynamicStreamAssignments1769400000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    if (!usersTable) {
      console.log('users table not found - skipping out-of-range stream cleanup');
      return;
    }

    const hasSocketPort = !!usersTable.findColumnByName('socketPort');
    const hasPixelStreamUrl = !!usersTable.findColumnByName('pixelStreamUrl');
    if (!hasSocketPort || !hasPixelStreamUrl) {
      console.log('users.socketPort / users.pixelStreamUrl missing - skipping stream cleanup');
      return;
    }

    const allowedPairs = buildAllowedSlotPairs();
    const rows = (await queryRunner.query(`
      SELECT id, "socketPort", "pixelStreamUrl"
      FROM users
      WHERE "socketPort" IS NOT NULL
         OR "pixelStreamUrl" IS NOT NULL
    `)) as UserStreamRow[];

    let updatedCount = 0;
    for (const row of rows) {
      const hasBothValues =
        typeof row.socketPort === 'number' &&
        Number.isFinite(row.socketPort) &&
        !!row.pixelStreamUrl;
      const pairKey = hasBothValues ? `${row.socketPort}|${row.pixelStreamUrl}` : '';
      const isAllowed = hasBothValues && allowedPairs.has(pairKey);
      if (isAllowed) {
        continue;
      }

      await queryRunner.query(
        `
          UPDATE users
          SET "socketPort" = NULL,
              "pixelStreamUrl" = NULL
          WHERE id = $1
        `,
        [row.id],
      );
      updatedCount += 1;
    }

    console.log(
      `Cleared out-of-range stream assignments for ${updatedCount} user(s) based on first ${getMaxStreamInstances()} slot(s)`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    console.log(
      'ClearOutOfRangeDynamicStreamAssignments migration is irreversible (previous assignments are not restored)',
    );
  }
}

