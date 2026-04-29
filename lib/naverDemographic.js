/**
 * 네이버 DataLab 기반 키워드 인구통계 분석
 * 성별 비율 + 연령대 비율 추출
 *
 * 원리: DataLab 검색트렌드 API의 gender / ages 필터를 이용해
 * 각 세그먼트별 상대적 검색 관심도를 구하고 비율로 변환합니다.
 */

import { getTrend, getDateRange } from './naverTrend';

/**
 * 키워드 인구통계 데이터 조회
 * @param {string}  keyword
 * @param {string}  clientId
 * @param {string}  clientSecret
 * @returns {Promise<{ gender, ageGroups, trend12 }>}
 */
export async function getKeywordDemographics(keyword, clientId, clientSecret) {
  const { startDate: s3, endDate: e3 } = getDateRange(3);   // 3개월 (성별·연령)
  const { startDate: s12, endDate: e12 } = getDateRange(12); // 12개월 (트렌드)

  const group = [{ groupName: keyword, keywords: [keyword] }];
  const base  = { timeUnit: 'month', keywordGroups: group, clientId, clientSecret };

  // 8개 인구통계 + 1개 12개월 트렌드 병렬 호출
  const [
    male, female,
    age1, age2, age3, age4, age5, age6,
    trend12,
  ] = await Promise.allSettled([
    getTrend({ ...base, startDate: s3, endDate: e3, gender: 'm' }),
    getTrend({ ...base, startDate: s3, endDate: e3, gender: 'f' }),
    getTrend({ ...base, startDate: s3, endDate: e3, ages: ['1'] }),
    getTrend({ ...base, startDate: s3, endDate: e3, ages: ['2'] }),
    getTrend({ ...base, startDate: s3, endDate: e3, ages: ['3'] }),
    getTrend({ ...base, startDate: s3, endDate: e3, ages: ['4'] }),
    getTrend({ ...base, startDate: s3, endDate: e3, ages: ['5'] }),
    getTrend({ ...base, startDate: s3, endDate: e3, ages: ['6'] }),
    getTrend({ ...base, startDate: s12, endDate: e12, timeUnit: 'month' }),
  ]);

  /** 결과 배열의 평균 ratio 계산 */
  function avgRatio(res) {
    if (res.status !== 'fulfilled') return 0;
    const data = res.value?.results?.[0]?.data ?? [];
    if (!data.length) return 0;
    return data.reduce((s, d) => s + (d.ratio ?? 0), 0) / data.length;
  }

  // 성별 비율
  const maleAvg   = avgRatio(male);
  const femaleAvg = avgRatio(female);
  const genderSum = maleAvg + femaleAvg;

  const gender = genderSum > 0 ? {
    male:   Math.round(maleAvg   / genderSum * 100),
    female: Math.round(femaleAvg / genderSum * 100),
  } : null;

  // 연령대 비율
  const ageAvgs = [age1, age2, age3, age4, age5, age6].map(avgRatio);
  const ageSum  = ageAvgs.reduce((a, b) => a + b, 0);

  const ageGroups = ageSum > 0 ? ageAvgs.map((avg, i) => ({
    label:   ['10대', '20대', '30대', '40대', '50대', '60대+'][i],
    percent: Math.round(avg / ageSum * 100),
  })) : null;

  // 12개월 트렌드 데이터
  const trendData = trend12.status === 'fulfilled'
    ? (trend12.value?.results?.[0]?.data ?? []).map(d => ({ period: d.period, ratio: d.ratio ?? 0 }))
    : [];

  return { gender, ageGroups, trendData };
}
