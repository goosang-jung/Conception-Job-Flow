# Conception Job Flow Release Checklist

## 1. 배포 전 검증

```bash
npm install
npm run build
npm start
```

- 브라우저에서 `http://localhost:3002/health` 확인
- 관리 화면에서 데이터 백업 JSON 다운로드
- `data/uploads` 폴더 별도 복사
- 증빙 ZIP 다운로드 테스트
- 모바일 폭에서 업무, 달력, 관리 화면 확인

## 2. Android 설치 패키지 완성

디버그 APK:

```bash
npx cap sync android
cd android
gradlew assembleDebug
```

정식 배포 전에는 아래 항목을 추가로 준비한다.

- Android 앱 이름/아이콘 최종 확인
- 버전명과 버전코드 증가
- 서명 키 생성 및 안전 보관
- Release APK 또는 AAB 빌드
- 실제 휴대폰 설치 테스트

## 3. Release 배포 정리

GitHub Release에는 다음 파일과 내용을 포함한다.

- 릴리즈 제목: `Conception Job Flow vX.X.X`
- 변경 요약
- 설치 방법
- 관리자 비밀번호 설정 방법
- 데이터 저장 위치 안내
- 백업/복구 주의사항
- Android APK가 준비된 경우 APK 첨부

릴리즈 전 필수 확인:

- GitHub Actions Build 성공
- `README.md` 실행 방법 최신화
- `DEVELOPMENT_COMMAND.md` 다음 개발 순서 최신화
- 백업 JSON과 `data/uploads` 별도 보관 안내 포함

## 4. 대용량 ZIP/영상 최적화 기준

현재 앱은 증빙 ZIP을 브라우저에서 생성한다. 실제 운영에서 영상이 많아지면 아래 기준을 적용한다.

- 30MB 초과 영상은 서버 업로드 제한에 걸리므로 사전 압축
- 10MB 이상 영상은 “대용량 영상”으로 별도 표시
- 제출 ZIP 생성 전 불필요한 원본 영상 삭제 또는 별도 보관
- 장기적으로는 서버 ZIP 생성 API로 전환
- 영상 썸네일 생성 및 원본/압축본 분리 저장 검토

권장 폴더 보관 구조:

```text
backup/
  dashboard-YYYY-MM-DD.json
  uploads/
  release-notes.md
```

## 5. 운영 백업 기준

- 매일 1회 JSON 백업
- 감사 제출 패키지 생성 직후 백업
- 대량 수정 전/후 백업
- 서버 이전 시 `data/dashboard.json`과 `data/uploads`를 함께 이동
