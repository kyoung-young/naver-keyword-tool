/**
 * GET/POST/PUT/DELETE /api/competitors
 * 경쟁사 키워드 그룹 CRUD — PostgreSQL 저장 (Railway 파일시스템은 휘발성이라 DB 사용)
 */

import { NextResponse } from 'next/server';
import { getDb, initDb } from '../../../lib/db.js';

export const runtime = 'nodejs';

/** DB 행 → 클라이언트 객체 변환 */
function toGroup(row) {
  return {
    id:        String(row.id),
    name:      row.name,
    keywords:  row.keywords ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** 전체 그룹 조회 */
export async function GET() {
  try {
    await initDb();
    const db = getDb();
    if (!db) {
      return NextResponse.json({ groups: [], error: 'DB 미연결 — DATABASE_URL 환경변수를 확인하세요.' });
    }
    const { rows } = await db.query(
      'SELECT * FROM competitor_groups ORDER BY updated_at DESC'
    );
    return NextResponse.json({ groups: rows.map(toGroup) });
  } catch (err) {
    console.error('[competitors GET]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** 그룹 추가 */
export async function POST(request) {
  try {
    await initDb();
    const db = getDb();
    if (!db) return NextResponse.json({ error: 'DB 미연결' }, { status: 503 });

    const { name, keywords } = await request.json();
    if (!name?.trim())    return NextResponse.json({ error: '그룹명을 입력해주세요.' }, { status: 400 });
    if (!keywords?.length) return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 });

    const cleaned = keywords.map((k) => k.trim()).filter(Boolean);
    const { rows } = await db.query(
      `INSERT INTO competitor_groups (name, keywords)
       VALUES ($1, $2)
       RETURNING *`,
      [name.trim(), cleaned]
    );
    return NextResponse.json(toGroup(rows[0]), { status: 201 });
  } catch (err) {
    console.error('[competitors POST]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** 그룹 수정 */
export async function PUT(request) {
  try {
    await initDb();
    const db = getDb();
    if (!db) return NextResponse.json({ error: 'DB 미연결' }, { status: 503 });

    const { id, name, keywords } = await request.json();
    if (!id) return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });

    const cleaned = keywords?.map((k) => k.trim()).filter(Boolean);
    const { rows } = await db.query(
      `UPDATE competitor_groups
       SET name       = COALESCE($2, name),
           keywords   = COALESCE($3, keywords),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [Number(id), name?.trim() ?? null, cleaned ?? null]
    );
    if (!rows.length) return NextResponse.json({ error: '그룹을 찾을 수 없습니다.' }, { status: 404 });
    return NextResponse.json(toGroup(rows[0]));
  } catch (err) {
    console.error('[competitors PUT]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** 그룹 삭제 */
export async function DELETE(request) {
  try {
    await initDb();
    const db = getDb();
    if (!db) return NextResponse.json({ error: 'DB 미연결' }, { status: 503 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });

    const { rowCount } = await db.query(
      'DELETE FROM competitor_groups WHERE id = $1',
      [Number(id)]
    );
    if (!rowCount) return NextResponse.json({ error: '그룹을 찾을 수 없습니다.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[competitors DELETE]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
