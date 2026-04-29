# ── Stage 1: 의존성 설치 ──────────────────────────────────────────────────────
FROM node:20-slim AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ── Stage 2: 빌드 ─────────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 3: 실행 ─────────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 최소 권한 유저
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# 빌드 아티팩트 복사
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# data 디렉터리 (Railway Volume 마운트 포인트)
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

# Railway가 PORT 환경변수를 주입함 (기본 8080)
# next start 는 PORT env를 자동으로 읽음 — 별도 포트 지정 불필요
EXPOSE 3000

CMD ["node_modules/.bin/next", "start"]
