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
  // 성별·연령은 DataLab에서 정확한 비율을 구할 수 없음
  // (각 필터별 호출이 독립적으로 정규화되므로 비교 불가)
  // → 트렌드 데이터만 12개월 조회
  const { startDate, endDate } = getDateRange(12);
  const group = [{ groupName: keyword, keywords: [keyword] }];

  try {
    const result = await getTrend({
      startDate,
      endDate,
      timeUnit: 'month',
      keywordGroups: group,
      clientId,
      clientSecret,
    });

    const trendData = (result?.results?.[0]?.data ?? []).map(d => ({
      period: d.period,
      ratio:  d.ratio ?? 0,
    }));

    return { gender: null, ageGroups: null, trendData };
  } catch {
    return { gender: null, ageGroups: null, trendData: [] };
  }
}
