/**
 * GET /api/env-status
 * .env.local 에 API 키가 설정됐는지 여부 반환 (값 자체는 노출 안 함)
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    hasClientId:      !!process.env.NAVER_CLIENT_ID,
    hasClientSecret:  !!process.env.NAVER_CLIENT_SECRET,
    hasCustomerId:    !!process.env.NAVER_AD_CUSTOMER_ID,
    hasAccessLicense: !!process.env.NAVER_AD_ACCESS_LICENSE,
    hasSecretKey:     !!process.env.NAVER_AD_SECRET_KEY,
  });
}
