import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

export interface StreamAssignment {
  socketPort: number;
  pixelStreamUrl: string;
}

export interface UserStreamState {
  id: string;
  socketPort: number | null;
  pixelStreamUrl: string | null;
}

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

export function loadStreamAssignmentPool(): StreamAssignment[] {
  const portLines = readPoolFileLines('socket_ports_list.txt');
  const urlLines = readPoolFileLines('pixelstream_urls.txt');

  if (portLines.length === 0 || urlLines.length === 0) {
    throw new Error('Port and Pixel Stream URL pools must not be empty');
  }

  if (portLines.length !== urlLines.length) {
    throw new Error(
      `Pool size mismatch: ${portLines.length} ports but ${urlLines.length} URLs`,
    );
  }

  return portLines.map((portValue, index) => {
    const parsedPort = Number.parseInt(portValue, 10);
    if (!Number.isFinite(parsedPort) || parsedPort <= 0) {
      throw new Error(`Invalid socket port value: "${portValue}"`);
    }

    const pixelStreamUrl = urlLines[index];
    if (!/^https?:\/\//i.test(pixelStreamUrl)) {
      throw new Error(`Invalid pixel stream URL value: "${pixelStreamUrl}"`);
    }

    return {
      socketPort: parsedPort,
      pixelStreamUrl,
    };
  });
}

export function getNextAvailableStreamAssignment(
  allUsers: UserStreamState[],
): StreamAssignment {
  const pool = loadStreamAssignmentPool();
  const usedPorts = new Set<number>();
  const usedUrls = new Set<string>();

  allUsers.forEach((user) => {
    if (typeof user.socketPort === 'number') {
      usedPorts.add(user.socketPort);
    }
    if (user.pixelStreamUrl) {
      usedUrls.add(user.pixelStreamUrl);
    }
  });

  const available = pool.find(
    (entry) =>
      !usedPorts.has(entry.socketPort) && !usedUrls.has(entry.pixelStreamUrl),
  );

  if (!available) {
    throw new Error(
      'No available socket port + pixel stream URL assignment in pool',
    );
  }

  return available;
}
