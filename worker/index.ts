import {
  SEED_DATA,
  VALID_NOTICE_CATEGORIES,
  VALID_POSTURES,
  VALID_PRAYER_CATEGORIES,
  VALID_ZONES,
} from '../src/data/sanctuarySeed';
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
} from '../src/types';

interface CFWebSocket extends WebSocket {
  accept?: () => void;
  serializeAttachment?: (attachment: unknown) => void;
  deserializeAttachment?: () => unknown;
}

interface CFDurableObjectState {
  storage: {
    get<T>(key: string): Promise<T | undefined>;
    put<T>(key: string, value: T): Promise<void>;
  };
  acceptWebSocket(ws: WebSocket): void;
  getWebSockets(): WebSocket[];
}

interface CFDurableObjectNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(request: Request): Promise<Response> };
}

export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  SANCTUARY_HUB: CFDurableObjectNamespace;
  PARISH_ADMIN_CODE?: string;
}

type CFWebSocketPairCtor = new () => { 0: CFWebSocket; 1: CFWebSocket };

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export class SanctuaryHub {
  private ctx: CFDurableObjectState;
  private env: Env;

  constructor(ctx: CFDurableObjectState, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }

  private async getDb(): Promise<SanctuaryPayload> {
    const existing = await this.ctx.storage.get<SanctuaryPayload>('parish_db');
    if (existing) return existing;
    const initial = structuredClone(SEED_DATA);
    await this.ctx.storage.put('parish_db', initial);
    return initial;
  }

  private async saveDb(db: SanctuaryPayload): Promise<void> {
    await this.ctx.storage.put('parish_db', db);
  }

  private getActivePilgrims(): ActivePilgrim[] {
    const list: ActivePilgrim[] = [];
    for (const sock of this.ctx.getWebSockets()) {
      const cfSock = sock as CFWebSocket;
      const att = cfSock.deserializeAttachment?.() as ActivePilgrim | null | undefined;
      if (att && att.id) {
        list.push(att);
      }
    }
    return list;
  }

  private broadcast(event: SanctuaryServerEvent): void {
    const payload = JSON.stringify(event);
    for (const sock of this.ctx.getWebSockets()) {
      try {
        sock.send(payload);
      } catch {
        // ignore closed sockets
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // WebSocket Upgrade for /ws/sanctuary
    if (pathname === '/ws/sanctuary') {
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
        return new Response('Expected WebSocket upgrade', { status: 426 });
      }
      const PairCtor = (globalThis as unknown as { WebSocketPair: CFWebSocketPairCtor }).WebSocketPair;
      const pair = new PairCtor();
      const client = pair[0];
      const server = pair[1];
      this.ctx.acceptWebSocket(server);
      server.send(JSON.stringify({ type: 'presence:sync', pilgrims: this.getActivePilgrims() }));
      return new Response(null, { status: 101, webSocket: client } as ResponseInit);
    }

    if (pathname === '/api/health' && request.method === 'GET') {
      return jsonResponse({ ok: true, activePilgrims: this.getActivePilgrims().length });
    }

    if (pathname === '/api/sanctuary' && request.method === 'GET') {
      const db = await this.getDb();
      return jsonResponse({ ...db, activePilgrims: this.getActivePilgrims() });
    }

    if (pathname === '/api/admin/verify' && request.method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as { passcode?: string };
      const expected = this.env.PARISH_ADMIN_CODE || '1225';
      const code = typeof body.passcode === 'string' ? body.passcode.trim() : '';
      if (code === expected) {
        return jsonResponse({ ok: true });
      }
      return jsonResponse(
        { ok: false, error: '사목실 인증 코드가 올바르지 않습니다. (기본 코드: 1225)' },
        401
      );
    }

    if (pathname === '/api/prayers' && request.method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as {
        author?: string;
        intention?: string;
        category?: PrayerCategory;
        candleLit?: boolean;
      };
      const authorRaw = typeof body.author === 'string' ? body.author.trim() : '';
      const intentionRaw = typeof body.intention === 'string' ? body.intention.trim() : '';
      if (!intentionRaw || intentionRaw.length > 400) {
        return jsonResponse({ error: '기도 지향을 1자 이상 400자 이내로 입력해 주세요.' }, 400);
      }
      const category = VALID_PRAYER_CATEGORIES.includes(body.category as PrayerCategory)
        ? (body.category as PrayerCategory)
        : '평안';

      const db = await this.getDb();
      const newPrayer: PrayerIntention = {
        id: createId('prayer'),
        author: authorRaw.slice(0, 32) || '익명의 순례자',
        category,
        intention: intentionRaw,
        candleLit: body.candleLit !== false,
        amenCount: 1,
        blessedByPriest: false,
        createdAt: new Date().toISOString(),
      };
      db.prayers.unshift(newPrayer);
      await this.saveDb(db);
      this.broadcast({ type: 'prayer:created', prayer: newPrayer });
      return jsonResponse(newPrayer, 201);
    }

    const amenMatch = pathname.match(/^\/api\/prayers\/([^/]+)\/amen$/);
    if (amenMatch && request.method === 'POST') {
      const db = await this.getDb();
      const target = db.prayers.find((p) => p.id === amenMatch[1]);
      if (!target) return jsonResponse({ error: '해당 기도를 찾을 수 없습니다.' }, 404);
      target.amenCount += 1;
      await this.saveDb(db);
      this.broadcast({ type: 'prayer:updated', prayer: target });
      return jsonResponse(target);
    }

    const blessMatch = pathname.match(/^\/api\/prayers\/([^/]+)\/bless$/);
    if (blessMatch && request.method === 'PATCH') {
      const db = await this.getDb();
      const target = db.prayers.find((p) => p.id === blessMatch[1]);
      if (!target) return jsonResponse({ error: '해당 기도를 찾을 수 없습니다.' }, 404);
      target.blessedByPriest = !target.blessedByPriest;
      await this.saveDb(db);
      this.broadcast({ type: 'prayer:updated', prayer: target });
      return jsonResponse(target);
    }

    const prayerDeleteMatch = pathname.match(/^\/api\/prayers\/([^/]+)$/);
    if (prayerDeleteMatch && request.method === 'DELETE') {
      const db = await this.getDb();
      db.prayers = db.prayers.filter((p) => p.id !== prayerDeleteMatch[1]);
      await this.saveDb(db);
      this.broadcast({ type: 'prayer:deleted', id: prayerDeleteMatch[1] });
      return jsonResponse({ ok: true });
    }

    if (pathname === '/api/meditations' && request.method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const liturgicalTitle = String(body.liturgicalTitle || '').trim();
      const scriptureRef = String(body.scriptureRef || '').trim();
      const scriptureText = String(body.scriptureText || '').trim();
      const reflection = String(body.reflection || '').trim();
      const prayerText = String(body.prayerText || '').trim();
      const dateLabel = String(body.dateLabel || '').trim() || '특별 묵상';
      const themeRaw = body.theme as PrayerCategory;
      const theme = VALID_PRAYER_CATEGORIES.includes(themeRaw) ? themeRaw : '평안';

      if (!liturgicalTitle || !scriptureRef || !scriptureText || !prayerText) {
        return jsonResponse({ error: '제목, 성경 구절, 기도문을 모두 입력해 주세요.' }, 400);
      }

      const db = await this.getDb();
      const item: DailyMeditation = {
        id: createId('med'),
        dayIndex: db.dailyMeditations.length % 7,
        dateLabel: dateLabel.slice(0, 48),
        liturgicalTitle: liturgicalTitle.slice(0, 100),
        theme,
        scriptureRef: scriptureRef.slice(0, 80),
        scriptureText: scriptureText.slice(0, 500),
        reflection: reflection.slice(0, 1000) || scriptureText,
        prayerText: prayerText.slice(0, 800),
      };
      db.dailyMeditations.unshift(item);
      await this.saveDb(db);
      return jsonResponse(item, 201);
    }

    const medDeleteMatch = pathname.match(/^\/api\/meditations\/([^/]+)$/);
    if (medDeleteMatch && request.method === 'DELETE') {
      const db = await this.getDb();
      if (db.dailyMeditations.length <= 1) {
        return jsonResponse({ error: '최소 1개의 오늘의 말씀은 유지되어야 합니다.' }, 400);
      }
      db.dailyMeditations = db.dailyMeditations.filter((m) => m.id !== medDeleteMatch[1]);
      await this.saveDb(db);
      return jsonResponse({ ok: true });
    }

    if (pathname === '/api/masses' && request.method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const dayGroup = body.dayGroup as MassSchedule['dayGroup'];
      const validGroups: MassSchedule['dayGroup'][] = [
        '주일 미사',
        '평일 미사',
        '토요 특전',
        '고해성사',
      ];
      const time = String(body.time || '').trim();
      const title = String(body.title || '').trim();
      const location = String(body.location || '').trim() || '대성전';
      const note = String(body.note || '').trim();

      if (!validGroups.includes(dayGroup) || !time || !title) {
        return jsonResponse({ error: '구분, 시간, 미사 명칭을 정확히 입력해 주세요.' }, 400);
      }

      const db = await this.getDb();
      const newMass: MassSchedule = {
        id: createId('mass'),
        dayGroup,
        time: time.slice(0, 32),
        title: title.slice(0, 80),
        location: location.slice(0, 50),
        note: note.slice(0, 120),
      };
      db.masses.push(newMass);
      await this.saveDb(db);
      return jsonResponse(newMass, 201);
    }

    const massDeleteMatch = pathname.match(/^\/api\/masses\/([^/]+)$/);
    if (massDeleteMatch && request.method === 'DELETE') {
      const db = await this.getDb();
      db.masses = db.masses.filter((m) => m.id !== massDeleteMatch[1]);
      await this.saveDb(db);
      return jsonResponse({ ok: true });
    }

    if (pathname === '/api/notices' && request.method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const title = String(body.title || '').trim();
      const categoryRaw = body.category as NoticeCategory;
      const category = VALID_NOTICE_CATEGORIES.includes(categoryRaw) ? categoryRaw : '본당 소식';
      const summary = String(body.summary || '').trim();
      const content = String(body.content || '').trim();
      const pinned = Boolean(body.pinned);

      if (!title || !summary) {
        return jsonResponse({ error: '공지 제목과 요약을 입력해 주세요.' }, 400);
      }

      const now = new Date();
      const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
      const db = await this.getDb();
      const notice: ParishNotice = {
        id: createId('notice'),
        title: title.slice(0, 120),
        category,
        date: dateStr,
        summary: summary.slice(0, 220),
        content: (content || summary).slice(0, 2000),
        pinned,
      };
      db.notices.unshift(notice);
      await this.saveDb(db);
      return jsonResponse(notice, 201);
    }

    const noticeDeleteMatch = pathname.match(/^\/api\/notices\/([^/]+)$/);
    if (noticeDeleteMatch && request.method === 'DELETE') {
      const db = await this.getDb();
      db.notices = db.notices.filter((n) => n.id !== noticeDeleteMatch[1]);
      await this.saveDb(db);
      return jsonResponse({ ok: true });
    }

    const spacePatchMatch = pathname.match(/^\/api\/spaces\/([^/]+)$/);
    if (spacePatchMatch && request.method === 'PATCH') {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const db = await this.getDb();
      const space: SanctuarySpace | undefined = db.spaces.find((s) => s.id === spacePatchMatch[1]);
      if (!space) return jsonResponse({ error: '해당 성당 공간을 찾을 수 없습니다.' }, 404);
      if (typeof body.isOpen === 'boolean') space.isOpen = body.isOpen;
      if (typeof body.statusNote === 'string' && body.statusNote.trim()) {
        space.statusNote = body.statusNote.trim().slice(0, 80);
      }
      await this.saveDb(db);
      return jsonResponse(space);
    }

    return jsonResponse({ error: 'Not found' }, 404);
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    try {
      const raw = typeof message === 'string' ? message : new TextDecoder().decode(message);
      const msg = JSON.parse(raw) as {
        type?: string;
        id?: string;
        name?: string;
        zone?: SanctuaryZoneId;
        seatIndex?: number;
        posture?: PrayerPosture;
      };
      const cfSock = ws as CFWebSocket;

      if (msg.type === 'sanctuary:enter') {
        const existing = cfSock.deserializeAttachment?.() as ActivePilgrim | null | undefined;
        const pilgrim: ActivePilgrim = {
          id:
            existing?.id ||
            (typeof msg.id === 'string' && msg.id.trim()
              ? msg.id.trim().slice(0, 48)
              : createId('pilgrim')),
          name:
            typeof msg.name === 'string' && msg.name.trim()
              ? msg.name.trim().slice(0, 24)
              : '익명의 순례자',
          zone: VALID_ZONES.includes(msg.zone as SanctuaryZoneId)
            ? (msg.zone as SanctuaryZoneId)
            : 'nave',
          seatIndex:
            typeof msg.seatIndex === 'number' && Number.isFinite(msg.seatIndex)
              ? Math.max(0, Math.min(11, Math.floor(msg.seatIndex)))
              : 0,
          posture: VALID_POSTURES.includes(msg.posture as PrayerPosture)
            ? (msg.posture as PrayerPosture)
            : '침묵 묵상',
          enteredAt: existing?.enteredAt || new Date().toISOString(),
        };
        cfSock.serializeAttachment?.(pilgrim);
        this.broadcast({ type: 'presence:sync', pilgrims: this.getActivePilgrims() });
      } else if (msg.type === 'sanctuary:move') {
        const current = cfSock.deserializeAttachment?.() as ActivePilgrim | null | undefined;
        if (!current) return;
        const updated: ActivePilgrim = {
          ...current,
          zone: VALID_ZONES.includes(msg.zone as SanctuaryZoneId)
            ? (msg.zone as SanctuaryZoneId)
            : current.zone,
          seatIndex:
            typeof msg.seatIndex === 'number' && Number.isFinite(msg.seatIndex)
              ? Math.max(0, Math.min(11, Math.floor(msg.seatIndex)))
              : current.seatIndex,
          posture: VALID_POSTURES.includes(msg.posture as PrayerPosture)
            ? (msg.posture as PrayerPosture)
            : current.posture,
        };
        cfSock.serializeAttachment?.(updated);
        this.broadcast({ type: 'presence:sync', pilgrims: this.getActivePilgrims() });
      } else if (msg.type === 'sanctuary:leave') {
        cfSock.serializeAttachment?.(null);
        this.broadcast({ type: 'presence:sync', pilgrims: this.getActivePilgrims() });
      }
    } catch {
      // ignore malformed frames
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const cfSock = ws as CFWebSocket;
    const hadPilgrim = Boolean(cfSock.deserializeAttachment?.());
    cfSock.serializeAttachment?.(null);
    if (hadPilgrim) {
      this.broadcast({ type: 'presence:sync', pilgrims: this.getActivePilgrims() });
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/') || url.pathname === '/ws/sanctuary') {
      const id = env.SANCTUARY_HUB.idFromName('global-sanctuary');
      const stub = env.SANCTUARY_HUB.get(id);
      return stub.fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};
