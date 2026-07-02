"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Edit2, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import * as holidaysKr from '@hyunbinseo/holidays-kr';

interface Employee {
  no: number;
  empId: string;
  name: string;
  position: string;
  department: string;
  mainWorkplace?: string;
  subWorkplace?: string;
  password?: string;
  isManager?: boolean;
  isRetired?: boolean;
}

interface SupportAssignment {
  am?: string[];
  pm?: string[];
}

interface ScheduleData {
  year: number;
  month: number;
  employees: Employee[];
  shifts: Record<string, Record<number, string>>; // empId → day → shiftCode
  supports?: Record<string, Record<number, SupportAssignment>>; // empId → day → Support
}

interface PersonalCalendarProps {
  scheduleData?: ScheduleData;
  isSaving?: boolean;
  openPopover?: (e: React.MouseEvent, type: 'calendar', data: { empId: string; empName: string; day: number; am: string[]; pm: string[] }) => void;
  getPopoverSupports?: (empId: string, day: number) => { am: string[]; pm: string[] };
  showToast?: (msg: string) => void;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

const SHIFT_CODES: Record<string, { label: string; hours: string; color: string; bg: string; border: string }> = {
  'D': { label: '주간', hours: '08:30-17:30', color: 'text-blue-800', bg: 'bg-blue-50', border: 'border-blue-200' },
  'D3': { label: '조기출근', hours: '07:30-16:30', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
  'DO': { label: 'ALL DAY', hours: '종일', color: 'text-blue-900', bg: 'bg-blue-100', border: 'border-blue-300' },
  'E': { label: '기능검사(E)', hours: '11:00-20:00', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
  'H': { label: '오전반일', hours: '08:30-12:30', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  'HO': { label: 'HALF DAY', hours: '반일', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  'M': { label: '오전', hours: '08:30-12:30', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
  'M1': { label: '토요근무(도수)', hours: '08:30-12:30', color: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  'MO': { label: '4h대체휴무', hours: '대체휴무', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  'MX': { label: '토요근무(방종)', hours: '08:30-12:30', color: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-100' },
  'N': { label: '야간(수면)', hours: '21:00-08:00', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  '수면': { label: '야간(수면)', hours: '21:00-08:00', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  'NO': { label: 'NIGHT-OFF', hours: '-', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' },
  'OFF': { label: 'OFF', hours: '-', color: 'text-gray-400', bg: 'bg-gray-100', border: 'border-gray-200' },
  'S': { label: '휴일당직', hours: '08:30-17:30', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  'SO': { label: '8h대체휴무', hours: '대체휴무', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100' },
  '연차': { label: '연차', hours: '-', color: 'text-blue-600', bg: 'bg-white', border: 'border-blue-100' },
  '반차': { label: '반차', hours: '반일', color: 'text-blue-600', bg: 'bg-white', border: 'border-blue-100' },
  '특휴': { label: '특휴', hours: '-', color: 'text-blue-600', bg: 'bg-white', border: 'border-blue-100' },
  '태검': { label: '태아검진', hours: '-', color: 'text-blue-600', bg: 'bg-white', border: 'border-blue-100' },
  '휴직': { label: '휴직', hours: '-', color: 'text-blue-600', bg: 'bg-white', border: 'border-blue-100' },
  '육휴': { label: '육휴', hours: '-', color: 'text-blue-600', bg: 'bg-white', border: 'border-blue-100' },
};

const ROOM_NAME_MAP: Record<string, string> = {
  '면역': '면역', '근전도': '근전도', '뇌파': '뇌파', '안과': '안과',
  '심기능': '심기', '심초': '심초', '청력': '청력', '소화': '소화',
  '호흡': '호흡', '수면': '수면', '육아휴직': '휴직',
};
function getRoomName(dept: string): string {
  return ROOM_NAME_MAP[dept] || dept;
}

const MAP_FULL_TO_SHORT: Record<string, string> = {
  '면역치료실': '면역', '면역치료': '면역', '8F 면역치료': '면역',
  '안과검사실': '안과', '안과기능': '안과', '4F 안과기능': '안과',
  '수면다원검사실': '수면', '수면다원': '수면', '4F 수면다원': '수면',
  '근전도실': '근전도', '1F 근전도': '근전도',
  '뇌파검사실': '뇌파', '뇌파검사': '뇌파', '3F 뇌파': '뇌파',
  '소화기능검사실': '소화', '소화기능': '소화', '2F 소화기능': '소화',
  '심장기능검사실': '심기능', '심장기능': '심기능', '2F 심장기능': '심기능',
  '심장초음파실': '심초', '심장초음파': '심초', '2F 심장초음파': '심초',
  '호흡기능검사실': '호흡', '호흡기능': '호흡', '1F 호흡기능': '호흡',
  '청력기능검사실': '청력', '청력검사': '청력', 'B1 청력': '청력'
};

const normalize = (emp: any) => {
  if (!emp) return emp;
  return {
    ...emp,
    mainWorkplace: MAP_FULL_TO_SHORT[emp.mainWorkplace] || emp.mainWorkplace || '',
    subWorkplace: MAP_FULL_TO_SHORT[emp.subWorkplace] || emp.subWorkplace || '',
    department: MAP_FULL_TO_SHORT[emp.department] || emp.department || ''
  };
};

export default function PersonalCalendar(props: PersonalCalendarProps) {
  const { scheduleYear: year, scheduleMonth: month, calendarMemos: memos, loadCalendarMemos, saveCalendarMemo, employees: rawEmployees, vacations, currentUser: rawCurrentUser, globalVersion } = useStore();

  const [calendarEmpId, setCalendarEmpId] = useState<string>('all');
  const [localScheduleData, setLocalScheduleData] = useState<ScheduleData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ── 메모 기능 로컬 상태 ──
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [selectedMemoEmpId, setSelectedMemoEmpId] = useState('');
  const [selectedMemoDay, setSelectedMemoDay] = useState<number | null>(null);
  const [memoText, setMemoText] = useState('');
  const [toast, setToast] = useState('');

  // 1. 직원 데이터 필터링 & 노멀라이징
  const employees = useMemo(() => {
    return (rawEmployees || [])
      .filter((emp: any) => {
        const dept = String(emp.department || '').trim();
        const name = String(emp.name || '').trim();
        return (dept === '기능검사팀' || dept === '기능검사') && name !== '유병렬';
      })
      .map(normalize);
  }, [rawEmployees]);

  const currentUser = useMemo(() => {
    if (!rawCurrentUser) return rawCurrentUser;
    return {
      ...rawCurrentUser,
      mainWorkplace: MAP_FULL_TO_SHORT[rawCurrentUser.mainWorkplace] || rawCurrentUser.mainWorkplace || '',
      subWorkplace: MAP_FULL_TO_SHORT[rawCurrentUser.subWorkplace] || rawCurrentUser.subWorkplace || '',
      department: MAP_FULL_TO_SHORT[rawCurrentUser.department] || rawCurrentUser.department || ''
    };
  }, [rawCurrentUser]);

  // 2. 휴가 맵 생성
  const approvedVacationsMap = useMemo(() => {
    const map: Record<string, any> = {};
    vacations.forEach(v => {
      if (v.status === '승인') {
        map[`${v.empId}_${v.vacationDate}`] = v;
      }
    });
    return map;
  }, [vacations]);

  // 3. 공휴일 딕셔너리 생성
  const [holidaysDict, setHolidaysDict] = useState<Record<string, string>>({});

  useEffect(() => {
    const yearObj = (holidaysKr as any)[`y${year}`];
    if (yearObj) {
      const filtered: Record<string, string> = {};
      for (const [dateStr, names] of Object.entries(yearObj)) {
        const arr = names as string[];
        filtered[dateStr] = arr.join('/');
      }
      setHolidaysDict(filtered);
    } else {
      setHolidaysDict({});
    }
  }, [year]);

  const getHolidayName = useCallback((y: number, m: number, d: number) => {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return holidaysDict[dateStr] || null;
  }, [holidaysDict]);

  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);

  const dateInfos = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const date = new Date(year, month - 1, d);
      const dow = date.getDay();
      const holidayName = getHolidayName(year, month, d);
      return { day: d, dow, dayName: DAY_NAMES[dow], isHoliday: !!holidayName, holidayName };
    });
  }, [year, month, daysInMonth, getHolidayName]);

  // 4. 로컬/Props 데이터 병합 및 실제 변동(연차/휴직 등) 반영 (Merged State)
  const scheduleData = useMemo(() => {
    const base = props.scheduleData || localScheduleData || {
      year,
      month,
      employees: [],
      shifts: {},
      supports: {}
    };

    const mergedShifts = JSON.parse(JSON.stringify(base.shifts || {}));
    const mergedSupports = JSON.parse(JSON.stringify(base.supports || {}));
    
    // 승인된 연차를 shifts 및 supports에 병합
    vacations.forEach(v => {
      if (v.status === '승인') {
        try {
          const vDate = new Date(v.vacationDate);
          if (vDate.getFullYear() === base.year && (vDate.getMonth() + 1) === base.month) {
            const day = vDate.getDate();
            const empId = v.empId;
            if (!mergedShifts[empId]) {
              mergedShifts[empId] = {};
            }
            const type = v.vacationType;
            let code = type;
            if (type === '종일연차') code = '연차';
            else if (type === '오전반차' || type === '오후반차') code = '반차';
            else if (type === '토요일 오전 MO' || type === '토요일 오후 MO') code = 'MO';
            else if (type === '대체 오전 HO' || type === '대체 오후 HO') code = 'HO';
            else if (type === '육아휴직') code = '육휴';
            else if (type === '휴직') code = '휴직';
            mergedShifts[empId][day] = code;

            // 인수자 대타 지원지 자동 배치
            if (v.handoverEmpId) {
              const handoverId = v.handoverEmpId;
              const giver = base.employees.find((e: Employee) => String(e.empId) === String(v.empId)) ||
                           employees.find((e: Employee) => String(e.empId) === String(v.empId));
              if (giver) {
                const giverWorkplaceFull = giver.mainWorkplace || giver.department || '';
                const giverWorkplace = MAP_FULL_TO_SHORT[giverWorkplaceFull] || giverWorkplaceFull;

                if (!mergedSupports[handoverId]) {
                  mergedSupports[handoverId] = {};
                }
                if (!mergedSupports[handoverId][day]) {
                  mergedSupports[handoverId][day] = { am: [], pm: [] };
                }

                const amList = Array.isArray(mergedSupports[handoverId][day].am) ? [...mergedSupports[handoverId][day].am] : [];
                const pmList = Array.isArray(mergedSupports[handoverId][day].pm) ? [...mergedSupports[handoverId][day].pm] : [];

                if (type === '종일연차') {
                  if (!amList.includes(giverWorkplace)) amList.push(giverWorkplace);
                  if (!pmList.includes(giverWorkplace)) pmList.push(giverWorkplace);
                } else if (type === '오전반차' || type === '토요일 오전 MO' || type === '대체 오전 HO') {
                  if (!amList.includes(giverWorkplace)) amList.push(giverWorkplace);
                } else if (type === '오후반차' || type === '토요일 오후 MO' || type === '대체 오후 HO') {
                  if (!pmList.includes(giverWorkplace)) pmList.push(giverWorkplace);
                }

                mergedSupports[handoverId][day] = { am: amList, pm: pmList };
              }
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
    });

    return {
      ...base,
      shifts: mergedShifts,
      supports: mergedSupports
    };
  }, [props.scheduleData, localScheduleData, vacations, year, month, employees]);

  // 5. 메모 로드 & 토스트 타이머
  useEffect(() => {
    loadCalendarMemos(year, month);
  }, [year, month, loadCalendarMemos]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // 6. DB fetch 로직 (props.scheduleData 가 없을 때만 동작)
  useEffect(() => {
    if (props.scheduleData) return;

    let isMounted = true;

    // 즉시 로컬 스토리지 캐시 로드하여 빈 화면 방지
    const cacheKey = `cached_schedule_${year}_${month}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          setLocalScheduleData(parsed);
        }
      } catch (e) {
        console.error('[PersonalCalendar] Cache load error:', e);
      }
    }

    const fetchSchedule = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/schedule?year=${year}&month=${month}&_t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('근무표 로드 실패');
        const data = await res.json();
        if (isMounted) {
          const targetEmployees = employees.length > 0
            ? employees.filter((e: Employee) => !e.isRetired)
            : [];

          const sortedEmployees = [...targetEmployees].sort((a, b) => {
            const indexA = data.empIds ? data.empIds.indexOf(String(a.empId)) : -1;
            const indexB = data.empIds ? data.empIds.indexOf(String(b.empId)) : -1;
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
          });

          const freshData = {
            year,
            month,
            employees: sortedEmployees,
            shifts: data.shifts || {},
            supports: data.supports || {}
          };
          setLocalScheduleData(freshData);
          localStorage.setItem(cacheKey, JSON.stringify(freshData));
        }
      } catch (err) {
        console.error('[PersonalCalendar] 데이터 로드 실패:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchSchedule();
    return () => { isMounted = false; };
  }, [year, month, props.scheduleData, employees, globalVersion]);

  const isFullOff = useCallback((code: string) => {
    const c = code?.toUpperCase().trim() || '';
    return !c || ['OFF', 'NO', 'SO', '연차', '육휴', '휴직', '특휴', '태검'].includes(c);
  }, []);

  // 7. 부서 색상 유틸
  const getDeptColor = (dept: string) => {
    const map: Record<string, string> = {
      '면역': 'bg-purple-50 text-purple-700 border-purple-200',
      '근전도': 'bg-teal-50 text-teal-700 border-teal-200',
      '근전': 'bg-teal-50 text-teal-700 border-teal-200',
      '뇌파': 'bg-green-50 text-green-700 border-green-200',
      '안과': 'bg-blue-50 text-blue-700 border-blue-200',
      '심기능': 'bg-orange-50 text-orange-700 border-orange-200',
      '심기': 'bg-orange-50 text-orange-700 border-orange-200',
      '심초': 'bg-orange-50 text-orange-700 border-orange-200',
      '청력': 'bg-cyan-50 text-cyan-700 border-cyan-200',
      '소화': 'bg-amber-50 text-amber-700 border-amber-200',
      '호흡': 'bg-teal-50 text-teal-700 border-teal-200',
      '수면': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      '육아휴직': 'bg-gray-100 text-gray-500 border-gray-200',
      '휴직': 'bg-gray-100 text-gray-500 border-gray-200',
    };
    return map[dept] || 'bg-gray-50 text-gray-600 border-gray-200';
  };

  const handleSaveMemo = () => {
    if (!selectedMemoEmpId || selectedMemoDay === null) return;
    const key = `${selectedMemoEmpId}_${selectedMemoDay}`;
    const existing = memos[key] || '';
    const updated = existing ? `${existing}\n${memoText.trim()}` : memoText.trim();
    saveCalendarMemo(year, month, key, updated);
    setShowMemoModal(false);
    setToast('메모가 저장되었습니다.');
  };

  const firstDay = new Date(year, month - 1, 1).getDay();
  const totalCells = Math.ceil((daysInMonth + firstDay) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const d = i - firstDay + 1;
    if (d > 0 && d <= daysInMonth) return dateInfos[d - 1];
    return null;
  });

  const currentDisplayEmployees = scheduleData.employees.length > 0 ? scheduleData.employees : employees;

  const displayEmployees = calendarEmpId === 'all'
    ? currentDisplayEmployees
    : (() => {
      const selectedEmp = currentDisplayEmployees.find(e => String(e.empId) === String(calendarEmpId));
      if (!selectedEmp) return [];
      const targetWorkplace = selectedEmp.mainWorkplace || selectedEmp.department;
      return currentDisplayEmployees
        .filter(e => (e.mainWorkplace || e.department) === targetWorkplace)
        .sort((a, b) => {
          if (String(a.empId) === String(calendarEmpId)) return -1;
          if (String(b.empId) === String(calendarEmpId)) return 1;
          return 0;
        });
    })();

  return (
    <div className="flex-1 flex overflow-hidden bg-white relative h-full">
      {isLoading && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 animate-pulse z-50" />
      )}

      {/* 왼쪽 직원 리스트 탭 */}
      <div className="w-[150px] shrink-0 bg-white border-r border-gray-200 overflow-hidden flex flex-col z-10">
        <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center justify-center shrink-0 h-[35px]">
          <h3 className="font-bold text-gray-500 text-[11px]">직원 정보</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-1.5 space-y-1 no-scrollbar">
          <button
            onClick={() => setCalendarEmpId('all')}
            className={`w-full text-center px-3 py-2 rounded-lg text-[11px] font-bold transition-all ${calendarEmpId === 'all'
              ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200 shadow-sm'
              : 'text-gray-600 hover:bg-gray-50'
              }`}
          >
            전체 직원
          </button>
          {currentDisplayEmployees.map(emp => (
            <button
              key={emp.empId}
              onClick={() => setCalendarEmpId(emp.empId)}
              className={`w-full px-1.5 py-2 rounded-lg transition-all ${calendarEmpId === emp.empId
                ? 'bg-primary-50 ring-1 ring-primary-200 shadow-sm'
                : 'hover:bg-gray-50'
                }`}
            >
              <div className="grid grid-cols-[36px_1fr] gap-1 items-center w-full">
                <span className={`inline-block text-[9px] font-bold px-1 py-0.5 rounded border text-center truncate ${getDeptColor(emp.mainWorkplace || emp.department)}`}>{emp.mainWorkplace || emp.department}</span>
                <span className={`font-bold text-[11px] text-center truncate ${calendarEmpId === emp.empId ? 'text-primary-800' : 'text-gray-900'}`}>{emp.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 메인 캘린더 영역 */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 shrink-0 h-[35px]">
          {DAY_NAMES.map((d, i) => {
            let dayBg = 'bg-gray-50';
            let textClass = 'text-gray-700';
            if (i === 0) { dayBg = 'bg-red-50/40'; textClass = 'text-red-600'; }
            else if (i === 6) { dayBg = 'bg-blue-50/40'; textClass = 'text-blue-700'; }
            return (
              <div key={d} className={`py-2 text-center text-[11px] font-bold border-r border-gray-200 flex items-center justify-center ${dayBg} ${textClass}`}>
                {d}
              </div>
            );
          })}
        </div>

        {/* 달력 날짜 본문 */}
        <div className="flex-1 bg-gray-50 relative overflow-hidden">
          <div
            className="grid grid-cols-7 h-full w-full"
            style={{ gridTemplateRows: `repeat(${totalCells / 7}, minmax(0, 1fr))` }}
          >
            {cells.map((info, idx) => {
              if (!info) return <div key={`empty-${idx}`} className="border-r border-b border-gray-100 bg-white" />;

              // 선택된 직원의 해당 일자 지원 여부 감지
              let isDaySupportForSelectedEmp = false;
              if (calendarEmpId !== 'all') {
                const emp = displayEmployees.find(e => String(e.empId) === String(calendarEmpId));
                if (emp) {
                  const shift = scheduleData.shifts[emp.empId]?.[info.day] || '';
                  const off = isFullOff(shift);
                  if (!off) {
                    const amRaw = scheduleData.supports?.[emp.empId]?.[info.day]?.am;
                    const pmRaw = scheduleData.supports?.[emp.empId]?.[info.day]?.pm;
                    const amSupports = amRaw && amRaw.length > 0 ? amRaw.map((r: any) => getRoomName(r)) : [getRoomName(emp.mainWorkplace || emp.department)];
                    const pmSupports = pmRaw && pmRaw.length > 0 ? pmRaw.map((r: any) => getRoomName(r)) : [getRoomName(emp.mainWorkplace || emp.department)];
                    const origDept = emp.mainWorkplace || emp.department || '';
                    const hasAmSupport = amSupports.length > 0 && amSupports[0] !== getRoomName(origDept);
                    const hasPmSupport = pmSupports.length > 0 && pmSupports[0] !== getRoomName(origDept);
                    isDaySupportForSelectedEmp = hasAmSupport || hasPmSupport;
                  }
                }
              }

              let cellBg = 'bg-white border-t-2 border-t-transparent';
              let textCol = 'text-gray-700';
              if (info.dow === 6) {
                cellBg = 'bg-blue-50/30 border-t-2 border-t-blue-300/80';
                textCol = 'text-blue-700';
              }
              if (info.dow === 0 || info.isHoliday) {
                cellBg = 'bg-red-50/30 border-t-2 border-t-red-300/80';
                textCol = 'text-red-600';
              }

              if (isDaySupportForSelectedEmp) {
                cellBg = 'bg-orange-50/40 border-t-2 border-t-[#ff7a00]';
              }

              const handleDateClick = () => {
                const myEmpId = currentUser.employeeId;
                if (!myEmpId) {
                  const showMsg = props.showToast || alert;
                  showMsg('로그인 정보가 없습니다.');
                  return;
                }
                setSelectedMemoEmpId(myEmpId);
                setSelectedMemoDay(info.day);
                setMemoText('');
                setShowMemoModal(true);
              };

              return (
                <div
                  key={info.day}
                  className={`border-r border-b border-gray-100 ${cellBg} p-1.5 flex flex-col gap-1 overflow-hidden cursor-pointer hover:bg-gray-100/50 transition-colors`}
                  onClick={handleDateClick}
                >
                  <div className="flex items-center gap-1.5 shrink-0 mb-1.5 pointer-events-none">
                    <span className={`text-sm font-black ${textCol}`}>{info.day}</span>
                    {info.isHoliday && (
                      <span
                        className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-black whitespace-nowrap"
                        title={info.holidayName!}
                      >
                        {info.holidayName}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto flex flex-col items-start gap-1 no-scrollbar min-h-0 w-full">
                    <div className="grid grid-cols-2 gap-1.5 w-full items-start">
                      {/* 1열: 근무/연차 영역 */}
                      <div className="flex flex-col gap-1 w-full">
                        {(() => {
                          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(info.day).padStart(2, '0')}`;
                          const dayVacations = (vacations || []).filter(v => v.status === '승인' && v.vacationDate === dateStr);
                          
                          // 묶음 박스로 렌더링된 직원 ID 리스트 수집
                          const groupedEmpIds = dayVacations.flatMap(v => 
                            [String(v.empId), v.handoverEmpId ? String(v.handoverEmpId) : ''].filter(Boolean)
                          );

                          return (
                            <>
                              {/* 1. 연차-대타 묶음(Group) UI */}
                              {dayVacations.map(v => {
                                const vacEmp = (rawEmployees || []).find(e => String(e.empId) === String(v.empId));
                                const normalizedVacEmp = vacEmp ? normalize(vacEmp) : null;
                                const vacDept = normalizedVacEmp ? (normalizedVacEmp.mainWorkplace || normalizedVacEmp.department) : '';
                                const vacName = normalizedVacEmp ? normalizedVacEmp.name : '';

                                let displayVacType = v.vacationType;
                                if (v.vacationType === '종일연차') displayVacType = '연차';
                                else if (v.vacationType === '오전반차') displayVacType = '오전반';
                                else if (v.vacationType === '오후반차') displayVacType = '오후반';
                                else if (v.vacationType === '토요일 오전 MO') displayVacType = '오전MO';
                                else if (v.vacationType === '토요일 오후 MO') displayVacType = '오후MO';
                                else if (v.vacationType === '대체 오전 HO') displayVacType = '오전HO';
                                else if (v.vacationType === '대체 오후 HO') displayVacType = '오후HO';

                                const hasHandover = !!v.handoverEmpId;
                                const hoverEmp = hasHandover ? (rawEmployees || []).find(e => String(e.empId) === String(v.handoverEmpId)) : null;
                                const normalizedHoverEmp = hoverEmp ? normalize(hoverEmp) : null;
                                const hoverDept = normalizedHoverEmp ? (normalizedHoverEmp.mainWorkplace || normalizedHoverEmp.department) : '';
                                const hoverName = normalizedHoverEmp ? normalizedHoverEmp.name : '';

                                return (
                                  <div
                                    key={`vac-group-${v.empId}-${v.vacationDate}`}
                                    className="flex flex-col gap-[2px] p-1 bg-blue-50/40 border border-blue-200 rounded-md mb-1 w-full text-[10px] truncate"
                                  >
                                    <div className="truncate leading-tight font-medium text-blue-900">
                                      [{vacDept}] {vacName} {displayVacType}
                                    </div>
                                    {hasHandover && (
                                      <div className="truncate leading-tight font-medium text-blue-700">
                                        ↳ [{hoverDept}] {hoverName} 지원
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {/* 2. 일반 근무/오프 렌더링 로직 (중복 제거) */}
                              {displayEmployees.map(emp => {
                                if (groupedEmpIds.includes(String(emp.empId))) {
                                  return null;
                                }

                                const approvedVacation = approvedVacationsMap[`${emp.empId}_${dateStr}`];
                                const shift = scheduleData.shifts[emp.empId]?.[info.day] || '';
                                const normalizedShift = shift?.toUpperCase().trim();

                                const off = isFullOff(shift);
                                const isHolidayDay = info.dow === 0 || info.isHoliday;
                                const isHolidayHo = isHolidayDay && normalizedShift === 'HO';
                                const isSatM = info.dow === 6 && normalizedShift === 'M';
                                const isForceMorningOnly = isHolidayHo || isSatM;

                                const isDefaultMorningOnly = !off && (
                                  ['M', 'M1', 'MX', 'H', 'HO', 'MO'].includes(normalizedShift) ||
                                  (info.dow === 6)
                                );

                                const amRaw = scheduleData.supports?.[emp.empId]?.[info.day]?.am;
                                const pmRaw = scheduleData.supports?.[emp.empId]?.[info.day]?.pm;
                                const amSupports: string[] = amRaw && amRaw.length > 0 ? amRaw.map((r: any) => getRoomName(r)) : [getRoomName(emp.mainWorkplace || emp.department)];
                                const pmSupports: string[] = isForceMorningOnly
                                  ? []
                                  : (isDefaultMorningOnly && !(pmRaw && pmRaw.length > 0))
                                    ? []
                                    : (pmRaw && pmRaw.length > 0 ? pmRaw.map((r: any) => getRoomName(r)) : [getRoomName(emp.mainWorkplace || emp.department)]);

                                const origDept = emp.mainWorkplace || emp.department || '';
                                const isAmSupport = amSupports.length > 0 && amSupports[0] !== getRoomName(origDept);
                                const isPmSupport = pmSupports.length > 0 && pmSupports[0] !== getRoomName(origDept);
                                const supportDept = isAmSupport
                                  ? amSupports[0]
                                  : (isPmSupport ? pmSupports[0] : null);

                                // 1. 전체 직원 모드인 경우: 연차 혹은 대타 지원 근무가 있는 날만 노출
                                if (calendarEmpId === 'all') {
                                  if (!approvedVacation && !supportDept) return null;
                                }

                                // 2. 개별 직원 모드인 경우
                                if (calendarEmpId !== 'all') {
                                  const upperShift = shift?.toUpperCase().trim();
                                  const isOff = upperShift === 'OFF' || !upperShift;
                                  const isHolidayOrSunday = info.dow === 0 || info.isHoliday;
                                  const isSaturday = info.dow === 6;
                                  const isWeekday = !isHolidayOrSunday && !isSaturday;

                                  if (approvedVacation || supportDept) {
                                    // Proceed to show
                                  } else if (isHolidayOrSunday) {
                                    if (isOff) return null;
                                  } else if (isSaturday) {
                                    if (isOff) return null;
                                  } else if (isWeekday) {
                                    if (upperShift !== 'HO') return null;
                                  }
                                }

                                // 휴가 뱃지 스타일 정의
                                let vacBadgeStyle = "";
                                let vacLabel = "";
                                if (approvedVacation) {
                                  const vacType = approvedVacation.vacationType;
                                  if (vacType === '종일연차') {
                                    vacBadgeStyle = "bg-rose-50 text-rose-600 border-rose-100";
                                    vacLabel = "연차";
                                  } else if (vacType === '오전반차') {
                                    vacBadgeStyle = "bg-sky-50 text-sky-600 border-sky-100";
                                    vacLabel = "오전반";
                                  } else if (vacType === '오후반차') {
                                    vacBadgeStyle = "bg-sky-50 text-sky-600 border-sky-100";
                                    vacLabel = "오후반";
                                  } else if (vacType.includes('MO')) {
                                    vacBadgeStyle = "bg-purple-50 text-purple-700 border-purple-200";
                                    vacLabel = vacType === '토요일 오전 MO' ? '오전MO' : '오후MO';
                                  } else if (vacType.includes('HO')) {
                                    vacBadgeStyle = "bg-indigo-50 text-indigo-700 border-indigo-200";
                                    vacLabel = vacType === '대체 오전 HO' ? '오전HO' : '오후HO';
                                  } else {
                                    vacBadgeStyle = "bg-rose-50 text-rose-600 border-rose-100";
                                    vacLabel = vacType;
                                  }
                                }

                                // 일반 근무 코드 배지 스타일
                                let shiftBadgeStyle = "bg-gray-50 text-gray-400 border-gray-200";
                                let showCode = shift || 'OFF';
                                const upperShift = shift?.toUpperCase().trim();
                                if (upperShift && SHIFT_CODES[upperShift]) {
                                  const sInfo = SHIFT_CODES[upperShift];
                                  shiftBadgeStyle = `${sInfo.bg} ${sInfo.color} ${sInfo.border}`;
                                } else if (upperShift === 'OFF' || !upperShift) {
                                  shiftBadgeStyle = "bg-gray-50 text-gray-400 border-gray-200";
                                  showCode = 'OFF';
                                } else {
                                  shiftBadgeStyle = "bg-pink-50 text-pink-600 border-pink-100";
                                }

                                const isSelf = calendarEmpId !== 'all' && String(emp.empId) === String(currentUser.employeeId);
                                const cardClass = isSelf
                                  ? "ring-1 ring-blue-200 border-blue-300 bg-blue-50 shadow-sm font-extrabold"
                                  : supportDept
                                    ? "ring-1 ring-orange-200 border-orange-300 bg-orange-50/70 shadow-sm font-extrabold"
                                    : "border-gray-100 bg-gray-50 hover:bg-gray-100/50 hover:border-gray-200";

                                return (
                                  <div
                                    key={emp.empId}
                                    className={`flex flex-col gap-0.5 px-1 py-1 rounded-md border text-[10px] sm:text-xs transition-all select-none min-w-0 ${cardClass} ${props.openPopover ? 'cursor-pointer' : 'cursor-default'}`}
                                    onClick={(e) => {
                                      if (!props.openPopover || !props.getPopoverSupports) return;
                                      e.stopPropagation();
                                      if (props.isSaving) {
                                        const showMsg = props.showToast || alert;
                                        showMsg('저장 중에는 수정할 수 없습니다.');
                                        return;
                                      }
                                      const { am, pm } = props.getPopoverSupports(emp.empId, info.day);
                                      props.openPopover(e, 'calendar', { empId: emp.empId, empName: emp.name, day: info.day, am, pm });
                                    }}
                                  >
                                    <div className="flex items-center justify-between gap-0.5 w-full min-w-0">
                                      <span className={`truncate leading-none ${isSelf ? 'text-blue-900 font-black text-[10px] sm:text-xs' : 'text-gray-700 font-bold'}`}>
                                        {emp.name}
                                      </span>

                                      <div className="flex items-center gap-0.5 shrink-0">
                                        {approvedVacation ? (
                                          <span className={`px-1 py-0.5 rounded text-[8px] sm:text-[9px] font-black border leading-none shrink-0 ${vacBadgeStyle}`}>
                                            {vacLabel}
                                          </span>
                                        ) : (
                                          <span className={`px-1 py-0.5 rounded text-[8px] sm:text-[9px] font-black border leading-none shrink-0 ${shiftBadgeStyle}`}>
                                            {showCode}
                                          </span>
                                        )}

                                        {supportDept && (
                                          <span className="text-[8px] sm:text-[9px] bg-[#ff7a00] text-white px-1 py-0.5 rounded font-black shrink-0 leading-none shadow-sm">
                                            {supportDept}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </>
                          );
                        })()}
                      </div>

                      {/* 2열: 메모 영역 */}
                      <div className="flex flex-col gap-1 w-full">
                        {displayEmployees.map(emp => {
                          const memoContent = memos[`${emp.empId}_${info.day}`];
                          if (!memoContent) return null;
                          return (
                            <div
                              key={`memo-${emp.empId}`}
                              className="text-[10px] text-gray-600 bg-blue-50/60 px-1 py-1 rounded border border-blue-100 whitespace-pre-wrap break-all leading-normal w-full shadow-sm cursor-pointer hover:bg-blue-100/60 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (String(emp.empId) === String(currentUser.employeeId)) {
                                  setSelectedMemoEmpId(emp.empId);
                                  setSelectedMemoDay(info.day);
                                  setMemoText('');
                                  setShowMemoModal(true);
                                } else {
                                  const showMsg = props.showToast || alert;
                                  showMsg('본인의 메모만 수정할 수 있습니다.');
                                }
                              }}
                            >
                              <span className="text-blue-500 font-bold mr-1">{emp.name}:</span>
                              {memoContent}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 메모 입력 모달 ── */}
      {showMemoModal && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[60]" onClick={() => setShowMemoModal(false)} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-blue-500" /> 메모 입력
                </h3>
                <button onClick={() => setShowMemoModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5">
                <p className="text-xs text-gray-500 mb-3 font-bold">
                  {selectedMemoDay}일 - {currentDisplayEmployees.find(e => e.empId === selectedMemoEmpId)?.name}
                </p>

                {/* [기존 작성된 메모] 영역 */}
                {(() => {
                  const key = `${selectedMemoEmpId}_${selectedMemoDay}`;
                  const existing = memos[key];
                  if (!existing) return null;
                  return (
                    <div className="mb-4 bg-gray-50 border border-gray-100 rounded-xl p-3 max-h-24 overflow-y-auto no-scrollbar">
                      <p className="text-[10px] font-bold text-gray-400 mb-1.5">[기존 작성된 메모]</p>
                      <p className="text-xs text-gray-700 whitespace-pre-wrap break-all leading-relaxed">{existing}</p>
                    </div>
                  );
                })()}

                <textarea
                  autoFocus
                  value={memoText}
                  onChange={(e) => setMemoText(e.target.value)}
                  placeholder="추가할 메모를 입력하세요..."
                  className="w-full h-24 border border-gray-200 rounded-xl p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none placeholder-gray-400"
                />

                <div className="flex items-center justify-between mt-4">
                  {/* [초기화] 버튼 */}
                  {(() => {
                    const key = `${selectedMemoEmpId}_${selectedMemoDay}`;
                    const hasExisting = !!memos[key];
                    if (!hasExisting) return <div />;
                    return (
                      <button
                        onClick={() => {
                          if (confirm('해당 날짜의 메모를 전부 지우시겠습니까?')) {
                            saveCalendarMemo(year, month, key, '');
                            setShowMemoModal(false);
                            setToast('메모가 삭제되었습니다.');
                          }
                        }}
                        className="px-3 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        전체 비우기
                      </button>
                    );
                  })()}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowMemoModal(false)}
                      className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSaveMemo}
                      className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                      저장
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── 로컬 토스트 알림 ── */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] bg-gray-800 text-white px-5 py-2.5 rounded-xl shadow-lg text-xs font-bold transition-opacity">
          {toast}
        </div>
      )}
    </div>
  );
}
