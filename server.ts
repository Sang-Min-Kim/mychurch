import express from 'express';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
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
} from './src/types.ts';

import {
  SEED_DATA,
  VALID_NOTICE_CATEGORIES,
  VALID_POSTURES,
  VALID_PRAYER_CATEGORIES,
  VALID_ZONES,
} from './src/data/sanctuarySeed.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'parish-db.json');

async function ensureDb(): Promise<SanctuaryPayload> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(raw) as SanctuaryPayload;
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(SEED_DATA, null, 2), 'utf-8');
    return structuredClone(SEED_DATA);
  }
}

async function saveDb(data: SanctuaryPayload): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

const ADMIN_PASSCODE = process.env.PARISH_ADMIN_CODE || '1225';

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/sanctuary' });

  // Authoritative server-side map of pilgrims currently inside the sanctuary
  const socketToPilgrim = new Map<WebSocket, ActivePilgrim>();

  const getPilgrimsList = (): ActivePilgrim[] => Array.from(socketToPilgrim.values());

  const broadcast = (event: SanctuaryServerEvent) => {
    const payload = JSON.stringify(event);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  };

  wss.on('connection', (ws) => {
    // Send initial authoritative presence list upon connection
    ws.send(JSON.stringify({ type: 'presence:sync', pilgrims: getPilgrimsList() }));

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as {
          type?: string;
          id?: string;
          name?: string;
          zone?: SanctuaryZoneId;
          seatIndex?: number;
          posture?: PrayerPosture;
        };

        if (msg.type === 'sanctuary:enter') {
          const id =
            typeof msg.id === 'string' && msg.id.trim()
              ? msg.id.trim().slice(0, 48)
              : createId('pilgrim');
          const name =
            typeof msg.name === 'string' && msg.name.trim()
              ? msg.name.trim().slice(0, 24)
              : '익명의 순례자';
          const zone: SanctuaryZoneId = VALID_ZONES.includes(msg.zone as SanctuaryZoneId)
            ? (msg.zone as SanctuaryZoneId)
            : 'nave';
          const posture: PrayerPosture = VALID_POSTURES.includes(msg.posture as PrayerPosture)
            ? (msg.posture as PrayerPosture)
            : '침묵 묵상';
          const seatIndex =
            typeof msg.seatIndex === 'number' && Number.isFinite(msg.seatIndex)
              ? Math.max(0, Math.min(11, Math.floor(msg.seatIndex)))
              : 0;

          const existing = socketToPilgrim.get(ws);
          const pilgrim: ActivePilgrim = {
            id: existing?.id || id,
            name,
            zone,
            seatIndex,
            posture,
            enteredAt: existing?.enteredAt || new Date().toISOString(),
          };
          socketToPilgrim.set(ws, pilgrim);
          broadcast({ type: 'presence:sync', pilgrims: getPilgrimsList() });
        } else if (msg.type === 'sanctuary:move') {
          const current = socketToPilgrim.get(ws);
          if (!current) return;
          const nextZone: SanctuaryZoneId = VALID_ZONES.includes(msg.zone as SanctuaryZoneId)
            ? (msg.zone as SanctuaryZoneId)
            : current.zone;
          const nextPosture: PrayerPosture = VALID_POSTURES.includes(msg.posture as PrayerPosture)
            ? (msg.posture as PrayerPosture)
            : current.posture;
          const nextSeat =
            typeof msg.seatIndex === 'number' && Number.isFinite(msg.seatIndex)
              ? Math.max(0, Math.min(11, Math.floor(msg.seatIndex)))
              : current.seatIndex;

          socketToPilgrim.set(ws, {
            ...current,
            zone: nextZone,
            seatIndex: nextSeat,
            posture: nextPosture,
          });
          broadcast({ type: 'presence:sync', pilgrims: getPilgrimsList() });
        } else if (msg.type === 'sanctuary:leave') {
          if (socketToPilgrim.delete(ws)) {
            broadcast({ type: 'presence:sync', pilgrims: getPilgrimsList() });
          }
        }
      } catch {
        // ignore malformed frames
      }
    });

    ws.on('close', () => {
      if (socketToPilgrim.delete(ws)) {
        broadcast({ type: 'presence:sync', pilgrims: getPilgrimsList() });
      }
    });
  });

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, activePilgrims: getPilgrimsList().length });
  });

  app.get('/api/sanctuary', async (_req, res) => {
    try {
      const db = await ensureDb();
      res.json({ ...db, activePilgrims: getPilgrimsList() });
    } catch {
      res.status(500).json({ error: '성당 데이터를 불러오지 못했습니다.' });
    }
  });

  app.post('/api/admin/verify', (req, res) => {
    const code = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    if (code === ADMIN_PASSCODE) {
      res.json({ ok: true });
    } else {
      res.status(401).json({ ok: false, error: '사목실 인증 코드가 올바르지 않습니다. (기본 코드: 1225)' });
    }
  });

  app.post('/api/prayers', async (req, res) => {
    try {
      const db = await ensureDb();
      const authorRaw = typeof req.body?.author === 'string' ? req.body.author.trim() : '';
      const intentionRaw = typeof req.body?.intention === 'string' ? req.body.intention.trim() : '';
      const categoryRaw = req.body?.category as PrayerCategory;
      const candleLit = req.body?.candleLit !== false;

      if (!intentionRaw || intentionRaw.length > 400) {
        return res.status(400).json({ error: '기도 지향을 1자 이상 400자 이내로 입력해 주세요.' });
      }

      const category: PrayerCategory = VALID_PRAYER_CATEGORIES.includes(categoryRaw)
        ? categoryRaw
        : '평안';

      const newPrayer: PrayerIntention = {
        id: createId('prayer'),
        author: authorRaw.slice(0, 32) || '익명의 순례자',
        category,
        intention: intentionRaw,
        candleLit,
        amenCount: 1,
        blessedByPriest: false,
        createdAt: new Date().toISOString(),
      };

      db.prayers.unshift(newPrayer);
      await saveDb(db);
      broadcast({ type: 'prayer:created', prayer: newPrayer });
      return res.status(201).json(newPrayer);
    } catch {
      return res.status(500).json({ error: '기도 봉헌을 저장하는 중 오류가 발생했습니다.' });
    }
  });

  app.post('/api/prayers/:id/amen', async (req, res) => {
    try {
      const db = await ensureDb();
      const target = db.prayers.find((p) => p.id === req.params.id);
      if (!target) {
        return res.status(404).json({ error: '해당 기도를 찾을 수 없습니다.' });
      }
      target.amenCount += 1;
      await saveDb(db);
      broadcast({ type: 'prayer:updated', prayer: target });
      return res.json(target);
    } catch {
      return res.status(500).json({ error: '기도 응답을 저장하지 못했습니다.' });
    }
  });

  app.patch('/api/prayers/:id/bless', async (req, res) => {
    try {
      const db = await ensureDb();
      const target = db.prayers.find((p) => p.id === req.params.id);
      if (!target) {
        return res.status(404).json({ error: '해당 기도를 찾을 수 없습니다.' });
      }
      target.blessedByPriest = !target.blessedByPriest;
      await saveDb(db);
      broadcast({ type: 'prayer:updated', prayer: target });
      return res.json(target);
    } catch {
      return res.status(500).json({ error: '사제 축복 상태를 변경하지 못했습니다.' });
    }
  });

  app.delete('/api/prayers/:id', async (req, res) => {
    try {
      const db = await ensureDb();
      db.prayers = db.prayers.filter((p) => p.id !== req.params.id);
      await saveDb(db);
      broadcast({ type: 'prayer:deleted', id: req.params.id });
      return res.json({ ok: true });
    } catch {
      return res.status(500).json({ error: '기도 지향을 삭제하지 못했습니다.' });
    }
  });

  app.post('/api/meditations', async (req, res) => {
    try {
      const db = await ensureDb();
      const liturgicalTitle = String(req.body?.liturgicalTitle || '').trim();
      const scriptureRef = String(req.body?.scriptureRef || '').trim();
      const scriptureText = String(req.body?.scriptureText || '').trim();
      const reflection = String(req.body?.reflection || '').trim();
      const prayerText = String(req.body?.prayerText || '').trim();
      const dateLabel = String(req.body?.dateLabel || '').trim() || '특별 묵상';
      const themeRaw = req.body?.theme as PrayerCategory;
      const theme: PrayerCategory = VALID_PRAYER_CATEGORIES.includes(themeRaw) ? themeRaw : '평안';

      if (!liturgicalTitle || !scriptureRef || !scriptureText || !prayerText) {
        return res.status(400).json({ error: '제목, 성경 구절, 기도문을 모두 입력해 주세요.' });
      }

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
      await saveDb(db);
      return res.status(201).json(item);
    } catch {
      return res.status(500).json({ error: '묵상 말씀을 등록하지 못했습니다.' });
    }
  });

  app.delete('/api/meditations/:id', async (req, res) => {
    try {
      const db = await ensureDb();
      if (db.dailyMeditations.length <= 1) {
        return res.status(400).json({ error: '최소 1개의 오늘의 말씀은 유지되어야 합니다.' });
      }
      db.dailyMeditations = db.dailyMeditations.filter((m) => m.id !== req.params.id);
      await saveDb(db);
      return res.json({ ok: true });
    } catch {
      return res.status(500).json({ error: '묵상을 삭제하지 못했습니다.' });
    }
  });

  app.post('/api/masses', async (req, res) => {
    try {
      const db = await ensureDb();
      const dayGroup = req.body?.dayGroup as MassSchedule['dayGroup'];
      const validGroups: MassSchedule['dayGroup'][] = ['주일 미사', '평일 미사', '토요 특전', '고해성사'];
      const time = String(req.body?.time || '').trim();
      const title = String(req.body?.title || '').trim();
      const location = String(req.body?.location || '').trim() || '대성전';
      const note = String(req.body?.note || '').trim();

      if (!validGroups.includes(dayGroup) || !time || !title) {
        return res.status(400).json({ error: '구분, 시간, 미사 명칭을 정확히 입력해 주세요.' });
      }

      const newMass: MassSchedule = {
        id: createId('mass'),
        dayGroup,
        time: time.slice(0, 32),
        title: title.slice(0, 80),
        location: location.slice(0, 50),
        note: note.slice(0, 120),
      };

      db.masses.push(newMass);
      await saveDb(db);
      return res.status(201).json(newMass);
    } catch {
      return res.status(500).json({ error: '미사 일정을 추가하지 못했습니다.' });
    }
  });

  app.delete('/api/masses/:id', async (req, res) => {
    try {
      const db = await ensureDb();
      db.masses = db.masses.filter((m) => m.id !== req.params.id);
      await saveDb(db);
      return res.json({ ok: true });
    } catch {
      return res.status(500).json({ error: '미사 일정을 삭제하지 못했습니다.' });
    }
  });

  app.post('/api/notices', async (req, res) => {
    try {
      const db = await ensureDb();
      const title = String(req.body?.title || '').trim();
      const categoryRaw = req.body?.category as NoticeCategory;
      const category: NoticeCategory = VALID_NOTICE_CATEGORIES.includes(categoryRaw)
        ? categoryRaw
        : '본당 소식';
      const summary = String(req.body?.summary || '').trim();
      const content = String(req.body?.content || '').trim();
      const pinned = Boolean(req.body?.pinned);

      if (!title || !summary) {
        return res.status(400).json({ error: '공지 제목과 요약을 입력해 주세요.' });
      }

      const now = new Date();
      const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

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
      await saveDb(db);
      return res.status(201).json(notice);
    } catch {
      return res.status(500).json({ error: '공지사항을 등록하지 못했습니다.' });
    }
  });

  app.delete('/api/notices/:id', async (req, res) => {
    try {
      const db = await ensureDb();
      db.notices = db.notices.filter((n) => n.id !== req.params.id);
      await saveDb(db);
      return res.json({ ok: true });
    } catch {
      return res.status(500).json({ error: '공지사항을 삭제하지 못했습니다.' });
    }
  });

  app.patch('/api/spaces/:id', async (req, res) => {
    try {
      const db = await ensureDb();
      const space: SanctuarySpace | undefined = db.spaces.find((s) => s.id === req.params.id);
      if (!space) {
        return res.status(404).json({ error: '해당 성당 공간을 찾을 수 없습니다.' });
      }
      if (typeof req.body?.isOpen === 'boolean') {
        space.isOpen = req.body.isOpen;
      }
      if (typeof req.body?.statusNote === 'string' && req.body.statusNote.trim()) {
        space.statusNote = req.body.statusNote.trim().slice(0, 80);
      }
      await saveDb(db);
      return res.json(space);
    } catch {
      return res.status(500).json({ error: '공간 상태를 변경하지 못했습니다.' });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Sanctuary platform + WebSocket running on http://0.0.0.0:${port}`);
  });
}

startServer();
