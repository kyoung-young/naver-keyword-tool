import './globals.css';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export const metadata = {
  title: '네이버 키워드 분석툴',
  description: '네이버 검색 API 기반 키워드 분석 · 순위 확인 · 트렌드 대시보드',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            <Topbar />
            <div className="page-body">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
