import {
  SEED_DATA,
  VALID_NOTICE_CATEGORIES,
  VALID_PRAYER_CATEGORIES,
} from '../data/sanctuarySeed';
import type {
  ActivePilgrim,
  DailyMeditation,
  MassSchedule,
  NoticeCategory,
  ParishNotice,
  PrayerCategory,
  PrayerIntention,
  PrayerPosture,
  SanctuaryPayload,
  SanctuaryServerEvent,
  SanctuarySpace,
  SanctuaryZoneId,
} from '../types';

const STORAGE_DB_KEY = 'quiet_sanctuary_parish_db_v1';
const STORAGE_PRESENCE_KEY = 'quiet_sanctuary_presence_v1';
const BROADCAST_CHANNEL_NAME = 'quiet_sanctuary_sync_v1';

// True when served by Node server.ts OR Cloudflare Worker (worker/index.ts).
// Switches automatically to browser persistence when deployed as pure static files (e.g. Cloudflare Pages without Worker).
let hasBackendApi: boolean | null = null;

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function readLocalDb(): SanctuaryPayload {
  try {
    const raw = window.localStorage.getItem(STORAGE_DB_KEY);
    if (raw) {
      return JSON.parse(raw) as SanctuaryPayload;
    }
  } catch {
    // ignore storage read error
  }
  const copy = structuredClone(SEED_DATA);
  writeLocalDb(copy);
  return copy;
}

function writeLocalDb(db: SanctuaryPayload): void {
  try {
    window.localStorage.setItem(STORAGE_DB_KEY, JSON.stringify(db));
  } catch {
    // ignore storage quota error
  }
}

function readLocalPilgrims(): ActivePilgrim[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_PRESENCE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ActivePilgrim[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalPilgrims(pilgrims: ActivePilgrim[]): void {
  try {
    window.localStorage.setItem(STORAGE_PRESENCE_KEY, JSON.stringify(pilgrims));
  } catch {
    // ignore
  }
}

function broadcastLocalEvent(event: SanctuaryServerEvent): void {
  try {
    if ('BroadcastChannel' in window) {
      const ch = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      ch.postMessage(event);
      ch.close();
    }
  } catch {
    // ignore
  }
}

async function isJsonResponse(res: Response): Promise<boolean> {
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json');
}

export async function loadSanctuary(): Promise<
  SanctuaryPayload & { activePilgrims: ActivePilgrim[]; mode: 'edge-api' | 'static-local' }
> {
  try {
    const res = await fetch('/api/sanctuary');
    if (res.ok && (await isJsonResponse(res))) {
      hasBackendApi = true;
      const json = (await res.json()) as SanctuaryPayload & { activePilgrims?: ActivePilgrim[] };
      return {
        dailyMeditations: json.dailyMeditations,
        prayers: json.prayers,
        masses: json.masses,
        notices: json.notices,
        spaces: json.spaces,
        activePilgrims: Array.isArray(json.activePilgrims) ? json.activePilgrims : [],
        mode: 'edge-api',
      };
    }
  } catch {
    // Fall through to static browser storage mode
  }

  hasBackendApi = false;
  const db = readLocalDb();
  return {
    ...db,
    activePilgrims: readLocalPilgrims(),
    mode: 'static-local',
  };
}

export async function verifyAdminPasscode(
  passcode: string
): Promise<{ ok: boolean; error?: string }> {
  if (hasBackendApi !== false) {
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      if (await isJsonResponse(res)) {
        const result = (await res.json()) as { ok: boolean; error?: string };
        return res.ok && result.ok
          ? { ok: true }
          : { ok: false, error: result.error || '사목실 인증에 실패했습니다.' };
      }
    } catch {
      // fall through if static-only
    }
  }

  if (passcode.trim() === '1225') {
    return { ok: true };
  }
  return { ok: false, error: '사목실 인증 코드가 올바르지 않습니다. (기본 코드: 1225)' };
}

export async function createPrayer(input: {
  author: string;
  category: PrayerCategory;
  intention: string;
  candleLit?: boolean;
}): Promise<PrayerIntention> {
  if (hasBackendApi !== false) {
    try {
      const res = await fetch('/api/prayers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (await isJsonResponse(res)) {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || '기도를 봉헌하는 중 오류가 발생했습니다.');
        }
        return data as PrayerIntention;
      }
    } catch (err) {
      if (hasBackendApi === true) throw err;
    }
  }

  const trimmed = input.intention.trim();
  if (!trimmed || trimmed.length > 400) {
    throw new Error('기도 지향을 1자 이상 400자 이내로 입력해 주세요.');
  }
  const category = VALID_PRAYER_CATEGORIES.includes(input.category) ? input.category : '평안';
  const created: PrayerIntention = {
    id: createId('prayer'),
    author: input.author.trim().slice(0, 32) || '익명의 순례자',
    category,
    intention: trimmed,
    candleLit: input.candleLit !== false,
    amenCount: 1,
    blessedByPriest: false,
    createdAt: new Date().toISOString(),
  };
  const db = readLocalDb();
  db.prayers.unshift(created);
  writeLocalDb(db);
  broadcastLocalEvent({ type: 'prayer:created', prayer: created });
  return created;
}

export async function amenPrayer(id: string): Promise<PrayerIntention | null> {
  if (hasBackendApi !== false) {
    try {
      const res = await fetch(`/api/prayers/${id}/amen`, { method: 'POST' });
      if (res.ok && (await isJsonResponse(res))) {
        return (await res.json()) as PrayerIntention;
      }
    } catch {
      // fall through if static
    }
  }

  const db = readLocalDb();
  const target = db.prayers.find((p) => p.id === id);
  if (!target) return null;
  target.amenCount += 1;
  writeLocalDb(db);
  broadcastLocalEvent({ type: 'prayer:updated', prayer: target });
  return target;
}

export async function toggleBlessPrayer(id: string): Promise<PrayerIntention | null> {
  if (hasBackendApi !== false) {
    try {
      const res = await fetch(`/api/prayers/${id}/bless`, { method: 'PATCH' });
      if (res.ok && (await isJsonResponse(res))) {
        return (await res.json()) as PrayerIntention;
      }
    } catch {
      // fall through
    }
  }

  const db = readLocalDb();
  const target = db.prayers.find((p) => p.id === id);
  if (!target) return null;
  target.blessedByPriest = !target.blessedByPriest;
  writeLocalDb(db);
  broadcastLocalEvent({ type: 'prayer:updated', prayer: target });
  return target;
}

export async function deletePrayer(id: string): Promise<boolean> {
  if (hasBackendApi !== false) {
    try {
      const res = await fetch(`/api/prayers/${id}`, { method: 'DELETE' });
      if (res.ok && (await isJsonResponse(res))) {
        return true;
      }
    } catch {
      // fall through
    }
  }

  const db = readLocalDb();
  db.prayers = db.prayers.filter((p) => p.id !== id);
  writeLocalDb(db);
  broadcastLocalEvent({ type: 'prayer:deleted', id });
  return true;
}

export async function createMeditation(input: {
  liturgicalTitle: string;
  dateLabel: string;
  theme: PrayerCategory;
  scriptureRef: string;
  scriptureText: string;
  reflection: string;
  prayerText: string;
}): Promise<DailyMeditation | null> {
  if (hasBackendApi !== false) {
    try {
      const res = await fetch('/api/meditations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (res.ok && (await isJsonResponse(res))) {
        return (await res.json()) as DailyMeditation;
      }
    } catch {
      // fall through
    }
  }

  if (
    !input.liturgicalTitle.trim() ||
    !input.scriptureRef.trim() ||
    !input.scriptureText.trim() ||
    !input.prayerText.trim()
  ) {
    return null;
  }
  const db = readLocalDb();
  const item: DailyMeditation = {
    id: createId('med'),
    dayIndex: db.dailyMeditations.length % 7,
    dateLabel: input.dateLabel.trim() || '특별 묵상',
    liturgicalTitle: input.liturgicalTitle.trim(),
    theme: VALID_PRAYER_CATEGORIES.includes(input.theme) ? input.theme : '평안',
    scriptureRef: input.scriptureRef.trim(),
    scriptureText: input.scriptureText.trim(),
    reflection: input.reflection.trim() || input.scriptureText.trim(),
    prayerText: input.prayerText.trim(),
  };
  db.dailyMeditations.unshift(item);
  writeLocalDb(db);
  return item;
}

export async function deleteMeditation(id: string): Promise<boolean> {
  if (hasBackendApi !== false) {
    try {
      const res = await fetch(`/api/meditations/${id}`, { method: 'DELETE' });
      if (res.ok && (await isJsonResponse(res))) return true;
    } catch {
      // fall through
    }
  }

  const db = readLocalDb();
  if (db.dailyMeditations.length <= 1) return false;
  db.dailyMeditations = db.dailyMeditations.filter((m) => m.id !== id);
  writeLocalDb(db);
  return true;
}

export async function createMass(input: {
  dayGroup: MassSchedule['dayGroup'];
  time: string;
  title: string;
  location: string;
  note: string;
}): Promise<MassSchedule | null> {
  if (hasBackendApi !== false) {
    try {
      const res = await fetch('/api/masses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (res.ok && (await isJsonResponse(res))) {
        return (await res.json()) as MassSchedule;
      }
    } catch {
      // fall through
    }
  }

  if (!input.time.trim() || !input.title.trim()) return null;
  const db = readLocalDb();
  const item: MassSchedule = {
    id: createId('mass'),
    dayGroup: input.dayGroup,
    time: input.time.trim(),
    title: input.title.trim(),
    location: input.location.trim() || '대성전',
    note: input.note.trim(),
  };
  db.masses.push(item);
  writeLocalDb(db);
  return item;
}

export async function deleteMass(id: string): Promise<boolean> {
  if (hasBackendApi !== false) {
    try {
      const res = await fetch(`/api/masses/${id}`, { method: 'DELETE' });
      if (res.ok && (await isJsonResponse(res))) return true;
    } catch {
      // fall through
    }
  }

  const db = readLocalDb();
  db.masses = db.masses.filter((m) => m.id !== id);
  writeLocalDb(db);
  return true;
}

export async function createNotice(input: {
  title: string;
  category: NoticeCategory;
  summary: string;
  content: string;
  pinned: boolean;
}): Promise<ParishNotice | null> {
  if (hasBackendApi !== false) {
    try {
      const res = await fetch('/api/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (res.ok && (await isJsonResponse(res))) {
        return (await res.json()) as ParishNotice;
      }
    } catch {
      // fall through
    }
  }

  if (!input.title.trim() || !input.summary.trim()) return null;
  const db = readLocalDb();
  const now = new Date();
  const item: ParishNotice = {
    id: createId('notice'),
    title: input.title.trim(),
    category: VALID_NOTICE_CATEGORIES.includes(input.category) ? input.category : '본당 소식',
    date: `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`,
    summary: input.summary.trim(),
    content: (input.content || input.summary).trim(),
    pinned: Boolean(input.pinned),
  };
  db.notices.unshift(item);
  writeLocalDb(db);
  return item;
}

export async function deleteNotice(id: string): Promise<boolean> {
  if (hasBackendApi !== false) {
    try {
      const res = await fetch(`/api/notices/${id}`, { method: 'DELETE' });
      if (res.ok && (await isJsonResponse(res))) return true;
    } catch {
      // fall through
    }
  }

  const db = readLocalDb();
  db.notices = db.notices.filter((n) => n.id !== id);
  writeLocalDb(db);
  return true;
}

export async function updateSpaceStatus(
  id: string,
  payload: { isOpen: boolean; statusNote: string }
): Promise<SanctuarySpace | null> {
  if (hasBackendApi !== false) {
    try {
      const res = await fetch(`/api/spaces/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok && (await isJsonResponse(res))) {
        return (await res.json()) as SanctuarySpace;
      }
    } catch {
      // fall through
    }
  }

  const db = readLocalDb();
  const target = db.spaces.find((s) => s.id === id);
  if (!target) return null;
  target.isOpen = payload.isOpen;
  target.statusNote = payload.statusNote;
  writeLocalDb(db);
  return target;
}

export interface RealtimeBridge {
  sendEnter: (pilgrim: ActivePilgrim) => void;
  sendMove: (payload: { zone: SanctuaryZoneId; seatIndex: number; posture: PrayerPosture }) => void;
  sendLeave: (pilgrimId?: string) => void;
  dispose: () => void;
}

export function createSanctuaryRealtime(
  mode: 'edge-api' | 'static-local',
  getCurrentPilgrim: () => ActivePilgrim | null,
  onEvent: (event: SanctuaryServerEvent) => void
): RealtimeBridge {
  // Static-only hosting mode (e.g. Cloudflare Pages without Worker): sync across tabs via BroadcastChannel
  if (mode === 'static-local') {
    let channel: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = (e) => {
        if (e.data && typeof e.data === 'object') {
          onEvent(e.data as SanctuaryServerEvent);
        }
      };
    }

    const onUnload = () => {
      const mine = getCurrentPilgrim();
      if (!mine) return;
      const next = readLocalPilgrims().filter((p) => p.id !== mine.id);
      writeLocalPilgrims(next);
      broadcastLocalEvent({ type: 'presence:sync', pilgrims: next });
    };
    window.addEventListener('beforeunload', onUnload);

    return {
      sendEnter(pilgrim) {
        const next = [...readLocalPilgrims().filter((p) => p.id !== pilgrim.id), pilgrim];
        writeLocalPilgrims(next);
        onEvent({ type: 'presence:sync', pilgrims: next });
        broadcastLocalEvent({ type: 'presence:sync', pilgrims: next });
      },
      sendMove(payload) {
        const mine = getCurrentPilgrim();
        if (!mine) return;
        const next = readLocalPilgrims().map((p) =>
          p.id === mine.id
            ? { ...p, zone: payload.zone, seatIndex: payload.seatIndex, posture: payload.posture }
            : p
        );
        writeLocalPilgrims(next);
        onEvent({ type: 'presence:sync', pilgrims: next });
        broadcastLocalEvent({ type: 'presence:sync', pilgrims: next });
      },
      sendLeave(pilgrimId) {
        const targetId = pilgrimId || getCurrentPilgrim()?.id;
        if (!targetId) return;
        const next = readLocalPilgrims().filter((p) => p.id !== targetId);
        writeLocalPilgrims(next);
        onEvent({ type: 'presence:sync', pilgrims: next });
        broadcastLocalEvent({ type: 'presence:sync', pilgrims: next });
      },
      dispose() {
        window.removeEventListener('beforeunload', onUnload);
        channel?.close();
      },
    };
  }

  // Real WebSocket mode (Node server.ts or Cloudflare Worker Durable Object)
  let ws: WebSocket | null = null;
  let unmounted = false;
  let reconnectTimer: number | null = null;

  const connect = () => {
    if (unmounted) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws/sanctuary`);
    ws = socket;

    socket.onopen = () => {
      const mine = getCurrentPilgrim();
      if (mine) {
        socket.send(JSON.stringify({ type: 'sanctuary:enter', ...mine }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as SanctuaryServerEvent;
        onEvent(msg);
      } catch {
        // ignore malformed frames
      }
    };

    socket.onclose = () => {
      if (unmounted) return;
      reconnectTimer = window.setTimeout(connect, 2500);
    };
  };

  connect();

  return {
    sendEnter(pilgrim) {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'sanctuary:enter', ...pilgrim }));
      }
    },
    sendMove(payload) {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'sanctuary:move',
            zone: payload.zone,
            seatIndex: payload.seatIndex,
            posture: payload.posture,
          })
        );
      }
    },
    sendLeave() {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'sanctuary:leave' }));
      }
    },
    dispose() {
      unmounted = true;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      ws?.close();
    },
  };
}
