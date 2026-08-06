# Conception Job Flow 설치·운영 안내서

이 문서는 GitHub에서 Conception Job Flow를 내려받아 설치하고 운영하는 방법을 설명합니다.

현재 기본 실행 주소는 다음과 같습니다.

```text
http://localhost:3002
```

`localhost:5180`은 이전 개발 주소이므로 현재는 사용하지 않습니다.

## 1. GitHub에서 다운로드

저장소 주소:

```text
https://github.com/goosang-jung/Conception-Job-Flow
```

### 방법 A. ZIP으로 받기

1. GitHub 저장소에 접속합니다.
2. 초록색 `Code` 버튼을 누릅니다.
3. `Download ZIP`을 선택합니다.
4. ZIP 파일 압축을 풉니다.
5. 압축을 푼 `Conception-Job-Flow` 폴더로 이동합니다.

### 방법 B. Git으로 받기

```bash
git clone https://github.com/goosang-jung/Conception-Job-Flow.git
cd Conception-Job-Flow
```

## 2. 필수 설치 프로그램

PC에 Node.js가 설치되어 있어야 합니다.

Node.js 다운로드:

```text
https://nodejs.org
```

설치 확인:

```bash
node -v
npm -v
```

버전이 표시되면 준비가 된 것입니다.

## 3. 앱 설치

프로젝트 폴더에서 아래 명령을 실행합니다.

```bash
npm install
```

## 4. 앱 실행

```bash
npm run start
```

실행 후 브라우저에서 접속합니다.

```text
http://localhost:3002
```

## 5. 관리자 로그인

관리자 비밀번호는 운영자가 설정한 값을 사용합니다.

운영 환경에서는 반드시 환경변수 `ADMIN_PASSWORD`로 별도 비밀번호를 설정하는 것을 권장합니다.

관리자 모드에서 가능한 주요 기능:

- 업무 추가/삭제
- 담당자 관리
- 예산 수정
- 결재 승인/반려/집행완료
- 이미지/동영상 증빙 업로드
- 증빙 제출 처리
- 증빙 ZIP 다운로드
- 제출용 PDF 표지 인쇄

## 6. 데이터 저장 위치

현재 앱은 로컬 파일 기반으로 데이터를 저장합니다.

중요 데이터:

```text
data/dashboard.json
data/uploads/
```

운영 중에는 `data` 폴더를 반드시 백업해야 합니다.

백업 대상:

```text
data/
```

## 7. 최신 버전 업데이트

Git으로 받은 경우:

```bash
git pull
npm install
npm run build
npm run start
```

ZIP으로 받은 경우:

1. GitHub에서 새 ZIP을 다운로드합니다.
2. 기존 `data` 폴더를 백업합니다.
3. 새 폴더에 기존 `data` 폴더를 복사합니다.
4. `npm install` 후 `npm run start`를 실행합니다.

## 8. 운영 확인

서버 상태 확인 주소:

```text
http://localhost:3002/health
```

정상일 경우 `ok: true`가 표시됩니다.

## 9. 자주 생기는 문제

### localhost:5180이 열리지 않습니다

정상입니다. 현재 앱 주소는 `localhost:3002`입니다.

```text
http://localhost:3002
```

### npm 명령이 안 됩니다

Node.js가 설치되어 있는지 확인합니다.

```bash
node -v
npm -v
```

### 변경사항이 안 보입니다

서버를 재시작합니다.

```bash
npm run start
```

이미 실행 중인 서버가 있으면 종료한 뒤 다시 실행합니다.

### 데이터가 사라질까 걱정됩니다

`data` 폴더를 백업하면 됩니다.

```text
data/dashboard.json
data/uploads/
```

## 10. Android 앱 설치 관련

현재 웹앱은 `localhost:3002`에서 바로 실행할 수 있습니다.

Android APK를 직접 만들려면 추가로 필요합니다.

- JDK 설치
- `JAVA_HOME` 설정
- Android Studio 또는 Android SDK
- Capacitor Android 빌드

Android 설치 패키지는 별도 개발 단계에서 정식으로 정리하는 것을 권장합니다.

## 11. 기본 운영 순서

가장 간단한 운영 순서는 아래와 같습니다.

```bash
git clone https://github.com/goosang-jung/Conception-Job-Flow.git
cd Conception-Job-Flow
npm install
npm run start
```

브라우저 접속:

```text
http://localhost:3002
```

관리자 로그인:

```text
운영자가 설정한 관리자 비밀번호 사용
```
