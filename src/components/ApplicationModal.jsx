// 스터디 신청 모달 팝업 컴포넌트 (유효성 검사, 중복 제출 방지, Firestore 저장 포함)
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import { createApplication, hasAlreadySubmitted } from '../services/applicationService';

// 선택 가능한 관심 분야 및 개발 경험 목록
const INTEREST_OPTIONS = ['Java', 'React', 'Spring Boot', 'AI'];
const LEVEL_OPTIONS = ['초급', '중급', '고급'];

// 이메일 정규표현식 검사
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 스터디 신청 모달 컴포넌트
 * @param {Object} props
 * @param {boolean} props.isOpen - 모달 열림 여부
 * @param {Function} props.onClose - 모달 닫기 콜백
 * @param {string} [props.initialInterest] - 특정 과정에서 눌렀을 때 기본 선택할 관심 분야
 */
export default function ApplicationModal({ isOpen, onClose, initialInterest = 'Java' }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    interest: initialInterest || 'Java',
    level: '초급',
    motivation: '',
  });

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState(null);

  // 중복 클릭 방지를 위한 동기식 Ref 잠금
  const submittingRef = useRef(false);

  // 모달이 열릴 때 선택된 관심 분야 동기화 및 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        interest: INTEREST_OPTIONS.includes(initialInterest) ? initialInterest : 'Java',
      }));
      setErrors({});
      setSubmitError('');
      setSubmittedRecord(null);
    }
  }, [isOpen, initialInterest]);

  // ESC 키로 모달 닫기 지원
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  // 휴대폰 번호 자동 하이픈(-) 포맷팅
  const formatPhoneNumber = (rawValue) => {
    const digits = rawValue.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  // 입력값 변경 핸들러
  const handleChange = (field, value) => {
    const nextValue = field === 'phone' ? formatPhoneNumber(value) : value;
    setFormData((prev) => ({ ...prev, [field]: nextValue }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
    if (submitError) setSubmitError('');
  };

  // 전체 필수 항목 및 형식 유효성 검사
  const validateForm = () => {
    const nextErrors = {};
    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();
    const digitsPhone = formData.phone.replace(/\D/g, '');
    const trimmedMotivation = formData.motivation.trim();

    if (!trimmedName) {
      nextErrors.name = '이름을 입력해주세요.';
    } else if (trimmedName.length > 50) {
      nextErrors.name = '이름은 50자 이내로 입력해주세요.';
    }

    if (!trimmedEmail) {
      nextErrors.email = '이메일을 입력해주세요.';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      nextErrors.email = '올바른 이메일 형식이 아닙니다. (예: name@example.com)';
    }

    if (!formData.phone.trim()) {
      nextErrors.phone = '휴대폰 번호를 입력해주세요.';
    } else if (digitsPhone.length < 10 || digitsPhone.length > 11) {
      nextErrors.phone = '올바른 휴대폰 번호 10~11자리를 입력해주세요.';
    }

    if (!INTEREST_OPTIONS.includes(formData.interest)) {
      nextErrors.interest = '관심 분야를 선택해주세요.';
    }

    if (!LEVEL_OPTIONS.includes(formData.level)) {
      nextErrors.level = '개발 경험을 선택해주세요.';
    }

    if (!trimmedMotivation) {
      nextErrors.motivation = '신청 동기를 입력해주세요.';
    } else if (trimmedMotivation.length < 5) {
      nextErrors.motivation = '신청 동기를 최소 5자 이상 입력해주세요.';
    } else if (trimmedMotivation.length > 1000) {
      nextErrors.motivation = '신청 동기는 1,000자 이내로 작성해주세요.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // 폼 제출 및 Firestore 저장 핸들러
  const handleSubmit = async (event) => {
    event.preventDefault();

    // 이미 요청 중이면 중복 실행 차단
    if (submittingRef.current || isSubmitting) return;

    if (!validateForm()) return;

    // 동일 브라우저 내 동일 이메일 + 관심 분야 중복 제출 방지
    if (hasAlreadySubmitted(formData.email, formData.interest)) {
      setSubmitError(
        `이미 '${formData.email.trim()}' 이메일로 '${formData.interest}' 과정 신청이 접수되었습니다.`
      );
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const saved = await createApplication(formData);
      setSubmittedRecord(saved);
      // 폼 초기화
      setFormData({
        name: '',
        email: '',
        phone: '',
        interest: initialInterest || 'Java',
        level: '초급',
        motivation: '',
      });
    } catch (error) {
      console.error('신청 저장 오류:', error);
      setSubmitError('신청서 전송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="application-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* 어두운 배경 오버레이 */}
      <div
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
        className="animate-modal-backdrop fixed inset-0 bg-slate-900/55 backdrop-blur-xs"
      />

      {/* 모달 본문 카드 */}
      <div className="animate-modal-panel relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* 상단 타이틀 바 */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <h2
              id="application-modal-title"
              className="font-display text-lg font-bold text-slate-900"
            >
              {submittedRecord ? '스터디 신청 완료' : 'IT 개발 스터디 신청'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {submittedRecord
                ? '지원서가 정상적으로 접수되었습니다.'
                : '모든 필수 항목을 입력한 뒤 신청서를 제출해주세요.'}
            </p>
          </div>

          <button
            type="button"
            aria-label="모달 닫기"
            disabled={isSubmitting}
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 제출 완료 화면 vs 신청 폼 */}
        {submittedRecord ? (
          <div className="p-6 sm:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-slate-900">
                신청이 성공적으로 접수되었습니다
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                운영진 검토 후 입력하신 이메일({submittedRecord.email})로 승인 여부 및 오리엔테이션
                일정을 안내해 드립니다.
              </p>
            </div>

            {/* 접수 내역 요약 */}
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <dl className="space-y-2.5">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">접수 번호</dt>
                  <dd className="font-mono text-xs font-medium text-slate-900 tabular-nums">
                    {submittedRecord.id}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">지원자</dt>
                  <dd className="font-medium text-slate-900">{submittedRecord.name}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">관심 분야</dt>
                  <dd className="font-medium text-slate-900">{submittedRecord.interest}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">현재 상태</dt>
                  <dd className="font-semibold text-amber-700">승인 대기 (WAITING)</dd>
                </div>
              </dl>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 cursor-pointer"
              >
                확인
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5 p-6">
            {submitError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* 이름 & 이메일 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="apply-name" className="block text-sm font-semibold text-slate-800">
                  이름 <span className="text-red-600">*</span>
                </label>
                <input
                  id="apply-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="홍길동"
                  maxLength={50}
                  className={`mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    errors.name
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-slate-300 focus:border-blue-700 focus:ring-blue-100'
                  }`}
                />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="apply-email" className="block text-sm font-semibold text-slate-800">
                  이메일 <span className="text-red-600">*</span>
                </label>
                <input
                  id="apply-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="developer@example.com"
                  maxLength={120}
                  className={`mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    errors.email
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-slate-300 focus:border-blue-700 focus:ring-blue-100'
                  }`}
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>
            </div>

            {/* 휴대폰 번호 */}
            <div>
              <label htmlFor="apply-phone" className="block text-sm font-semibold text-slate-800">
                휴대폰 번호 <span className="text-red-600">*</span>
              </label>
              <input
                id="apply-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="010-1234-5678"
                maxLength={20}
                className={`mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-sm font-mono tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  errors.phone
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-slate-300 focus:border-blue-700 focus:ring-blue-100'
                }`}
              />
              {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
            </div>

            {/* 관심 분야 (세그먼트 버튼) */}
            <div>
              <span className="block text-sm font-semibold text-slate-800">
                관심 분야 <span className="text-red-600">*</span>
              </span>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {INTEREST_OPTIONS.map((item) => {
                  const isActive = formData.interest === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleChange('interest', item)}
                      className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'border-blue-700 bg-blue-700 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
              {errors.interest && <p className="mt-1 text-xs text-red-600">{errors.interest}</p>}
            </div>

            {/* 개발 경험 (초급, 중급, 고급) */}
            <div>
              <span className="block text-sm font-semibold text-slate-800">
                개발 경험 <span className="text-red-600">*</span>
              </span>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {LEVEL_OPTIONS.map((lvl) => {
                  const isActive = formData.level === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => handleChange('level', lvl)}
                      className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
              {errors.level && <p className="mt-1 text-xs text-red-600">{errors.level}</p>}
            </div>

            {/* 신청 동기 */}
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="apply-motivation"
                  className="block text-sm font-semibold text-slate-800"
                >
                  신청 동기 <span className="text-red-600">*</span>
                </label>
                <span className="font-mono text-xs text-slate-400 tabular-nums">
                  {formData.motivation.length} / 1000
                </span>
              </div>
              <textarea
                id="apply-motivation"
                rows={4}
                value={formData.motivation}
                onChange={(e) => handleChange('motivation', e.target.value)}
                placeholder="스터디에서 배우고 싶은 목표나 함께 만들고 싶은 프로젝트에 대해 간단히 적어주세요."
                maxLength={1000}
                className={`mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  errors.motivation
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-slate-300 focus:border-blue-700 focus:ring-blue-100'
                }`}
              />
              {errors.motivation && (
                <p className="mt-1 text-xs text-red-600">{errors.motivation}</p>
              )}
            </div>

            {/* 하단 제출 버튼 영역 */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-w-32 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    제출 중...
                  </>
                ) : (
                  '신청서 제출'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
