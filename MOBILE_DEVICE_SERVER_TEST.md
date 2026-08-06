# 휴대폰 실기기 서버 연결 테스트

## 1. 목적

Android APK가 실제 휴대폰에서 PC의 Express 서버에 접속해 업무, 로그인, 첨부파일, 증빙 ZIP 기능을 정상 사용하는지 확인한다.

## 2. PC 서버를 같은 Wi‑Fi에서 열기

PC와 휴대폰을 같은 Wi‑Fi에 연결한 뒤 PC에서 실행한다.

```bash
npm run start:lan
```

서버는 아래처럼 열린다.

```text
http://<PC_LOCAL_IP>:3002
```

## 3. PC 로컬 IP 확인

PowerShell에서 실행한다.

```powershell
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
  Select-Object IPAddress, InterfaceAlias
```

보통 아래 형태의 주소를 사용한다.

```text
192.168.x.x
10.x.x.x
172.16.x.x ~ 172.31.x.x
```

예시:

```text
PC IP가 192.168.0.25라면 서버 주소는 http://192.168.0.25:3002
```

## 4. 모바일용 API 주소 설정

처음 설정할 때는 예시 파일을 복사한다.

```powershell
Copy-Item .env.mobile.example .env.mobile
```

그 다음 `.env.mobile` 파일을 열어 PC IP로 수정한다.

```text
VITE_API_URL=http://192.168.0.25:3002
```

주의:

- `YOUR_PC_LOCAL_IP`를 반드시 실제 IP로 바꾼다.
- 휴대폰에서 `localhost`는 PC가 아니라 휴대폰 자신이다.
- PC 방화벽에서 3002 포트 접근이 막히면 휴대폰에서 접속되지 않는다.

## 5. 모바일 APK 빌드

디버그 APK:

```bash
npm run app:build:mobile
```

정식 서명 APK:

```bash
npm run app:release:apk:mobile
```

AAB:

```bash
npm run app:release:aab:mobile
```

산출물 위치:

```text
android/app/build/outputs/apk/debug/app-debug.apk
android/app/build/outputs/apk/release/app-release.apk
android/app/build/outputs/bundle/release/app-release.aab
```

## 6. 휴대폰 접속 사전 확인

휴대폰 브라우저에서 먼저 확인한다.

```text
http://<PC_LOCAL_IP>:3002/health
```

정상 예시:

```json
{ "ok": true, "service": "conception-job-flow", "tasks": 3 }
```

브라우저에서 `/health`가 열리지 않으면 APK도 서버에 연결되지 않는다.

## 7. 실기기 기능 점검표

| 구분 | 테스트 항목 | 기대 결과 | 결과 | 메모 |
| --- | --- | --- | --- | --- |
| 서버 | 휴대폰 브라우저에서 `/health` 접속 | 정상 JSON 표시 |  |  |
| 앱 실행 | APK 설치 후 첫 화면 표시 | 화면 깨짐 없음 |  |  |
| 로그인 | 관리자 로그인 | 관리 기능 표시 |  |  |
| 로그인 | 결재자 로그인 | 결재 처리 가능, 삭제/복구 제한 |  |  |
| 로그인 | 일반 사용자 로그인 | 조회 중심 작동 |  |  |
| 업무 | 업무 목록 로딩 | 서버 데이터 표시 |  |  |
| 달력 | 월간/목적별 달력 표시 | 날짜와 카드 표시 |  |  |
| 관리 | 결재 관제 표시 | 결재 카드 표시 |  |  |
| 첨부 | 이미지 업로드 | 업무에 이미지 저장 |  |  |
| 첨부 | 동영상 업로드 | 업무에 동영상 저장 |  |  |
| 증빙 | 증빙 자료실 필터 | 태그/누락 필터 작동 |  |  |
| ZIP | 서버 ZIP 다운로드 | ZIP 파일 다운로드 |  |  |
| UI | 버튼 크기/간격 | 손가락 터치 가능 |  |  |
| UI | 화면 이동 | 자연스럽게 이동 |  |  |

## 8. 문제 발생 시 우선 확인

### 휴대폰에서 서버 접속 안 됨

- PC와 휴대폰이 같은 Wi‑Fi인지 확인
- `npm run start:lan`으로 실행했는지 확인
- PC IP가 맞는지 확인
- Windows 방화벽에서 3002 포트 허용
- 휴대폰 브라우저에서 `/health` 먼저 확인

### APK는 열리지만 데이터가 안 뜸

- `.env.mobile`의 `VITE_API_URL`이 실제 PC IP인지 확인
- `.env.mobile` 수정 후 APK를 다시 빌드했는지 확인
- 서버 주소가 `http://PC_IP:3002` 형태인지 확인

### 이미지/동영상 업로드 실패

- 파일 크기 30MB 이하인지 확인
- PC 서버 콘솔 오류 확인
- `data/uploads` 폴더 생성 여부 확인

## 9. 테스트 후 개발 반영 순서

1. 서버 연결 실패
2. 로그인/권한 오류
3. 첨부파일 업로드 실패
4. 증빙 ZIP 실패
5. 모바일 화면 깨짐
6. 버튼 크기/간격/UI 품질 개선
