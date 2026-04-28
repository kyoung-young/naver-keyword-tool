# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ── Stage 2: builder ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 3: runner ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Railway 프록시가 0.0.0.0 에 연결 — localhost 기본값이면 "Application failed to respond"
ENV HOSTNAME=0.0.0.0

# 최소 권한 유저
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# standalone 아티팩트 복사
COPY --from=builder /app/public                           ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static

# data 디렉터리 — Railway Volume 마운트 포인트
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

# Railway가 PORT 환경변수를 주입함 (기본 8080)
EXPOSE 3000

CMD ["node", "server.js"]
