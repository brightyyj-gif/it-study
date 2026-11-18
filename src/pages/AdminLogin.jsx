// 관리자 전용 로그인 페이지 (Firebase Authentication + 별도 관리자 권한 검증)
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithPopup, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { ArrowLeft, ShieldCheck, AlertCircle, Loader2, Lock } from 'lucide-react';
import { auth, googleProvider } from '../firebase/firebase';
import { verifyAdminPrivilege } from '../services/applicationService';

export default function AdminLogin({ currentUser, isAdmin, authLoading, onAdminVerified }) {
  const navigate = useNavigate();

  const [loginMode, setLoginMode] = useState('google'); // 'google' | 'email'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 이미 관리자 인증 및 권한 검증이 완료된 상태라면 대시보드로 이동
  useEffect(() => {
    if (!authLoading && currentUser && isAdmin) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [authLoading, currentUser, isAdmin, navigate]);

  // Firebase 로그인 성공 후 별도의 Firestore 관리자 권한 검증 수행
  const handlePostAuthVerification = async (user) => {
    const result = await verifyAdminPrivilege(user);
    if (!result.isAdmin) {
      // 인증은 되었으나 관리자 권한이 없는 계정인 경우 즉시 로그아웃 및 접근 차단
      await signOut(auth);
      setErrorMsg(result.reason || '관리자 권한이 없는 계정입니다.');
      return;
    }

    if (onAdminVerified) {
      onAdminVerified(result.adminProfile);
    }
    navigate('/admin/dashboard', { replace: true });
  };

  // Google 계정 팝업 로그인
  const handleGoogleLogin = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setErrorMsg('');

    try {
      const credential = await signInWithPopup(auth, googleProvider);
      await handlePostAuthVerification(credential.user);
    } catch (error) {
      console.error('Google 로그인 오류:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        setErrorMsg('로그인 팝업 창이 닫혔습니다. 다시 시도해주세요.');
      } else if (error.code === 'auth/popup-blocked') {
        setErrorMsg('브라우저에서 팝업이 차단되었습니다. 팝업 차단을 해제한 뒤 다시 시도해주세요.');
      } else {
        setErrorMsg('Google 로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // 이메일/비밀번호 로그인 (Firebase 콘솔에서 이메일/비밀번호 공급자 활성화 시 사용)
  const handleEmailLogin = async (event) => {
    event.preventDefault();
    if (isProcessing) return;

    if (!email.trim() || !password) {
      setErrorMsg('관리자 이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      await handlePostAuthVerification(credential.user);
    } catch (error) {
      console.error('이메일 로그인 오류:', error);
      if (error.code === 'auth/operation-not-allowed') {
        setErrorMsg(
          'Firebase 콘솔에서 이메일/비밀번호 로그인이 활성화되지 않았습니다. Google 관리자 로그인을 사용하거나 콘솔에서 공급자를 활성화해주세요.'
        );
      } else if (
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/user-not-found'
      ) {
        setErrorMsg('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else {
        setErrorMsg('로그인 처리 중 오류가 발생했습니다.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        {/* 상단 메인 사이트 복귀 링크 */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          메인 페이지로 돌아가기
        </Link>

        {/* 로그인 카드 */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-7 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-slate-900">IT STUDY 관리자</h1>
              <p className="text-xs text-slate-500">
                등록된 관리자 권한 계정으로만 대시보드에 접근할 수 있습니다.
              </p>
            </div>
          </div>

          {/* 로그인 방식 전환 탭 */}
          <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setLoginMode('google');
                setErrorMsg('');
              }}
              className={`rounded-md py-2 text-xs font-semibold transition-colors cursor-pointer ${
                loginMode === 'google'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Google 관리자 인증
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode('email');
                setErrorMsg('');
              }}
              className={`rounded-md py-2 text-xs font-semibold transition-colors cursor-pointer ${
                loginMode === 'email'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              이메일 / 비밀번호
            </button>
          </div>

          {/* 에러 메시지 표시 */}
          {errorMsg && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs leading-relaxed text-red-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {loginMode === 'google' ? (
            <div className="mt-6 space-y-4">
              <p className="text-xs leading-relaxed text-slate-600">
                Firebase Authentication 인증 후 Firestore <code className="font-mono">admins</code>{' '}
                권한 테이블을 대조하여 관리자 여부를 검증합니다.
              </p>

              <button
                type="button"
                disabled={isProcessing || authLoading}
                onClick={handleGoogleLogin}
                className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    권한 확인 중...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Google 계정으로 로그인
                  </>
                )}
              </button>
            </div>
          ) : (
            <form onSubmit={handleEmailLogin} className="mt-6 space-y-4">
              <div>
                <label htmlFor="admin-email" className="block text-xs font-semibold text-slate-700">
                  관리자 이메일
                </label>
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@itstudy.kr"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-semibold text-slate-700"
                >
                  비밀번호
                </label>
                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                disabled={isProcessing || authLoading}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    로그인 중...
                  </>
                ) : (
                  '관리자 로그인'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
