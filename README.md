# IT STUDY — IT 스터디 모집 및 신청 관리 웹사이트

React, Vite, Firebase Authentication, Firebase Firestore를 기반으로 구축된 IT 개발 스터디 모집 및 실시간 관리자 대시보드 웹 애플리케이션입니다.

## 주요 기능

### 1. 일반 사용자 기능 (`/`)
- **모집 현황 및 스터디 소개**: Firestore `studies` 컬렉션과 연동되어 실시간 모집 상태(`모집 중` / `모집 마감`) 및 4가지 핵심 과정(Java 백엔드, React 프론트엔드, Spring Boot 프로젝트, 생성형 AI 활용)을 확인할 수 있습니다.
- **온라인 스터디 신청 모달**: 이름, 이메일, 휴대폰 번호, 관심 분야, 개발 경험, 신청 동기를 입력해 신청할 수 있습니다.
  - 필수 항목 및 이메일/휴대폰 형식 유효성 검사
  - 중복 클릭 및 동일 이메일·관심 분야 중복 제출 방지
  - 제출 시 Firestore `applications` 컬렉션에 `status: "WAITING"`, `createdAt: serverTimestamp()`로 저장

### 2. 관리자 기능 (`/admin/login`, `/admin/dashboard`)
- **이중 관리자 검증**: Firebase Authentication 로그인뿐만 아니라 Firestore `/admins/{uid}` 문서를 검증하여 등록된 관리자만 대시보드에 접근할 수 있습니다.
- **실시간 신청자 관리 (`onSnapshot`)**: 전체/승인 대기/승인 완료/반려 통계 카드, 이름 검색, 관심 분야 필터, 상태 필터, 신청자 상세 보기, 승인/반려 상태 업데이트 및 삭제 기능을 제공합니다.
- **스터디 과정 및 관리자 계정 관리**: 각 과정의 모집 상태(`모집 중`/`모집 마감`), 일정, 정원, 소개 문구를 수정하거나 신규 관리자 UID를 등록할 수 있습니다.

---

## 폴더 구조

```text
src/
  components/
    Header.jsx              # 상단 네비게이션 바 (IT STUDY, 메뉴, 관리자 이동)
    Footer.jsx              # 하단 푸터
    ApplicationModal.jsx    # 신청 모달 (유효성 검사, 중복 제출 방지, Firestore 저장)
    StatCard.jsx            # 대시보드 통계 카드
    ApplicationTable.jsx    # 신청자 목록 테이블 및 검색/필터/관리 액션
  pages/
    Home.jsx                # 메인 랜딩 페이지
    AdminLogin.jsx          # 관리자 로그인 페이지
    AdminDashboard.jsx      # 전체 화면 관리자 대시보드
  services/
    applicationService.js   # Firestore CRUD, 실시간 구독, 관리자 권한 검증
  firebase/
    firebase.js             # Firebase 앱, Auth, Firestore 초기화 및 연결 검증
  App.jsx                   # React Router 및 관리자 라우트 보호
  main.jsx                  # React 진입점
  index.css                 # Tailwind CSS 및 애니메이션 정의
```

---

## Firebase 설정 및 보안 규칙 (`firestore.rules`)

1. **설정 파일 (`firebase-applet-config.json`)**
   - 프로젝트 루트의 `firebase-applet-config.json`에 `projectId`, `apiKey`, `authDomain`, `firestoreDatabaseId` 등이 설정되어 있으며 `src/firebase/firebase.js`에서 이를 불러옵니다.
2. **Firestore 컬렉션 구조**
   - `applications/{applicationId}`: 신청서 데이터 (`id`, `name`, `email`, `phone`, `interest`, `level`, `motivation`, `status`, `createdAt`)
   - `admins/{adminId}`: 별도 관리자 권한 검증용 계정 문서 (`uid`, `email`, `displayName`, `role`, `createdAt`)
   - `studies/{studyId}`: 스터디 과정 안내 및 모집 여부 (`id`, `title`, `category`, `schedule`, `capacity`, `isRecruiting`, `summary`, `updatedAt`)
3. **보안 규칙 핵심 정책 (`firestore.rules`)**
   - 일반 사용자는 `/applications` 컬렉션에 **`WAITING` 상태로 생성(`create`)만 가능**하며, 목록(`list`)이나 타인의 신청서 조회(`get`), 수정, 삭제는 완전히 차단됩니다.
   - `isAdmin()` 함수는 `request.auth.token.email_verified == true`와 Firestore `admins/{uid}` 존재 여부를 함께 검증합니다.
   - 이메일/비밀번호 로그인을 추가로 사용하려면 Firebase Console > Authentication > Sign-in method에서 **이메일/비밀번호** 공급자를 활성화하고, 해당 사용자의 UID를 관리자 대시보드 **스터디 관리 > 관리자 권한 등록 계정** 또는 Firestore `admins` 컬렉션에 등록하세요.

---

## 로컬 실행 방법

```bash
# 1. 의존성 패키지 설치
npm install

# 2. 개발 서버 실행 (http://localhost:3000)
npm run dev

# 3. 프로덕션 빌드 검증
npm run build
```
