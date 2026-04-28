/**
 * GET/POST/PUT/DELETE /api/competitors
 * 경쟁사 키워드 그룹 CRUD — data/competitors.json 파일 저장
 */

import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const DATA_PATH = path.join(process.cwd(), 'data', 'competitors.json');

function readData() {
  try {
    return JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
  } catch {
    return { groups: [] };
  }
}

function writeData(data) {
  const dir = path.dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

/** 전체 그룹 조회 */
export async function GET() {
  try {
    const data = readData();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** 그룹 추가 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, keywords } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: '그룹명을 입력해주세요.' }, { status: 400 });
    }
    if (!keywords?.length) {
      return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 });
    }

    const data = readData();
    const newGroup = {
      id: Date.now().toString(),
      name: name.trim(),
      keywords: keywords.map((k) => k.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.groups.push(newGroup);
    writeData(data);

    return NextResponse.json(newGroup, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** 그룹 수정 */
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, name, keywords } = body;

    if (!id) {
      return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
    }

    const data = readData();
    const idx = data.groups.findIndex((g) => g.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: '그룹을 찾을 수 없습니다.' }, { status: 404 });
    }

    data.groups[idx] = {
      ...data.groups[idx],
      name: name?.trim() ?? data.groups[idx].name,
      keywords: keywords ?? data.groups[idx].keywords,
      updatedAt: new Date().toISOString(),
    };
    writeData(data);

    return NextResponse.json(data.groups[idx]);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** 그룹 삭제 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
    }

    const data = readData();
    const before = data.groups.length;
    data.groups = data.groups.filter((g) => g.id !== id);

    if (data.groups.length === before) {
      return NextResponse.json({ error: '그룹을 찾을 수 없습니다.' }, { status: 404 });
    }

    writeData(data);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
