import { useStore } from '@/store/useStore';
import { Megaphone, Repeat2, CalendarDays, MonitorCheck, BarChart3 } from 'lucide-react';

export default function BottomNav() {
  const { currentPage, setCurrentPage, currentUser, notices, handovers, equipmentIssues, highlightedItemIds, vacations, readVacationIds } = useStore();

  const unreadCounts: Record<string, number> = {
    notices: notices.filter(n => !n.readBy?.includes(currentUser.name)).length,
    handovers: handovers.filter(h => !h.readBy?.includes(currentUser.name)).length,
    equipment: equipmentIssues.filter(eq => !eq.readBy?.includes(currentUser.name)).length,
  };

  const pendingVacationsCount = currentUser.isManager ? vacations.filter(v => v.status === '대기' && !(v.approvedBy || '').includes(currentUser.name)).length : 0;
  const unreadVacationsCount = vacations.filter(v => !readVacationIds.includes(v.id) && v.reason !== '엑셀 업로드 자동 승인').length;

  const scheduleAlarmCount = highlightedItemIds.filter(id => 
    typeof id === 'string' && (id.includes('_shift') || id.includes('_am') || id.includes('_pm'))
  ).length + pendingVacationsCount + unreadVacationsCount;

  const navItems = [
    { id: 'notices', label: '공지', icon: Megaphone },
    { id: 'handovers', label: '인수인계', icon: Repeat2 },
    { id: 'schedule', label: '근무표', icon: CalendarDays },
    { id: 'calendar', label: '근무일정', icon: CalendarDays },
    { id: 'equipment', label: '장비', icon: MonitorCheck },
    { id: 'stats', label: '통계', icon: BarChart3 }
  ];

  return (
    <nav className="bottom-nav block md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
      <div className="grid grid-cols-6 items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          const badgeCount = item.id === 'schedule' ? scheduleAlarmCount : (unreadCounts[item.id] || 0);

          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id as any)}
              className={`bottom-nav-item flex flex-col items-center justify-center gap-0.5 h-full relative ${isActive ? 'active' : ''}`}
            >
              <div className="relative">
                <Icon className="w-[18px] h-[18px]" />
                {badgeCount > 0 && (
                  <span className={`absolute -top-1.5 -right-2 w-[14px] h-[14px] flex items-center justify-center bg-[#eb4d3d] text-white text-[9px] font-bold rounded-full shrink-0 tracking-tighter leading-none ${item.id === 'schedule' ? 'animate-pulse' : ''}`}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </div>
              <span className="text-[9px] sm:text-[10px] font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
