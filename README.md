# 네이버 키워드 분석 툴

네이버 검색 API를 활용한 키워드 분석 · 순위 추적 · 경쟁사 모니터링 SaaS 도구입니다.

## 주요 기능

| 기능 | 설명 |
|------|------|
| 🔍 키워드 검색 분석 | 블로그·카페·뉴스·웹 채널별 문서 수 조회 |
| 📊 키워드 분석 | 월간 PC/모바일 검색량, 경쟁도 분석 (네이버 검색광고 API) |
| 🔎 키워드 확장 | 연관 키워드 자동 추천 및 검색량 비교 |
| 🏆 노출 순위 확인 | 파워링크 · 파워콘텐츠 · 블로그/카페/뉴스/웹 유기적 순위 조회 |
| ⭐ 영향력 분석 | 특정 채널에서의 키워드 노출 영향력 점수 |
| 📈 트렌드 그래프 | 기간별 문서 수 변화 추이 시각화 |
| 🔔 모니터링 스케줄러 | 키워드 문서 수 자동 추적 및 히스토리 관리 |

---

## 🚀 Railway 배포 가이드

### 1단계: 네이버 API 키 발급

#### 네이버 검색 API (키워드 조회 · 순위 · 트렌드)
1. [네이버 개발자 센터](https://developers.naver.com/apps/#/register) 접속
2. 애플리케이션 등록 → **검색** API 선택
3. `Client ID`, `Client Secret` 메모

#### 네이버 검색광고 API (키워드 분석 · 확장)
1. [네이버 검색광고](https://searchad.naver.com) 로그인
2. 도구 → API 관리 → API 사용 신청
3. `API 키`, `시크릿 키`, `고객 ID` 메모

---

### 2단계: GitHub에 저장소 생성

```bash
# 이 저장소를 Fork하거나, 직접 새 저장소로 Push
git clone https://github.com/YOUR_USERNAME/naver-keyword-tool
cd naver-keyword-tool
git remote set-url origin https://github.com/YOUR_USERNAME/naver-keyword-tool
git push -u origin main
```

---

### 3단계: Railway 배포

1. [Railway.app](https://railway.app) 가입 (GitHub 계정 연동 권장)
2. **New Project** → **Deploy from GitHub repo** 선택
3. 본인 저장소 선택 → Railway가 `railway.toml`을 자동 감지하여 빌드

---

### 4단계: 환경변수 설정

Railway 대시보드 → 서비스 선택 → **Variables** 탭에서 추가:

| 변수명 | 필수 | 설명 |
|--------|------|------|
| `NAVER_CLIENT_ID` | ✅ | 네이버 검색 API Client ID |
| `NAVER_CLIENT_SECRET` | ✅ | 네이버 검색 API Client Secret |
| `NAVER_AD_API_KEY` | ✅ | 네이버 검색광고 API 키 |
| `NAVER_AD_SECRET_KEY` | ✅ | 네이버 검색광고 시크릿 키 |
| `NAVER_AD_CUSTOMER_ID` | ✅ | 네이버 검색광고 고객 ID |
| `CRON_SECRET` | 권장 | 모니터링 자동실행 보안 토큰 (임의 문자열) |

---

### 5단계: 볼륨 마운트 (데이터 영속성)

Railway 대시보드 → 서비스 → **Volumes** 탭:
- **Mount Path**: `/app/data`
- **Size**: 1 GB (기본값으로 충분)

> 볼륨을 설정하지 않으면 서비스 재시작 시 등록한 경쟁사 그룹, 모니터링 데이터가 초기화됩니다.

---

### 6단계: 모니터링 자동 실행 (선택)

Railway 대시보드 → **New** → **Cron Job** 추가:

```
Schedule  : */5 * * * *
Command   : curl -s -H "Authorization: Bearer $CRON_SECRET" https://<YOUR_DOMAIN>/api/cron
```

`<YOUR_DOMAIN>`은 Railway에서 생성된 도메인으로 교체하세요.

---

### 7단계: 도메인 확인

Railway 대시보드 → 서비스 → **Settings** → **Networking** → Generate Domain

생성된 URL로 접속하면 완료! 🎉

---

## 💻 로컬 개발 환경 설정

```bash
# 1. 저장소 클론
git clone https://github.com/YOUR_USERNAME/naver-keyword-tool
cd naver-keyword-tool

# 2. 의존성 설치
npm install

# 3. 환경변수 파일 생성
cp .env.local.example .env.local
# .env.local 파일을 편집기로 열어 API 키 입력

# 4. 개발 서버 시작
npm run dev

# 5. (선택) 모니터링 워커 별도 실행 — 새 터미널에서
npm run worker
```

---

## `.env.local.example` 파일 구조

```bash
# 네이버 검색 API
NAVER_CLIENT_ID=발급받은_Client_ID
NAVER_CLIENT_SECRET=발급받은_Client_Secret

# 네이버 검색광고 API
NAVER_AD_API_KEY=발급받은_API_키
NAVER_AD_SECRET_KEY=발급받은_시크릿_키
NAVER_AD_CUSTOMER_ID=발급받은_고객_ID

# 모니터링 cron 보안 토큰 (로컬에서는 생략 가능)
CRON_SECRET=랜덤하고_긴_비밀문자열
```

---

## 🏗️ 기술 스택

- **Frontend**: Next.js 16 (App Router), React 19, Pure CSS
- **Backend**: Next.js API Routes (Node.js runtime)
- **데이터 저장**: JSON 파일 (`data/` 폴더, Railway Volume 마운트)
- **스케줄링**: node-cron (로컬), Railway Cron Job (프로덕션)
- **외부 API**: 네이버 검색 API, 네이버 검색광고 API

---

## ⚠️ 주의사항

- 네이버 검색 API는 **하루 25,000건** 무료 호출 제한이 있습니다.
- 네이버 검색광고 API는 별도 심사 후 발급됩니다.
- SERP 파싱(뉴스 순위 등)은 네이버 HTML 구조 변경 시 동작이 달라질 수 있습니다.
- 이 도구는 개인 / 소규모 팀 사용 목적으로 제작되었습니다.

---

## 📄 라이선스

MIT License
