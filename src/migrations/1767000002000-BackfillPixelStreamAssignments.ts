import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFAULT_PIXEL_STREAM_URLS = [
  'https://psi1.crowdtale.ai',
  'https://psi2.crowdtale.ai',
  'https://psi3.crowdtale.ai',
];

const DEFAULT_SOCKET_PORTS = [13370, 13372, 13373];

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

export class BackfillPixelStreamAssignments1767000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    if (!usersTable) {
      console.log('ℹ️  users table not found - skipping stream assignment backfill');
      return;
    }

    const hasSocketPort = !!usersTable.findColumnByName('socketPort');
    const hasPixelStreamUrl = !!usersTable.findColumnByName('pixelStreamUrl');
    if (!hasSocketPort || !hasPixelStreamUrl) {
      console.log('ℹ️  socketPort/pixelStreamUrl columns missing - skipping backfill');
      return;
    }

    const envUrls = parseList(process.env.PIXEL_STREAM_URLS).map(normalizePixelStreamUrl);
    const envPorts = parseList(process.env.PIXEL_STREAM_SOCKET_PORTS)
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0 && value <= 65535);

    const urls = (envUrls.length > 0 ? envUrls : DEFAULT_PIXEL_STREAM_URLS.map(normalizePixelStreamUrl));
    const ports = (envPorts.length > 0 ? envPorts : DEFAULT_SOCKET_PORTS);
    const slotCount = Math.min(urls.length, ports.length);

    if (slotCount <= 0) {
      console.log('ℹ️  No valid pixel stream slots configured - skipping backfill');
      return;
    }

    const users: Array<{ id: string; socketPort: number | null; pixelStreamUrl: string | null }> = await queryRunner.query(`
      SELECT "id", "socketPort", "pixelStreamUrl"
      FROM "users"
      WHERE "socketPort" IS NULL OR "pixelStreamUrl" IS NULL OR "pixelStreamUrl" = ''
      ORDER BY "createdAt" ASC, "id" ASC
    `);

    const alreadyAssigned: Array<{ id: string; socketPort: number | null }> = await queryRunner.query(`
      SELECT "id", "socketPort"
      FROM "users"
      WHERE "socketPort" IS NOT NULL
    `);
    const usedPorts = new Set(
      alreadyAssigned
        .map((row) => Number(row.socketPort))
        .filter((value) => Number.isFinite(value)),
    );

    let updated = 0;
    let skippedNoFreePort = 0;
    for (const user of users) {
      let socketPort = user.socketPort;
      if (socketPort == null) {
        const freePort = ports.find((port) => !usedPorts.has(port));
        if (freePort == null) {
          skippedNoFreePort += 1;
          continue;
        }
        socketPort = freePort;
      }

      const slotIndex = ports.indexOf(socketPort);
      const pixelStreamUrl =
        user.pixelStreamUrl && user.pixelStreamUrl.trim().length > 0
          ? user.pixelStreamUrl
          : slotIndex >= 0
            ? urls[slotIndex]
            : urls[0];

      await queryRunner.query(
        `
          UPDATE "users"
          SET "socketPort" = $2, "pixelStreamUrl" = $3
          WHERE "id" = $1
        `,
        [user.id, socketPort, pixelStreamUrl],
      );
      usedPorts.add(socketPort);
      updated += 1;
    }

    console.log(
      `✅ Backfilled pixel stream assignment for ${updated} user(s); skipped ${skippedNoFreePort} (no free socket port)`,
    );
  }

  public async down(): Promise<void> {
    console.log('ℹ️  BackfillPixelStreamAssignments migration is irreversible');
  }
}
