// 관리자 대시보드 신청자 목록 테이블 및 검색/필터/관리 액션 컴포넌트
import { useState } from 'react';
import { Search, Eye, Check, XCircle, Trash2 } from 'lucide-react';

// 상태별 라벨 및 시맨틱 스타일 매핑 (색상 단독 사용 금지, 텍스트 라벨 동반)
const STATUS_CONFIG = {
  WAITING: {
    label: '승인 대기',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  APPROVED: {
    label: '승인 완료',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  REJECTED: {
    label: '반려',
    className: 'bg-red-50 text-red-800 border-red-200',
  },
};

const INTEREST_FILTERS = ['전체', 'Java', 'React', 'Spring Boot', 'AI'];
const STATUS_FILTERS = [
  { value: 'ALL', label: '전체 상태' },
  { value: 'WAITING', label: '승인 대기' },
  { value: 'APPROVED', label: '승인 완료' },
  { value: 'REJECTED', label: '반려' },
];

/**
 * Firestore Timestamp 또는 Date 객체를 읽기 쉬운 한국 날짜 문자열로 변환
 */
export function formatDateKR(createdAt) {
  if (!createdAt) return '-';
  let dateObj;
  if (typeof createdAt.toDate === 'function') {
    dateObj = createdAt.toDate();
  } else if (createdAt instanceof Date) {
    dateObj = createdAt;
  } else if (typeof createdAt.seconds === 'number') {
    dateObj = new Date(createdAt.seconds * 1000);
  } else {
    dateObj = new Date(createdAt);
  }
  if (Number.isNaN(dateObj.getTime())) return '-';
  return dateObj.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * 신청자 목록 테이블 컴포넌트
 */
export default function ApplicationTable({
  applications,
  loading,
  searchQuery,
  onSearchChange,
  interestFilter,
  onInterestFilterChange,
  statusFilter,
  onStatusFilterChange,
  onViewDetail,
  onChangeStatus,
  onDelete,
  busyId,
}) {
  // 삭제 전 2단계 인라인 확인을 위한 상태 (window.confirm 대체)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {/* 검색 및 필터 컨트롤 바 */}
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
        {/* 이름 검색 인풋 */}
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="이름으로 검색..."
            aria-label="신청자 이름 검색"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* 관심 분야 및 상태 필터 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
            {INTEREST_FILTERS.map((interest) => {
              const active = interestFilter === interest;
              return (
                <button
                  key={interest}
                  type="button"
                  onClick={() => onInterestFilterChange(interest)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {interest}
                </button>
              );
            })}
          </div>

          <select
            aria-label="신청 상태 필터"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
          >
            {STATUS_FILTERS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 데이터 테이블 영역 */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
              <th className="px-4 py-3 whitespace-nowrap">번호</th>
              <th className="px-4 py-3 whitespace-nowrap">이름</th>
              <th className="px-4 py-3 whitespace-nowrap">이메일</th>
              <th className="px-4 py-3 whitespace-nowrap">연락처</th>
              <th className="px-4 py-3 whitespace-nowrap">관심 분야</th>
              <th className="px-4 py-3 whitespace-nowrap">개발 경험</th>
              <th className="px-4 py-3 whitespace-nowrap">신청일</th>
              <th className="px-4 py-3 whitespace-nowrap">상태</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">관리</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="h-12">
                  <td colSpan={9} className="px-4 py-3">
                    <div className="h-5 w-full animate-pulse rounded bg-slate-100" />
                  </td>
                </tr>
              ))
            ) : applications.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-14 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    조건에 해당하는 신청자가 없습니다.
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    검색어나 필터 조건을 초기화하거나 새로운 스터디 신청이 접수되면 이곳에
                    표시됩니다.
                  </p>
                </td>
              </tr>
            ) : (
              applications.map((app, index) => {
                const statusInfo = STATUS_CONFIG[app.status] || STATUS_CONFIG.WAITING;
                const isBusy = busyId === app.id;
                const isConfirmingDelete = confirmDeleteId === app.id;

                return (
                  <tr key={app.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {String(index + 1).padStart(2, '0')}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {app.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{app.email}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {app.phone}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                      {app.interest}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{app.level}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {formatDateKR(app.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {/* 상세 보기 */}
                        <button
                          type="button"
                          onClick={() => onViewDetail(app.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          상세
                        </button>

                        {/* 승인 버튼 */}
                        <button
                          type="button"
                          disabled={isBusy || app.status === 'APPROVED'}
                          onClick={() => onChangeStatus(app.id, 'APPROVED')}
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                          승인
                        </button>

                        {/* 반려 버튼 */}
                        <button
                          type="button"
                          disabled={isBusy || app.status === 'REJECTED'}
                          onClick={() => onChangeStatus(app.id, 'REJECTED')}
                          className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          반려
                        </button>

                        {/* 삭제 버튼 (2단계 인라인 확인) */}
                        {isConfirmingDelete ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                setConfirmDeleteId(null);
                                onDelete(app.id);
                              }}
                              className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                            >
                              삭제 확인
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setConfirmDeleteId(app.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-45 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            삭제
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
