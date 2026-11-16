import { useState } from 'react';
import { ArrowLeft, ArrowRight, Compass } from 'lucide-react';
import type { AppSection, SanctuarySpace } from '../types';
import { SanctuaryImage } from './SanctuaryImage';

interface StructureViewProps {
  spaces: SanctuarySpace[];
  onNavigate: (section: AppSection, focusCandle?: boolean) => void;
  onOpenVR?: () => void;
}

const HISTORY_TIMELINE = [
  {
    year: '1987',
    title: '산자락 첫 성소와 돌담의 시작',
    detail:
      '도심의 분주함을 벗어난 뒷산 소나무 숲 아래, 신자들과 수도자들이 직접 돌을 쌓아 작은 경당과 종탑을 세우며 첫 미사를 봉헌했습니다.',
  },
  {
    year: '2004',
    title: '라임스톤 대성전과 목조 회랑 중건',
    detail:
      '전통 한옥 처마의 비례와 로마네스크 석조 건축의 단아함을 결합하여 자연광만으로 빛나는 대성전과 84m 걷기 회랑을 완공했습니다.',
  },
  {
    year: '2021',
    title: '누구나 쉬어가는 열린 치유 성전',
    detail:
      '신자뿐 아니라 삶의 쉼표가 필요한 모든 이에게 아트리움과 성체조배실, 온라인 기도실을 상시 개방하는 고요의 사목 플랫폼을 시작했습니다.',
  },
];

export function StructureView({ spaces, onNavigate, onOpenVR }: StructureViewProps) {
  const [selectedId, setSelectedId] = useState<string>(spaces[0]?.id || 'atrium');
  const currentIndex = Math.max(
    0,
    spaces.findIndex((s) => s.id === selectedId)
  );
  const selectedSpace = spaces[currentIndex] || spaces[0];

  if (!selectedSpace) return null;

  const handleStep = (direction: -1 | 1) => {
    const nextIdx = (currentIndex + direction + spaces.length) % spaces.length;
    setSelectedId(spaces[nextIdx].id);
  };

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12 md:py-16 space-y-20">
      {/* 1. Sanctuary Introduction & Architectural Style */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start border-b border-[#E5E1D8] dark:border-[#2C2924] pb-14">
        <div className="lg:col-span-5 space-y-4">
          <p className="text-xs tracking-[0.16em] text-[#7C5A3C] dark:text-[#C59F61]">
            HISTORY &amp; ARCHITECTURE · 성당 소개 및 건축 양식
          </p>
          <h1
            className="font-editorial text-3xl sm:text-4xl font-medium leading-tight text-[#1C1B18] dark:text-[#EDEAE2]"
            style={{ textWrap: 'balance' }}
          >
            자연의 빛과 돌, 그리고 침묵이 빚어낸 성전
          </h1>
          <p className="text-[15px] leading-[1.85] text-[#5C5852] dark:text-[#B5B0A6]">
            고요의 성당(성 루카 본당)은 한국의 산사 건축이 지닌 깊은 여백과 서양 수도원의 석조
            비례가 조화를 이루는 현대 성전입니다. 인위적인 장식을 비워내고 화강석, 라임스톤,
            삼나무의 질감을 그대로 드러내어 성당에 머무는 시간 자체가 하나의 기도가 되도록
            설계되었습니다.
          </p>
          {onOpenVR && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenVR}
                className="inline-flex items-center gap-2 rounded-md bg-[#1C1B18] dark:bg-[#9E7B42] px-4 py-2.5 text-xs font-medium text-[#F8F7F4] dark:text-[#141311] cursor-pointer hover:bg-[#33312C] dark:hover:bg-[#B38E52]"
              >
                <span>3D VR 가상 성당 순례 보기</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-7 divide-y divide-[#E5E1D8] dark:divide-[#2C2924] border-t border-b border-[#E5E1D8] dark:border-[#2C2924]">
          {HISTORY_TIMELINE.map((item) => (
            <div key={item.year} className="py-5 grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-6">
              <div className="sm:col-span-3 font-mono text-sm tabular-nums text-[#7C5A3C] dark:text-[#C59F61]">
                {item.year}
              </div>
              <div className="sm:col-span-9 space-y-1">
                <h2 className="text-[16px] font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
                  {item.title}
                </h2>
                <p className="text-sm leading-relaxed text-[#5C5852] dark:text-[#B5B0A6]">
                  {item.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Interactive Architectural Plan + Virtual Guided Tour */}
      <section className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs tracking-[0.16em] text-[#6E6A63] dark:text-[#A39E93]">
              VIRTUAL SANCTUARY TOUR · 성당 구조 및 공간 순례
            </p>
            <h2 className="font-editorial text-2xl sm:text-3xl font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
              평면도로 살펴보는 여섯 개의 성스러운 공간
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleStep(-1)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#D4CFC4] dark:border-[#3A3630] px-3.5 py-2 text-xs font-medium text-[#1C1B18] dark:text-[#EDEAE2] whitespace-nowrap shrink-0 cursor-pointer hover:bg-[#EFECE4] dark:hover:bg-[#1F1D1A] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>이전 공간</span>
            </button>
            <span className="px-2 font-mono text-xs tabular-nums text-[#6E6A63] dark:text-[#A39E93]">
              {String(currentIndex + 1).padStart(2, '0')} / {String(spaces.length).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={() => handleStep(1)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#D4CFC4] dark:border-[#3A3630] px-3.5 py-2 text-xs font-medium text-[#1C1B18] dark:text-[#EDEAE2] whitespace-nowrap shrink-0 cursor-pointer hover:bg-[#EFECE4] dark:hover:bg-[#1F1D1A] transition-colors"
            >
              <span>다음 공간</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left: Architectural Blueprint SVG & Numbered Index */}
          <div className="lg:col-span-6 space-y-6">
            <div className="rounded-lg border border-[#E5E1D8] dark:border-[#2C2924] bg-[#F3F1EC] dark:bg-[#1B1916] p-6">
              <div className="flex items-center justify-between text-xs text-[#6E6A63] dark:text-[#A39E93] mb-4">
                <span>ARCHITECTURAL FLOOR PLAN · 축척 1:250</span>
                <span className="inline-flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5" />
                  <span>북향 정원 · 동남향 채광</span>
                </span>
              </div>

              <svg
                viewBox="0 0 560 380"
                className="w-full h-auto select-none"
                role="img"
                aria-label="고요의 성당 공간 배치 평면도"
              >
                <rect
                  x="16"
                  y="16"
                  width="528"
                  height="348"
                  rx="4"
                  fill="none"
                  stroke="currentColor"
                  className="text-[#D4CFC4] dark:text-[#3A3630]"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                {/* 06. Cloister Garden & Bell Tower */}
                <g
                  onClick={() => setSelectedId('cloister')}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label="06 회랑 정원과 종탑"
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedId('cloister')}
                >
                  <rect
                    x="32"
                    y="32"
                    width="496"
                    height="74"
                    rx="3"
                    className={
                      selectedId === 'cloister'
                        ? 'fill-[#9E7B42]/20 stroke-[#9E7B42]'
                        : 'fill-[#EAE6DC]/70 dark:fill-[#25221D] stroke-[#CFC9BC] dark:stroke-[#3F3B34] hover:fill-[#9E7B42]/10'
                    }
                    strokeWidth="1.5"
                  />
                  <text
                    x="280"
                    y="73"
                    textAnchor="middle"
                    className="fill-current text-[#1C1B18] dark:text-[#EDEAE2] text-[13px] font-medium"
                  >
                    06. 회랑 정원과 종탑 (Cloister &amp; Bell Tower)
                  </text>
                </g>

                {/* 03. Adoration Chapel */}
                <g
                  onClick={() => setSelectedId('adoration')}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label="03 성체조배실 기도실"
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedId('adoration')}
                >
                  <rect
                    x="32"
                    y="124"
                    width="126"
                    height="112"
                    rx="3"
                    className={
                      selectedId === 'adoration'
                        ? 'fill-[#9E7B42]/20 stroke-[#9E7B42]'
                        : 'fill-[#EAE6DC]/70 dark:fill-[#25221D] stroke-[#CFC9BC] dark:stroke-[#3F3B34] hover:fill-[#9E7B42]/10'
                    }
                    strokeWidth="1.5"
                  />
                  <text
                    x="95"
                    y="176"
                    textAnchor="middle"
                    className="fill-current text-[#1C1B18] dark:text-[#EDEAE2] text-[12px] font-medium"
                  >
                    03. 성체조배실
                  </text>
                  <text
                    x="95"
                    y="194"
                    textAnchor="middle"
                    className="fill-current text-[#6E6A63] dark:text-[#9E988D] text-[10px]"
                  >
                    침묵 기도실
                  </text>
                </g>

                {/* 02. Main Nave */}
                <g
                  onClick={() => setSelectedId('nave')}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label="02 대성전 예배당"
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedId('nave')}
                >
                  <rect
                    x="174"
                    y="124"
                    width="212"
                    height="148"
                    rx="3"
                    className={
                      selectedId === 'nave'
                        ? 'fill-[#9E7B42]/20 stroke-[#9E7B42]'
                        : 'fill-[#FAF9F6] dark:fill-[#211F1B] stroke-[#CFC9BC] dark:stroke-[#3F3B34] hover:fill-[#9E7B42]/10'
                    }
                    strokeWidth="1.75"
                  />
                  <rect
                    x="252"
                    y="142"
                    width="56"
                    height="18"
                    rx="1"
                    fill="none"
                    stroke="currentColor"
                    className="text-[#9E7B42]"
                    strokeWidth="1.25"
                  />
                  <text
                    x="280"
                    y="198"
                    textAnchor="middle"
                    className="fill-current text-[#1C1B18] dark:text-[#EDEAE2] text-[14px] font-medium"
                  >
                    02. 대성전 · 예배당
                  </text>
                  <text
                    x="280"
                    y="218"
                    textAnchor="middle"
                    className="fill-current text-[#6E6A63] dark:text-[#9E988D] text-[11px]"
                  >
                    Main Nave &amp; Altar
                  </text>
                </g>

                {/* 04. Candles */}
                <g
                  onClick={() => setSelectedId('candles')}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label="04 봉헌 초 제대"
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedId('candles')}
                >
                  <rect
                    x="402"
                    y="124"
                    width="126"
                    height="68"
                    rx="3"
                    className={
                      selectedId === 'candles'
                        ? 'fill-[#9E7B42]/20 stroke-[#9E7B42]'
                        : 'fill-[#EAE6DC]/70 dark:fill-[#25221D] stroke-[#CFC9BC] dark:stroke-[#3F3B34] hover:fill-[#9E7B42]/10'
                    }
                    strokeWidth="1.5"
                  />
                  <text
                    x="465"
                    y="162"
                    textAnchor="middle"
                    className="fill-current text-[#1C1B18] dark:text-[#EDEAE2] text-[12px] font-medium"
                  >
                    04. 봉헌 초 제대
                  </text>
                </g>

                {/* 05. Confession */}
                <g
                  onClick={() => setSelectedId('confession')}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label="05 화해의 고해소"
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedId('confession')}
                >
                  <rect
                    x="402"
                    y="204"
                    width="126"
                    height="68"
                    rx="3"
                    className={
                      selectedId === 'confession'
                        ? 'fill-[#9E7B42]/20 stroke-[#9E7B42]'
                        : 'fill-[#EAE6DC]/70 dark:fill-[#25221D] stroke-[#CFC9BC] dark:stroke-[#3F3B34] hover:fill-[#9E7B42]/10'
                    }
                    strokeWidth="1.5"
                  />
                  <text
                    x="465"
                    y="242"
                    textAnchor="middle"
                    className="fill-current text-[#1C1B18] dark:text-[#EDEAE2] text-[12px] font-medium"
                  >
                    05. 화해의 고해소
                  </text>
                </g>

                {/* 01. Atrium */}
                <g
                  onClick={() => setSelectedId('atrium')}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label="01 만남의 아트리움"
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedId('atrium')}
                >
                  <rect
                    x="130"
                    y="288"
                    width="300"
                    height="62"
                    rx="3"
                    className={
                      selectedId === 'atrium'
                        ? 'fill-[#9E7B42]/20 stroke-[#9E7B42]'
                        : 'fill-[#EAE6DC]/70 dark:fill-[#25221D] stroke-[#CFC9BC] dark:stroke-[#3F3B34] hover:fill-[#9E7B42]/10'
                    }
                    strokeWidth="1.5"
                  />
                  <text
                    x="280"
                    y="323"
                    textAnchor="middle"
                    className="fill-current text-[#1C1B18] dark:text-[#EDEAE2] text-[13px] font-medium"
                  >
                    01. 만남의 아트리움 · 성당 입구 수반
                  </text>
                </g>
              </svg>
            </div>

            <div className="divide-y divide-[#E5E1D8] dark:divide-[#2C2924] border-t border-b border-[#E5E1D8] dark:border-[#2C2924]">
              {spaces.map((space) => {
                const active = space.id === selectedSpace.id;
                return (
                  <button
                    key={space.id}
                    type="button"
                    onClick={() => setSelectedId(space.id)}
                    className={`w-full py-3.5 px-2 flex items-center justify-between gap-4 text-left cursor-pointer transition-colors ${
                      active
                        ? 'text-[#1C1B18] dark:text-[#EDEAE2] font-medium bg-[#EFECE4]/60 dark:bg-[#1E1C18]'
                        : 'text-[#5C5852] dark:text-[#A39E93] hover:text-[#1C1B18] dark:hover:text-[#EDEAE2]'
                    }`}
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-xs tabular-nums text-[#9E7B42]">
                        {space.orderLabel}.
                      </span>
                      <span className="text-[15px]">{space.name}</span>
                    </div>
                    <span className="text-xs text-[#6E6A63] dark:text-[#969085] whitespace-nowrap shrink-0">
                      {space.isOpen ? '개방 중' : '정비·휴식'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Selected Sanctuary Space Monograph */}
          <div className="lg:col-span-6 space-y-6">
            <div className="overflow-hidden rounded-lg border border-[#E5E1D8] dark:border-[#2C2924] bg-[#EFECE4] dark:bg-[#1B1916] h-72 sm:h-80">
              <SanctuaryImage
                imageKey={selectedSpace.imageKey}
                alt={`${selectedSpace.name} — ${selectedSpace.subtitle}`}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs tracking-widest text-[#7C5A3C] dark:text-[#C59F61]">
                  {selectedSpace.orderLabel} · {selectedSpace.latinName}
                </p>
                <h3 className="font-editorial text-2xl sm:text-3xl font-medium text-[#1C1B18] dark:text-[#EDEAE2] mt-1">
                  {selectedSpace.name}
                </h3>
                <p className="text-sm text-[#5C5852] dark:text-[#B5B0A6] mt-1">
                  {selectedSpace.subtitle}
                </p>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-t border-b border-[#E5E1D8] dark:border-[#2C2924] text-sm">
                <div>
                  <dt className="text-xs text-[#6E6A63] dark:text-[#969085]">공간 규모</dt>
                  <dd className="mt-0.5 text-[#1C1B18] dark:text-[#EDEAE2] tabular-nums">
                    {selectedSpace.dimensions}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#6E6A63] dark:text-[#969085]">운영 현황</dt>
                  <dd className="mt-0.5 text-[#1C1B18] dark:text-[#EDEAE2]">
                    {selectedSpace.statusNote}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-[#6E6A63] dark:text-[#969085]">채광 및 건축 특징</dt>
                  <dd className="mt-0.5 text-[#1C1B18] dark:text-[#EDEAE2]">
                    {selectedSpace.lightingNote}
                  </dd>
                </div>
              </dl>

              <p className="text-[15px] leading-[1.85] text-[#4A4742] dark:text-[#B5B0A6]">
                {selectedSpace.description}
              </p>

              <div className="rounded-lg border border-[#E5E1D8] dark:border-[#2C2924] bg-[#F3F1EC] dark:bg-[#1B1916] p-5 space-y-2">
                <p className="text-xs tracking-wider text-[#7C5A3C] dark:text-[#C59F61]">
                  이 공간에서 드리는 짧은 묵상
                </p>
                <p className="font-editorial text-lg leading-relaxed text-[#1C1B18] dark:text-[#EDEAE2]">
                  {selectedSpace.contemplationPrompt}
                </p>
              </div>

              {selectedSpace.id === 'candles' && (
                <button
                  type="button"
                  onClick={() => onNavigate('prayer', true)}
                  className="inline-flex items-center gap-2 rounded-md bg-[#1C1B18] dark:bg-[#9E7B42] px-5 py-2.5 text-sm font-medium text-[#F8F7F4] dark:text-[#141311] cursor-pointer hover:bg-[#33312C] dark:hover:bg-[#B38E52] transition-colors"
                >
                  <span>온라인 봉헌 초 제대로 이동하기</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
