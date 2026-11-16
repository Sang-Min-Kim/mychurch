import { useState } from 'react';
import { Search, X } from 'lucide-react';
import type { MassSchedule, NoticeCategory, ParishNotice } from '../types';

interface NoticesViewProps {
  masses: MassSchedule[];
  notices: ParishNotice[];
}

const GROUPS: MassSchedule['dayGroup'][] = ['주일 미사', '토요 특전', '평일 미사', '고해성사'];
const NOTICE_TABS: ('전체' | NoticeCategory)[] = ['전체', '본당 소식', '전례·성사', '피정·치유'];

export function NoticesView({ masses, notices }: NoticesViewProps) {
  const [category, setCategory] = useState<'전체' | NoticeCategory>('전체');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNotice, setSelectedNotice] = useState<ParishNotice | null>(null);

  const filteredNotices = notices.filter((n) => {
    const matchesCategory = category === '전체' || n.category === category;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q || n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12 md:py-16 space-y-16">
      <div className="max-w-2xl space-y-3">
        <p className="text-xs tracking-[0.16em] text-[#7C5A3C] dark:text-[#C59F61]">
          LITURGY &amp; PARISH BROADSHEET · 미사 안내 및 본당 소식
        </p>
        <h1 className="font-editorial text-3xl sm:text-4xl font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
          성전의 전례 시간표와 본당 소식
        </h1>
        <p className="text-[15px] leading-[1.8] text-[#5C5852] dark:text-[#B5B0A6]">
          고요의 성당에서 봉헌되는 매일의 미사와 고해성사 일정, 그리고 피정과 공동체 소식을
          전해드립니다.
        </p>
      </div>

      {/* Mass & Confession Timetable */}
      <section className="space-y-6">
        <h2 className="font-editorial text-2xl font-medium text-[#1C1B18] dark:text-[#EDEAE2] border-b border-[#E5E1D8] dark:border-[#2C2924] pb-3">
          미사 및 고해성사 시간 안내
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {GROUPS.map((group) => {
            const items = masses.filter((m) => m.dayGroup === group);
            return (
              <div
                key={group}
                className="rounded-lg border border-[#E5E1D8] dark:border-[#2C2924] bg-[#F3F1EC] dark:bg-[#1B1916] p-6 space-y-4"
              >
                <h3 className="font-editorial text-xl font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
                  {group}
                </h3>
                {items.length === 0 ? (
                  <p className="text-sm text-[#6E6A63] dark:text-[#969085]">
                    등록된 일정이 없습니다.
                  </p>
                ) : (
                  <div className="divide-y divide-[#E5E1D8] dark:divide-[#2C2924]">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="py-3 flex items-baseline justify-between gap-4"
                      >
                        <div>
                          <div className="text-[15px] font-medium text-[#1C1B18] dark:text-[#EDEAE2]">
                            {item.title}
                          </div>
                          <div className="text-xs text-[#6E6A63] dark:text-[#A39E93] mt-0.5">
                            {item.location}
                            {item.note ? ` · ${item.note}` : ''}
                          </div>
                        </div>
                        <span className="font-mono text-sm tabular-nums text-[#7C5A3C] dark:text-[#C59F61] shrink-0">
                          {item.time}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Parish Notices Broadsheet */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E1D8] dark:border-[#2C2924] pb-4">
          <div className="flex flex-wrap items-center gap-1 rounded-md bg-[#EFECE4] dark:bg-[#1B1916] p-1">
            {NOTICE_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setCategory(tab)}
                className={`px-3 py-1.5 text-xs rounded cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                  category === tab
                    ? 'bg-[#FAF9F6] dark:bg-[#2A2721] text-[#1C1B18] dark:text-[#EDEAE2] font-medium'
                    : 'text-[#6E6A63] dark:text-[#969085] hover:text-[#1C1B18] dark:hover:text-[#EDEAE2]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-[#6E6A63] dark:text-[#969085] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="공지 제목 또는 내용 검색"
              className="w-full rounded-md border border-[#D4CFC4] dark:border-[#3A3630] bg-[#FAF9F6] dark:bg-[#1B1916] pl-9 pr-3 py-2 text-sm text-[#1C1B18] dark:text-[#EDEAE2] placeholder:text-[#9C968B] focus:outline-none focus:border-[#9E7B42]"
            />
          </div>
        </div>

        {filteredNotices.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#6E6A63] dark:text-[#969085]">
            조건에 맞는 본당 소식이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-[#E5E1D8] dark:divide-[#2C2924]">
            {filteredNotices.map((notice) => (
              <article
                key={notice.id}
                onClick={() => setSelectedNotice(notice)}
                className="py-6 flex flex-col md:flex-row md:items-baseline justify-between gap-4 cursor-pointer group"
              >
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex items-center gap-2 text-xs text-[#6E6A63] dark:text-[#969085] tabular-nums">
                    <span className="text-[#7C5A3C] dark:text-[#C59F61] font-medium">
                      {notice.category}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{notice.date}</span>
                    {notice.pinned && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>주요 안내</span>
                      </>
                    )}
                  </div>
                  <h3 className="font-editorial text-xl font-medium text-[#1C1B18] dark:text-[#EDEAE2] group-hover:text-[#7C5A3C] dark:group-hover:text-[#C59F61] transition-colors">
                    {notice.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#5C5852] dark:text-[#B5B0A6]">
                    {notice.summary}
                  </p>
                </div>

                <span className="text-xs font-medium text-[#7C5A3C] dark:text-[#C59F61] whitespace-nowrap shrink-0">
                  자세히 읽기
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Notice Reading Modal */}
      {selectedNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="notice-modal-title"
          onClick={() => setSelectedNotice(null)}
        >
          <div
            className="w-full max-w-2xl rounded-lg border border-[#E5E1D8] dark:border-[#2C2924] bg-[#F8F7F4] dark:bg-[#181613] p-7 sm:p-9 space-y-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs text-[#7C5A3C] dark:text-[#C59F61] tabular-nums">
                  {selectedNotice.category} · {selectedNotice.date}
                </p>
                <h2
                  id="notice-modal-title"
                  className="font-editorial text-2xl font-medium text-[#1C1B18] dark:text-[#EDEAE2]"
                >
                  {selectedNotice.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                aria-label="공지 닫기"
                className="p-2 text-[#6E6A63] hover:text-[#1C1B18] dark:text-[#A39E93] dark:hover:text-[#EDEAE2] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border-t border-[#E5E1D8] dark:border-[#2C2924] pt-5">
              <p className="text-[15px] leading-[1.9] text-[#3B3833] dark:text-[#CBC6BC] whitespace-pre-line">
                {selectedNotice.content}
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="rounded-md bg-[#1C1B18] dark:bg-[#9E7B42] px-4 py-2 text-xs font-medium text-[#F8F7F4] dark:text-[#141311] cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
