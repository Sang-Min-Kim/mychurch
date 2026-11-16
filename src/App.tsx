import { useCallback, useEffect, useRef, useState } from 'react';
import { AdminView } from './components/AdminView';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { NoticesView } from './components/NoticesView';
import {
  PrayerMeditationView,
  type SanctuaryVisitState,
} from './components/PrayerMeditationView';
import { StructureView } from './components/StructureView';
import {
  createSanctuaryRealtime,
  loadSanctuary,
  type RealtimeBridge,
} from './services/sanctuaryApi';
import type {
  ActivePilgrim,
  AppSection,
  PrayerIntention,
  PrayerPosture,
  SanctuaryPayload,
  SanctuaryServerEvent,
  SanctuaryZoneId,
} from './types';

export default function App() {
  const [activeSection, setActiveSection] = useState<AppSection>('home');
  const [prayerTab, setPrayerTab] = useState<'vr' | 'sanctuary'>('vr');
  const [isVigilDark, setIsVigilDark] = useState<boolean>(false);
  const [data, setData] = useState<SanctuaryPayload | null>(null);
  const [activePilgrims, setActivePilgrims] = useState<ActivePilgrim[]>([]);
  const [visitState, setVisitState] = useState<SanctuaryVisitState>('outside');
  const [myPilgrim, setMyPilgrim] = useState<ActivePilgrim | null>(null);
  const [lastStaySeconds, setLastStaySeconds] = useState<number>(0);
  const [realtimeMode, setRealtimeMode] = useState<'edge-api' | 'static-local' | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const realtimeRef = useRef<RealtimeBridge | null>(null);
  const myPilgrimRef = useRef<ActivePilgrim | null>(null);

  useEffect(() => {
    myPilgrimRef.current = myPilgrim;
  }, [myPilgrim]);

  const fetchSanctuary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const loaded = await loadSanctuary();
      setData({
        dailyMeditations: loaded.dailyMeditations,
        prayers: loaded.prayers,
        masses: loaded.masses,
        notices: loaded.notices,
        spaces: loaded.spaces,
      });
      setActivePilgrims(loaded.activePilgrims);
      setRealtimeMode(loaded.mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : '연결 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSanctuary();
  }, [fetchSanctuary]);

  useEffect(() => {
    if (!realtimeMode) return;
    const bridge = createSanctuaryRealtime(
      realtimeMode,
      () => myPilgrimRef.current,
      (msg: SanctuaryServerEvent) => {
        if (msg.type === 'presence:sync') {
          setActivePilgrims(msg.pilgrims);
        } else if (msg.type === 'prayer:created') {
          setData((prev) => {
            if (!prev) return prev;
            if (prev.prayers.some((p) => p.id === msg.prayer.id)) return prev;
            return { ...prev, prayers: [msg.prayer, ...prev.prayers] };
          });
        } else if (msg.type === 'prayer:updated') {
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  prayers: prev.prayers.map((p) =>
                    p.id === msg.prayer.id ? msg.prayer : p
                  ),
                }
              : prev
          );
        } else if (msg.type === 'prayer:deleted') {
          setData((prev) =>
            prev
              ? { ...prev, prayers: prev.prayers.filter((p) => p.id !== msg.id) }
              : prev
          );
        }
      }
    );
    realtimeRef.current = bridge;
    return () => {
      bridge.dispose();
      realtimeRef.current = null;
    };
  }, [realtimeMode]);

  useEffect(() => {
    if (isVigilDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isVigilDark]);

  const handleNavigate = (section: AppSection) => {
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEnterSanctuary = (payload: {
    name: string;
    zone: SanctuaryZoneId;
    seatIndex: number;
    posture: PrayerPosture;
  }) => {
    const pilgrim: ActivePilgrim = {
      id: `pilgrim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: payload.name,
      zone: payload.zone,
      seatIndex: payload.seatIndex,
      posture: payload.posture,
      enteredAt: new Date().toISOString(),
    };
    myPilgrimRef.current = pilgrim;
    setMyPilgrim(pilgrim);
    setVisitState('inside');
    setActiveSection('prayer');
    realtimeRef.current?.sendEnter(pilgrim);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMoveInSanctuary = (payload: {
    zone: SanctuaryZoneId;
    seatIndex: number;
    posture?: PrayerPosture;
  }) => {
    setMyPilgrim((prev) => {
      if (!prev) return prev;
      const next: ActivePilgrim = {
        ...prev,
        zone: payload.zone,
        seatIndex: payload.seatIndex,
        posture: payload.posture || prev.posture,
      };
      realtimeRef.current?.sendMove({
        zone: next.zone,
        seatIndex: next.seatIndex,
        posture: next.posture,
      });
      return next;
    });
  };

  const handleLeaveSanctuary = () => {
    if (myPilgrim) {
      const elapsed = Math.max(
        1,
        Math.floor((Date.now() - new Date(myPilgrim.enteredAt).getTime()) / 1000)
      );
      setLastStaySeconds(elapsed);
    }
    realtimeRef.current?.sendLeave(myPilgrim?.id);
    myPilgrimRef.current = null;
    setMyPilgrim(null);
    setVisitState('departed');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const todayDayIndex = new Date().getDay();
  const todayMeditation =
    data?.dailyMeditations.find((m) => m.dayIndex === todayDayIndex) ||
    data?.dailyMeditations[0];

  const handlePrayerCreated = (created: PrayerIntention) => {
    setData((prev) => {
      if (!prev) return prev;
      if (prev.prayers.some((p) => p.id === created.id)) return prev;
      return { ...prev, prayers: [created, ...prev.prayers] };
    });
  };

  const handlePrayerAmen = (updated: PrayerIntention) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            prayers: prev.prayers.map((p) => (p.id === updated.id ? updated : p)),
          }
        : prev
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F4] dark:bg-[#141311] text-[#1C1B18] dark:text-[#EDEAE2] transition-colors duration-200">
      <Header
        activeSection={activeSection}
        isInsideSanctuary={visitState === 'inside'}
        onNavigate={handleNavigate}
        onQuickEnterOrFocus={() => {
          setPrayerTab('sanctuary');
          handleNavigate('prayer');
        }}
      />

      <main className="flex-1">
        {loading ? (
          <div className="mx-auto max-w-[1200px] px-6 py-24 space-y-6">
            <div className="h-8 w-64 rounded bg-[#EAE6DC] dark:bg-[#24211D] animate-pulse" />
            <div className="h-64 w-full rounded-lg bg-[#EAE6DC] dark:bg-[#24211D] animate-pulse" />
          </div>
        ) : error || !data || !todayMeditation ? (
          <div className="mx-auto max-w-[1200px] px-6 py-24 text-center space-y-4">
            <p className="text-sm text-[#6E6A63] dark:text-[#A39E93]">
              {error || '성당 정보를 준비하는 중입니다.'}
            </p>
            <button
              type="button"
              onClick={() => void fetchSanctuary()}
              className="rounded-md bg-[#1C1B18] dark:bg-[#9E7B42] px-4 py-2 text-xs font-medium text-[#F8F7F4] dark:text-[#141311] cursor-pointer"
            >
              다시 불러오기
            </button>
          </div>
        ) : (
          <>
            {activeSection === 'home' && (
              <HomeView
                todayMeditation={todayMeditation}
                masses={data.masses}
                notices={data.notices}
                prayers={data.prayers}
                activePilgrims={activePilgrims}
                onNavigate={handleNavigate}
                onOpenVR={() => {
                  setPrayerTab('vr');
                  handleNavigate('prayer');
                }}
              />
            )}

            {activeSection === 'structure' && (
              <StructureView
                spaces={data.spaces}
                onNavigate={(sec) => handleNavigate(sec)}
                onOpenVR={() => {
                  setPrayerTab('vr');
                  handleNavigate('prayer');
                }}
              />
            )}

            {activeSection === 'prayer' && (
              <PrayerMeditationView
                meditations={data.dailyMeditations}
                prayers={data.prayers}
                activePilgrims={activePilgrims}
                visitState={visitState}
                myPilgrim={myPilgrim}
                lastStaySeconds={lastStaySeconds}
                isVigilDark={isVigilDark}
                activeTab={prayerTab}
                onTabChange={setPrayerTab}
                onToggleVigilDark={() => setIsVigilDark((prev) => !prev)}
                onEnterSanctuary={handleEnterSanctuary}
                onMoveInSanctuary={handleMoveInSanctuary}
                onLeaveSanctuary={handleLeaveSanctuary}
                onReturnHome={() => {
                  setVisitState('outside');
                  handleNavigate('home');
                }}
                onPrayerCreated={handlePrayerCreated}
                onPrayerAmen={handlePrayerAmen}
              />
            )}

            {activeSection === 'notices' && (
              <NoticesView masses={data.masses} notices={data.notices} />
            )}

            {activeSection === 'admin' && (
              <AdminView data={data} onDataChange={setData} />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-[#E5E1D8] dark:border-[#2C2924] mt-12">
        <div className="mx-auto max-w-[1200px] px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-xs text-[#6E6A63] dark:text-[#969085]">
          <div className="space-y-1">
            <p className="font-editorial text-sm font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
              고요의 성당 · 천주교 성 루카 본당
            </p>
            <p>경기도 양평군 산수길 42 · 성전 개방 매일 06:00 – 21:00 · 사목실 031-772-0124</p>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => handleNavigate('structure')}
              className="hover:text-[#1C1B18] dark:hover:text-[#EDEAE2] cursor-pointer"
            >
              성당 구조 안내
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('prayer')}
              className="hover:text-[#1C1B18] dark:hover:text-[#EDEAE2] cursor-pointer"
            >
              성당 입장·기도
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('notices')}
              className="hover:text-[#1C1B18] dark:hover:text-[#EDEAE2] cursor-pointer"
            >
              미사 시간표
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('admin')}
              className="hover:text-[#1C1B18] dark:hover:text-[#EDEAE2] cursor-pointer"
            >
              본당 관리
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
