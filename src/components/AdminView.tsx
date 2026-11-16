import { useState } from 'react';
import { Check, Lock, Plus, Trash2 } from 'lucide-react';
import {
  createMass,
  createMeditation,
  createNotice,
  deleteMass,
  deleteMeditation,
  deleteNotice,
  deletePrayer,
  toggleBlessPrayer,
  updateSpaceStatus,
  verifyAdminPasscode,
} from '../services/sanctuaryApi';
import type {
  MassSchedule,
  NoticeCategory,
  PrayerCategory,
  SanctuaryPayload,
  SanctuarySpace,
} from '../types';

interface AdminViewProps {
  data: SanctuaryPayload;
  onDataChange: (next: SanctuaryPayload) => void;
}

type AdminTab = 'meditations' | 'prayers' | 'masses' | 'notices';

export function AdminView({ data, onDataChange }: AdminViewProps) {
  const [unlocked, setUnlocked] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<AdminTab>('meditations');
  const [feedback, setFeedback] = useState<string>('');

  // Meditation Form
  const [medTitle, setMedTitle] = useState('');
  const [medDateLabel, setMedDateLabel] = useState('오늘의 특별 묵상');
  const [medTheme, setMedTheme] = useState<PrayerCategory>('평안');
  const [medRef, setMedRef] = useState('');
  const [medScripture, setMedScripture] = useState('');
  const [medReflection, setMedReflection] = useState('');
  const [medPrayer, setMedPrayer] = useState('');

  // Mass Form
  const [massGroup, setMassGroup] = useState<MassSchedule['dayGroup']>('주일 미사');
  const [massTime, setMassTime] = useState('');
  const [massTitle, setMassTitle] = useState('');
  const [massLocation, setMassLocation] = useState('대성전');
  const [massNote, setMassNote] = useState('');

  // Notice Form
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeCat, setNoticeCat] = useState<NoticeCategory>('본당 소식');
  const [noticeSummary, setNoticeSummary] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticePinned, setNoticePinned] = useState(false);

  const notify = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(''), 3000);
  };

  const handleVerify = async (codeToUse: string) => {
    setAuthError('');
    try {
      const result = await verifyAdminPasscode(codeToUse);
      if (!result.ok) {
        setAuthError(result.error || '사목실 인증에 실패했습니다.');
        return;
      }
      setUnlocked(true);
    } catch {
      setAuthError('서버와 연결할 수 없습니다.');
    }
  };

  const handleAddMeditation = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await createMeditation({
      liturgicalTitle: medTitle,
      dateLabel: medDateLabel,
      theme: medTheme,
      scriptureRef: medRef,
      scriptureText: medScripture,
      reflection: medReflection,
      prayerText: medPrayer,
    });
    if (created) {
      onDataChange({ ...data, dailyMeditations: [created, ...data.dailyMeditations] });
      setMedTitle('');
      setMedRef('');
      setMedScripture('');
      setMedReflection('');
      setMedPrayer('');
      notify('새 묵상 말씀과 기도문이 등록되었습니다.');
    }
  };

  const handleDeleteMeditation = async (id: string) => {
    if (await deleteMeditation(id)) {
      onDataChange({
        ...data,
        dailyMeditations: data.dailyMeditations.filter((m) => m.id !== id),
      });
      notify('묵상 항목이 삭제되었습니다.');
    }
  };

  const handleToggleBless = async (id: string) => {
    const updated = await toggleBlessPrayer(id);
    if (updated) {
      onDataChange({
        ...data,
        prayers: data.prayers.map((p) => (p.id === id ? updated : p)),
      });
      notify('사제 미사 기억 상태가 변경되었습니다.');
    }
  };

  const handleDeletePrayer = async (id: string) => {
    if (await deletePrayer(id)) {
      onDataChange({
        ...data,
        prayers: data.prayers.filter((p) => p.id !== id),
      });
      notify('기도 지향이 정리되었습니다.');
    }
  };

  const handleAddMass = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await createMass({
      dayGroup: massGroup,
      time: massTime,
      title: massTitle,
      location: massLocation,
      note: massNote,
    });
    if (created) {
      onDataChange({ ...data, masses: [...data.masses, created] });
      setMassTime('');
      setMassTitle('');
      setMassNote('');
      notify('새 미사·성사 일정이 추가되었습니다.');
    }
  };

  const handleDeleteMass = async (id: string) => {
    if (await deleteMass(id)) {
      onDataChange({
        ...data,
        masses: data.masses.filter((m) => m.id !== id),
      });
      notify('미사 일정이 삭제되었습니다.');
    }
  };

  const handleAddNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await createNotice({
      title: noticeTitle,
      category: noticeCat,
      summary: noticeSummary,
      content: noticeContent,
      pinned: noticePinned,
    });
    if (created) {
      onDataChange({ ...data, notices: [created, ...data.notices] });
      setNoticeTitle('');
      setNoticeSummary('');
      setNoticeContent('');
      setNoticePinned(false);
      notify('새 본당 소식이 게시되었습니다.');
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (await deleteNotice(id)) {
      onDataChange({
        ...data,
        notices: data.notices.filter((n) => n.id !== id),
      });
      notify('본당 공지가 삭제되었습니다.');
    }
  };

  const handleToggleSpace = async (space: SanctuarySpace) => {
    const nextOpen = !space.isOpen;
    const updated = await updateSpaceStatus(space.id, {
      isOpen: nextOpen,
      statusNote: nextOpen ? '개방 중 · 순례객 환영' : '성전 정비 및 정숙 시간',
    });
    if (updated) {
      onDataChange({
        ...data,
        spaces: data.spaces.map((s) => (s.id === space.id ? updated : s)),
      });
      notify(`${space.name} 개방 상태가 변경되었습니다.`);
    }
  };

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-20 flex justify-center">
        <div className="w-full max-w-md rounded-lg border border-[#E5E1D8] dark:border-[#2C2924] bg-[#F3F1EC] dark:bg-[#1B1916] p-8 space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs text-[#7C5A3C] dark:text-[#C59F61]">
              <Lock className="w-3.5 h-3.5" />
              <span>PARISH OFFICE CONSOLE</span>
            </div>
            <h1 className="font-editorial text-2xl font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
              본당 사목 관리 플랫폼
            </h1>
            <p className="text-sm leading-relaxed text-[#5C5852] dark:text-[#B5B0A6]">
              오늘의 말씀, 미사 시간표, 본당 공지, 봉헌된 기도 지향 및 성당 공간 개방 상태를
              관리하는 사목실 전용 공간입니다.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleVerify(passcode);
            }}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="admin-passcode"
                className="block text-xs text-[#6E6A63] dark:text-[#A39E93] mb-1.5"
              >
                사목실 인증 코드 (체험 기본 코드: 1225)
              </label>
              <input
                id="admin-passcode"
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="1225"
                className="w-full rounded-md border border-[#D4CFC4] dark:border-[#3A3630] bg-[#FAF9F6] dark:bg-[#141311] px-3.5 py-2.5 text-sm text-[#1C1B18] dark:text-[#EDEAE2] focus:outline-none focus:border-[#9E7B42]"
              />
            </div>

            {authError && (
              <p className="text-xs text-[#9E3B33] dark:text-[#E27D74]">{authError}</p>
            )}

            <div className="flex flex-col gap-2.5">
              <button
                type="submit"
                className="w-full rounded-md bg-[#1C1B18] dark:bg-[#9E7B42] px-4 py-2.5 text-sm font-medium text-[#F8F7F4] dark:text-[#141311] cursor-pointer hover:bg-[#33312C] dark:hover:bg-[#B38E52]"
              >
                사목 관리실 열기
              </button>
              <button
                type="button"
                onClick={() => void handleVerify('1225')}
                className="w-full rounded-md border border-[#D4CFC4] dark:border-[#3A3630] px-4 py-2.5 text-xs font-medium text-[#5C5852] dark:text-[#B5B0A6] cursor-pointer hover:bg-[#EAE6DC] dark:hover:bg-[#24211D]"
              >
                체험용 관리자 바로 입장 (코드 1225 자동 입력)
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const totalAmens = data.prayers.reduce((sum, p) => sum + p.amenCount, 0);

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12 md:py-16 space-y-12">
      {/* Console Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E5E1D8] dark:border-[#2C2924] pb-6">
        <div className="space-y-1.5">
          <p className="text-xs tracking-widest text-[#7C5A3C] dark:text-[#C59F61]">
            PARISH MANAGEMENT CONSOLE · 본당 사목 관리
          </p>
          <h1 className="font-editorial text-3xl font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
            성 루카 성당 운영 현황
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {feedback && (
            <span className="text-xs text-[#2D6A4F] dark:text-[#74C69D]">{feedback}</span>
          )}
          <button
            type="button"
            onClick={() => setUnlocked(false)}
            className="rounded-md border border-[#D4CFC4] dark:border-[#3A3630] px-3.5 py-2 text-xs text-[#5C5852] dark:text-[#A39E93] cursor-pointer hover:text-[#1C1B18] dark:hover:text-[#EDEAE2]"
          >
            관리실 잠그기
          </button>
        </div>
      </div>

      {/* Summary KPI Grid (Single-level hairline bordered strip) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-[#E5E1D8] dark:border-[#2C2924] rounded-lg divide-y lg:divide-y-0 lg:divide-x divide-[#E5E1D8] dark:divide-[#2C2924] bg-[#F3F1EC] dark:bg-[#1B1916]">
        <div className="p-5 space-y-1">
          <div className="text-xs text-[#6E6A63] dark:text-[#969085]">봉헌된 기도·촛불</div>
          <div className="font-mono text-2xl font-medium tabular-nums text-[#1C1B18] dark:text-[#EDEAE2]">
            {data.prayers.length}
          </div>
        </div>
        <div className="p-5 space-y-1">
          <div className="text-xs text-[#6E6A63] dark:text-[#969085]">함께 바친 아멘 응답</div>
          <div className="font-mono text-2xl font-medium tabular-nums text-[#1C1B18] dark:text-[#EDEAE2]">
            {totalAmens}
          </div>
        </div>
        <div className="p-5 space-y-1">
          <div className="text-xs text-[#6E6A63] dark:text-[#969085]">등록된 묵상·말씀</div>
          <div className="font-mono text-2xl font-medium tabular-nums text-[#1C1B18] dark:text-[#EDEAE2]">
            {data.dailyMeditations.length}
          </div>
        </div>
        <div className="p-5 space-y-1">
          <div className="text-xs text-[#6E6A63] dark:text-[#969085]">미사·공지 등록</div>
          <div className="font-mono text-2xl font-medium tabular-nums text-[#1C1B18] dark:text-[#EDEAE2]">
            {data.masses.length + data.notices.length}
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex flex-wrap items-center gap-1 rounded-md bg-[#EFECE4] dark:bg-[#1B1916] p-1 w-fit">
        {[
          { id: 'meditations' as const, label: '오늘의 말씀·기도 관리' },
          { id: 'prayers' as const, label: '기도 지향·사제 기억' },
          { id: 'masses' as const, label: '미사·성사 시간표' },
          { id: 'notices' as const, label: '본당 공지·공간 상태' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 text-xs rounded cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
              activeTab === tab.id
                ? 'bg-[#FAF9F6] dark:bg-[#2A2721] text-[#1C1B18] dark:text-[#EDEAE2] font-medium'
                : 'text-[#6E6A63] dark:text-[#969085] hover:text-[#1C1B18] dark:hover:text-[#EDEAE2]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Meditations */}
      {activeTab === 'meditations' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <form
            onSubmit={handleAddMeditation}
            className="lg:col-span-5 rounded-lg border border-[#E5E1D8] dark:border-[#2C2924] bg-[#F3F1EC] dark:bg-[#1B1916] p-6 space-y-4"
          >
            <h2 className="font-editorial text-xl font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
              새 오늘의 말씀·기도 등록
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={medDateLabel}
                onChange={(e) => setMedDateLabel(e.target.value)}
                placeholder="전례일 구분"
                className="rounded-md border border-[#D4CFC4] dark:border-[#3A3630] bg-[#FAF9F6] dark:bg-[#141311] px-3 py-2 text-sm text-[#1C1B18] dark:text-[#EDEAE2]"
              />
              <select
                value={medTheme}
                onChange={(e) => setMedTheme(e.target.value as PrayerCategory)}
                className="rounded-md border border-[#D4CFC4] dark:border-[#3A3630] bg-[#FAF9F6] dark:bg-[#141311] px-3 py-2 text-sm text-[#1C1B18] dark:text-[#EDEAE2]"
              >
                {(['평안', '위로', '치유', '가족', '감사', '성찰'] as PrayerCategory[]).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="text"
              required
              value={medTitle}
              onChange={(e) => setMedTitle(e.target.value)}
              placeholder="묵상 제목 (예: 고요한 새벽의 초대)"
              className="w-full rounded-md border border-[#D4CFC4] dark:border-[#3A3630] bg-[#FAF9F6] dark:bg-[#141311] px-3 py-2 text-sm text-[#1C1B18] dark:text-[#EDEAE2]"
            />
            <input
              type="text"
              required
              value={medRef}
              onChange={(e) => setMedRef(e.target.value)}
              placeholder="성경 출처 (예: 시편 23편 1-3절)"
              className="w-full rounded-md border border-[#D4CFC4] dark:border-[#3A3630] bg-[#FAF9F6] dark:bg-[#141311] px-3 py-2 text-sm text-[#1C1B18] dark:text-[#EDEAE2]"
            />
            <textarea
              required
              rows={2}
              value={medScripture}
              onChange={(e) => setMedScripture(e.target.value)}
              placeholder="성경 구절 본문"
              className="w-full rounded-md border border-[#D4CFC4] dark:border-[#3A3630] bg-[#FAF9F6] dark:bg-[#141311] px-3 py-2 text-sm text-[#1C1B18] dark:text-[#EDEAE2]"
            />
            <textarea
              rows={3}
              value={medReflection}
              onChange={(e) => setMedReflection(e.target.value)}
              placeholder="사목 묵상 해설"
              className="w-full rounded-md border border-[#D4CFC4] dark:border-[#3A3630] bg-[#FAF9F6] dark:bg-[#141311] px-3 py-2 text-sm text-[#1C1B18] dark:text-[#EDEAE2]"
            />
            <textarea
              required
              rows={3}
              value={medPrayer}
              onChange={(e) => setMedPrayer(e.target.value)}
              placeholder="마무리 기도문"
              className="w-full rounded-md border border-[#D4CFC4] dark:border-[#3A3630] bg-[#FAF9F6] dark:bg-[#141311] px-3 py-2 text-sm text-[#1C1B18] dark:text-[#EDEAE2]"
            />
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-[#1C1B18] dark:bg-[#9E7B42] px-4 py-2.5 text-sm font-medium text-[#F8F7F4] dark:text-[#141311] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>말씀과 기도문 게시</span>
            </button>
          </form>

          <div className="lg:col-span-7 divide-y divide-[#E5E1D8] dark:divide-[#2C2924] border-t border-b border-[#E5E1D8] dark:border-[#2C2924]">
            {data.dailyMeditations.map((med) => (
              <div key={med.id} className="py-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-[#6E6A63] dark:text-[#969085]">
                    {med.dateLabel} · {med.theme} · {med.scriptureRef}
                  </div>
                  <div className="text-[15px] font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
                    {med.liturgicalTitle}
                  </div>
                  <p className="text-xs text-[#5C5852] dark:text-[#B5B0A6] line-clamp-2">
                    {med.scriptureText}
                  </p>
                </div>
                {data.dailyMeditations.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteMeditation(med.id)}
                    aria-label={`${med.liturgicalTitle} 삭제`}
                    className="p-2 text-[#6E6A63] hover:text-[#9E3B33] cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Prayer Intentions */}
      {activeTab === 'prayers' && (
        <div className="divide-y divide-[#E5E1D8] dark:divide-[#2C2924] border-t border-b border-[#E5E1D8] dark:border-[#2C2924]">
          {data.prayers.map((p) => (
            <div
              key={p.id}
              className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1 max-w-2xl">
                <div className="text-xs text-[#6E6A63] dark:text-[#969085] tabular-nums">
                  {p.author} · {p.category} · 아멘 {p.amenCount}명
                </div>
                <p className="text-sm text-[#1C1B18] dark:text-[#EDEAE2]">{p.intention}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleBless(p.id)}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                    p.blessedByPriest
                      ? 'border-[#9E7B42] bg-[#9E7B42]/15 text-[#7C5A3C] dark:text-[#C59F61]'
                      : 'border-[#D4CFC4] dark:border-[#3A3630] text-[#5C5852] dark:text-[#A39E93]'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{p.blessedByPriest ? '미사 기억됨' : '미사 기억 표시'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePrayer(p.id)}
                  aria-label="기도 지향 삭제"
                  className="p-2 text-[#6E6A63] hover:text-[#9E3B33] cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Mass Schedule */}
      {activeTab === 'masses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <form
            onSubmit={handleAddMass}
            className="lg:col-span-5 rounded-lg border border-[#E5E1D8] dark:border-[#2C2924] bg-[#F3F1EC] dark:bg-[#1B1916] p-6 space-y-4"
          >
            <h2 className="font-editorial text-xl font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
              미사·고해성사 일정 추가
            </h2>
            <select
              value={massGroup}
              onChange={(e) => setMassGroup(e.target.value as MassSchedule['dayGroup'])}
              className="w-full rounded-md border border-[#D4CFC4] dark:border-[#3A3630] bg-[#FAF9F6] dark:bg-[#141311] px-3 py-2 text-sm text-[#1C1B18] dark:text-[#EDEAE2]"
            >
              <option value="주일 미사">주일 미사</option>
              <option value="토요 특전">토요 특전</option>
              <option value="평일 미사">평일 미사</option>
              <option value="고해성사">고해성사</option>
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={massTime}
                onChange={(e) => setMassTime(e.target.value)}
                placeholder="시간 (예: 19:30)"
                className="rounded-md border border-[#D4CFC4] dark:border-[#3A3630] bg-[#FAF9F6] dark:bg-[#141311] px-3 py-2 text-sm text-[#1C1B18] dark:text-[#EDEAE2]"
              />
              <input
                type="text"
                required
                value={massLocation}
                onChange={(e) => setMassLocation(e.target.value)}
                placeholder="장소 (예: 대성전)"
                className="rounded-md border border-[#D4CFC4] dark:border-[#3A3630] bg-[#FAF9F6] dark:bg-[#141311] px-3 py-2 text-sm text-[#1C1B18] dark:text-[#EDEAE2]"
              />
            </div>
            <input
              type="text"
              required
              value={massTitle}
              onChange={(e) => setMassTitle(e.target.value)}
              placeholder="미사 명칭 (예: 성체조배와 저녁 미사)"
              className="w-full rounded-md border border-[#D4CFC4] dark:border-[#3A3630] bg-[#FAF9F6] dark:bg-[#141311] px-3 py-2 text-sm text-[#1C1B18] dark:text-[#EDEAE2]"
            />
            <input
              type="text"
              value={massNote}
              onChange={(e) => setMassNote(e.target.value)}
              placeholder="안내 문구 (선택)"
              className="w-full rounded-md border border-[#D4CFC4] dark:border-[#3A3630] bg-[#FAF9F6] dark:bg-[#141311] px-3 py-2 text-sm text-[#1C1B18] dark:text-[#EDEAE2]"
            />
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-[#1C1B18] dark:bg-[#9E7B42] px-4 py-2.5 text-sm font-medium text-[#F8F7F4] dark:text-[#141311] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>일정 추가</span>
            </button>
          </form>

          <div className="lg:col-span-7 divide-y divide-[#E5E1D8] dark:divide-[#2C2924] border-t border-b border-[#E5E1D8] dark:border-[#2C2924]">
            {data.masses.map((m) => (
              <div key={m.id} className="py-3.5 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-[#7C5A3C] dark:text-[#C59F61] tabular-nums">
                    {m.dayGroup} · {m.time} · {m.location}
                  </div>
                  <div className="text-sm font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
                    {m.title}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteMass(m.id)}
                  aria-label={`${m.title} 삭제`}
                  className="p-2 text-[#6E6A63] hover:text-[#9E3B33] cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Notices & Sanctuary Spaces */}
      {activeTab === 'notices' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <form
            onSubmit={handleAddNotice}
            className="lg:col-span-5 rounded-lg border border-[#E5E1D8] dark:border-[#2C2924] bg-[#F3F1EC] dark:bg-[#1B1916] p-6 space-y-4"
          >
            <h2 className="font-editorial text-xl font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
              본당 공지사항 작성
            </h2>
            <select
              value={noticeCat}
              onChange={(e) => setNoticeCat(e.target.value as NoticeCategory)}
              className="w-full rounded-md border border-[#D4CFC4] dark:border-[#3A3630] bg-[#FAF9F6] dark:bg-[#141311] px-3 py-2 text-sm text-[#1C1B18] dark:text-[#EDEAE2]"
            >
              <option value="본당 소식">본당 소식</option>
              <option value="전례·성사">전례·성사</option>
              <option value="피정·치유">피정·치유</option>
            </select>
            <input
              type="text"
              required
              value={noticeTitle}
              onChange={(e) => setNoticeTitle(e.target.value)}
              placeholder="공지 제목"
              className="w-full rounded-md border border-[#D4CFC4] dark:border-[#3A3630] bg-[#FAF9F6] dark:bg-[#141311] px-3 py-2 text-sm text-[#1C1B18] dark:text-[#EDEAE2]"
            />
            <textarea
              required
              rows={2}
              value={noticeSummary}
              onChange={(e) => setNoticeSummary(e.target.value)}
              placeholder="요약 문구 (목록 노출용)"
              className="w-full rounded-md border border-[#D4CFC4] dark:border-[#3A3630] bg-[#FAF9F6] dark:bg-[#141311] px-3 py-2 text-sm text-[#1C1B18] dark:text-[#EDEAE2]"
            />
            <textarea
              rows={4}
              value={noticeContent}
              onChange={(e) => setNoticeContent(e.target.value)}
              placeholder="본문 상세 안내"
              className="w-full rounded-md border border-[#D4CFC4] dark:border-[#3A3630] bg-[#FAF9F6] dark:bg-[#141311] px-3 py-2 text-sm text-[#1C1B18] dark:text-[#EDEAE2]"
            />
            <label className="flex items-center gap-2 text-xs text-[#5C5852] dark:text-[#B5B0A6] cursor-pointer">
              <input
                type="checkbox"
                checked={noticePinned}
                onChange={(e) => setNoticePinned(e.target.checked)}
                className="accent-[#9E7B42]"
              />
              <span>주요 안내로 표시</span>
            </label>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-[#1C1B18] dark:bg-[#9E7B42] px-4 py-2.5 text-sm font-medium text-[#F8F7F4] dark:text-[#141311] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>본당 공지 게시</span>
            </button>
          </form>

          <div className="lg:col-span-7 space-y-10">
            <div className="space-y-3">
              <h3 className="font-editorial text-xl font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
                등록된 본당 공지 ({data.notices.length})
              </h3>
              <div className="divide-y divide-[#E5E1D8] dark:divide-[#2C2924] border-t border-b border-[#E5E1D8] dark:border-[#2C2924]">
                {data.notices.map((n) => (
                  <div key={n.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-[#6E6A63] dark:text-[#969085] tabular-nums">
                        {n.category} · {n.date}
                      </div>
                      <div className="text-sm font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
                        {n.title}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteNotice(n.id)}
                      aria-label={`${n.title} 삭제`}
                      className="p-2 text-[#6E6A63] hover:text-[#9E3B33] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-editorial text-xl font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
                성당 공간별 개방 상태 관리
              </h3>
              <div className="divide-y divide-[#E5E1D8] dark:divide-[#2C2924] border-t border-b border-[#E5E1D8] dark:border-[#2C2924]">
                {data.spaces.map((space) => (
                  <div key={space.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
                        {space.orderLabel}. {space.name}
                      </div>
                      <div className="text-xs text-[#6E6A63] dark:text-[#969085]">
                        {space.statusNote}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleSpace(space)}
                      className={`rounded-md border px-3 py-1.5 text-xs cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                        space.isOpen
                          ? 'border-[#2D6A4F] text-[#2D6A4F] dark:border-[#74C69D] dark:text-[#74C69D]'
                          : 'border-[#D4CFC4] dark:border-[#3A3630] text-[#6E6A63] dark:text-[#969085]'
                      }`}
                    >
                      {space.isOpen ? '개방 중 (전환)' : '정비·휴식 (전환)'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
