// Firebase SDK 초기화 및 서비스(Authentication, Firestore) 설정 파일
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// 1. Firebase 앱 인스턴스 초기화
const app = initializeApp(firebaseConfig);

// 2. 지정된 Firestore 데이터베이스 ID를 연결하여 Firestore 인스턴스 생성
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// 3. Firebase Authentication 인스턴스 및 Google 로그인 공급자 생성
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// 4. 앱 부팅 시 Firestore 서버 연결 상태를 사전 검증하는 함수
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Firebase 연결에 실패했습니다. firebase-applet-config.json 설정을 확인해주세요.');
    }
  }
}

testConnection();

export default app;
