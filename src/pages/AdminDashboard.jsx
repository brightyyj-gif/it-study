// 전체 화면 관리자 대시보드 페이지 (실시간 신청자 관리, 통계, 상세 보기, 스터디 과정 및 관리자 권한 관리)
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Check,
  XCircle,
  Trash2,
  UserPlus,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { auth } from '../firebase/firebase';
import {
  subscribeToApplications,
  getApplicationById,
  updateApplicationStatus,
  deleteApplication,
  subscribeToStudyTracks,
  saveStudyTrack,
  getAdminUsers,
  addAdminUser,
  DEFAULT_STUDY_TRACKS,
} from '../services/applicationService';
import StatCard from '../components/StatCard';
import ApplicationTable, { formatDateKR } from '../components/ApplicationTable';

// 메뉴 탭 정의
const MENU_ITEMS = [
  { id: 'overview', label: '대시보드', icon: LayoutDashboard },
  { id: 'applicants', label: '신청자 관리', icon: Users },
  { id: 'studies', label: '스터디 관리', icon: BookOpen },
];

const STATUS_BADGE = {
  WAITING: { label: '승인 대기', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  APPROVED: { label: '승인 완료', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  REJECTED: { label: '반려', className: 'bg-red-50 text-red-800 border-red-200' },
};

export default function AdminDashboard({ currentUser, adminProfile }) {
  const navigate = useNavigate();

  // 레이아웃 및 활성 섹션 상태
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 신청자 실시간 데이터 및 필터 상태
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [interestFilter, setInterestFilter] = useState('전체');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [busyAppId, setBusyAppId] = useState(null);
  const [actionNotice, setActionNotice] = useState('');
  const [actionError, setActionError] = useState('');

  // 신청자 상세 보기 모달 상태
  const [detailApp, setDetailApp] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // 스터디 과정 관리 상태
  const [studyTracks, setStudyTracks] = useState(DEFAULT_STUDY_TRACKS);
  const [savingTrackId, setSavingTrackId] = useState(null);

  // 관리자 권한 계정 목록 및 추가 폼 상태
  const [adminUsers, setAdminUsers] = useState([]);
  const [newAdminForm, setNewAdminForm] = useState({
    uid: '',
    email: '',
    displayName: '',
    role: 'ADMIN',
  });
  const [addingAdmin, setAddingAdmin] = useState(false);

  // 실시간 신청자 목록 및 스터디 목록 구독
  useEffect(() => {
    setLoadingApps(true);
    const unsubApps = subscribeToApplications(
      (items) => {
        setApplications(items);
        setLoadingApps(false);
      },
      (error) => {
        console.error('실시간 신청자 목록 구독 오류:', error);
        setActionError('신청자 데이터를 불러오는 중 권한 또는 네트워크 오류가 발생했습니다.');
        setLoadingApps(false);
      }
    );

    const unsubStudies = subscribeToStudyTracks((tracks) => {
      setStudyTracks(tracks);
    });

    return () => {
      unsubApps();
      unsubStudies();
    };
  }, []);

  // 스터디 관리 탭 진입 시 관리자 계정 목록 불러오기
  useEffect(() => {
    if (activeTab === 'studies') {
      getAdminUsers()
        .then((list) => setAdminUsers(list || []))
        .catch((err) => console.warn('관리자 목록 조회 실패:', err));
    }
  }, [activeTab]);

  // 통계 지표 계산
  const stats = useMemo(() => {
    const total = applications.length;
    const waiting = applications.filter((a) => a.status === 'WAITING').length;
    const approved = applications.filter((a) => a.status === 'APPROVED').length;
    const rejected = applications.filter((a) => a.status === 'REJECTED').length;

    const byInterest = ['Java', 'React', 'Spring Boot', 'AI'].map((cat) => ({
      category: cat,
      count: applications.filter((a) => a.interest === cat).length,
    }));

    return { total, waiting, approved, rejected, byInterest };
  }, [applications]);

  // 검색 및 필터가 적용된 신청자 목록
  const filteredApplications = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return applications.filter((app) => {
      const matchesName = !keyword || (app.name || '').toLowerCase().includes(keyword);
      const matchesInterest = interestFilter === '전체' || app.interest === interestFilter;
      const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
      return matchesName && matchesInterest && matchesStatus;
    });
  }, [applications, searchQuery, interestFilter, statusFilter]);

  // 현재 한국어 날짜 포맷
  const formattedToday = useMemo(() => {
    return new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  }, []);

  // 일시 알림 표시 헬퍼
  const showNotice = (msg) => {
    setActionError('');
    setActionNotice(msg);
    setTimeout(() => setActionNotice(''), 3000);
  };

  // 신청자 상세 정보 모달 열기 (Firestore 단건 조회)
  const handleViewDetail = async (applicationId) => {
    const fallback = applications.find((a) => a.id === applicationId) || null;
    setDetailApp(fallback);
    setLoadingDetail(true);
    try {
      const fresh = await getApplicationById(applicationId);
      if (fresh) setDetailApp(fresh);
    } catch (error) {
      console.error('상세 조회 실패:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  // 신청 상태 변경 (승인 / 반려 / 대기)
  const handleChangeStatus = async (applicationId, nextStatus) => {
    setBusyAppId(applicationId);
    setActionError('');
    try {
      await updateApplicationStatus(applicationId, nextStatus);
      if (detailApp && detailApp.id === applicationId) {
        setDetailApp((prev) => (prev ? { ...prev, status: nextStatus } : null));
      }
      const statusText =
        nextStatus === 'APPROVED' ? '승인 완료' : nextStatus === 'REJECTED' ? '반려' : '승인 대기';
      showNotice(`신청 상태가 '${statusText}'(으)로 변경되었습니다.`);
    } catch (error) {
      console.error('상태 변경 오류:', error);
      setActionError('상태 변경에 실패했습니다. 관리자 권한을 확인해주세요.');
    } finally {
      setBusyAppId(null);
    }
  };

  // 신청 데이터 삭제
  const handleDeleteApplication = async (applicationId) => {
    setBusyAppId(applicationId);
    setActionError('');
    try {
      await deleteApplication(applicationId);
      if (detailApp && detailApp.id === applicationId) {
        setDetailApp(null);
      }
      showNotice('신청 내역이 삭제되었습니다.');
    } catch (error) {
      console.error('삭제 오류:', error);
      setActionError('신청 내역 삭제에 실패했습니다.');
    } finally {
      setBusyAppId(null);
    }
  };

  // 스터디 모집 상태 토글 및 저장
  const handleToggleRecruiting = async (track) => {
    setSavingTrackId(track.id);
    setActionError('');
    try {
      await saveStudyTrack({
        ...track,
        isRecruiting: !track.isRecruiting,
      });
      showNotice(`'${track.title}' 모집 상태가 업데이트되었습니다.`);
    } catch (error) {
      console.error('스터디 상태 저장 오류:', error);
      setActionError('스터디 설정 저장에 실패했습니다.');
    } finally {
      setSavingTrackId(null);
    }
  };

  // 스터디 세부 정보 수정 저장
  const handleUpdateTrackField = (trackId, field, value) => {
    setStudyTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, [field]: value } : t))
    );
  };

  const handleSaveTrackDetails = async (track) => {
    setSavingTrackId(track.id);
    setActionError('');
    try {
      await saveStudyTrack(track);
      showNotice(`'${track.title}' 과정 정보가 저장되었습니다.`);
    } catch (error) {
      console.error('스터디 저장 오류:', error);
      setActionError('스터디 정보 저장에 실패했습니다.');
    } finally {
      setSavingTrackId(null);
    }
  };

  // 신규 관리자 등록
  const handleAddAdmin = async (event) => {
    event.preventDefault();
    if (!newAdminForm.uid.trim() || !newAdminForm.email.trim() || !newAdminForm.displayName.trim()) {
      setActionError('추가할 관리자의 UID, 이메일, 이름을 모두 입력해주세요.');
      return;
    }

    setAddingAdmin(true);
    setActionError('');
    try {
      await addAdminUser(newAdminForm);
      const refreshed = await getAdminUsers();
      setAdminUsers(refreshed || []);
      setNewAdminForm({ uid: '', email: '', displayName: '', role: 'ADMIN' });
      showNotice('신규 관리자 권한이 등록되었습니다.');
    } catch (error) {
      console.error('관리자 추가 오류:', error);
      setActionError('관리자 등록에 실패했습니다. UID 형식(영문/숫자)을 확인해주세요.');
    } finally {
      setAddingAdmin(false);
    }
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  const activeTitle = MENU_ITEMS.find((item) => item.id === activeTab)?.label || '관리자 대시보드';

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* 모바일 사이드바 백드롭 */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
        />
      )}

      {/* 왼쪽 고정 사이드바 */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-slate-900 text-slate-100 transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-6">
          <span className="font-display text-base font-extrabold tracking-tight text-white">
            IT STUDY Admin
          </span>
          <button
            type="button"
            aria-label="사이드바 닫기"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 사이드바 메뉴 */}
        <nav aria-label="관리자 메뉴" className="flex-1 space-y-1 px-3 py-5">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 하단 메인 사이트 이동 & 로그아웃 */}
        <div className="space-y-1 border-t border-slate-800 p-3">
          <Link
            to="/"
            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            <span>메인 페이지 보기</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-950/50 hover:text-red-200 cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>로그아웃</span>
          </button>
        </div>
      </aside>

      {/* 우측 메인 콘텐츠 뷰포트 */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 상단 헤더 바 */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="메뉴 열기"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-display text-lg font-bold text-slate-900">{activeTitle}</h1>
            </div>
          </div>

          {/* 우측 로그인 관리자 정보 및 현재 날짜 */}
          <div className="flex items-center gap-5 text-right">
            <div className="hidden sm:block">
              <p className="text-xs font-medium text-slate-500">{formattedToday}</p>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <p className="text-xs font-semibold text-slate-900">
                {adminProfile?.displayName || currentUser?.displayName || '관리자'}
              </p>
              <p className="text-[11px] text-slate-500">{currentUser?.email}</p>
            </div>
          </div>
        </header>

        {/* 본문 작업 공간 */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {/* 상태 피드백 배너 */}
          {actionNotice && (
            <div
              role="status"
              className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
            >
              <Check className="h-4 w-4 shrink-0" />
              <span>{actionNotice}</span>
            </div>
          )}

          {actionError && (
            <div
              role="alert"
              className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* 탭 1: 대시보드 개요 */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 4개 통계 카드 */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="전체 신청자 수"
                  value={stats.total}
                  description="누적 스터디 지원서"
                  loading={loadingApps}
                />
                <StatCard
                  label="승인 대기"
                  value={stats.waiting}
                  description="검토가 필요한 지원자"
                  tone="amber"
                  loading={loadingApps}
                />
                <StatCard
                  label="승인 완료"
                  value={stats.approved}
                  description="스터디 합류 확정"
                  tone="green"
                  loading={loadingApps}
                />
                <StatCard
                  label="반려"
                  value={stats.rejected}
                  description="이번 기수 미선발"
                  tone="red"
                  loading={loadingApps}
                />
              </div>

              {/* 관심 분야별 지원 현황 요약 바 */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-sm font-bold text-slate-900">
                    관심 분야별 신청 분포
                  </h2>
                  <span className="text-xs text-slate-500">실시간 Firestore 연동</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {stats.byInterest.map((item) => (
                    <div
                      key={item.category}
                      className="rounded-lg border border-slate-100 bg-slate-50 p-3.5"
                    >
                      <p className="text-xs font-medium text-slate-500">{item.category}</p>
                      <p className="mt-1 font-display text-xl font-bold text-slate-900 tabular-nums">
                        {item.count}명
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 최근 신청자 목록 테이블 */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-base font-bold text-slate-900">
                    신청자 실시간 현황
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('applicants')}
                    className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                  >
                    전체 신청자 관리로 이동
                  </button>
                </div>

                <ApplicationTable
                  applications={filteredApplications}
                  loading={loadingApps}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  interestFilter={interestFilter}
                  onInterestFilterChange={setInterestFilter}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  onViewDetail={handleViewDetail}
                  onChangeStatus={handleChangeStatus}
                  onDelete={handleDeleteApplication}
                  busyId={busyAppId}
                />
              </div>
            </div>
          )}

          {/* 탭 2: 신청자 관리 전용 화면 */}
          {activeTab === 'applicants' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-600">
                  총 <strong className="font-mono tabular-nums text-slate-900">{filteredApplications.length}</strong>
                  명의 신청자가 표시되고 있습니다.
                </p>
                {(searchQuery || interestFilter !== '전체' || statusFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setInterestFilter('전체');
                      setStatusFilter('ALL');
                    }}
                    className="text-xs font-medium text-blue-700 hover:underline cursor-pointer"
                  >
                    필터 초기화
                  </button>
                )}
              </div>

              <ApplicationTable
                applications={filteredApplications}
                loading={loadingApps}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                interestFilter={interestFilter}
                onInterestFilterChange={setInterestFilter}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                onViewDetail={handleViewDetail}
                onChangeStatus={handleChangeStatus}
                onDelete={handleDeleteApplication}
                busyId={busyAppId}
              />
            </div>
          )}

          {/* 탭 3: 스터디 관리 및 관리자 권한 설정 */}
          {activeTab === 'studies' && (
            <div className="space-y-8">
              {/* 스터디 트랙 설정 */}
              <section>
                <h2 className="font-display text-base font-bold text-slate-900">
                  스터디 과정 모집 상태 및 커리큘럼 설정
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  모집 상태 변경 시 메인 페이지의 스터디 소개 카드 및 모집 상태가 즉시 반영됩니다.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {studyTracks.map((track) => {
                    const isSaving = savingTrackId === track.id;
                    return (
                      <div
                        key={track.id}
                        className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className="font-mono text-xs font-semibold text-blue-700">
                              {track.category}
                            </span>
                            <h3 className="mt-0.5 font-display text-base font-bold text-slate-900">
                              {track.title}
                            </h3>
                          </div>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleToggleRecruiting(track)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              track.isRecruiting
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {track.isRecruiting ? '모집 중 (클릭 시 마감)' : '모집 마감 (클릭 시 재개)'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-medium text-slate-600">
                              진행 일정
                            </label>
                            <input
                              type="text"
                              value={track.schedule}
                              onChange={(e) =>
                                handleUpdateTrackField(track.id, 'schedule', e.target.value)
                              }
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-700 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600">
                              모집 정원 (명)
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={500}
                              value={track.capacity}
                              onChange={(e) =>
                                handleUpdateTrackField(track.id, 'capacity', Number(e.target.value))
                              }
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs tabular-nums text-slate-900 focus:border-blue-700 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600">
                            과정 소개 요약
                          </label>
                          <textarea
                            rows={2}
                            value={track.summary}
                            onChange={(e) =>
                              handleUpdateTrackField(track.id, 'summary', e.target.value)
                            }
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs leading-relaxed text-slate-900 focus:border-blue-700 focus:outline-none"
                          />
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleSaveTrackDetails(track)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                          >
                            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                            변경 사항 저장
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* 관리자 권한 계정 관리 */}
              <section className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="font-display text-base font-bold text-slate-900">
                  관리자 권한 등록 계정 (<code className="font-mono text-xs">/admins</code>)
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Firebase 인증 여부와 별개로 Firestore{' '}
                  <code className="font-mono">admins</code> 컬렉션에 등록된 UID만 관리자
                  대시보드에 접근할 수 있습니다. (내 UID:{' '}
                  <code className="font-mono text-slate-800">{currentUser?.uid}</code>)
                </p>

                <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-2.5">이름</th>
                        <th className="px-4 py-2.5">이메일</th>
                        <th className="px-4 py-2.5">Firebase UID</th>
                        <th className="px-4 py-2.5">권한 등급</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminUsers.map((adm) => (
                        <tr key={adm.uid}>
                          <td className="px-4 py-2.5 font-semibold text-slate-900">
                            {adm.displayName}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">{adm.email}</td>
                          <td className="px-4 py-2.5 font-mono text-slate-500">{adm.uid}</td>
                          <td className="px-4 py-2.5 font-mono font-semibold text-blue-700">
                            {adm.role}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 신규 관리자 UID 추가 폼 */}
                <form
                  onSubmit={handleAddAdmin}
                  className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-4"
                >
                  <input
                    type="text"
                    placeholder="Firebase Auth UID"
                    value={newAdminForm.uid}
                    onChange={(e) => setNewAdminForm((p) => ({ ...p, uid: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                  <input
                    type="email"
                    placeholder="관리자 이메일"
                    value={newAdminForm.email}
                    onChange={(e) => setNewAdminForm((p) => ({ ...p, email: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="이름"
                    value={newAdminForm.displayName}
                    onChange={(e) =>
                      setNewAdminForm((p) => ({ ...p, displayName: e.target.value }))
                    }
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={addingAdmin}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    관리자 추가
                  </button>
                </form>
              </section>
            </div>
          )}
        </main>
      </div>

      {/* 신청자 상세 정보 모달 */}
      {detailApp && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={() => setDetailApp(null)}
            className="animate-modal-backdrop fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
          />
          <div className="animate-modal-panel relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 id="detail-modal-title" className="font-display text-lg font-bold text-slate-900">
                  신청자 상세 정보
                </h2>
                <p className="font-mono text-xs text-slate-500">{detailApp.id}</p>
              </div>
              <button
                type="button"
                aria-label="상세 모달 닫기"
                onClick={() => setDetailApp(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-6 text-sm">
              {loadingDetail && (
                <p className="text-xs text-slate-500">최신 Firestore 정보를 동기화하고 있습니다...</p>
              )}

              <dl className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-500">이름</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900">{detailApp.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">상태</dt>
                  <dd className="mt-1">
                    <span
                      className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${
                        (STATUS_BADGE[detailApp.status] || STATUS_BADGE.WAITING).className
                      }`}
                    >
                      {(STATUS_BADGE[detailApp.status] || STATUS_BADGE.WAITING).label}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">이메일</dt>
                  <dd className="mt-0.5 text-slate-800">{detailApp.email}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">연락처</dt>
                  <dd className="mt-0.5 font-mono text-xs tabular-nums text-slate-800">
                    {detailApp.phone}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">관심 분야</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">{detailApp.interest}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">개발 경험</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">{detailApp.level}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">신청일</dt>
                  <dd className="mt-0.5 font-mono text-xs tabular-nums text-slate-700">
                    {formatDateKR(detailApp.createdAt)}
                  </dd>
                </div>
              </dl>

              <div>
                <p className="text-xs font-semibold text-slate-600">신청 동기</p>
                <div className="mt-1.5 whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-800">
                  {detailApp.motivation}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                disabled={busyAppId === detailApp.id}
                onClick={() => handleDeleteApplication(detailApp.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                삭제
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busyAppId === detailApp.id || detailApp.status === 'REJECTED'}
                  onClick={() => handleChangeStatus(detailApp.id, 'REJECTED')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-45 cursor-pointer"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  반려
                </button>
                <button
                  type="button"
                  disabled={busyAppId === detailApp.id || detailApp.status === 'APPROVED'}
                  onClick={() => handleChangeStatus(detailApp.id, 'APPROVED')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-45 cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  승인
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
