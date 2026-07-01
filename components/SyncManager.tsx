"use client";

import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';

export default function SyncManager() {
  const isLoggedIn = useStore((state) => state.isLoggedIn);

  const checkVersionAndSync = async () => {
    if (useStore.getState().isGlobalSyncing) return; // 방어 코드: 이미 동기화 중이면 무시
    try {
      const res = await fetch(`/api/version?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        const serverVersion = data.version;
        const currentGlobalVersion = useStore.getState().globalVersion;

        // 최초 로드 시에는 버전만 맞춤 (동기화 X)
        if (currentGlobalVersion === 0) {
          useStore.getState().setGlobalVersion(serverVersion);
        } 
        // 서버 버전이 클라이언트 버전과 다르면 누군가 데이터를 변경한 것임
        else if (serverVersion && serverVersion !== currentGlobalVersion) {
          useStore.getState().setGlobalVersion(serverVersion);
          await useStore.getState().syncData();
        }
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    // 30초 간격 폴링 루프 (기존 5초에서 대폭 연장)
    const intervalId = setInterval(async () => {
      // 탭이 활성화되어 있지 않거나 숨겨져 있으면 즉시 리턴 (구글 서버 부하 방지)
      if (document.hidden || document.visibilityState !== 'visible') return;
      await checkVersionAndSync();
    }, 30000);

    // 화면 활성화(가려졌다가 다시 보임) 감지 시 즉시 1회 동기화 실행
    const handleVisibilityChange = async () => {
      if (!document.hidden && document.visibilityState === 'visible') {
        await checkVersionAndSync();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLoggedIn]);

  return null;
}
