/**
 * GET/POST/PUT/DELETE /api/monitor
 * 모니터링 스케줄 저장/조회 — data/monitors.json 파일 저장
 *
 * NOTE: 실제 자동 스케줄 실행은 Next.js 내에서 직접 지원하지 않습니다.
 *       프로덕션 환경에서는 다음 방법 중 하나를 사용하세요:
 *       1. node-cron을 사용하는 별도 Node.js 워커 프로세스 (worker.js)
 *       2. Vercel Cron Jobs (vercel.json 에 crons 설정)
 *       3. 외부 cron 서비스 (예: GitHub Actions scheduled workflow)
 *       수동 즉시 실행은 POST /api/monitor/run 으로 구현하세요.
 */

import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const DATA_PATH = path.join(process.cwd(), 'data', 'monitors.json');

function readData() {
  try {
    return JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
  } catch {
    return { monitors: [] };
  }
}

function writeData(data) {
  const dir = path.dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function calcNextRun(schedule, from = new Date()) {
  const next = new Date(from);
  if (schedule === 'daily') {
    next.setDate(next.getDate() + 1);
  } else if (schedule === 'weekly') {
    next.setDate(next.getDate() + 7);
  }
  next.setHours(9, 0, 0, 0); // 매일 오전 9시 실행
  return next.toISOString();
}

/** 전체 조회 */
export async function GET() {
  try {
    return NextResponse.json(readData());
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** 모니터링 등록 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { groupId, groupName, keywords, schedule, email } = body;

    if (!groupName || !keywords?.length) {
      return NextResponse.json({ error: '그룹 정보가 필요합니다.' }, { status: 400 });
    }
    if (!['daily', 'weekly'].includes(schedule)) {
      return NextResponse.json({ error: '주기는 daily 또는 weekly 여야 합니다.' }, { status: 400 });
    }

    const data = readData();
    const newItem = {
      id: Date.now().toString(),
      groupId: groupId || null,
      groupName,
      keywords,
      schedule,
      email: email || '',
      active: true,
      lastRunAt: null,
      nextRunAt: calcNextRun(schedule),
      history: [],
      createdAt: new Date().toISOString(),
    };
    data.monitors.push(newItem);
    writeData(data);

    return NextResponse.json(newItem, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** 수정 (active 토글 등) */
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });

    const data = readData();
    const idx = data.monitors.findIndex((m) => m.id === id);
    if (idx === -1) return NextResponse.json({ error: '항목 없음' }, { status: 404 });

    data.monitors[idx] = { ...data.monitors[idx], ...updates };
    writeData(data);

    return NextResponse.json(data.monitors[idx]);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** 삭제 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });

    const data = readData();
    const before = data.monitors.length;
    data.monitors = data.monitors.filter((m) => m.id !== id);

    if (data.monitors.length === before) {
      return NextResponse.json({ error: '항목 없음' }, { status: 404 });
    }

    writeData(data);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
