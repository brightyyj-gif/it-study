// 일반 사용자용 IT 스터디 모집 메인 랜딩 페이지
import { useEffect, useState } from 'react';
import { ArrowRight, Calendar, Code2, Cpu, Layers, Server, Users } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ApplicationModal from '../components/ApplicationModal';
import { DEFAULT_STUDY_TRACKS, subscribeToStudyTracks } from '../services/applicationService';

// 각 트랙 카테고리별 이미지 및 시각 보조 설정
const TRACK_VISUALS = {
  Java: {
    image: '/src/assets/images/track_backend_java_1794988383235.jpg',
    alt: 'Java 백엔드 아키텍처를 상징하는 모듈형 구조물',
    icon: Server,
    number: '01',
    spanClass: 'lg:col-span-7',
  },
  React: {
    image: '/src/assets/images/track_frontend_react_1794988383167.jpg',
    alt: 'React 프론트엔드 UI 설계 워크스페이스',
    icon: Code2,
    number: '02',
    spanClass: 'lg:col-span-5',
  },
  'Spring Boot': {
    image: null,
    alt: 'Spring Boot 실전 프로젝트 아키텍처',
    icon: Layers,
    number: '03',
    spanClass: 'lg:col-span-5',
  },
  AI: {
    image: '/src/assets/images/track_ai_studio_1794988382839.jpg',
    alt: '생성형 AI 파이프라인을 상징하는 광학 프리즘',
    icon: Cpu,
    number: '04',
    spanClass: 'lg:col-span-7',
  },
};

export default function Home({ isAdminAuthenticated = false }) {
  const [tracks, setTracks] = useState(DEFAULT_STUDY_TRACKS);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInterest, setSelectedInterest] = useState('Java');
  const [heroImgError, setHeroImgError] = useState(false);
  const [trackImgErrors, setTrackImgErrors] = useState({});

  // Firestore에서 실시간 스터디 과정 및 모집 상태 구독
  useEffect(() => {
    const unsubscribe = subscribeToStudyTracks((liveTracks) => {
      setTracks(liveTracks);
    });
    return () => unsubscribe();
  }, []);

  // 하나 이상의 과정이 모집 중이면 전체 상태를 '모집 중'으로 표시
  const isAnyRecruiting = tracks.some((t) => t.isRecruiting);

  // 신청 모달 열기 (특정 관심 분야 지정 가능)
  const handleOpenApply = (interest = 'Java') => {
    setSelectedInterest(interest);
    setModalOpen(true);
  };

  return (
    <div id="top" className="min-h-screen flex flex-col bg-neutral-50 text-slate-900">
      {/* 상단 공통 네비게이션 */}
      <Header
        onOpenApply={() => handleOpenApply('Java')}
        isAdminAuthenticated={isAdminAuthenticated}
      />

      <main className="flex-1">
        {/* 1. 히어로 섹션 (2단 분할 레이아웃 + 하단 핵심 지표 스트립) */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
            <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12 lg:gap-12">
              {/* 좌측 카피 영역 */}
              <div className="flex flex-col justify-center lg:col-span-6">
                {/* 정제된 메타데이터 라인 (모집 상태 표시 포함) */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
                  <span
                    className={`font-semibold ${
                      isAnyRecruiting ? 'text-blue-700' : 'text-slate-500'
                    }`}
                  >
                    모집 상태: {isAnyRecruiting ? '모집 중' : '모집 마감'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>2026 실전 프로젝트 코호트</span>
                  <span aria-hidden="true">·</span>
                  <span>온·오프라인 병행</span>
                </div>

                <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-slate-900 text-balance sm:text-5xl lg:leading-[1.12]">
                  함께 성장하는 IT 개발 스터디
                </h1>

                <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                  Java, Spring Boot, React, AI 개발을 함께 공부하는 실전 프로젝트 스터디. 이론에만
                  머무르지 않고 설계부터 코드 리뷰, 실제 서비스 배포까지 동료들과 완주합니다.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleOpenApply('Java')}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                  >
                    신청하기
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <a
                    href="#curriculum"
                    className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0"
                  >
                    스터디 과정 보기
                  </a>
                </div>
              </div>

              {/* 우측 비주얼 영역 */}
              <div className="lg:col-span-6">
                <div className="relative h-64 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 sm:h-80 lg:h-full lg:min-h-[360px]">
                  {!heroImgError ? (
                    <img
                      src="/src/assets/images/hero_it_study_1794988382752.jpg"
                      alt="개발자들이 함께 노트북으로 프로젝트를 논의하는 IT 스터디 공간"
                      referrerPolicy="no-referrer"
                      onError={() => setHeroImgError(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-8 text-center">
                      <Code2 className="h-10 w-10 text-slate-500" />
                      <p className="mt-3 font-display text-base font-bold text-slate-800">
                        IT STUDY Engineering Cohort
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        실전 협업 기반 백엔드 · 프론트엔드 · AI 스터디
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 히어로 하단 4열 핵심 지표 스트립 */}
            <div className="mt-12 grid grid-cols-2 gap-6 border-t border-slate-200 pt-8 md:grid-cols-4">
              <div>
                <p className="text-xs font-medium text-slate-500">운영 트랙</p>
                <p className="mt-1 font-display text-xl font-bold text-slate-900 tabular-nums">
                  4개 핵심 과정
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">커리큘럼 기간</p>
                <p className="mt-1 font-display text-xl font-bold text-slate-900 tabular-nums">
                  12주 집중 운영
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">피드백 방식</p>
                <p className="mt-1 font-display text-xl font-bold text-slate-900 tabular-nums">
                  주 2회 코드 리뷰
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">최종 목표</p>
                <p className="mt-1 font-display text-xl font-bold text-slate-900 tabular-nums">
                  실서비스 배포 완료
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. 스터디 소개 영역 (비대칭 벤토 그리드) */}
        <section id="curriculum" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wide text-blue-700">커리큘럼 트랙</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 text-balance sm:text-4xl">
              실무 역량을 완성하는 4가지 전문 스터디
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              각 트랙은 기초 개념 정립부터 실전 프로젝트 구현까지 단계별로 구성되어 있습니다.
              원하는 과정을 선택해 바로 지원할 수 있습니다.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12">
            {tracks.map((track) => {
              const visual = TRACK_VISUALS[track.category] || TRACK_VISUALS['Spring Boot'];
              const IconComp = visual.icon;
              const imgFailed = trackImgErrors[track.id];

              return (
                <article
                  key={track.id}
                  className={`flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white ${visual.spanClass}`}
                >
                  <div>
                    {/* 이미지 슬롯 (비율 유지 + 폴백 컨테이너) */}
                    {visual.image && !imgFailed ? (
                      <div className="aspect-[16/9] w-full overflow-hidden border-b border-slate-100 bg-slate-100 lg:aspect-[16/8]">
                        <img
                          src={visual.image}
                          alt={visual.alt}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setTrackImgErrors((prev) => ({ ...prev, [track.id]: true }))
                          }
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-[16/9] w-full flex-col justify-between border-b border-slate-100 bg-slate-900 p-6 text-white lg:aspect-[16/8]">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-slate-400 tabular-nums">
                            TRACK {visual.number}
                          </span>
                          <IconComp className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-mono text-xs text-blue-300">{track.category}</p>
                          <p className="mt-1 font-display text-lg font-bold">
                            아키텍처 설계 · API 보안 · 클라우드 배포
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 본문 텍스트 */}
                    <div className="p-6">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono font-semibold text-slate-700">
                          {visual.number}. {track.category}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`font-semibold ${
                            track.isRecruiting ? 'text-blue-700' : 'text-slate-500'
                          }`}
                        >
                          {track.isRecruiting ? '모집 중' : '모집 마감'}
                        </span>
                      </div>

                      <h3 className="mt-2 font-display text-xl font-bold text-slate-900">
                        {track.title}
                      </h3>

                      <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                        {track.summary}
                      </p>
                    </div>
                  </div>

                  {/* 하단 메타데이터 및 신청 버튼 */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 px-6 py-4">
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {track.schedule}
                      </span>
                      <span className="inline-flex items-center gap-1.5 tabular-nums">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        정원 {track.capacity}명
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={!track.isRecruiting}
                      onClick={() => handleOpenApply(track.category)}
                      className="rounded-lg border border-slate-200 bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {track.isRecruiting ? '이 과정 신청' : '모집 마감'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* 3. 모집 안내 및 진행 절차 섹션 */}
        <section id="guide" className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
              {/* 좌측 안내 요약 */}
              <div className="lg:col-span-5">
                <p className="text-xs font-semibold tracking-wide text-blue-700">모집 안내</p>
                <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 text-balance">
                  지원 절차 및 운영 원칙
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-slate-600">
                  IT STUDY는 단순 강의 시청이 아닌, 매주 직접 코드를 작성하고 PR 리뷰를 주고받는
                  실전 협업 방식으로 운영됩니다. 초급자부터 경력 전환 준비생까지 지원 동기를
                  중심으로 선발합니다.
                </p>

                <dl className="mt-8 space-y-4 border-t border-slate-200 pt-6 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="font-medium text-slate-500">모집 대상</dt>
                    <dd className="text-right font-semibold text-slate-900">
                      기초 문법을 익힌 예비/주니어 개발자
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="font-medium text-slate-500">진행 방식</dt>
                    <dd className="text-right font-semibold text-slate-900">
                      GitHub PR 리뷰 및 주간 팀 스프린트
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="font-medium text-slate-500">결과 통보</dt>
                    <dd className="text-right font-semibold text-slate-900">
                      지원 후 48시간 이내 이메일 안내
                    </dd>
                  </div>
                </dl>
              </div>

              {/* 우측 3단계 프로세스 */}
              <div className="space-y-4 lg:col-span-7">
                <div className="rounded-xl border border-slate-200 bg-neutral-50 p-6">
                  <p className="font-mono text-xs font-semibold text-blue-700">01. 지원서 제출</p>
                  <h3 className="mt-1.5 font-display text-lg font-bold text-slate-900">
                    온라인 신청 모달을 통한 간편 지원
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    희망 트랙(Java, React, Spring Boot, AI)과 현재 개발 경험 수준, 스터디를 통해
                    달성하고 싶은 목표를 작성해 제출합니다.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-neutral-50 p-6">
                  <p className="font-mono text-xs font-semibold text-blue-700">02. 운영진 검토</p>
                  <h3 className="mt-1.5 font-display text-lg font-bold text-slate-900">
                    수준별 팀 매칭 및 승인 처리
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    운영진이 지원자의 개발 경험과 학습 목표를 검토해 균형 잡힌 스터디 조를 편성하고
                    최종 승인 상태를 업데이트합니다.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-neutral-50 p-6">
                  <p className="font-mono text-xs font-semibold text-blue-700">
                    03. 온보딩 및 프로젝트 시작
                  </p>
                  <h3 className="mt-1.5 font-display text-lg font-bold text-slate-900">
                    오리엔테이션 진행 후 12주 스프린트 돌입
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    Git 협업 워크플로우 세팅을 시작으로 주차별 과제, 코드 리뷰, 최종 데모데이까지
                    함께 완주합니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 하단 전환 CTA 배너 */}
            <div className="mt-16 flex flex-col items-start justify-between gap-6 rounded-2xl bg-slate-900 p-8 text-white sm:flex-row sm:items-center sm:p-10">
              <div>
                <h3 className="font-display text-2xl font-bold tracking-tight">
                  지금 바로 스터디에 합류하세요
                </h3>
                <p className="mt-2 text-sm text-slate-300">
                  지원서 작성은 2분 이내로 완료되며, 접수 즉시 대기 상태로 등록됩니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenApply('Java')}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 whitespace-nowrap shrink-0 cursor-pointer"
              >
                신청하기
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* 하단 푸터 */}
      <Footer onOpenApply={() => handleOpenApply('Java')} />

      {/* 스터디 신청 모달 팝업 */}
      <ApplicationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialInterest={selectedInterest}
      />
    </div>
  );
}
