import { ArrowRight, Compass, Flame, Volume2 } from 'lucide-react';
import type {
  ActivePilgrim,
  AppSection,
  DailyMeditation,
  MassSchedule,
  ParishNotice,
  PrayerIntention,
} from '../types';
import { SanctuaryImage } from './SanctuaryImage';

interface HomeViewProps {
  todayMeditation: DailyMeditation;
  masses: MassSchedule[];
  notices: ParishNotice[];
  prayers: PrayerIntention[];
  activePilgrims: ActivePilgrim[];
  onNavigate: (section: AppSection) => void;
  onOpenVR: () => void;
}

export function HomeView({
  todayMeditation,
  masses,
  notices,
  prayers,
  activePilgrims,
  onNavigate,
  onOpenVR,
}: HomeViewProps) {
  const sundayMasses = masses.filter((m) => m.dayGroup === '주일 미사').slice(0, 3);
  const pinnedNotices = notices.slice(0, 3);
  const litCandleCount = prayers.filter((p) => p.candleLit).length;

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12 md:py-16 space-y-20">
      {/* 1. Contemplative Editorial Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
        <div className="lg:col-span-5 flex flex-col justify-between py-2">
          <div>
            <p className="text-xs tracking-[0.18em] text-[#6E6A63] dark:text-[#A39E93] mb-5">
              ST. LUKE SANCTUARY · 산사의 고요를 품은 성전
            </p>
            <h1
              className="font-editorial text-[clamp(2.1rem,3.6vw,3.15rem)] font-medium leading-[1.28] text-[#1C1B18] dark:text-[#EDEAE2]"
              style={{ textWrap: 'balance' }}
            >
              잠시 멈추어,
              <br />
              침묵 속에서 숨을 고르는 곳
            </h1>
            <p className="mt-6 text-[15px] leading-[1.8] text-[#5C5852] dark:text-[#B5B0A6] max-w-[44ch]">
              바쁜 일상의 걸음을 잠시 늦추고 성당 안 빈 자리에 앉아 보세요. 여러 순례자들이
              조용히 함께 머무는 공간에서 각자 기도하고 초를 밝힌 뒤 평안히 돌아갈 수 있습니다.
            </p>
          </div>

          <div className="mt-10 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onOpenVR}
                className="inline-flex items-center gap-2.5 rounded-md bg-[#1C1B18] dark:bg-[#9E7B42] px-5 py-3 text-sm font-medium text-[#F8F7F4] dark:text-[#141311] whitespace-nowrap shrink-0 cursor-pointer hover:bg-[#33312C] dark:hover:bg-[#B38E52] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9E7B42]"
              >
                <span>가상 성당 순례 VR 보기</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('structure')}
                className="inline-flex items-center gap-2 rounded-md border border-[#D4CFC4] dark:border-[#3A3630] px-4 py-3 text-sm font-medium text-[#1C1B18] dark:text-[#EDEAE2] whitespace-nowrap shrink-0 cursor-pointer hover:bg-[#EFECE4] dark:hover:bg-[#1F1D1A] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9E7B42]"
              >
                <Compass className="w-4 h-4 text-[#7C5A3C] dark:text-[#C59F61]" />
                <span>성당 구조 보기</span>
              </button>
            </div>

            <div className="pt-5 border-t border-[#E5E1D8] dark:border-[#2C2924] flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-[#6E6A63] dark:text-[#A39E93] tabular-nums">
              <span>현재 성당 안 순례자 {activePilgrims.length}명</span>
              <span aria-hidden="true">·</span>
              <span>성전 개방 06:00 – 21:00</span>
              <span aria-hidden="true">·</span>
              <span>봉헌 초 {litCandleCount}자루</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <figure className="h-full flex flex-col">
            <div className="relative overflow-hidden rounded-lg border border-[#E5E1D8] dark:border-[#2C2924] bg-[#EFECE4] dark:bg-[#1C1A17] h-[340px] sm:h-[440px] lg:h-full lg:min-h-[470px]">
              <SanctuaryImage
                imageKey="courtyard"
                alt="이른 아침 물안개가 내려앉은 고요의 성당 아트리움과 돌 수반"
                className="w-full h-full object-cover"
              />
            </div>
            <figcaption className="mt-2.5 text-xs text-[#6E6A63] dark:text-[#969085] font-editorial italic">
              Fig. 01 — 만남의 아트리움과 돌 수반, 이른 아침 산안개 속의 전이 공간
            </figcaption>
          </figure>
        </div>
      </section>

      {/* 2. Today's Daily Scripture & Healing Anchor */}
      <section className="border-t border-b border-[#E5E1D8] dark:border-[#2C2924] py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-4 space-y-3">
            <p className="text-xs tracking-widest text-[#7C5A3C] dark:text-[#C59F61]">
              오늘의 말씀과 묵상
            </p>
            <h2 className="font-editorial text-2xl sm:text-[28px] font-medium leading-snug text-[#1C1B18] dark:text-[#EDEAE2]">
              {todayMeditation.liturgicalTitle}
            </h2>
            <p className="text-[13px] text-[#6E6A63] dark:text-[#A39E93]">
              {todayMeditation.dateLabel} · {todayMeditation.theme}
            </p>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <blockquote className="font-editorial text-xl sm:text-2xl leading-[1.7] text-[#1C1B18] dark:text-[#EDEAE2]">
              “{todayMeditation.scriptureText}”
            </blockquote>
            <p className="text-sm text-[#6E6A63] dark:text-[#A39E93]">
              — {todayMeditation.scriptureRef}
            </p>
            <p className="text-[15px] leading-[1.85] text-[#4A4742] dark:text-[#B5B0A6] max-w-prose">
              {todayMeditation.reflection}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-6 text-sm">
              <button
                type="button"
                onClick={() => onNavigate('prayer')}
                className="inline-flex items-center gap-2 font-medium text-[#7C5A3C] dark:text-[#C59F61] hover:underline cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>성당에 들어가 묵상 음악과 기도하기</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('prayer')}
                className="inline-flex items-center gap-2 font-medium text-[#1C1B18] dark:text-[#EDEAE2] hover:underline cursor-pointer"
              >
                <Flame className="w-4 h-4 text-[#9E7B42]" />
                <span>초 봉헌 제대 살펴보기</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Architectural Sanctuary Preview (2-Column Editorial Split) */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs tracking-widest text-[#6E6A63] dark:text-[#A39E93] mb-2">
              성당의 공간과 동선
            </p>
            <h2 className="font-editorial text-2xl sm:text-3xl font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
              침묵에서 평화로 이어지는 여섯 개의 공간
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('structure')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#7C5A3C] dark:text-[#C59F61] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>성당 평면도 및 구조 안내</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          <article
            onClick={() => onNavigate('structure')}
            className="group cursor-pointer flex flex-col justify-between rounded-lg border border-[#E5E1D8] dark:border-[#2C2924] bg-[#F3F1EC] dark:bg-[#1B1916] overflow-hidden hover:border-[#C7BFB0] dark:hover:border-[#494339] transition-colors duration-200"
          >
            <div className="h-64 overflow-hidden">
              <SanctuaryImage
                imageKey="nave"
                alt="대성전 라임스톤 제대와 고측창의 자연 채광"
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
              />
            </div>
            <div className="p-7 space-y-2.5">
              <div className="text-xs text-[#6E6A63] dark:text-[#A39E93]">
                02 · 대성전 주 제대 · 고측창 자연광
              </div>
              <h3 className="font-editorial text-xl font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
                빛과 돌이 빚어내는 고요한 대성전
              </h3>
              <p className="text-sm leading-relaxed text-[#5C5852] dark:text-[#B5B0A6]">
                불필요한 장식을 덜어낸 석조 벽면과 목조 트러스 아래, 하루의 빛이 천천히 제대를
                비추며 기도의 몰입을 돕습니다.
              </p>
            </div>
          </article>

          <article
            onClick={() => onNavigate('structure')}
            className="group cursor-pointer flex flex-col justify-between rounded-lg border border-[#E5E1D8] dark:border-[#2C2924] bg-[#F3F1EC] dark:bg-[#1B1916] overflow-hidden hover:border-[#C7BFB0] dark:hover:border-[#494339] transition-colors duration-200"
          >
            <div className="h-64 overflow-hidden">
              <SanctuaryImage
                imageKey="cloister"
                alt="소나무 숲과 맞닿은 회랑 정원 산책로"
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
              />
            </div>
            <div className="p-7 space-y-2.5">
              <div className="text-xs text-[#6E6A63] dark:text-[#A39E93]">
                06 · 회랑 정원 · 걷기 묵상 산책로
              </div>
              <h3 className="font-editorial text-xl font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
                소나무 회랑을 거닐며 마음을 비우는 시간
              </h3>
              <p className="text-sm leading-relaxed text-[#5C5852] dark:text-[#B5B0A6]">
                성전 기도를 마친 뒤 일상으로 돌아가기 전, 이끼와 나무 그늘이 이어진 84m 회랑을
                걸으며 내면의 속도를 가다듬습니다.
              </p>
            </div>
          </article>
        </div>
      </section>

      {/* 4. Mass Timetable & Parish Notices Broadsheet */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-4">
        <div className="lg:col-span-5 space-y-5">
          <div className="flex items-end justify-between border-b border-[#E5E1D8] dark:border-[#2C2924] pb-3">
            <h2 className="font-editorial text-2xl font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
              주일 미사 및 성사 시간
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('notices')}
              className="text-xs font-medium text-[#7C5A3C] dark:text-[#C59F61] hover:underline cursor-pointer"
            >
              전체 시간표
            </button>
          </div>

          <div className="divide-y divide-[#E5E1D8] dark:divide-[#2C2924]">
            {sundayMasses.map((mass) => (
              <div key={mass.id} className="py-3.5 flex items-baseline justify-between gap-4">
                <div>
                  <div className="text-[15px] font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
                    {mass.title}
                  </div>
                  <div className="text-xs text-[#6E6A63] dark:text-[#A39E93] mt-0.5">
                    {mass.location} · {mass.note}
                  </div>
                </div>
                <span className="font-mono text-sm tabular-nums text-[#7C5A3C] dark:text-[#C59F61] shrink-0">
                  {mass.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 space-y-5">
          <div className="flex items-end justify-between border-b border-[#E5E1D8] dark:border-[#2C2924] pb-3">
            <h2 className="font-editorial text-2xl font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
              본당 소식과 피정 안내
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('notices')}
              className="text-xs font-medium text-[#7C5A3C] dark:text-[#C59F61] hover:underline cursor-pointer"
            >
              모두 보기
            </button>
          </div>

          <div className="divide-y divide-[#E5E1D8] dark:divide-[#2C2924]">
            {pinnedNotices.map((notice) => (
              <button
                key={notice.id}
                type="button"
                onClick={() => onNavigate('notices')}
                className="w-full py-4 text-left group cursor-pointer block"
              >
                <div className="flex items-center gap-2 text-xs text-[#6E6A63] dark:text-[#A39E93] mb-1 tabular-nums">
                  <span>{notice.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{notice.date}</span>
                </div>
                <div className="text-[16px] font-medium text-[#1C1B18] dark:text-[#EDEAE2] group-hover:text-[#7C5A3C] dark:group-hover:text-[#C59F61] transition-colors">
                  {notice.title}
                </div>
                <p className="mt-1 text-sm text-[#5C5852] dark:text-[#B5B0A6] line-clamp-2">
                  {notice.summary}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
