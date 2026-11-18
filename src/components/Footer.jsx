// 하단 푸터 컴포넌트
import { Link } from 'react-router-dom';

export default function Footer({ onOpenApply }) {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-start">
          {/* 좌측: 브랜드 및 간략 소개 */}
          <div className="max-w-sm">
            <p className="font-display text-lg font-extrabold tracking-tight text-slate-900">
              IT STUDY
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Java, Spring Boot, React, 생성형 AI 개발을 함께 학습하고 실전 프로젝트를 완성하는
              개발자 성장 커뮤니티입니다.
            </p>
          </div>

          {/* 우측: 빠른 이동 링크 및 문의 안내 */}
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 text-sm">
            <div>
              <p className="font-semibold text-slate-900">스터디 안내</p>
              <ul className="mt-3 space-y-2 text-slate-600">
                <li>
                  <a href="#curriculum" className="hover:text-slate-900 transition-colors">
                    스터디 소개
                  </a>
                </li>
                <li>
                  <a href="#guide" className="hover:text-slate-900 transition-colors">
                    모집 안내
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onOpenApply}
                    className="hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    지원서 작성
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-slate-900">운영 및 관리</p>
              <ul className="mt-3 space-y-2 text-slate-600">
                <li>
                  <Link to="/admin/login" className="hover:text-slate-900 transition-colors">
                    관리자 로그인
                  </Link>
                </li>
                <li>
                  <Link to="/admin/dashboard" className="hover:text-slate-900 transition-colors">
                    관리자 대시보드
                  </Link>
                </li>
              </ul>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <p className="font-semibold text-slate-900">문의</p>
              <p className="mt-3 text-slate-600">study@itstudy.kr</p>
              <p className="mt-1 text-xs text-slate-500">평일 10:00 – 19:00 응답</p>
            </div>
          </div>
        </div>

        {/* 최하단 저작권 표기 */}
        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-slate-100 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} IT STUDY. All rights reserved.</p>
          <p>실전 프로젝트 중심 IT 교육 스터디 플랫폼</p>
        </div>
      </div>
    </footer>
  );
}
