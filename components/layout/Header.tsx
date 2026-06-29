import { useStore } from '@/store/useStore';
import { Menu, Bell, User } from 'lucide-react';

export default function Header() {
  const { currentPage, currentUser, isGlobalSyncing } = useStore();

  const pageTitles: Record<string, string> = {
    notices: '공지사항',
    handovers: '인수인계',
    schedule: '근무표',
    equipment: '의료장비',
    stats: '장비 통계',
  };

  const headerTitle = pageTitles[currentPage] || '공지사항';

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm h-14 flex items-center">
      <div className="flex flex-1 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button className="md:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <h1 id="header-title" className="text-sm font-bold text-gray-900">{headerTitle}</h1>
          {isGlobalSyncing && (
            <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200/50 px-2.5 py-0.5 rounded-full font-bold animate-pulse shrink-0">
              실시간 동기화 중...
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            <Bell className="w-4 h-4" />
          </button>
          <div className="hidden sm:flex items-center gap-2 ml-2 pl-3 border-l border-gray-200">
            <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span id="header-username" className="text-sm font-medium text-gray-700">{currentUser.name || '사용자'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
