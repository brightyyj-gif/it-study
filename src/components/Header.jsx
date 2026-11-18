// 상단 네비게이션 헤더 컴포넌트 (3-Zone Top Bar Contract 준수)
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

/**
 * 상단 공통 헤더 컴포넌트
 * @param {Object} props
 * @param {Function} props.onOpenApply - 신청하기 모달을 여는 콜백 함수
 * @param {boolean} [props.isAdminAuthenticated] - 관리자 인증 완료 여부
 */
export default function Header({ onOpenApply, isAdminAuthenticated = false }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // 섹션 스크롤 이동 헬퍼 (다른 라우트에 있을 경우 홈으로 이동 후 스크롤)
  const handleSectionLink = (sectionId) => {
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 120);
      return;
    }

    if (sectionId === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 신청하기 버튼 클릭 핸들러
  const handleApplyClick = () => {
    setMobileMenuOpen(false);
    if (onOpenApply) {
      onOpenApply();
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: 브랜드 로고 워드마크 (단일 텍스트 요소) */}
        <Link
          to="/"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="font-display text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
        >
          IT STUDY
        </Link>

        {/* Zone 2: 데스크톱 중앙 네비게이션 링크 */}
        <nav
          aria-label="주요 메뉴"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          <button
            type="button"
            onClick={() => handleSectionLink('top')}
            className="py-1 transition-colors hover:text-slate-900 hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
          >
            홈
          </button>
          <button
            type="button"
            onClick={() => handleSectionLink('curriculum')}
            className="py-1 transition-colors hover:text-slate-900 hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
          >
            스터디 소개
          </button>
          <button
            type="button"
            onClick={() => handleSectionLink('guide')}
            className="py-1 transition-colors hover:text-slate-900 hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
          >
            모집 안내
          </button>
          <button
            type="button"
            onClick={handleApplyClick}
            className="py-1 text-blue-700 font-semibold transition-colors hover:text-blue-800 hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
          >
            신청하기
          </button>
        </nav>

        {/* Zone 3: 우측 관리자 이동 버튼 및 모바일 메뉴 토글 */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to={isAdminAuthenticated ? '/admin/dashboard' : '/admin/login'}
            className="hidden sm:inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            관리자
          </Link>

          {/* 모바일 햄버거 메뉴 버튼 */}
          <button
            type="button"
            aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition-colors hover:bg-slate-100 md:hidden cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* 모바일 드롭다운 메뉴 */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <nav aria-label="모바일 메뉴" className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => handleSectionLink('top')}
              className="flex min-h-11 items-center rounded-lg px-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              홈
            </button>
            <button
              type="button"
              onClick={() => handleSectionLink('curriculum')}
              className="flex min-h-11 items-center rounded-lg px-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              스터디 소개
            </button>
            <button
              type="button"
              onClick={() => handleSectionLink('guide')}
              className="flex min-h-11 items-center rounded-lg px-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              모집 안내
            </button>
            <button
              type="button"
              onClick={handleApplyClick}
              className="mt-1 flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 cursor-pointer"
            >
              신청하기
            </button>
            <Link
              to={isAdminAuthenticated ? '/admin/dashboard' : '/admin/login'}
              onClick={() => setMobileMenuOpen(false)}
              className="mt-1 flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
            >
              관리자
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
