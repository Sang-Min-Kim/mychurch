export type AppSection = 'home' | 'structure' | 'prayer' | 'notices' | 'admin';

export type SoundscapeId = 'cathedral' | 'chimes' | 'rain' | 'silence';

export type PrayerCategory = '평안' | '위로' | '치유' | '가족' | '감사' | '성찰';

export type NoticeCategory = '본당 소식' | '전례·성사' | '피정·치유';

export type SanctuaryZoneId = 'nave' | 'adoration' | 'candles' | 'cloister';

export type PrayerPosture = '침묵 묵상' | '치유 기도' | '감사 기도' | '촛불 봉헌';

export interface ActivePilgrim {
  id: string;
  name: string;
  zone: SanctuaryZoneId;
  seatIndex: number;
  posture: PrayerPosture;
  enteredAt: string;
}

export interface DailyMeditation {
  id: string;
  dayIndex: number;
  dateLabel: string;
  liturgicalTitle: string;
  theme: PrayerCategory;
  scriptureRef: string;
  scriptureText: string;
  reflection: string;
  prayerText: string;
}

export interface PrayerIntention {
  id: string;
  author: string;
  category: PrayerCategory;
  intention: string;
  candleLit: boolean;
  amenCount: number;
  blessedByPriest: boolean;
  createdAt: string;
}

export interface MassSchedule {
  id: string;
  dayGroup: '주일 미사' | '평일 미사' | '토요 특전' | '고해성사';
  time: string;
  title: string;
  location: string;
  note: string;
}

export interface ParishNotice {
  id: string;
  title: string;
  category: NoticeCategory;
  date: string;
  summary: string;
  content: string;
  pinned: boolean;
}

export interface SanctuarySpace {
  id: string;
  orderLabel: string;
  name: string;
  latinName: string;
  subtitle: string;
  dimensions: string;
  lightingNote: string;
  description: string;
  contemplationPrompt: string;
  isOpen: boolean;
  statusNote: string;
  imageKey: 'courtyard' | 'nave' | 'candle' | 'cloister';
}

export interface SanctuaryPayload {
  dailyMeditations: DailyMeditation[];
  prayers: PrayerIntention[];
  masses: MassSchedule[];
  notices: ParishNotice[];
  spaces: SanctuarySpace[];
}

export type SanctuaryServerEvent =
  | { type: 'presence:sync'; pilgrims: ActivePilgrim[] }
  | { type: 'prayer:created'; prayer: PrayerIntention }
  | { type: 'prayer:updated'; prayer: PrayerIntention }
  | { type: 'prayer:deleted'; id: string };
