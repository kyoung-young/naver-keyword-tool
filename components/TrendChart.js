'use client';

import { useEffect, useRef } from 'react';

const COLORS = [
  '#03C75A', '#1a6fc4', '#854F0B', '#7F77DD', '#e07b54',
];

/**
 * 트렌드 라인 차트 컴포넌트 (Chart.js 사용)
 * Props:
 *   data: { results: Array<{ title, data: Array<{ period, ratio }> }> }
 */
export default function TrendChart({ data }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!data?.results?.length) return;

    // Chart.js 동적 임포트 (SSR 방지)
    import('chart.js/auto').then((mod) => {
      const Chart = mod.default;

      const canvas = canvasRef.current;
      if (!canvas) return;

      // 기존 차트 파괴
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      // 레이블 (기간) 수집
      const labels = data.results[0]?.data?.map((d) => d.period) ?? [];

      const datasets = data.results.map((series, i) => ({
        label: series.title,
        data: series.data.map((d) => d.ratio),
        borderColor: COLORS[i % COLORS.length],
        backgroundColor: COLORS[i % COLORS.length] + '20',
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.3,
        fill: false,
      }));

      chartRef.current = new Chart(canvas, {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                font: { family: "'Noto Sans KR', sans-serif", size: 12 },
                usePointStyle: true,
                padding: 16,
              },
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                font: { size: 11 },
                maxRotation: 45,
                autoSkip: true,
                maxTicksLimit: 12,
              },
            },
            y: {
              beginAtZero: true,
              max: 100,
              ticks: {
                font: { size: 11 },
                callback: (v) => v,
              },
              title: {
                display: true,
                text: '검색 비율 (상대값)',
                font: { size: 11 },
              },
            },
          },
        },
      });
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [data]);

  if (!data?.results?.length) {
    return (
      <div className="chart-empty">트렌드 데이터가 없습니다.</div>
    );
  }

  return (
    <div className="chart-container">
      <canvas ref={canvasRef} />
      <style>{`
        .chart-container {
          position: relative;
          height: 360px;
          width: 100%;
        }
        .chart-empty {
          padding: 60px;
          text-align: center;
          color: var(--color-text-sub);
        }
      `}</style>
    </div>
  );
}
