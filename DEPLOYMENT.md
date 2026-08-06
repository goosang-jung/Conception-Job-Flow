# Conception Job Flow 배포

## 필수 환경변수

- `ADMIN_PASSWORD`: 관리자 비밀번호. 운영 환경에서는 미설정 시 로그인이 차단됩니다.
- `NODE_ENV=production`: HSTS 보안 헤더를 활성화합니다.
- `FORCE_HTTPS=true`: 신뢰된 리버스 프록시의 `X-Forwarded-Proto`를 기준으로 HTTPS로 전환합니다.
- `CORS_ORIGIN`: 허용할 실제 웹 주소만 지정합니다.
- `DATA_DIR`: 재배포 후에도 유지되는 영속 볼륨을 지정합니다.

## 실행

```bash
npm ci
npm run build
npm start
```

기본 구조에서는 Express가 빌드 결과와 `/api`를 함께 제공합니다. Nginx, Cloudflare, Render, Railway 등의 TLS 프록시 앞에서 실행하고 외부에는 HTTPS 포트만 공개하세요.

## 운영 확인

- `GET /api/health`가 `ok: true`를 반환하는지 확인합니다.
- 인증 없이 `POST /api/tasks`가 HTTP 401을 반환하는지 확인합니다.
- `DATA_DIR/dashboard.json`이 영속 볼륨에 생성되는지 확인합니다.
- 최초 공개 전에 개발 기본 비밀번호 `admin1234`가 아닌 운영용 `ADMIN_PASSWORD`를 설정합니다.
