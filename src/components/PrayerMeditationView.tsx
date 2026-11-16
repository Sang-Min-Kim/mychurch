import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  Flame,
  LogOut,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Sun,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type {
  ActivePilgrim,
  DailyMeditation,
  PrayerCategory,
  PrayerIntention,
  PrayerPosture,
  SanctuaryZoneId,
  SoundscapeId,
} from '../types';
import { amenPrayer, createPrayer } from '../services/sanctuaryApi';
import { ambientAudio } from '../utils/ambientAudio';
import { SanctuaryImage } from './SanctuaryImage';
import { SanctuaryVRPlayer } from './SanctuaryVRPlayer';

export type SanctuaryVisitState = 'outside' | 'inside' | 'departed';

interface PrayerMeditationViewProps {
  meditations: DailyMeditation[];
  prayers: PrayerIntention[];
  activePilgrims: ActivePilgrim[];
  visitState: SanctuaryVisitState;
  myPilgrim: ActivePilgrim | null;
  lastStaySeconds: number;
  isVigilDark: boolean;
  activeTab: 'vr' | 'sanctuary';
  onTabChange: (tab: 'vr' | 'sanctuary') => void;
  onToggleVigilDark: () => void;
  onEnterSanctuary: (payload: {
    name: string;
    zone: SanctuaryZoneId;
    seatIndex: number;
    posture: PrayerPosture;
  }) => void;
  onMoveInSanctuary: (payload: {
    zone: SanctuaryZoneId;
    seatIndex: number;
    posture?: PrayerPosture;
  }) => void;
  onLeaveSanctuary: () => void;
  onReturnHome: () => void;
  onPrayerCreated: (prayer: PrayerIntention) => void;
  onPrayerAmen: (prayer: PrayerIntention) => void;
}

const SOUNDSCAPES: { id: SoundscapeId; title: string; detail: string }[] = [
  { id: 'cathedral', title: '성당의 침묵', detail: '잔잔한 오르간 화음의 성전 울림' },
  { id: 'chimes', title: '새벽 종소리와 바람', detail: '먼 산사의 풍경과 소나무 바람결' },
  { id: 'rain', title: '회랑의 빗소리', detail: '처마와 돌길을 적시는 고요한 빗소리' },
  { id: 'silence', title: '완전한 침묵', detail: '배경 소리 없이 고요히 머물기' },
];

const CATEGORIES: PrayerCategory[] = ['평안', '위로', '치유', '가족', '감사', '성찰'];

const ZONES: { id: SanctuaryZoneId; label: string; subtitle: string; seatCount: number }[] = [
  { id: 'nave', label: '대성전 좌석', subtitle: '주 제대 앞 12좌석', seatCount: 12 },
  { id: 'adoration', label: '성체조배실', subtitle: '고요한 침묵 방 4좌석', seatCount: 4 },
  { id: 'candles', label: '봉헌 초 제대', subtitle: '촛불 앞 4자리', seatCount: 4 },
  { id: 'cloister', label: '회랑 정원', subtitle: '걷기 묵상 길 4자리', seatCount: 4 },
];

const POSTURES: PrayerPosture[] = ['침묵 묵상', '치유 기도', '감사 기도', '촛불 봉헌'];

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function PrayerMeditationView({
  meditations,
  prayers,
  activePilgrims,
  visitState,
  myPilgrim,
  lastStaySeconds,
  isVigilDark,
  activeTab,
  onTabChange,
  onToggleVigilDark,
  onEnterSanctuary,
  onMoveInSanctuary,
  onLeaveSanctuary,
  onReturnHome,
  onPrayerCreated,
  onPrayerAmen,
}: PrayerMeditationViewProps) {
  const todayDayIndex = new Date().getDay();
  const initialMedIdx = Math.max(
    0,
    meditations.findIndex((m) => m.dayIndex === todayDayIndex)
  );
  const [medIndex, setMedIndex] = useState<number>(initialMedIdx);

  // Entry form state
  const [entryName, setEntryName] = useState<string>('');
  const [entryZone, setEntryZone] = useState<SanctuaryZoneId>('nave');
  const [entryPosture, setEntryPosture] = useState<PrayerPosture>('침묵 묵상');

  // Elapsed stay clock while inside
  const [staySeconds, setStaySeconds] = useState<number>(0);

  // Ambient Soundscape state
  const [soundscape, setSoundscape] = useState<SoundscapeId>('silence');
  const [volume, setVolume] = useState<number>(0.35);

  // Silent Meditation Timer state
  const [timerMinutes, setTimerMinutes] = useState<number>(5);
  const [secondsLeft, setSecondsLeft] = useState<number>(5 * 60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [timerDone, setTimerDone] = useState<boolean>(false);

  // Prayer Intention Form state
  const [author, setAuthor] = useState<string>('');
  const [category, setCategory] = useState<PrayerCategory>('평안');
  const [intention, setIntention] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [submitSuccess, setSubmitSuccess] = useState<string>('');
  const [filterCat, setFilterCat] = useState<'전체' | PrayerCategory>('전체');
  const [amenedIds, setAmenedIds] = useState<Record<string, boolean>>({});

  const candleSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (visitState !== 'inside' || !myPilgrim) {
      setStaySeconds(0);
      return;
    }
    const updateClock = () => {
      const diff = Math.max(
        0,
        Math.floor((Date.now() - new Date(myPilgrim.enteredAt).getTime()) / 1000)
      );
      setStaySeconds(diff);
    };
    updateClock();
    const id = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(id);
  }, [visitState, myPilgrim]);

  useEffect(() => {
    return () => {
      ambientAudio.stop();
    };
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          setTimerDone(true);
          ambientAudio.playSoftCompletionBell();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  const activeMeditation = meditations[medIndex] || meditations[0];

  const handleSelectSound = (id: SoundscapeId) => {
    setSoundscape(id);
    ambientAudio.setVolume(volume);
    ambientAudio.start(id);
  };

  const handleVolumeChange = (nextVol: number) => {
    setVolume(nextVol);
    ambientAudio.setVolume(nextVol);
  };

  const handleSelectTimerMinutes = (mins: number) => {
    setTimerRunning(false);
    setTimerDone(false);
    setTimerMinutes(mins);
    setSecondsLeft(mins * 60);
  };

  const breathingPhase = (() => {
    if (!timerRunning) return '마음을 가다듬고 침묵에 머뭅니다';
    const cycle = (timerMinutes * 60 - secondsLeft) % 14;
    if (cycle < 4) return '천천히 숨을 들이마십니다 (4초)';
    if (cycle < 8) return '평화 속에 잠시 머뭅니다 (4초)';
    return '무거운 생각을 내쉬며 놓아줍니다 (6초)';
  })();

  const pickFirstAvailableSeat = (zone: SanctuaryZoneId): number => {
    const zInfo = ZONES.find((z) => z.id === zone) || ZONES[0];
    const occupied = new Set(
      activePilgrims.filter((p) => p.zone === zone).map((p) => p.seatIndex)
    );
    for (let i = 0; i < zInfo.seatCount; i++) {
      if (!occupied.has(i)) return i;
    }
    return activePilgrims.filter((p) => p.zone === zone).length % zInfo.seatCount;
  };

  const handleEnterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const chosenName = entryName.trim() || '익명의 순례자';
    if (!author.trim() && entryName.trim()) {
      setAuthor(entryName.trim());
    }
    onEnterSanctuary({
      name: chosenName,
      zone: entryZone,
      seatIndex: pickFirstAvailableSeat(entryZone),
      posture: entryPosture,
    });
  };

  const handleLeave = () => {
    ambientAudio.stop();
    setSoundscape('silence');
    setTimerRunning(false);
    onLeaveSanctuary();
  };

  const handleSubmitPrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');

    if (!intention.trim()) {
      setSubmitError('기도 지향 내용을 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createPrayer({
        author: author.trim() || myPilgrim?.name || '익명의 순례자',
        category,
        intention: intention.trim(),
        candleLit: true,
      });
      onPrayerCreated(created);
      setIntention('');
      setSubmitSuccess('작은 초 한 자루와 함께 기도 지향이 제대에 봉헌되었습니다.');
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : '기도를 봉헌하는 중 오류가 발생했습니다.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleAmen = async (id: string) => {
    if (amenedIds[id]) return;
    setAmenedIds((prev) => ({ ...prev, [id]: true }));
    try {
      const updated = await amenPrayer(id);
      if (updated) {
        onPrayerAmen(updated);
      }
    } catch {
      // ignore transient error
    }
  };

  const filteredPrayers =
    filterCat === '전체' ? prayers : prayers.filter((p) => p.category === filterCat);

  const currentZoneLabel =
    ZONES.find((z) => z.id === myPilgrim?.zone)?.label || '대성전 좌석';

  // Helper to get pilgrims at a specific zone + seat
  const pilgrimsAt = (zone: SanctuaryZoneId, seatIndex: number) =>
    activePilgrims.filter((p) => p.zone === zone && p.seatIndex === seatIndex);

  const renderModeBar = () => (
    <div className="mx-auto max-w-[1200px] px-6 pt-8 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="inline-flex items-center gap-1 rounded-md bg-[#EFECE4] dark:bg-[#1B1916] p-1 w-fit">
        <button
          type="button"
          onClick={() => onTabChange('vr')}
          className={`px-3.5 py-2 text-xs rounded cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'vr'
              ? 'bg-[#FAF9F6] dark:bg-[#2A2721] text-[#1C1B18] dark:text-[#EDEAE2] font-medium'
              : 'text-[#6E6A63] dark:text-[#969085] hover:text-[#1C1B18] dark:hover:text-[#EDEAE2]'
          }`}
        >
          가상 성당 순례 VR 영상 (입장·기도·퇴장)
        </button>
        <button
          type="button"
          onClick={() => onTabChange('sanctuary')}
          className={`px-3.5 py-2 text-xs rounded cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'sanctuary'
              ? 'bg-[#FAF9F6] dark:bg-[#2A2721] text-[#1C1B18] dark:text-[#EDEAE2] font-medium'
              : 'text-[#6E6A63] dark:text-[#969085] hover:text-[#1C1B18] dark:hover:text-[#EDEAE2]'
          }`}
        >
          성당 좌석 입장 · 직접 기도하기
        </button>
      </div>

      <span className="text-xs text-[#6E6A63] dark:text-[#A39E93] tabular-nums">
        현재 성당 안 함께 머무는 순례자 {activePilgrims.length}명
      </span>
    </div>
  );

  // ------------------------------------------------------------------
  // TAB A: 3D VIRTUAL SANCTUARY VR PILGRIMAGE FILM
  // ------------------------------------------------------------------
  if (activeTab === 'vr') {
    return (
      <div>
        {renderModeBar()}
        <div className="mx-auto max-w-[1200px] px-6 py-6 md:py-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-xs tracking-[0.16em] text-[#7C5A3C] dark:text-[#C59F61]">
                3D VIRTUAL PILGRIMAGE · 가상의 순례자 성전 체험
              </p>
              <h1 className="font-editorial text-2xl sm:text-3xl font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
                아트리움을 지나 제대 앞에 앉아 기도하고 돌아가는 시간
              </h1>
            </div>
            <p className="text-xs text-[#6E6A63] dark:text-[#A39E93]">
              1인칭 VR 시점에서는 화면을 드래그하여 성당 내부를 360° 둘러보실 수 있습니다.
            </p>
          </div>

          <SanctuaryVRPlayer
            activePilgrims={activePilgrims}
            myPilgrimId={myPilgrim?.id}
            onEnterFromVR={() => onTabChange('sanctuary')}
          />
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // STATE 1: DEPARTED (기도를 마치고 성당에서 나온 뒤의 평화 축복 화면)
  // ------------------------------------------------------------------
  if (visitState === 'departed') {
    const mins = Math.floor(lastStaySeconds / 60);
    const secs = lastStaySeconds % 60;
    const stayText = mins > 0 ? `${mins}분 ${secs}초` : `${secs}초`;

    return (
      <div>
        {renderModeBar()}
        <div className="mx-auto max-w-[1200px] px-6 py-14 md:py-20 flex justify-center">
        <div className="w-full max-w-xl rounded-lg border border-[#E5E1D8] dark:border-[#2C2924] bg-[#F3F1EC] dark:bg-[#1B1916] p-8 sm:p-12 text-center space-y-6">
          <p className="text-xs tracking-[0.18em] text-[#7C5A3C] dark:text-[#C59F61]">
            PEACE BE WITH YOU · 성전을 나서며
          </p>
          <h1 className="font-editorial text-3xl font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
            평안히 돌아가십시오
          </h1>
          <p className="text-sm text-[#6E6A63] dark:text-[#A39E93] tabular-nums">
            성전 안에서 {stayText} 동안 고요히 머물며 기도를 바쳤습니다.
          </p>
          <blockquote className="font-editorial text-lg leading-[1.85] text-[#3B3833] dark:text-[#CBC6BC] border-t border-b border-[#E5E1D8] dark:border-[#2C2924] py-6">
            “성당을 나서더라도 이곳에 남긴 기도의 불빛은 꺼지지 않습니다. 오늘 마주하는 모든
            걸음 위에 고요한 은총이 함께하기를 빕니다.”
          </blockquote>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() =>
                onEnterSanctuary({
                  name: entryName.trim() || '익명의 순례자',
                  zone: entryZone,
                  seatIndex: pickFirstAvailableSeat(entryZone),
                  posture: entryPosture,
                })
              }
              className="rounded-md bg-[#1C1B18] dark:bg-[#9E7B42] px-5 py-2.5 text-sm font-medium text-[#F8F7F4] dark:text-[#141311] cursor-pointer hover:bg-[#33312C] dark:hover:bg-[#B38E52]"
            >
              다시 성당 입장하기
            </button>
            <button
              type="button"
              onClick={onReturnHome}
              className="rounded-md border border-[#D4CFC4] dark:border-[#3A3630] px-5 py-2.5 text-sm text-[#1C1B18] dark:text-[#EDEAE2] cursor-pointer hover:bg-[#EAE6DC] dark:hover:bg-[#24211D]"
            >
              성당 안내로 돌아가기
            </button>
          </div>
        </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // STATE 2: OUTSIDE (성당 문 앞 · 현재 동시 입장자 확인 및 입장 절차)
  // ------------------------------------------------------------------
  if (visitState === 'outside') {
    return (
      <div>
        {renderModeBar()}
        <div className="mx-auto max-w-[1200px] px-6 py-8 md:py-12 space-y-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <p className="text-xs tracking-[0.16em] text-[#7C5A3C] dark:text-[#C59F61]">
                THRESHOLD OF THE SANCTUARY · 성당 문 앞
              </p>
              <h1
                className="font-editorial text-3xl sm:text-4xl font-medium leading-tight text-[#1C1B18] dark:text-[#EDEAE2]"
                style={{ textWrap: 'balance' }}
              >
                잠시 문을 열고,
                <br />
                조용한 성당 안으로 들어서세요
              </h1>
              <p className="text-[15px] leading-[1.85] text-[#5C5852] dark:text-[#B5B0A6]">
                지금 성전 안에는 여러 순례자들이 각자의 자리에 조용히 머물며 기도하고 있습니다.
                신발의 먼지를 털듯 바깥의 마음을 잠시 내려놓고 빈 자리를 선택해 입장해 보세요.
              </p>
            </div>

            {/* Live Concurrent Occupancy Overview */}
            <div className="rounded-lg border border-[#E5E1D8] dark:border-[#2C2924] bg-[#F3F1EC] dark:bg-[#1B1916] p-5 space-y-4">
              <div className="flex items-center justify-between text-xs text-[#6E6A63] dark:text-[#A39E93]">
                <span className="inline-flex items-center gap-1.5 font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
                  <Users className="w-4 h-4 text-[#9E7B42]" />
                  <span>현재 성당 안 동시 기도 현황</span>
                </span>
                <span className="font-mono tabular-nums text-[#7C5A3C] dark:text-[#C59F61]">
                  총 {activePilgrims.length}명 머무는 중
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {ZONES.map((z) => {
                  const count = activePilgrims.filter((p) => p.zone === z.id).length;
                  return (
                    <div
                      key={z.id}
                      className="rounded border border-[#E5E1D8] dark:border-[#2C2924] bg-[#FAF9F6] dark:bg-[#141311] p-3 space-y-1"
                    >
                      <div className="text-[#1C1B18] dark:text-[#EDEAE2] font-medium">
                        {z.label}
                      </div>
                      <div className="font-mono tabular-nums text-[#6E6A63] dark:text-[#969085]">
                        {count}명 기도 중
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Entry Form Card */}
          <form
            onSubmit={handleEnterSubmit}
            className="lg:col-span-6 rounded-lg border border-[#E5E1D8] dark:border-[#2C2924] bg-[#F3F1EC] dark:bg-[#1B1916] p-7 sm:p-8 flex flex-col justify-between space-y-6"
          >
            <div className="space-y-5">
              <div className="overflow-hidden rounded-md border border-[#E5E1D8] dark:border-[#2C2924] h-44">
                <SanctuaryImage
                  imageKey="nave"
                  alt="성당 내부 대성전 좌석과 고측창의 빛"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="entry-name"
                    className="block text-xs text-[#6E6A63] dark:text-[#A39E93] mb-1.5"
                  >
                    이름 또는 세례명 (선택)
                  </label>
                  <input
                    id="entry-name"
                    type="text"
                    maxLength={24}
                    value={entryName}
                    onChange={(e) => setEntryName(e.target.value)}
                    placeholder="익명의 순례자"
                    className="w-full rounded-md border border-[#D4CFC4] dark:border-[#3A3630] bg-[#FAF9F6] dark:bg-[#141311] px-3.5 py-2.5 text-sm text-[#1C1B18] dark:text-[#EDEAE2] placeholder:text-[#9C968B] focus:outline-none focus:border-[#9E7B42]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="entry-posture"
                    className="block text-xs text-[#6E6A63] dark:text-[#A39E93] mb-1.5"
                  >
                    오늘의 기도 마음
                  </label>
                  <select
                    id="entry-posture"
                    value={entryPosture}
                    onChange={(e) => setEntryPosture(e.target.value as PrayerPosture)}
                    className="w-full rounded-md border border-[#D4CFC4] dark:border-[#3A3630] bg-[#FAF9F6] dark:bg-[#141311] px-3.5 py-2.5 text-sm text-[#1C1B18] dark:text-[#EDEAE2] focus:outline-none focus:border-[#9E7B42]"
                  >
                    {POSTURES.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <span className="block text-xs text-[#6E6A63] dark:text-[#A39E93] mb-2">
                  처음 머무를 공간 선택
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  {ZONES.map((z) => {
                    const selected = entryZone === z.id;
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => setEntryZone(z.id)}
                        className={`rounded-md border px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                          selected
                            ? 'border-[#9E7B42] bg-[#FAF9F6] dark:bg-[#24211C] text-[#1C1B18] dark:text-[#EDEAE2]'
                            : 'border-[#D4CFC4] dark:border-[#3A3630] bg-[#FAF9F6]/60 dark:bg-[#141311] text-[#5C5852] dark:text-[#A39E93]'
                        }`}
                      >
                        <div className="text-sm font-medium">{z.label}</div>
                        <div className="text-[11px] text-[#6E6A63] dark:text-[#969085]">
                          {z.subtitle}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#1C1B18] dark:bg-[#9E7B42] px-5 py-3.5 text-sm font-medium text-[#F8F7F4] dark:text-[#141311] cursor-pointer hover:bg-[#33312C] dark:hover:bg-[#B38E52] transition-colors"
            >
              <DoorOpen className="w-4 h-4" />
              <span>성당에 조용히 입장하기</span>
            </button>
          </form>
        </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // STATE 3: INSIDE THE SANCTUARY (동시 머무름 · 개인 기도·묵상 · 초 봉헌 · 퇴장)
  // ------------------------------------------------------------------
  return (
    <div>
      {renderModeBar()}
      <div className="mx-auto max-w-[1200px] px-6 py-8 md:py-12 space-y-14">
      {/* Top Sanctuary Status & Exit Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E5E1D8] dark:border-[#2C2924] pb-6">
        <div className="space-y-1">
          <p className="text-xs tracking-[0.16em] text-[#7C5A3C] dark:text-[#C59F61]">
            INSIDE THE SANCTUARY · 성당 내부 침묵 기도 중
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#1C1B18] dark:text-[#EDEAE2]">
            <span className="font-medium">{myPilgrim?.name || '순례자'}</span>
            <span aria-hidden="true" className="text-[#9C968B]">
              ·
            </span>
            <span>
              {currentZoneLabel} {(myPilgrim?.seatIndex ?? 0) + 1}번 자리
            </span>
            <span aria-hidden="true" className="text-[#9C968B]">
              ·
            </span>
            <span className="text-[#6E6A63] dark:text-[#A39E93]">{myPilgrim?.posture}</span>
            <span aria-hidden="true" className="text-[#9C968B]">
              ·
            </span>
            <span className="font-mono tabular-nums text-[#7C5A3C] dark:text-[#C59F61]">
              머문 시간 {formatElapsed(staySeconds)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleVigilDark}
            className="inline-flex items-center gap-2 rounded-md border border-[#D4CFC4] dark:border-[#3A3630] bg-[#F3F1EC] dark:bg-[#1B1916] px-3.5 py-2 text-xs font-medium text-[#1C1B18] dark:text-[#EDEAE2] whitespace-nowrap shrink-0 cursor-pointer hover:bg-[#EAE6DC] dark:hover:bg-[#24211D]"
          >
            {isVigilDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-[#C59F61]" />
                <span>낮 성당 화면</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-[#7C5A3C]" />
                <span>야간 촛불 모드</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleLeave}
            className="inline-flex items-center gap-2 rounded-md bg-[#1C1B18] dark:bg-[#9E7B42] px-4 py-2 text-xs font-medium text-[#F8F7F4] dark:text-[#141311] whitespace-nowrap shrink-0 cursor-pointer hover:bg-[#33312C] dark:hover:bg-[#B38E52]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>기도를 마치고 성당 나가기</span>
          </button>
        </div>
      </div>

      {/* Live Multi-User Sanctuary Presence Canvas (Interactive Floor Seats) */}
      <section className="rounded-lg border border-[#E5E1D8] dark:border-[#2C2924] bg-[#F3F1EC] dark:bg-[#1B1916] p-6 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-editorial text-xl font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
              성당 안 함께 머무는 자리 ({activePilgrims.length}명)
            </h2>
            <p className="text-xs text-[#6E6A63] dark:text-[#A39E93] mt-0.5">
              다른 자리를 누르면 조용히 자리를 옮겨 앉을 수 있습니다. 각자의 기도는 개인 공간에
              안전하게 유지됩니다.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label htmlFor="move-posture" className="text-[#6E6A63] dark:text-[#A39E93]">
              기도 자세:
            </label>
            <select
              id="move-posture"
              value={myPilgrim?.posture || '침묵 묵상'}
              onChange={(e) => {
                if (!myPilgrim) return;
                onMoveInSanctuary({
                  zone: myPilgrim.zone,
                  seatIndex: myPilgrim.seatIndex,
                  posture: e.target.value as PrayerPosture,
                });
              }}
              className="rounded border border-[#D4CFC4] dark:border-[#3A3630] bg-[#FAF9F6] dark:bg-[#141311] px-2.5 py-1 text-xs text-[#1C1B18] dark:text-[#EDEAE2]"
            >
              {POSTURES.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sanctuary Zones & Interactive Seats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Nave Pews (6 cols) */}
          <div className="lg:col-span-6 rounded-md border border-[#E5E1D8] dark:border-[#2C2924] bg-[#FAF9F6] dark:bg-[#141311] p-5 space-y-4">
            <div className="text-center space-y-1 border-b border-[#E5E1D8] dark:border-[#2C2924] pb-3">
              <div className="text-[11px] tracking-widest text-[#7C5A3C] dark:text-[#C59F61]">
                ALTAR · 주 제대
              </div>
              <div className="mx-auto w-24 h-1.5 rounded-sm bg-[#9E7B42]/50" />
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              {Array.from({ length: 12 }).map((_, idx) => {
                const occupants = pilgrimsAt('nave', idx);
                const isMine = myPilgrim?.zone === 'nave' && myPilgrim?.seatIndex === idx;
                const firstOccupant = occupants[0];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      onMoveInSanctuary({ zone: 'nave', seatIndex: idx })
                    }
                    className={`rounded-md border px-2.5 py-2.5 text-left transition-colors cursor-pointer min-h-[58px] flex flex-col justify-between ${
                      isMine
                        ? 'border-[#9E7B42] bg-[#9E7B42]/15 text-[#1C1B18] dark:text-[#EDEAE2]'
                        : occupants.length > 0
                        ? 'border-[#D4CFC4] dark:border-[#3A3630] bg-[#EFECE4] dark:bg-[#221F1A] text-[#1C1B18] dark:text-[#EDEAE2]'
                        : 'border-[#E5E1D8] dark:border-[#25221D] text-[#8B857B] hover:border-[#9E7B42]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono tabular-nums">
                      <span>좌석 {idx + 1}</span>
                      {occupants.length > 0 && (
                        <span className="text-[#9E7B42]">
                          {isMine ? '나' : `${occupants.length}명`}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] truncate font-medium">
                      {isMine
                        ? `${myPilgrim.name}`
                        : firstOccupant
                        ? `${firstOccupant.name}`
                        : '빈 자리'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Side Sanctuaries: Adoration, Candles, Cloister (6 cols) */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ZONES.filter((z) => z.id !== 'nave').map((zone) => (
              <div
                key={zone.id}
                className="rounded-md border border-[#E5E1D8] dark:border-[#2C2924] bg-[#FAF9F6] dark:bg-[#141311] p-4 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
                    {zone.label}
                  </div>
                  <div className="text-[11px] text-[#6E6A63] dark:text-[#969085]">
                    {zone.subtitle}
                  </div>
                </div>

                <div className="space-y-2">
                  {Array.from({ length: zone.seatCount }).map((_, idx) => {
                    const occupants = pilgrimsAt(zone.id, idx);
                    const isMine =
                      myPilgrim?.zone === zone.id && myPilgrim?.seatIndex === idx;
                    const firstOccupant = occupants[0];
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          onMoveInSanctuary({ zone: zone.id, seatIndex: idx })
                        }
                        className={`w-full rounded border px-2.5 py-2 text-left text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                          isMine
                            ? 'border-[#9E7B42] bg-[#9E7B42]/15 text-[#1C1B18] dark:text-[#EDEAE2]'
                            : occupants.length > 0
                            ? 'border-[#D4CFC4] dark:border-[#3A3630] bg-[#EFECE4] dark:bg-[#221F1A] text-[#1C1B18] dark:text-[#EDEAE2]'
                            : 'border-[#E5E1D8] dark:border-[#25221D] text-[#8B857B] hover:border-[#9E7B42]/60'
                        }`}
                      >
                        <span className="truncate">
                          {isMine
                            ? `${myPilgrim.name} (나)`
                            : firstOccupant
                            ? `${firstOccupant.name}`
                            : `자리 ${idx + 1}`}
                        </span>
                        <span className="text-[10px] shrink-0 text-[#9E7B42]">
                          {isMine
                            ? myPilgrim.posture
                            : firstOccupant
                            ? firstOccupant.posture
                            : '앉기'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Split: Daily Scripture/Prayer Reader (7 cols) + Ambient Soundscape & Timer (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left: Daily Scripture & Prayer Reader */}
        <article className="lg:col-span-7 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-[#6E6A63] dark:text-[#A39E93]">
              <span>{activeMeditation?.dateLabel}</span>
              <span aria-hidden="true" className="mx-2">
                ·
              </span>
              <span className="text-[#7C5A3C] dark:text-[#C59F61] font-medium">
                {activeMeditation?.theme}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setMedIndex((prev) => (prev - 1 + meditations.length) % meditations.length)
                }
                aria-label="이전 날짜 묵상"
                className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-[#D4CFC4] dark:border-[#3A3630] text-[#1C1B18] dark:text-[#EDEAE2] cursor-pointer hover:bg-[#EFECE4] dark:hover:bg-[#1F1D1A]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-xs tabular-nums text-[#6E6A63] dark:text-[#A39E93] px-1">
                {String(medIndex + 1).padStart(2, '0')} /{' '}
                {String(meditations.length).padStart(2, '0')}
              </span>
              <button
                type="button"
                onClick={() => setMedIndex((prev) => (prev + 1) % meditations.length)}
                aria-label="다음 날짜 묵상"
                className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-[#D4CFC4] dark:border-[#3A3630] text-[#1C1B18] dark:text-[#EDEAE2] cursor-pointer hover:bg-[#EFECE4] dark:hover:bg-[#1F1D1A]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {activeMeditation && (
            <div className="space-y-8">
              <h2 className="font-editorial text-2xl sm:text-[32px] font-medium leading-snug text-[#1C1B18] dark:text-[#EDEAE2]">
                {activeMeditation.liturgicalTitle}
              </h2>

              <div className="rounded-lg border border-[#E5E1D8] dark:border-[#2C2924] bg-[#F3F1EC] dark:bg-[#1B1916] p-7 sm:p-8 space-y-4">
                <p className="text-xs tracking-wider text-[#7C5A3C] dark:text-[#C59F61]">
                  오늘의 성경 말씀 · {activeMeditation.scriptureRef}
                </p>
                <blockquote className="font-editorial text-xl sm:text-2xl leading-[1.75] text-[#1C1B18] dark:text-[#EDEAE2]">
                  “{activeMeditation.scriptureText}”
                </blockquote>
              </div>

              <div className="space-y-4 max-w-prose">
                <h3 className="text-xs tracking-widest text-[#6E6A63] dark:text-[#A39E93]">
                  마음을 적시는 묵상
                </h3>
                <p className="text-[16px] leading-[1.9] text-[#3B3833] dark:text-[#CBC6BC]">
                  {activeMeditation.reflection}
                </p>
              </div>

              <div className="border-t border-b border-[#E5E1D8] dark:border-[#2C2924] py-7 space-y-3 max-w-prose">
                <h3 className="text-xs tracking-widest text-[#7C5A3C] dark:text-[#C59F61]">
                  오늘의 기도문
                </h3>
                <p className="font-editorial text-lg leading-[1.9] text-[#1C1B18] dark:text-[#EDEAE2]">
                  {activeMeditation.prayerText}
                </p>
              </div>
            </div>
          )}
        </article>

        {/* Right: Calm Background Soundscape + Breathing Silence Timer */}
        <aside className="lg:col-span-5 space-y-8">
          <div className="rounded-lg border border-[#E5E1D8] dark:border-[#2C2924] bg-[#F3F1EC] dark:bg-[#1B1916] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs tracking-wider text-[#7C5A3C] dark:text-[#C59F61]">
                  AMBIENT SOUNDSCAPE
                </p>
                <h3 className="font-editorial text-xl font-medium text-[#1C1B18] dark:text-[#EDEAE2] mt-0.5">
                  고요한 배경 소리 선택
                </h3>
              </div>
              {soundscape === 'silence' ? (
                <VolumeX className="w-5 h-5 text-[#6E6A63] dark:text-[#969085]" />
              ) : (
                <Volume2 className="w-5 h-5 text-[#9E7B42]" />
              )}
            </div>

            <div className="space-y-2">
              {SOUNDSCAPES.map((track) => {
                const active = soundscape === track.id;
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => handleSelectSound(track.id)}
                    className={`w-full rounded-md border px-4 py-3 text-left transition-colors cursor-pointer ${
                      active
                        ? 'border-[#9E7B42] bg-[#FAF9F6] dark:bg-[#24211C] text-[#1C1B18] dark:text-[#EDEAE2]'
                        : 'border-transparent bg-[#EAE6DC]/60 dark:bg-[#161412] text-[#5C5852] dark:text-[#A39E93] hover:bg-[#EAE6DC] dark:hover:bg-[#211E1A]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>{track.title}</span>
                      <span className="text-xs text-[#7C5A3C] dark:text-[#C59F61]">
                        {active ? (track.id === 'silence' ? '선택됨' : '재생 중') : '선택'}
                      </span>
                    </div>
                    <p className="text-xs text-[#6E6A63] dark:text-[#969085] mt-0.5">
                      {track.detail}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between text-xs text-[#6E6A63] dark:text-[#969085]">
                <label htmlFor="ambient-volume">소리 크기</label>
                <span className="font-mono tabular-nums">{Math.round(volume * 100)}%</span>
              </div>
              <input
                id="ambient-volume"
                type="range"
                min={0.05}
                max={0.9}
                step={0.05}
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-full accent-[#9E7B42] cursor-pointer"
              />
            </div>
          </div>

          <div className="rounded-lg border border-[#E5E1D8] dark:border-[#2C2924] bg-[#F3F1EC] dark:bg-[#1B1916] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs tracking-wider text-[#7C5A3C] dark:text-[#C59F61]">
                  SILENCE &amp; BREATHING
                </p>
                <h3 className="font-editorial text-xl font-medium text-[#1C1B18] dark:text-[#EDEAE2] mt-0.5">
                  침묵 묵상 시간
                </h3>
              </div>
              <div className="flex items-center gap-1 rounded-md bg-[#EAE6DC] dark:bg-[#141311] p-1">
                {[5, 10, 15].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleSelectTimerMinutes(mins)}
                    className={`px-2.5 py-1 text-xs rounded cursor-pointer tabular-nums transition-colors ${
                      timerMinutes === mins
                        ? 'bg-[#FAF9F6] dark:bg-[#27241F] text-[#1C1B18] dark:text-[#EDEAE2] font-medium'
                        : 'text-[#6E6A63] dark:text-[#969085]'
                    }`}
                  >
                    {mins}분
                  </button>
                ))}
              </div>
            </div>

            <div className="py-4 text-center space-y-2 border-t border-b border-[#E5E1D8] dark:border-[#2C2924]">
              <div className="font-mono text-4xl font-normal tracking-tight tabular-nums text-[#1C1B18] dark:text-[#EDEAE2]">
                {formatElapsed(secondsLeft)}
              </div>
              <p className="text-xs text-[#6E6A63] dark:text-[#A39E93]">
                {timerDone
                  ? '묵상 시간이 마쳐졌습니다. 고요한 은총 속에 평안히 돌아가세요.'
                  : breathingPhase}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (secondsLeft === 0) {
                    setSecondsLeft(timerMinutes * 60);
                    setTimerDone(false);
                  }
                  setTimerRunning((prev) => !prev);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-[#1C1B18] dark:bg-[#9E7B42] px-4 py-2.5 text-sm font-medium text-[#F8F7F4] dark:text-[#141311] cursor-pointer hover:bg-[#33312C] dark:hover:bg-[#B38E52] transition-colors"
              >
                {timerRunning ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>잠시 멈춤</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>묵상 시작</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleSelectTimerMinutes(timerMinutes)}
                aria-label="타이머 초기화"
                className="inline-flex items-center justify-center rounded-md border border-[#D4CFC4] dark:border-[#3A3630] px-3.5 py-2.5 text-sm text-[#1C1B18] dark:text-[#EDEAE2] cursor-pointer hover:bg-[#EAE6DC] dark:hover:bg-[#24211D]"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Votive Candle & Prayer Intention Wall */}
      <section
        ref={candleSectionRef}
        className="border-t border-[#E5E1D8] dark:border-[#2C2924] pt-14 space-y-10"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5 space-y-6">
            <div className="overflow-hidden rounded-lg border border-[#E5E1D8] dark:border-[#2C2924] h-52">
              <SanctuaryImage
                imageKey="candle"
                alt="고요의 성당 봉헌 초 제대에 켜진 따뜻한 밀랍 촛불"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs tracking-wider text-[#7C5A3C] dark:text-[#C59F61]">
                VOTIVE CANDLE &amp; INTENTIONS
              </p>
              <h2 className="font-editorial text-2xl font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
                기도 지향 남기고 초 봉헌하기
              </h2>
              <p className="text-sm leading-relaxed text-[#5C5852] dark:text-[#B5B0A6]">
                성당을 떠나신 뒤에도 작은 촛불이 제대 앞에 남아 기도를 이어갑니다. 봉헌된 지향은
                함께 머무는 순례자들과 실시간으로 나뉘며 본당 미사에 함께 기억됩니다.
              </p>
            </div>

            <form onSubmit={handleSubmitPrayer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="prayer-author"
                    className="block text-xs text-[#6E6A63] dark:text-[#A39E93] mb-1.5"
                  >
                    이름 또는 세례명 (선택)
                  </label>
                  <input
                    id="prayer-author"
                    type="text"
                    maxLength={32}
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder={myPilgrim?.name || '익명의 순례자'}
                    className="w-full rounded-md border border-[#D4CFC4] dark:border-[#3A3630] bg-[#FAF9F6] dark:bg-[#1B1916] px-3.5 py-2.5 text-sm text-[#1C1B18] dark:text-[#EDEAE2] placeholder:text-[#9C968B] focus:outline-none focus:border-[#9E7B42]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="prayer-category"
                    className="block text-xs text-[#6E6A63] dark:text-[#A39E93] mb-1.5"
                  >
                    기도 지향 구분
                  </label>
                  <select
                    id="prayer-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as PrayerCategory)}
                    className="w-full rounded-md border border-[#D4CFC4] dark:border-[#3A3630] bg-[#FAF9F6] dark:bg-[#1B1916] px-3.5 py-2.5 text-sm text-[#1C1B18] dark:text-[#EDEAE2] focus:outline-none focus:border-[#9E7B42]"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="prayer-intention"
                  className="block text-xs text-[#6E6A63] dark:text-[#A39E93] mb-1.5"
                >
                  기도 내용
                </label>
                <textarea
                  id="prayer-intention"
                  rows={4}
                  maxLength={400}
                  value={intention}
                  onChange={(e) => setIntention(e.target.value)}
                  placeholder="마음에 담긴 감사, 치유, 평화의 기도를 조용히 적어 주세요."
                  className="w-full rounded-md border border-[#D4CFC4] dark:border-[#3A3630] bg-[#FAF9F6] dark:bg-[#1B1916] px-3.5 py-2.5 text-sm leading-relaxed text-[#1C1B18] dark:text-[#EDEAE2] placeholder:text-[#9C968B] focus:outline-none focus:border-[#9E7B42]"
                />
              </div>

              {submitError && (
                <p className="text-xs text-[#9E3B33] dark:text-[#E27D74]">{submitError}</p>
              )}
              {submitSuccess && (
                <p className="text-xs text-[#2D6A4F] dark:text-[#74C69D]">{submitSuccess}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#1C1B18] dark:bg-[#9E7B42] px-5 py-3 text-sm font-medium text-[#F8F7F4] dark:text-[#141311] cursor-pointer hover:bg-[#33312C] dark:hover:bg-[#B38E52] disabled:opacity-50 transition-colors"
              >
                <Flame className="w-4 h-4" />
                <span>{submitting ? '초를 밝히는 중...' : '초를 밝히고 기도 봉헌하기'}</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E1D8] dark:border-[#2C2924] pb-4">
              <h3 className="font-editorial text-xl font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
                함께 밝힌 기도의 등불 ({filteredPrayers.length})
              </h3>

              <div className="flex flex-wrap items-center gap-1 rounded-md bg-[#EFECE4] dark:bg-[#1B1916] p-1">
                {(['전체', ...CATEGORIES] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFilterCat(cat)}
                    className={`px-2.5 py-1 text-xs rounded cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                      filterCat === cat
                        ? 'bg-[#FAF9F6] dark:bg-[#2A2721] text-[#1C1B18] dark:text-[#EDEAE2] font-medium'
                        : 'text-[#6E6A63] dark:text-[#969085] hover:text-[#1C1B18] dark:hover:text-[#EDEAE2]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {filteredPrayers.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#6E6A63] dark:text-[#969085]">
                선택한 구분의 기도 지향이 아직 없습니다. 첫 번째 초를 밝혀 보세요.
              </div>
            ) : (
              <div className="divide-y divide-[#E5E1D8] dark:divide-[#2C2924]">
                {filteredPrayers.map((item) => {
                  const joined = Boolean(amenedIds[item.id]);
                  return (
                    <article key={item.id} className="py-5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6E6A63] dark:text-[#969085]">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
                            {item.author}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{item.category}</span>
                          {item.blessedByPriest && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-[#7C5A3C] dark:text-[#C59F61]">
                                사제 미사 기억됨
                              </span>
                            </>
                          )}
                        </div>
                        <span className="tabular-nums">
                          {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                      </div>

                      <p className="text-[15px] leading-[1.8] text-[#2B2925] dark:text-[#DAD5CB]">
                        {item.intention}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <span className="inline-flex items-center gap-1.5 text-xs text-[#9E7B42]">
                          <Flame className="w-3.5 h-3.5" />
                          <span>봉헌 초 켜짐</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleAmen(item.id)}
                          disabled={joined}
                          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors cursor-pointer tabular-nums ${
                            joined
                              ? 'border-[#9E7B42] bg-[#9E7B42]/10 text-[#7C5A3C] dark:text-[#C59F61]'
                              : 'border-[#D4CFC4] dark:border-[#3A3630] text-[#5C5852] dark:text-[#B5B0A6] hover:border-[#9E7B42] hover:text-[#1C1B18] dark:hover:text-[#EDEAE2]'
                          }`}
                        >
                          <span>{joined ? '함께 기도했습니다' : '함께 기도하기 (아멘)'}</span>
                          <span className="font-mono">{item.amenCount}</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
