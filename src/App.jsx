// 애플리케이션 루트 라우팅, 관리자 인증 상태 관리 및 ErrorBoundary 컴포넌트
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/firebase';
import { verifyAdminPrivilege } from './services/applicationService';
import Home from './pages/Home';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

/**
 * Firestore 또는 렌더링 예외 발생 시 사용자에게 안전한 복구 화면을 제공하는 ErrorBoundary
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || '알 수 없는 오류가 발생했습니다.',
    };
  }

  componentDidCatch(error, info) {
    console.error('애플리케이션 오류 경계 포착:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <h1 className="font-display text-xl font-bold text-slate-900">
              화면 처리 중 오류가 발생했습니다
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              네트워크 상태나 권한 설정을 확인한 뒤 페이지를 새로고침해주세요.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 cursor-pointer"
            >
              새로고침
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * 관리자 인증 및 별도 권한 검증이 완료된 사용자만 통과시키는 보호 라우트
 */
function ProtectedAdminRoute({ authLoading, currentUser, isAdmin, children }) {
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700" />
          <p className="mt-3 text-xs font-medium text-slate-600">
            관리자 권한을 확인하고 있습니다...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Firebase Authentication 로그인 상태 변화 감지 및 Firestore admins 권한 검증
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCurrentUser(null);
        setAdminProfile(null);
        setIsAdmin(false);
        setAuthLoading(false);
        return;
      }

      setAuthLoading(true);
      const verification = await verifyAdminPrivilege(user);
      if (verification.isAdmin) {
        setCurrentUser(user);
        setAdminProfile(verification.adminProfile || null);
        setIsAdmin(true);
      } else {
        setCurrentUser(user);
        setAdminProfile(null);
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* 일반 사용자 메인 페이지 */}
          <Route path="/" element={<Home isAdminAuthenticated={Boolean(currentUser && isAdmin)} />} />

          {/* 관리자 로그인 페이지 */}
          <Route
            path="/admin/login"
            element={
              <AdminLogin
                currentUser={currentUser}
                isAdmin={isAdmin}
                authLoading={authLoading}
                onAdminVerified={(profile) => {
                  setAdminProfile(profile);
                  setIsAdmin(true);
                }}
              />
            }
          />

          {/* /admin 접근 시 대시보드로 리다이렉트 (미인증 시 ProtectedAdminRoute가 로그인으로 이동) */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

          {/* 관리자 전용 대시보드 (인증 + Firestore 권한 필수) */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedAdminRoute
                authLoading={authLoading}
                currentUser={currentUser}
                isAdmin={isAdmin}
              >
                <AdminDashboard currentUser={currentUser} adminProfile={adminProfile} />
              </ProtectedAdminRoute>
            }
          />

          {/* 알 수 없는 경로는 메인으로 이동 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
