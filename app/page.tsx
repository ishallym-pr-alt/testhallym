"use client";

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import LoginScreen from '@/components/ui/LoginScreen';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Fab from '@/components/ui/Fab';
import { requestNotificationPermission, subscribeToWebPush } from '@/lib/notifications';

import Notices from '@/components/pages/Notices';
import Handovers from '@/components/pages/Handovers';
import Equipment from '@/components/pages/Equipment';
import Stats from '@/components/pages/Stats';
import Schedule from '@/components/pages/Schedule';
import WorkSchedule from '@/components/pages/WorkSchedule';
import SyncManager from '@/components/SyncManager';

export default function App() {
  const { isLoggedIn, currentPage, setCurrentPage, setHighlightedItemId, initializeData, syncData, restoreSession, globalVersion, setGlobalVersion } = useStore();

  // 0. 최초 마운트 시 세션 복구
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // URL 파라미터 및 서비스 워커 메시지 감지
  useEffect(() => {
    if (!isLoggedIn) return;

    // 1. 초기 URL 파라미터 감지 (?page=notices&id=123)
    const handleUrlParams = () => {
      const params = new URLSearchParams(window.location.search);
      const page = params.get('page');
      const id = params.get('id');

      if (page && ['notices', 'handovers', 'schedule', 'calendar', 'equipment', 'stats'].includes(page)) {
        setCurrentPage(page as any);
        if (id) {
          const highlightedId = page === 'schedule' ? id : Number(id);
          setHighlightedItemId(highlightedId);
        }
        // URL 주소창에서 파라미터 제거 (새로고침 시 재동작 방지)
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    };

    handleUrlParams();

    // 2. 서비스 워커의 postMessage 수신
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data) {
        if (event.data.type === 'NAVIGATE') {
          const { page, id } = event.data;
          if (page && ['notices', 'handovers', 'schedule', 'calendar', 'equipment', 'stats'].includes(page)) {
            setCurrentPage(page);
            if (id) {
              const highlightedId = page === 'schedule' ? id : Number(id);
              setHighlightedItemId(highlightedId);
            }
          }
        } else if (event.data.type === 'SYNC_DATA') {
          syncData();
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, [isLoggedIn, setCurrentPage, setHighlightedItemId]);

  // 로그인 성공 시 구글 스프레드시트에서 데이터를 불러오고 웹 푸시 구독
  useEffect(() => {
    if (isLoggedIn) {
      initializeData();
      requestNotificationPermission().then((granted) => {
        if (granted) {
          const { currentUser } = useStore.getState();
          if (currentUser?.employeeId) {
            subscribeToWebPush(currentUser.employeeId);
          }
        }
      });
    }
  }, [isLoggedIn, initializeData]);



  if (!isLoggedIn) {
    return <LoginScreen />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'notices': return <Notices />;
      case 'handovers': return <Handovers />;
      case 'schedule': return <Schedule />;
      case 'calendar': return <WorkSchedule />;
      case 'equipment': return <Equipment />;
      case 'stats': return <Stats />;
      default: return <Notices />;
    }
  };

  const isSchedule = currentPage === 'schedule';
  const isCalendar = currentPage === 'calendar';
  const isFullHeight = isSchedule || isCalendar;

  return (
    <div id="screen-main">
      <SyncManager />
      <Sidebar />
      <main className={`md:ml-48 bg-gray-50 flex flex-col ${isFullHeight ? 'h-[100dvh] overflow-hidden' : 'min-h-[100dvh] pb-32 md:pb-8'} ${isCalendar ? 'pb-16 md:pb-0' : ''}`}>
        <Header />
        {isFullHeight ? (
          <div className="flex-1 overflow-hidden">{renderPage()}</div>
        ) : (
          <>
            {renderPage()}
            <Fab />
          </>
        )}
      </main>
      {!isSchedule && <BottomNav />}
    </div>
  );
}
