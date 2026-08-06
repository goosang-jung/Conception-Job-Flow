# Conception Job Flow v0.2.0 Release Draft

## 릴리즈 요약

Conception Job Flow v0.2.0은 업무, 예산, 결재, 증빙, 감사 제출, 백업/복구를 하나로 연결한 운영형 프로토타입 릴리즈입니다.

## 주요 변경

- 역할별 인증 구조 추가
  - 관리자
  - 결재자
  - 일반 사용자
- 결재자 권한으로 승인/반려/집행완료 처리 가능
- AI 결재 메모 및 반려 사유 초안 생성
- 예산 변경 이력 저장
- 예산 집행 예측 표시
- 서버 기반 대용량 증빙 ZIP 생성 API 추가
- 데이터 백업/복구 화면 추가
- Android Release APK/AAB 빌드 스크립트 추가
- Release 배포 체크리스트 추가

## 설치 및 실행

```bash
npm install
npm run build
npm start
```

실행 후 브라우저에서 `http://localhost:3002`로 접속합니다.

## 권한 환경변수

운영 환경에서는 아래 비밀번호를 환경변수로 설정합니다.

```bash
ADMIN_PASSWORD=관리자비밀번호
APPROVER_PASSWORD=결재자비밀번호
USER_PASSWORD=일반사용자비밀번호
```

비밀번호는 저장소에 커밋하지 않습니다.

## Android Release 빌드

```bash
npm run app:release:apk
npm run app:release:aab
```

정식 서명 빌드를 위해 아래 값을 환경변수 또는 `android/gradle.properties`에 설정합니다.

```text
CJ_RELEASE_STORE_FILE=키스토어경로
CJ_RELEASE_STORE_PASSWORD=키스토어비밀번호
CJ_RELEASE_KEY_ALIAS=키별칭
CJ_RELEASE_KEY_PASSWORD=키비밀번호
```

## 백업 주의사항

- 운영 데이터: `data/dashboard.json`
- 이미지/동영상 원본: `data/uploads`
- JSON 백업에는 원본 업로드 파일이 포함되지 않으므로 `data/uploads` 폴더를 별도 보관해야 합니다.

## 릴리즈 전 확인

- GitHub Actions Build 성공
- 관리 화면 데이터 백업 다운로드 테스트
- 서버 ZIP 다운로드 테스트
- Android 실제 기기 설치 테스트
- 관리자/결재자/일반 사용자 권한 테스트
