"use client";

import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';

export default function SyncManager() {
  const isLoggedIn = useStore((state) => state.isLoggedIn);

  const checkVersionAndSync = async () => {
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

    // 5초 간격 폴링 루프
    const intervalId = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      await checkVersionAndSync();
    }, 5000);

    // 윈도우 포커스 감지 시 즉시 1회 동기화 실행
    const handleFocus = async () => {
      await checkVersionAndSync();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isLoggedIn]);

  return null;
}
