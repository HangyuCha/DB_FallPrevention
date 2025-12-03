# 낙상방지 프로젝트 — 간단한 DB UI (브라우저)

이 저장소는 낙상방지 프로젝트를 위한 간단한 CRUD 웹 UI 데모입니다. 로컬 브라우저(localStorage)를 데이터 저장소로 사용하며 다음 연산을 지원합니다:

- SELECT (간단한 WHERE 지원)
- INSERT
- UPDATE
- DELETE

특징:
- 트렌디한 디자인(그라디언트 네비게이션, 카드 레이아웃)
# 낙상방지 프로젝트 — 간단한 DB UI (브라우저)

이 저장소는 낙상방지 프로젝트를 위한 간단한 CRUD 웹 UI 데모입니다. 로컬 브라우저(localStorage)를 데이터 저장소로 사용하며 다음 연산을 지원합니다:

- SELECT (간단한 WHERE 지원)
- INSERT
- UPDATE
- DELETE

특징:
- 트렌디한 디자인(그라디언트 네비게이션, 카드 레이아웃)
- 반응형 상단 메뉴 및 로그인 모달
- SQL같은 간단한 콘솔에서 명령 실행
- JSON 내보내기/가져오기

사용법

1. 프로젝트 루트를 연 뒤 의존성을 설치합니다:

```bash
cd "/Users/hangyu/Desktop/DB 프로젝트"
npm install
```

2. 개발 서버 실행:

```bash
npm run dev
```

3. 브라우저에서 열기:

```bash
open "http://localhost:5173"
```

UI 설명

- 상단: 로고와 메뉴, 로그인/로그아웃 버튼 (반응형)
- 홈(히어로) 섹션: 처음 접속 시 요약과 CTA
- 좌측: 빠른 액션(레코드 추가, 가져오기/내보내기) 및 SQL 콘솔
- 우측: 테이블로 레코드 목록 표시
- 레코드 추가/수정은 모달로 처리

파일 구조(중요):

```
./
├─ index.html            # 진입점(루트에 위치)
├─ package.json
├─ src/
│  ├─ js/app.js          # 클라이언트 로직
│  └─ css/styles.css     # 커스텀 스타일
└─ assets/
   ├─ logo.svg
   └─ Logo.png
```

제한사항 및 다음 단계

- 이 구현은 교육용이며 단일 브라우저(localStorage)에만 저장됩니다.
- 실제 서버/DB 연동이 필요하면 백엔드 API(Express, Flask 등)를 추가하고 fetch로 연결하면 됩니다.

원하시면 다음을 도와드릴게요:
- 백엔드(REST API) 추가 및 연결
- SQL 파서 확장(복잡한 WHERE, LIKE, AND/OR 등)
- 인증, 페이징, 정렬 UI 추가

작성자: 데모 자동 생성

## 개발 서버 (로컬에서 보기)

이 프로젝트를 로컬에서 `npm run dev`로 실행하려면 Node.js(권장 v18+)가 필요합니다.

기본적으로 Vite가 개발 서버를 시작하며, 브라우저에서 http://localhost:5173 에서 확인할 수 있습니다.

문제가 생기면 터미널 출력(오류 메시지)을 붙여서 알려 주세요.

## 백엔드 연동 (Flask)

동일 워크스페이스의 `DB repository/db-project-fall-detection` Flask 서버와 기본 연동이 되어 있습니다. 개발 모드에서는 Vite 프록시가 `/api` 요청을 `http://localhost:5000`으로 전달합니다.

- 프록시 설정: `vite.config.js`
- 프론트 API 클라이언트: `src/js/api.js`
- 백엔드 API 엔드포인트(Flask):
   - `GET /api/health` — 상태 확인
   - `GET /api/media` — Firebase Storage의 동영상/이미지 목록(+ 서명 URL)
   - `GET /api/streams` — 가용한 실시간 스트림 경로 목록(`/video_stream{카메라}_{종류}`)
   - `GET /api/detections` — 최근 감지 이벤트(감지 노드가 없으면 `event` 노드 기준 단순 매핑)

프론트는 백엔드 연결이 실패해도 동작하도록 설계되었고, 연결 가능 시 자동으로 원격 데이터를 가져와 `localStorage` 캐시를 갱신합니다.

### 실행 순서

1) 백엔드(Flask) 실행

```bash
cd "/Users/hangyu/Desktop/홍익대/3학년 2학기/세종/DB/DB repository/db-project-fall-detection"
pip install -r requirements.txt
python app.py
```

2) 프론트엔드(Vite) 실행

```bash
cd "/Users/hangyu/Desktop/홍익대/3학년 2학기/세종/DB/DB 프로젝트"
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속 후, 대시보드/비디오/탐지 화면이 백엔드 데이터로 점차 갱신됩니다(최대 60초 간격 자동 동기화). 실시간 스트림은 `GET /api/streams`로 받은 각 경로(`/video_stream...`)를 `<img>`/`<video>`로 직접 열어 확인할 수 있습니다.
