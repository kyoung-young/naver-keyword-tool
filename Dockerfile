FROM node:20-slim

WORKDIR /app

# 의존성 설치
COPY package.json package-lock.json* ./
RUN npm ci

# 소스 복사 및 빌드
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

ENV NODE_ENV=production

# data 디렉터리 생성
RUN mkdir -p /app/data

# Railway가 PORT 환경변수를 주입함
# next start는 PORT를 자동으로 읽어 해당 포트에 바인딩
CMD ["node_modules/.bin/next", "start"]
