import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFAULT_SOCKET_PORTS = [13371, 13372, 13373];
const DEFAULT_PIXEL_STREAM_URLS = [
  'https://psi1.crowdtale.ai',
  'https://psi2.crowdtale.ai',
  'https://psi3.crowdtale.ai',
];

type UserRow = {
  id: string;
};

function parseList(rawValue: string | undefined): string[] {
  if (!rawValue) return [];
  return rawValue
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizePixelStreamUrl(url: string): string {
  const hasProtocol = /^https?:\/\//i.test(url);
  const normalized = hasProtocol ? url : `https://${url}`;
  const parsed = new URL(normalized);

  if (!parsed.pathname || parsed.pathname === '/') {
    parsed.pathname = '/uiless.html';
  }

  if (!parsed.searchParams.has('AutoPlayVideo')) {
    parsed.searchParams.set('AutoPlayVideo', 'true');
  }

  return parsed.toString();
}

function getSocketPorts(): number[] {
  const parsed = parseList(process.env.PIXEL_STREAM_SOCKET_PORTS)
    .map((item) => Number(item))
    .filter((value) => Number.isInteger(value) && value > 0 && value <= 65535);
  return parsed.length > 0 ? parsed : DEFAULT_SOCKET_PORTS;
}

function getPixelStreamUrls(): string[] {
  const parsed = parseList(process.env.PIXEL_STREAM_URLS).map(normalizePixelStreamUrl);
  const urls = parsed.length > 0 ? parsed : DEFAULT_PIXEL_STREAM_URLS.map(normalizePixelStreamUrl);
  return urls;
}

export class ReassignExistingUsersToDefaultStreamSlots1769200000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    if (!usersTable) {
      console.log('ℹ️  users table not found - skipping stream reassignment');
      return;
    }

    const hasSocketPort = !!usersTable.findColumnByName('socketPort');
    const hasPixelStreamUrl = !!usersTable.findColumnByName('pixelStreamUrl');
    if (!hasSocketPort || !hasPixelStreamUrl) {
      console.log('ℹ️  users.socketPort / users.pixelStreamUrl missing - skipping stream reassignment');
      return;
    }

    const ports = getSocketPorts();
    const urls = getPixelStreamUrls();
    const slotCount = Math.min(ports.length, urls.length);
    if (slotCount === 0) {
      console.log('ℹ️  no stream slots configured - skipping stream reassignment');
      return;
    }

    // This migration intentionally reuses a small slot pool (13371~13373), so
    // per-column uniqueness on users.socketPort/users.pixelStreamUrl must be dropped.
    await queryRunner.query(`
      DROP INDEX IF EXISTS "public"."IDX_users_socketPort_unique";
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "public"."IDX_users_pixelStreamUrl_unique";
    `);

    const users = (await queryRunner.query(
      `SELECT id FROM users ORDER BY "createdAt" ASC`,
    )) as UserRow[];

    for (let index = 0; index < users.length; index += 1) {
      const user = users[index];
      const slotIndex = index % slotCount;
      await queryRunner.query(
        `UPDATE users SET "socketPort" = $1, "pixelStreamUrl" = $2 WHERE id = $3`,
        [ports[slotIndex], urls[slotIndex], user.id],
      );
    }

    console.log(
      `✅ Reassigned stream fields for ${users.length} user(s) using ${slotCount} rotating slot(s)`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    console.log(
      'ℹ️  ReassignExistingUsersToDefaultStreamSlots migration is irreversible (assignments and index drops are preserved)',
    );
  }
}
