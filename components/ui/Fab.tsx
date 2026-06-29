"use client";

import { PenTool } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function Fab() {
  const { currentPage, setNoticeDrawerMode, setHandoverDrawerMode } = useStore();

  if (currentPage === 'equipment' || currentPage === 'stats' || currentPage === 'schedule') {
    return null;
  }

  const handleOpen = () => {
    if (currentPage === 'notices') {
      setNoticeDrawerMode('create');
    } else if (currentPage === 'handovers') {
      setHandoverDrawerMode('create');
    }
  };

  return (
    <button
      onClick={handleOpen}
      className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-40 bg-[#ff7a00] hover:bg-[#e66e00] text-white rounded-full p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
    >
      <PenTool className="w-6 h-6" />
    </button>
  );
}
