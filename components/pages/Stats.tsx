import { useStore } from '@/store/useStore';
import { useMemo } from 'react';
import { ClipboardList, Cpu, ShieldAlert, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';

export default function Stats() {
  const { equipmentIssues } = useStore();

  const stats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // 12 months ago
    const twelveMonthsAgo = new Date(currentYear, currentMonth - 11, 1);

    // Filter year data (last 12 months)
    const yearData = equipmentIssues.filter(eq => {
      const d = new Date(eq.date.split(' ')[0]);
      return d >= twelveMonthsAgo;
    });

    const categories = [
      '의료장비 고장',
      '연동프로그램',
      '소모품'
    ] as const;

    // Generate last 12 months
    const monthLabels: string[] = [];
    const monthObjects: { year: number; month: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonth - i, 1);
      const y = targetDate.getFullYear();
      const m = targetDate.getMonth();
      monthLabels.push(`${m + 1}월`);
      monthObjects.push({ year: y, month: m });
    }

    // Category stats per month
    const categoryStats = categories.map(cat => {
      const monthlyCounts = monthObjects.map(({ year, month }) => {
        return yearData.filter(eq => {
          const d = new Date(eq.date.split(' ')[0]);
          
          // fallback category categorization if category is undefined (backward compatibility)
          let itemCat = eq.category;
          if (!itemCat) {
            const contentLower = eq.content.toLowerCase();
            const nameLower = eq.equipmentName.toLowerCase();
            const isProgram = 
              contentLower.includes('프로그램') || 
              contentLower.includes('소프트웨어') || 
              contentLower.includes('드라이버') || 
              contentLower.includes('업데이트') || 
              contentLower.includes('연동') || 
              contentLower.includes('오류') || 
              contentLower.includes('부팅') ||
              contentLower.includes('블루스크린') ||
              nameLower.includes('pc');
            itemCat = isProgram ? '연동프로그램' : '의료장비 고장';
          }
          return d.getFullYear() === year && d.getMonth() === month && itemCat === cat;
        }).length;
      });

      const total = monthlyCounts.reduce((a, b) => a + b, 0);
      const average = total > 0 ? (total / 12).toFixed(1) : '0.0';

      return {
        category: cat,
        monthlyCounts,
        total,
        average
      };
    });

    // Overall monthly counts and average
    const overallMonthlyCounts = monthObjects.map((_, mIdx) => {
      return categoryStats.reduce((sum, catStat) => sum + catStat.monthlyCounts[mIdx], 0);
    });
    const overallTotal = overallMonthlyCounts.reduce((a, b) => a + b, 0);
    const overallAverage = overallTotal > 0 ? (overallTotal / 12).toFixed(1) : '0.0';

    // Top room
    const roomCounts: Record<string, number> = {};
    yearData.forEach(eq => {
      roomCounts[eq.room] = (roomCounts[eq.room] || 0) + 1;
    });

    let topRoom = '-';
    let topRoomCount = 0;
    Object.keys(roomCounts).forEach(room => {
      if (roomCounts[room] > topRoomCount) {
        topRoomCount = roomCounts[room];
        topRoom = room;
      }
    });

    // Operational metrics
    const countSingodwem = equipmentIssues.filter(eq => eq.status === '신고됨').length;
    const countSuriJung = equipmentIssues.filter(eq => eq.status === '수리중').length;
    const countMisUnchecked = 0; // removed

    // Room ranking
    const allRooms = ['안과기능', '수면다원', '외안부', '뇌파검사', '소화기능', '심장기능', '심장초음파', '근전도', '호흡기능', '청력검사', '면역치료'];
    const roomRanking = allRooms.map(room => ({
      room,
      count: roomCounts[room] || 0
    })).sort((a, b) => b.count - a.count);
    const maxRoomCount = roomRanking.length > 0 ? roomRanking[0].count : 1;

    // Max count for stacked bar chart scaling
    const stackedMax = Math.max(...overallMonthlyCounts) || 1;
    const barMaxHeight = 150; // pixels

    return {
      totalIssues: overallTotal,
      monthlyAvg: overallAverage,
      topRoom,
      topRoomCount,
      countSingodwem,
      countSuriJung,
      countMisUnchecked,
      monthLabels,
      categoryStats,
      overallMonthlyCounts,
      roomRanking,
      maxRoomCount,
      stackedMax,
      barMaxHeight
    };
  }, [equipmentIssues]);

  return (
    <div className="p-4 sm:p-6 fade-enter bg-[#f2f4f6] min-h-screen">
      <div id="equipment-stats-dashboard" className="space-y-6 max-w-7xl mx-auto">
        
        {/* Top Header Card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">의료장비 통계 센터</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">최근 12개월 동안 접수된 의료장비 이슈 현황을 다각도로 분석합니다.</p>
          </div>
        </div>

        {/* 1. Main Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between transition-all hover:-translate-y-1 hover:shadow-md">
            <div>
              <div className="text-xs font-semibold text-gray-400 mb-1">연간 누적 이슈</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#004b8d]">
                {stats.totalIssues}<span className="text-sm font-semibold text-gray-400 ml-1">건</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#004b8d]/10 flex items-center justify-center text-[#004b8d]">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between transition-all hover:-translate-y-1 hover:shadow-md">
            <div>
              <div className="text-xs font-semibold text-gray-400 mb-1">월평균 발생 빈도</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#ff7a00]">
                {stats.monthlyAvg}<span className="text-sm font-semibold text-gray-400 ml-1">건</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#ff7a00]/10 flex items-center justify-center text-[#ff7a00]">
              <BarChart3 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between transition-all hover:-translate-y-1 hover:shadow-md">
            <div>
              <div className="text-xs font-semibold text-gray-400 mb-1">최다 고장 검실</div>
              <div className="text-lg sm:text-xl font-bold text-gray-900 truncate max-w-[180px]">
                {stats.topRoom}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">최근 1년 간 {stats.topRoomCount}건 발생</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* 2. Category Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 의료장비 고장/수리 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#004b8d] shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">의료장비 고장</h4>
              <div className="text-xl font-extrabold text-gray-900 mb-1">
                {stats.categoryStats[0].total}<span className="text-xs font-semibold text-gray-400 ml-0.5">건</span>
              </div>
              <p className="text-xs text-gray-500">월평균 {stats.categoryStats[0].average}건 발생</p>
            </div>
          </div>

          {/* 의료장비 연동 프로그램 오류 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">연동 프로그램</h4>
              <div className="text-xl font-extrabold text-gray-900 mb-1">
                {stats.categoryStats[1].total}<span className="text-xs font-semibold text-gray-400 ml-0.5">건</span>
              </div>
              <p className="text-xs text-gray-500">월평균 {stats.categoryStats[1].average}건 발생</p>
            </div>
          </div>

          {/* 소모품 고장/수리 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">소모품</h4>
              <div className="text-xl font-extrabold text-gray-900 mb-1">
                {stats.categoryStats[2].total}<span className="text-xs font-semibold text-gray-400 ml-0.5">건</span>
              </div>
              <p className="text-xs text-gray-500">월평균 {stats.categoryStats[2].average}건 발생</p>
            </div>
          </div>
        </div>

        {/* 3. Detailed Statistics Table */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm sm:text-base font-bold text-gray-900">월별 장비 고장 세부 현황 (최근 12개월)</h3>
            <span className="text-[10px] sm:text-xs text-gray-400 font-medium">단위: 건수(건)</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-left border-collapse min-w-[950px] table-fixed">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-500 text-xs font-bold">
                  <th className="py-3 px-4 w-[200px]">구분</th>
                  {stats.monthLabels.map((label, idx) => (
                    <th key={idx} className="py-3 px-2 text-center w-[50px]">{label}</th>
                  ))}
                  <th className="py-3 px-4 text-center w-[80px]">합계</th>
                  <th className="py-3 px-4 text-center w-[80px]">평균</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700 divide-y divide-gray-50">
                {/* 1. 의료장비 고장/수리 */}
                <tr className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#004b8d]"></span>
                    의료장비 고장
                  </td>
                  {stats.categoryStats[0].monthlyCounts.map((count, idx) => (
                    <td key={idx} className={`py-3.5 px-2 text-center font-medium ${count > 0 ? 'text-gray-900 font-semibold' : 'text-gray-300'}`}>
                      {count}
                    </td>
                  ))}
                  <td className="py-3.5 px-4 text-center font-bold text-[#004b8d]">
                    {stats.categoryStats[0].total}건
                  </td>
                  <td className="py-3.5 px-4 text-center font-semibold text-gray-600">
                    {stats.categoryStats[0].average}건
                  </td>
                </tr>

                {/* 2. 의료장비 연동 프로그램 오류 */}
                <tr className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                    연동프로그램
                  </td>
                  {stats.categoryStats[1].monthlyCounts.map((count, idx) => (
                    <td key={idx} className={`py-3.5 px-2 text-center font-medium ${count > 0 ? 'text-gray-900 font-semibold' : 'text-gray-300'}`}>
                      {count}
                    </td>
                  ))}
                  <td className="py-3.5 px-4 text-center font-bold text-indigo-600">
                    {stats.categoryStats[1].total}건
                  </td>
                  <td className="py-3.5 px-4 text-center font-semibold text-gray-600">
                    {stats.categoryStats[1].average}건
                  </td>
                </tr>

                {/* 3. 소모품 고장/수리 */}
                <tr className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    소모품
                  </td>
                  {stats.categoryStats[2].monthlyCounts.map((count, idx) => (
                    <td key={idx} className={`py-3.5 px-2 text-center font-medium ${count > 0 ? 'text-gray-900 font-semibold' : 'text-gray-300'}`}>
                      {count}
                    </td>
                  ))}
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                    {stats.categoryStats[2].total}건
                  </td>
                  <td className="py-3.5 px-4 text-center font-semibold text-gray-600">
                    {stats.categoryStats[2].average}건
                  </td>
                </tr>

                {/* 4. 총 합계 */}
                <tr className="bg-gray-50/50 font-bold text-gray-900">
                  <td className="py-4 px-4 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-500"></span>
                    합계 (전체)
                  </td>
                  {stats.overallMonthlyCounts.map((count, idx) => (
                    <td key={idx} className="py-4 px-2 text-center font-bold text-gray-900">
                      {count}
                    </td>
                  ))}
                  <td className="py-4 px-4 text-center text-[#ff7a00] text-base font-extrabold">
                    {stats.totalIssues}건
                  </td>
                  <td className="py-4 px-4 text-center text-[#004b8d] text-base font-extrabold">
                    {stats.monthlyAvg}건
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Visual Cumulative Chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900">월별 카테고리별 누적 고장 추이</h3>
              <p className="text-xs text-gray-500 mt-0.5">매월 접수된 이슈 종류별 상대적인 비율과 총량을 나타냅니다.</p>
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-[10px] sm:text-xs font-semibold text-gray-600">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-[#004b8d]"></span>
                <span>의료장비 고장</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-indigo-500"></span>
                <span>연동프로그램</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500"></span>
                <span>소모품</span>
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between gap-1 sm:gap-2 px-2 pt-6 border-b border-gray-100" style={{ height: `${stats.barMaxHeight + 40}px` }}>
            {stats.overallMonthlyCounts.map((val, mIdx) => {
              const c1 = stats.categoryStats[0].monthlyCounts[mIdx];
              const c2 = stats.categoryStats[1].monthlyCounts[mIdx];
              const c3 = stats.categoryStats[2].monthlyCounts[mIdx];

              const h1 = val > 0 ? (c1 / stats.stackedMax) * stats.barMaxHeight : 0;
              const h2 = val > 0 ? (c2 / stats.stackedMax) * stats.barMaxHeight : 0;
              const h3 = val > 0 ? (c3 / stats.stackedMax) * stats.barMaxHeight : 0;

              return (
                <div key={mIdx} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                  {val > 0 ? (
                    <div className="text-[10px] font-bold text-gray-700 mb-1">{val}</div>
                  ) : (
                    <div className="text-[10px] font-bold text-gray-300 mb-1">0</div>
                  )}
                  
                  <div className="w-full max-w-[28px] sm:max-w-[36px] flex flex-col-reverse rounded-t-lg overflow-hidden bg-gray-100" style={{ height: val > 0 ? `${h1 + h2 + h3}px` : '6px' }}>
                    {/* Segment 1: 의료장비 고장/수리 */}
                    {c1 > 0 && (
                      <div 
                        className="bg-[#004b8d] transition-all duration-300 hover:opacity-95" 
                        style={{ height: `${h1}px` }} 
                        title={`의료장비 고장: ${c1}건`}
                      ></div>
                    )}
                    {/* Segment 2: 연동 프로그램 오류 */}
                    {c2 > 0 && (
                      <div 
                        className="bg-indigo-500 transition-all duration-300 hover:opacity-95" 
                        style={{ height: `${h2}px` }} 
                        title={`연동프로그램: ${c2}건`}
                      ></div>
                    )}
                    {/* Segment 3: 소모품 고장/수리 */}
                    {c3 > 0 && (
                      <div 
                        className="bg-emerald-500 transition-all duration-300 hover:opacity-95" 
                        style={{ height: `${h3}px` }} 
                        title={`소모품: ${c3}건`}
                      ></div>
                    )}
                  </div>
                  <span className="text-[9px] sm:text-xs text-gray-400 font-bold mt-1.5 whitespace-nowrap">{stats.monthLabels[mIdx]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Bottom Rows: Operational Status & Room Ranking */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Operational Status Box */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 lg:col-span-2">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-4">실시간 접수 및 처리 현황</h3>
            <div className="space-y-3">
              <div className="bg-[#ff7a00]/5 border border-[#ff7a00]/10 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#ff7a00]/10 flex items-center justify-center shrink-0">
                  <span className="text-xl">🚨</span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-400">조치 필요 (신고됨)</div>
                  <div className="text-lg font-bold text-[#ff7a00]">{stats.countSingodwem}건</div>
                </div>
              </div>

              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <span className="text-xl">🛠️</span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-400">수리 진행 중</div>
                  <div className="text-lg font-bold text-[#004b8d]">{stats.countSuriJung}건</div>
                </div>
              </div>

              <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <span className="text-xl">⚠️</span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-400">긴급 이슈 현황</div>
                  <div className="text-lg font-bold text-red-500">- 건</div>
                </div>
              </div>
            </div>
          </div>

          {/* Room Ranking */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 lg:col-span-3">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-4">검사실별 연간 누적 순위</h3>
            <div className="space-y-3">
              {stats.roomRanking.slice(0, 7).map((item, idx) => {
                const barWidth = stats.maxRoomCount > 0 ? Math.max(4, Math.round((item.count / stats.maxRoomCount) * 100)) : 0;
                
                // Color scaling
                let barColor = 'bg-gray-200';
                let rankBadge = 'bg-gray-100 text-gray-600';
                if (idx === 0) { barColor = 'bg-[#004b8d]'; rankBadge = 'bg-[#004b8d]/10 text-[#004b8d]'; }
                else if (idx === 1) { barColor = 'bg-[#004b8d]/80'; rankBadge = 'bg-[#004b8d]/5 text-[#004b8d]/90'; }
                else if (idx === 2) { barColor = 'bg-[#004b8d]/60'; rankBadge = 'bg-[#004b8d]/5 text-[#004b8d]/70'; }
                
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${rankBadge}`}>
                      {idx + 1}
                    </span>
                    <span className="w-16 sm:w-20 text-xs sm:text-sm text-gray-700 font-semibold truncate">{item.room}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${barWidth}%` }}></div>
                    </div>
                    <span className={`w-8 text-right text-xs sm:text-sm font-bold ${item.count > 0 ? 'text-gray-700' : 'text-gray-300'}`}>
                      {item.count}건
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
