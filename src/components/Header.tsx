import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { AppSection } from '../types';

interface HeaderProps {
  activeSection: AppSection;
  isInsideSanctuary: boolean;
  onNavigate: (section: AppSection) => void;
  onQuickEnterOrFocus: () => void;
}

const NAV_ITEMS: { id: AppSection; label: string }[] = [
  { id: 'home', label: '성당 안내' },
  { id: 'structure', label: '성당 구조' },
  { id: 'prayer', label: '기도와 묵상' },
  { id: 'notices', label: '미사·공지' },
  { id: 'admin', label: '본당 관리' },
];

export function Header({
  activeSection,
  isInsideSanctuary,
  onNavigate,
  onQuickEnterOrFocus,
}: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSelect = (section: AppSection) => {
    setMobileOpen(false);
    onNavigate(section);
  };

  const handleAction = () => {
    setMobileOpen(false);
    onQuickEnterOrFocus();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#E5E1D8] dark:border-[#2C2924] bg-[#F8F7F4]/95 dark:bg-[#141311]/95 backdrop-blur-sm transition-colors duration-200">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-8 px-6 py-4">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleSelect('home')}
          className="font-editorial text-xl font-semibold tracking-tight text-[#1C1B18] dark:text-[#EDEAE2] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9E7B42]"
        >
          고요의 성당
        </button>

        {/* Zone 2: 5 concise single-line text nav links */}
        <nav
          aria-label="주 메뉴"
          className="hidden md:flex items-center gap-7 text-[15px] text-[#5C5852] dark:text-[#A39E93]"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`relative py-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9E7B42] ${
                  isActive
                    ? 'text-[#1C1B18] dark:text-[#EDEAE2] font-medium'
                    : 'hover:text-[#1C1B18] dark:hover:text-[#EDEAE2]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[17px] h-[1.5px] bg-[#9E7B42]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary CTA */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleAction}
            className="hidden sm:inline-flex items-center justify-center rounded-md bg-[#1C1B18] dark:bg-[#9E7B42] px-4 py-2 text-[13px] font-medium text-[#F8F7F4] dark:text-[#141311] whitespace-nowrap shrink-0 cursor-pointer hover:bg-[#33312C] dark:hover:bg-[#B38E52] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9E7B42]"
          >
            {isInsideSanctuary ? '기도실 머무는 중' : '성당 입장하기'}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={mobileOpen}
            className="md:hidden inline-flex items-center justify-center p-2 min-w-[44px] min-h-[44px] text-[#1C1B18] dark:text-[#EDEAE2] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9E7B42]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#E5E1D8] dark:border-[#2C2924] bg-[#F8F7F4] dark:bg-[#141311] px-6 py-4">
          <div className="flex flex-col gap-2">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className={`flex items-center justify-between py-2.5 text-left text-[15px] min-h-[44px] cursor-pointer ${
                    isActive
                      ? 'text-[#1C1B18] dark:text-[#EDEAE2] font-medium'
                      : 'text-[#5C5852] dark:text-[#A39E93]'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && <span className="text-xs text-[#9E7B42]">현재 화면</span>}
                </button>
              );
            })}
            <button
              type="button"
              onClick={handleAction}
              className="mt-2 w-full rounded-md bg-[#1C1B18] dark:bg-[#9E7B42] px-4 py-3 text-sm font-medium text-[#F8F7F4] dark:text-[#141311] cursor-pointer"
            >
              {isInsideSanctuary ? '기도실 머무는 중' : '성당 입장하기'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
