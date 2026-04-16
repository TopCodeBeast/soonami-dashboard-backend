const DEFAULT_PIXEL_STREAM_URLS = [
  'https://psi1.crowdtale.ai',
];

const DEFAULT_SOCKET_PORTS = [13370];

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

export function getPixelStreamConfig() {
  const urls = getPixelStreamUrls();
  const ports = getSocketPorts();
  const slotCount = Math.min(urls.length, ports.length, 1);
  return {
    urls: urls.slice(0, slotCount),
    ports: ports.slice(0, slotCount),
    slotCount,
  };
}

export function computePixelStreamSlotIndex(userId: string, slotCount: number): number {
  if (slotCount <= 0) return -1;
  // Single-session mode: everyone resolves to the only slot.
  return 0;
}

export function getAssignmentForUser(userId: string): { socketPort: number | null; pixelStreamUrl: string | null } {
  const { urls, ports, slotCount } = getPixelStreamConfig();
  if (!userId || slotCount === 0) {
    return { socketPort: null, pixelStreamUrl: null };
  }

  const slotIndex = computePixelStreamSlotIndex(userId, slotCount);
  return {
    socketPort: ports[slotIndex] ?? null,
    pixelStreamUrl: urls[slotIndex] ?? null,
  };
}
