import { useStore } from '@/store/useStore';
import { Megaphone, Repeat2, CalendarDays, MonitorCheck, BarChart3 } from 'lucide-react';

export default function BottomNav() {
  const { currentPage, setCurrentPage, currentUser, notices, handovers, equipmentIssues } = useStore();

  const unreadCounts: Record<string, number> = {
    notices: notices.filter(n => !n.readBy?.includes(currentUser.name)).length,
    handovers: handovers.filter(h => !h.readBy?.includes(currentUser.name)).length,
    equipment: equipmentIssues.filter(eq => !eq.readBy?.includes(currentUser.name)).length,
  };

  const navItems = [
    { id: 'notices', label: '공지', icon: Megaphone },
    { id: 'handovers', label: '인수인계', icon: Repeat2 },
    { id: 'schedule', label: '근무표', icon: CalendarDays },
    { id: 'equipment', label: '장비', icon: MonitorCheck },
    { id: 'stats', label: '통계', icon: BarChart3 }
  ];

  return (
    <nav className="bottom-nav block md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
      <div className="grid grid-cols-5 items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id as any)}
              className={`bottom-nav-item flex flex-col items-center justify-center gap-0.5 h-full relative ${isActive ? 'active' : ''}`}
            >
              <div className="relative">
                <Icon className="w-[18px] h-[18px]" />
                {unreadCounts[item.id] > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold px-1 py-0 rounded-full min-w-[14px] text-center shadow-[0_0_2px_rgba(239,68,68,0.8)]">
                    {unreadCounts[item.id] > 99 ? '99+' : unreadCounts[item.id]}
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
