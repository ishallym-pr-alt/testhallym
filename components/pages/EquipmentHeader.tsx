'use client';

import { Search, KanbanSquare, GitCommit } from 'lucide-react';

interface EquipmentHeaderProps {
  activeView: 'plan' | 'roadmap';
  setActiveView: (view: 'plan' | 'roadmap') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredCount: number;
  onViewChange?: () => void; // 탭 변경 시 추가 동작 (모달 닫기 등)
}

export default function EquipmentHeader({
  activeView,
  setActiveView,
  searchQuery,
  setSearchQuery,
  filteredCount,
  onViewChange,
}: EquipmentHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 shrink-0">
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <h2 className="text-xl font-bold text-gray-900 whitespace-nowrap">장비 이슈</h2>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => {
              setActiveView('plan');
              onViewChange?.();
            }}
            className={`flex items-center justify-center gap-1.5 min-w-[80px] px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${activeView === 'plan' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <KanbanSquare className="w-4 h-4 shrink-0" /> 플랜
          </button>
          <button 
            onClick={() => {
              setActiveView('roadmap');
              onViewChange?.();
            }}
            className={`flex items-center justify-center gap-1.5 min-w-[80px] px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${activeView === 'roadmap' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <GitCommit className="w-4 h-4 shrink-0" /> 로드맵
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="relative flex-1 sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2 pl-9 pr-4 bg-gray-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#004b8d]/20 border border-transparent focus:border-[#004b8d] transition-all"
          />
        </div>
        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-bold rounded-full whitespace-nowrap">
          {filteredCount}건
        </span>
      </div>
    </div>
  );
}
