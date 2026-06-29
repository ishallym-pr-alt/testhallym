import { useStore } from '@/store/useStore';
import { Megaphone, Repeat2, CalendarDays, MonitorCheck, BarChart3, User, LogOut } from 'lucide-react';

export default function Sidebar() {
  const { currentPage, setCurrentPage, currentUser, logout, notices, handovers, equipmentIssues } = useStore();

  const unreadCounts: Record<string, number> = {
    notices: notices.filter(n => !n.readBy?.includes(currentUser.name)).length,
    handovers: handovers.filter(h => !h.readBy?.includes(currentUser.name)).length,
    equipment: equipmentIssues.filter(eq => !eq.readBy?.includes(currentUser.name)).length,
  };

  const navItems = [
    { id: 'notices', label: '공지사항', icon: Megaphone },
    { id: 'handovers', label: '인수인계', icon: Repeat2 },
    { id: 'schedule', label: '근무표', icon: CalendarDays },
    { id: 'equipment', label: '의료장비', icon: MonitorCheck },
    { id: 'stats', label: '장비 통계', icon: BarChart3 }
  ];

  return (
    <aside className="sidebar hidden md:flex fixed left-0 top-0 bottom-0 w-48 flex-col z-40">

      {/* 사이드바 헤더 */}
      <div className="px-4 h-14 flex shrink-0 items-center border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
            <img src="/logo.png" alt="한림병원" className="w-6 h-6 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
          </div>
          <div>
            <p className="text-primary-900 font-bold text-sm leading-tight">한림병원</p>
            <p className="text-gray-500 text-[11px] mt-0.5">직원용 포탈</p>
          </div>
        </div>
      </div>

      {/* 사이드바 메뉴 */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id as any)}
              className={`sidebar-menu-item w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              {unreadCounts[item.id] > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
                  {unreadCounts[item.id] > 99 ? '99+' : unreadCounts[item.id]}
                </span>
              )}

            </button>
          );
        })}
      </nav>

      {/* 사이드바 하단: 사용자 정보 */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-accent-500" />
          </div>
          <div className="min-w-0 flex-1 flex flex-col items-start">
            <p className="text-gray-900 text-sm font-semibold truncate w-full text-left">{currentUser.name || '사용자'}</p>
            <p className="text-gray-500 text-[11px] truncate w-full text-left">사번: {currentUser.employeeId || '미입력'}</p>
          </div>
          <button onClick={logout} className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0" title="로그아웃">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
