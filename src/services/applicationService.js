// Firestore 데이터 연동 및 관리자 권한 검증 서비스 레이어
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';

// 컬렉션 이름 상수 정의
const APPLICATIONS_COLLECTION = 'applications';
const ADMINS_COLLECTION = 'admins';
const STUDIES_COLLECTION = 'studies';

// 최초 프로젝트 소유자(부트스트랩 관리자) 이메일
const BOOTSTRAPPED_ADMIN_EMAIL = 'brightyyj@gmail.com';

// 중복 제출 방지를 위한 로컬 스토리지 키
const SUBMITTED_CACHE_KEY = 'it_study_submitted_records';

// Firestore 작업 유형 열거형 (구조화 에러 로깅용)
export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

// 기본 스터디 트랙 데이터 (Firestore에 초기 문서가 없을 때 표시 및 시딩에 사용)
export const DEFAULT_STUDY_TRACKS = [
  {
    id: 'java-backend',
    title: 'Java 백엔드 과정',
    category: 'Java',
    schedule: '매주 화·목 19:30 (온라인)',
    capacity: 15,
    isRecruiting: true,
    summary:
      '객체지향 설계 원칙과 JVM 메모리 구조, 컬렉션 프레임워크, 테스트 주도 개발을 기반으로 탄탄한 백엔드 기초를 다집니다.',
  },
  {
    id: 'react-frontend',
    title: 'React 프론트엔드 과정',
    category: 'React',
    schedule: '매주 수·금 19:30 (온라인)',
    capacity: 15,
    isRecruiting: true,
    summary:
      '컴포넌트 설계 패턴, 비동기 상태 관리, 렌더링 성능 최적화와 반응형 UI 구현을 실전 프로젝트로 익힙니다.',
  },
  {
    id: 'springboot-project',
    title: 'Spring Boot 프로젝트',
    category: 'Spring Boot',
    schedule: '매주 토 14:00 (온·오프라인 병행)',
    capacity: 12,
    isRecruiting: true,
    summary:
      'REST API 설계, JPA 연관관계 모델링, Spring Security 인증/인가부터 클라우드 배포까지 팀 협업으로 완성합니다.',
  },
  {
    id: 'generative-ai',
    title: '생성형 AI 활용 과정',
    category: 'AI',
    schedule: '매주 일 14:00 (온·오프라인 병행)',
    capacity: 12,
    isRecruiting: true,
    summary:
      '최신 LLM API 연동, 구조화된 프롬프트 엔지니어링, RAG 파이프라인 구축으로 실무 서비스에 AI 기능을 통합합니다.',
  },
];

/**
 * Firestore 권한 오류 등 예외 발생 시 상세 컨텍스트를 JSON 형태로 던지는 공통 에러 핸들러
 * @param {unknown} error - 발생한 원본 에러 객체
 * @param {string} operationType - OperationType 값 (create, get, list, update, delete)
 * @param {string | null} path - 접근한 Firestore 경로
 */
export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * 고유하고 안전한 신청 ID 생성 (영문자, 숫자, 하이픈, 언더스코어만 허용)
 * @returns {string} 생성된 문서 ID
 */
function generateApplicationId() {
  const randomPart =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/[^a-zA-Z0-9-]/g, '')
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `app-${randomPart}`;
}

/**
 * 브라우저 내 동일 이메일 + 관심 분야 중복 제출 여부 확인
 * @param {string} email - 정규화된 이메일
 * @param {string} interest - 선택한 관심 분야
 * @returns {boolean} 중복 여부
 */
export function hasAlreadySubmitted(email, interest) {
  try {
    const raw = localStorage.getItem(SUBMITTED_CACHE_KEY);
    if (!raw) return false;
    const records = JSON.parse(raw);
    if (!Array.isArray(records)) return false;
    const targetKey = `${email.trim().toLowerCase()}::${interest}`;
    return records.includes(targetKey);
  } catch {
    return false;
  }
}

/**
 * 신청 완료된 (이메일 + 관심 분야) 조합을 로컬 스토리지에 기록하여 중복 제출 방지
 * @param {string} email
 * @param {string} interest
 */
function markAsSubmitted(email, interest) {
  try {
    const raw = localStorage.getItem(SUBMITTED_CACHE_KEY);
    const records = raw ? JSON.parse(raw) : [];
    const safeList = Array.isArray(records) ? records : [];
    const targetKey = `${email.trim().toLowerCase()}::${interest}`;
    if (!safeList.includes(targetKey)) {
      safeList.push(targetKey);
      localStorage.setItem(SUBMITTED_CACHE_KEY, JSON.stringify(safeList));
    }
  } catch {
    // 스토리지 접근 불가 환경에서는 무시
  }
}

/**
 * 1. 신청 데이터 등록 (일반 사용자 공개 기능)
 * - 최초 status는 반드시 'WAITING'으로 저장되며 createdAt은 서버 타임스탬프를 사용합니다.
 * @param {Object} formData - { name, email, phone, interest, level, motivation }
 * @returns {Promise<Object>} 등록된 신청서 정보
 */
export async function createApplication(formData) {
  const id = generateApplicationId();
  const docRef = doc(db, APPLICATIONS_COLLECTION, id);

  // 보안 규칙 및 firebase-blueprint.json 제약에 맞게 입력값 정제
  const payload = {
    id,
    name: formData.name.trim().slice(0, 50),
    email: formData.email.trim().toLowerCase().slice(0, 120),
    phone: formData.phone.trim().slice(0, 25),
    interest: formData.interest,
    level: formData.level,
    motivation: formData.motivation.trim().slice(0, 1000),
    status: 'WAITING',
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(docRef, payload);
    markAsSubmitted(payload.email, payload.interest);
    return {
      ...payload,
      createdAt: new Date(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${APPLICATIONS_COLLECTION}/${id}`);
  }
}

/**
 * 2. 전체 신청자 목록 단건 조회 (관리자 전용)
 * @returns {Promise<Array>} 신청자 배열 (최신순 정렬)
 */
export async function getApplications() {
  try {
    const q = query(collection(db, APPLICATIONS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      ...docSnap.data(),
      id: docSnap.id,
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, APPLICATIONS_COLLECTION);
  }
}

/**
 * 3. 신청자 상세 정보 단건 조회 (관리자 전용)
 * @param {string} applicationId - 조회할 신청 문서 ID
 * @returns {Promise<Object | null>} 신청서 상세 데이터
 */
export async function getApplicationById(applicationId) {
  const path = `${APPLICATIONS_COLLECTION}/${applicationId}`;
  try {
    const docSnap = await getDoc(doc(db, APPLICATIONS_COLLECTION, applicationId));
    if (!docSnap.exists()) return null;
    return {
      ...docSnap.data(),
      id: docSnap.id,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * 4. 신청 상태 변경 (관리자 전용: WAITING | APPROVED | REJECTED)
 * @param {string} applicationId - 신청 문서 ID
 * @param {'WAITING' | 'APPROVED' | 'REJECTED'} nextStatus - 변경할 상태
 */
export async function updateApplicationStatus(applicationId, nextStatus) {
  const path = `${APPLICATIONS_COLLECTION}/${applicationId}`;
  try {
    await updateDoc(doc(db, APPLICATIONS_COLLECTION, applicationId), {
      status: nextStatus,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * 5. 신청 데이터 삭제 (관리자 전용)
 * @param {string} applicationId - 삭제할 신청 문서 ID
 */
export async function deleteApplication(applicationId) {
  const path = `${APPLICATIONS_COLLECTION}/${applicationId}`;
  try {
    await deleteDoc(doc(db, APPLICATIONS_COLLECTION, applicationId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * 6. 실시간 신청자 목록 변경 감지 구독 (관리자 전용)
 * @param {Function} onData - 데이터 변경 시 호출할 콜백 (applications => void)
 * @param {Function} onError - 오류 발생 시 호출할 콜백 (optional)
 * @returns {Function} 구독 해제 함수 (unsubscribe)
 */
export function subscribeToApplications(onData, onError) {
  const q = query(collection(db, APPLICATIONS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: docSnap.id,
      }));
      onData(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.LIST, APPLICATIONS_COLLECTION);
      }
    }
  );
}

/**
 * 7. 별도 관리자 권한 검증 (Firebase Auth + Firestore /admins/{uid} 검증)
 * - 단순 Firebase Auth 로그인 여부만으로 관리자 권한을 부여하지 않고,
 *   Firestore의 admins 컬렉션 등록 여부를 검증합니다.
 * @param {import('firebase/auth').User | null} user
 * @returns {Promise<{ isAdmin: boolean, adminProfile?: Object, reason?: string }>}
 */
export async function verifyAdminPrivilege(user) {
  if (!user) {
    return { isAdmin: false, reason: '로그인이 필요합니다.' };
  }
  if (!user.emailVerified) {
    return { isAdmin: false, reason: '이메일 인증이 완료된 계정만 접근할 수 있습니다.' };
  }

  const adminRef = doc(db, ADMINS_COLLECTION, user.uid);
  try {
    const adminSnap = await getDoc(adminRef);
    if (adminSnap.exists()) {
      const data = adminSnap.data();
      if (data.role === 'ADMIN' || data.role === 'SUPER_ADMIN') {
        return { isAdmin: true, adminProfile: data };
      }
    }

    // 부트스트랩 관리자 이메일로 최초 로그인한 경우 admins 컬렉션에 자동 등록
    if (user.email === BOOTSTRAPPED_ADMIN_EMAIL) {
      const newAdminProfile = {
        uid: user.uid,
        email: user.email,
        displayName: (user.displayName || '최고 관리자').slice(0, 80),
        role: 'SUPER_ADMIN',
        createdAt: serverTimestamp(),
      };
      await setDoc(adminRef, newAdminProfile);
      return { isAdmin: true, adminProfile: { ...newAdminProfile, createdAt: new Date() } };
    }

    return {
      isAdmin: false,
      reason: '관리자 권한이 부여되지 않은 계정입니다. 등록된 관리자 계정으로 로그인해주세요.',
    };
  } catch (error) {
    // 권한 거부 또는 네트워크 오류 시 안전하게 접근 차단
    console.error('관리자 권한 검증 실패:', error);
    return {
      isAdmin: false,
      reason: '관리자 권한을 확인할 수 없습니다. 관리자에게 문의하세요.',
    };
  }
}

/**
 * 8. 등록된 관리자 목록 조회 (관리자 전용)
 * @returns {Promise<Array>} 관리자 목록
 */
export async function getAdminUsers() {
  try {
    const snapshot = await getDocs(collection(db, ADMINS_COLLECTION));
    return snapshot.docs.map((docSnap) => ({
      ...docSnap.data(),
      uid: docSnap.id,
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ADMINS_COLLECTION);
  }
}

/**
 * 9. 신규 관리자 권한 등록 (기존 관리자 전용)
 * @param {Object} adminData - { uid, email, displayName, role }
 */
export async function addAdminUser(adminData) {
  const uid = adminData.uid.trim();
  const path = `${ADMINS_COLLECTION}/${uid}`;
  try {
    await setDoc(doc(db, ADMINS_COLLECTION, uid), {
      uid,
      email: adminData.email.trim().toLowerCase().slice(0, 120),
      displayName: adminData.displayName.trim().slice(0, 80),
      role: adminData.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * 10. 스터디 과정 목록 실시간 구독 (메인 페이지 및 관리자 스터디 관리 화면 공용)
 * @param {Function} onData
 * @returns {Function} unsubscribe
 */
export function subscribeToStudyTracks(onData) {
  return onSnapshot(
    collection(db, STUDIES_COLLECTION),
    (snapshot) => {
      if (snapshot.empty) {
        onData(DEFAULT_STUDY_TRACKS);
        return;
      }
      const map = new Map();
      snapshot.docs.forEach((d) => map.set(d.id, { ...d.data(), id: d.id }));
      // 기본 트랙 순서를 유지하면서 Firestore 저장 데이터 병합
      const merged = DEFAULT_STUDY_TRACKS.map((def) => map.get(def.id) || def);
      snapshot.docs.forEach((d) => {
        if (!DEFAULT_STUDY_TRACKS.some((def) => def.id === d.id)) {
          merged.push({ ...d.data(), id: d.id });
        }
      });
      onData(merged);
    },
    (error) => {
      console.warn('스터디 목록 구독 중 오류가 발생하여 기본 목록을 표시합니다:', error);
      onData(DEFAULT_STUDY_TRACKS);
    }
  );
}

/**
 * 11. 스터디 과정 정보 업데이트 / 초기 등록 (관리자 전용)
 * @param {Object} track - { id, title, category, schedule, capacity, isRecruiting, summary }
 */
export async function saveStudyTrack(track) {
  const path = `${STUDIES_COLLECTION}/${track.id}`;
  try {
    const ref = doc(db, STUDIES_COLLECTION, track.id);
    const snap = await getDoc(ref);
    const payload = {
      id: track.id,
      title: track.title.trim().slice(0, 80),
      category: track.category,
      schedule: track.schedule.trim().slice(0, 80),
      capacity: Number(track.capacity) || 12,
      isRecruiting: Boolean(track.isRecruiting),
      summary: track.summary.trim().slice(0, 300),
      updatedAt: serverTimestamp(),
    };
    if (snap.exists()) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
