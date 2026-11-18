// 관리자 대시보드 상단 통계 카드 컴포넌트

/**
 * 통계 카드 컴포넌트
 * @param {Object} props
 * @param {string} props.label - 카드 제목 (예: 전체 신청자 수)
 * @param {number} props.value - 숫자 지표
 * @param {string} [props.description] - 보조 설명 텍스트
 * @param {'neutral' | 'amber' | 'green' | 'red'} [props.tone] - 시맨틱 강조 색상 톤
 * @param {boolean} [props.loading] - 로딩 스켈레톤 상태 여부
 */
export default function StatCard({
  label,
  value,
  description,
  tone = 'neutral',
  loading = false,
}) {
  const toneStyles = {
    neutral: 'text-slate-900',
    amber: 'text-amber-700',
    green: 'text-emerald-700',
    red: 'text-red-700',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      {loading ? (
        <div className="mt-3 h-8 w-16 animate-pulse rounded bg-slate-100" />
      ) : (
        <p
          className={`mt-2 font-display text-3xl font-bold tracking-tight tabular-nums ${
            toneStyles[tone] || toneStyles.neutral
          }`}
        >
          {value}
          <span className="ml-1 text-sm font-medium text-slate-500">명</span>
        </p>
      )}
      {description && <p className="mt-2 text-xs text-slate-500">{description}</p>}
    </div>
  );
}
