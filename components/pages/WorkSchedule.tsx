"use client";

import React, { useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '@/store/useStore';
import PersonalCalendar from '@/components/ui/PersonalCalendar';

export default function WorkSchedule() {
  const { scheduleYear: year, scheduleMonth: month, setScheduleYearMonth } = useStore();

  const changeMonth = useCallback((diff: number) => {
    let newMonth = month + diff;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    setScheduleYearMonth(newYear, newMonth);
  }, [year, month, setScheduleYearMonth]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* 상단 컨트롤 바 */}
      <div className="shrink-0 bg-white border-b border-gray-100 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-sm font-bold text-gray-900 min-w-[100px] text-center">{year}년 {month}월</span>
            <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
        <div className="text-[11px] text-gray-400 font-bold hidden sm:block">
          * 본인의 이름 칸을 클릭하여 개인 메모를 작성할 수 있습니다.
        </div>
      </div>

      {/* ── 개인캘린더 영역 ── */}
      <div className="flex-1 overflow-hidden relative">
        <PersonalCalendar />
      </div>
    </div>
  );
}
