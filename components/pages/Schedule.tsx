"use client";

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Upload, FileSpreadsheet, CalendarDays, Info, X, ChevronLeft, ChevronRight, Download, AlertTriangle, User, Plus, Edit2, Trash2, UserX, UserCheck, Archive } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useStore } from '@/store/useStore';
import VacationModal from './VacationModal';
import * as holidaysKr from '@hyunbinseo/holidays-kr';
import PersonalCalendar from '@/components/ui/PersonalCalendar';

const ROOM_NAME_MAP: Record<string, string> = {
  '면역': '면역', '근전도': '근전도', '뇌파': '뇌파', '안과': '안과',
  '심기능': '심기', '심초': '심초', '청력': '청력', '소화': '소화',
  '호흡': '호흡', '수면': '수면', '육아휴직': '휴직',
};
function getRoomName(dept: string): string {
  return ROOM_NAME_MAP[dept] || dept;
}

/* ──────────────────────────────────────────────
   1. 타입 정의
   ────────────────────────────────────────────── */
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

/* ──────────────────────────────────────────────
   2. 근무코드 정의 (첨부 이미지 2번 기반)
   ────────────────────────────────────────────── */
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

/* ──────────────────────────────────────────────
   3. 직원 데이터 (첨부 이미지 3번 기반)
   ────────────────────────────────────────────── */
const DEFAULT_EMPLOYEES: Employee[] = [
  { no: 1, empId: '8157', name: '이가람', position: '대리', department: '면역', mainWorkplace: '면역' },
  { no: 2, empId: '7339', name: '김가영', position: '계장', department: '근전도', mainWorkplace: '근전도' },
  { no: 3, empId: '10691', name: '정주연', position: '주임', department: '뇌파', mainWorkplace: '뇌파' },
  { no: 4, empId: '10714', name: '배우미', position: '선임주임', department: '안과', mainWorkplace: '안과' },
  { no: 5, empId: '10230', name: '최민정', position: '주임', department: '안과', mainWorkplace: '안과' },
  { no: 6, empId: '12499', name: '이지민', position: '사원', department: '안과', mainWorkplace: '안과' },
  { no: 7, empId: '11160', name: '강다희', position: '주임', department: '심기능', mainWorkplace: '심기능' },
  { no: 8, empId: '11774', name: '김혜진A', position: '사원', department: '심기능', mainWorkplace: '심기능' },
  { no: 9, empId: '11101', name: '이수민', position: '주임', department: '심초', mainWorkplace: '심초' },
  { no: 10, empId: '11812', name: '송은주', position: '사원', department: '심초', mainWorkplace: '심초' },
  { no: 11, empId: '11954', name: '박수빈', position: '사원', department: '청력', mainWorkplace: '청력' },
  { no: 12, empId: '12373', name: '신혜원', position: '사원', department: '소화', mainWorkplace: '소화' },
  { no: 13, empId: '12474', name: '박미지', position: '사원', department: '호흡', mainWorkplace: '호흡' },
  { no: 14, empId: '10970', name: '호윤기', position: '임상병리사', department: '수면', mainWorkplace: '수면' },
  { no: 15, empId: '10234', name: '도주현', position: '선임주임', department: '육아휴직', mainWorkplace: '육아휴직' },
];

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

/* ──────────────────────────────────────────────
   4. 샘플 데이터 생성 함수
   ────────────────────────────────────────────── */
function generateSampleShifts(year: number, month: number): Record<string, Record<number, string>> {
  const shifts: Record<string, Record<number, string>> = {};

  const exactShifts: Record<string, string[]> = {
    '8157': ['D', 'D', 'HO', 'D', 'D', 'OFF', 'OFF', 'D', 'D', 'D', 'D', 'D', 'OFF', 'OFF', 'D', 'D', 'D', 'D', 'HO', 'OFF', 'OFF', 'D', 'D', 'D', 'D', 'D', 'OFF', 'OFF', 'D', 'D'],
    '7339': ['D', 'D', 'OFF', 'D', 'D', 'OFF', 'OFF', 'D', 'D', 'D', 'D', 'D', 'OFF', 'OFF', 'D', 'D', 'D', 'D', '연차', 'OFF', 'OFF', 'D', 'D', 'D', 'D', 'D', 'OFF', 'OFF', 'D', 'D'],
    '10691': ['D', 'D', 'HO', 'D', 'D', 'OFF', 'OFF', 'D', 'D', 'D', 'D', '반차', 'OFF', 'OFF', 'D', 'D', 'D', 'D', 'D', 'OFF', 'OFF', 'D', 'D', 'D', 'D', 'HO', 'OFF', 'OFF', 'D', 'D'],
    '10714': ['D', 'D', 'HO', 'D', 'D', 'OFF', 'OFF', 'D', 'D', 'D', 'D', 'D', 'OFF', 'OFF', 'D', 'D', 'D', 'D', 'D', 'OFF', 'OFF', 'D', 'D', 'D', 'D', '태검', 'OFF', 'OFF', '연차', '연차'],
    '10230': ['D', 'D', 'OFF', 'D', 'D', 'OFF', 'OFF', 'D', 'D', 'MO', 'D', 'D', 'M', 'OFF', 'D', 'D', 'D', 'D', 'D', 'OFF', 'OFF', '연차', '연차', 'D', 'D', 'D', 'OFF', 'OFF', 'D', 'D'],
    '12499': ['D', 'D', 'D', 'D', 'D', 'OFF', 'OFF', 'D', 'D', 'D', 'D', 'D', 'OFF', 'OFF', 'D', 'D', 'D', 'D', 'D', 'OFF', 'OFF', 'D', 'D', 'D', 'D', 'D', 'OFF', 'OFF', 'D', 'D'],
    '11160': ['D', 'D', 'OFF', 'D', 'D', 'OFF', 'OFF', 'D', 'D', 'D', 'D', 'D', 'OFF', 'OFF', 'D', 'D', 'D', 'D', 'D', 'M', 'OFF', 'D', 'D', 'D', 'D', 'D', 'OFF', 'OFF', 'D', 'D'],
    '11774': ['D', 'D', 'HO', 'D', 'HO', 'OFF', 'OFF', 'D', 'D', 'D', 'D', 'D', 'M', 'OFF', 'D', 'D', 'D', 'D', '연차', 'OFF', 'OFF', 'D', 'D', 'D', 'D', 'D', 'M', 'OFF', 'D', 'D'],
    '11101': ['D', 'D', 'HO', 'D', 'D', 'OFF', 'OFF', 'D', 'D', 'D', 'D', 'D', 'M', 'OFF', 'D', 'D', 'D', 'D', 'HO', 'OFF', 'OFF', 'D', 'D', 'D', 'D', 'D', 'M', 'OFF', 'D', 'D'],
    '11812': ['D', 'D', 'OFF', 'D', 'D', 'OFF', 'OFF', 'D', 'D', 'D', 'D', 'D', 'OFF', 'OFF', 'D', 'D', 'D', 'D', 'D', 'M', 'OFF', 'D', 'D', 'D', 'D', 'D', 'OFF', 'OFF', 'D', 'D'],
    '11954': ['D', 'D', 'HO', 'D', 'D', 'OFF', 'OFF', 'D', 'D', 'D', 'D', 'HO', 'OFF', 'OFF', 'D', 'D', 'D', 'D', 'HO', 'OFF', 'OFF', 'D', 'D', 'D', 'D', 'D', 'M', 'OFF', '연차', '연차'],
    '12373': ['D', 'D', 'HO', 'D', 'D', 'OFF', 'OFF', '연차', '연차', 'D', 'D', 'HO', 'M', 'OFF', 'D', 'D', 'D', 'D', 'D', 'OFF', 'OFF', 'D', 'D', 'D', 'D', 'D', 'M', 'OFF', 'D', 'D'],
    '12474': ['D', 'D', 'OFF', 'D', 'D', 'OFF', 'OFF', 'D', 'D', 'D', 'D', 'D', 'M', 'OFF', 'D', 'D', 'D', 'D', 'D', 'M', 'OFF', 'D', 'D', 'D', 'D', 'D', 'OFF', 'OFF', 'D', 'D'],
    '10970': ['OFF', '연차', 'OFF', '수면', 'NO', 'OFF', 'OFF', 'OFF', '수면', 'NO', '수면', 'NO', '수면', 'NO', 'OFF', '수면', 'NO', '수면', 'NO', '수면', 'NO', 'OFF', '수면', 'NO', '수면', 'NO', '수면', 'NO', 'OFF', '수면'],
    '10234': Array(30).fill('육휴'),
  };

  DEFAULT_EMPLOYEES.forEach(emp => {
    shifts[emp.empId] = {};
    const empShifts = exactShifts[emp.empId];
    if (empShifts) {
      for (let d = 1; d <= 30; d++) {
        shifts[emp.empId][d] = empShifts[d - 1];
      }
    }
  });

  return shifts;
}

/* ──────────────────────────────────────────────
   5. 엑셀 파싱 함수
   ────────────────────────────────────────────── */
function parseExcelSchedule(workbook: XLSX.WorkBook, selectedYear?: number, selectedMonth?: number): ScheduleData | null {
  try {
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // 날짜 헤더 행 찾기: 1, 2, 3, 4 ... 연속 숫자가 있는 행
    let headerRowIdx = -1;
    let dateColStart = -1;
    let dateColEnd = -1;
    let nameColIdx = -1;
    let empIdColIdx = -1;
    let posColIdx = -1;

    for (let r = 0; r < Math.min(raw.length, 10); r++) {
      const row = raw[r];
      for (let c = 0; c < row.length; c++) {
        const val = typeof row[c] === 'number' ? row[c] : parseInt(String(row[c]));
        if (val === 1) {
          // 연속 숫자 확인
          let seqLen = 0;
          for (let cc = c; cc < row.length; cc++) {
            const v2 = typeof row[cc] === 'number' ? row[cc] : parseInt(String(row[cc]));
            if (v2 === seqLen + 1) seqLen++;
            else break;
          }
          if (seqLen >= 28) {
            headerRowIdx = r;
            dateColStart = c;
            dateColEnd = c + seqLen - 1;
            break;
          }
        }
      }
      if (headerRowIdx >= 0) break;
    }

    if (headerRowIdx < 0) return null;

    // 사원명, 사번 컬럼 찾기
    for (let r = 0; r <= headerRowIdx; r++) {
      const row = raw[r];
      for (let c = 0; c < dateColStart; c++) {
        const v = String(row[c] || '').trim();
        if (v.includes('사원명') || v.includes('이름') || v.includes('성명')) nameColIdx = c;
        if (v.includes('사번')) empIdColIdx = c;
        if (v.includes('직위') || v.includes('직급')) posColIdx = c;
      }
    }

    if (nameColIdx < 0) {
      // 사원명 못 찾으면 사번 다음 컬럼으로 추정
      nameColIdx = empIdColIdx >= 0 ? empIdColIdx + 1 : 2;
    }

    // 데이터 행 파싱
    const totalDays = dateColEnd - dateColStart + 1;
    const now = new Date();
    const year = selectedYear || now.getFullYear();
    const month = selectedMonth || (now.getMonth() + 1);

    const employees: Employee[] = [];
    const shifts: Record<string, Record<number, string>> = {};

    for (let r = headerRowIdx + 1; r < raw.length; r++) {
      const row = raw[r];
      const name = String(row[nameColIdx] || '').trim();
      if (!name || name.length < 2) continue;

      const empId = String(row[empIdColIdx] || r - headerRowIdx).trim();
      const pos = posColIdx >= 0 ? String(row[posColIdx] || '').trim() : '';

      const existing = DEFAULT_EMPLOYEES.find(e => String(e.empId) === String(empId) || e.name === name);
      const emp: Employee = {
        no: employees.length + 1,
        empId: empId,
        name: name,
        position: pos || existing?.position || '',
        department: existing?.department || '',
        isRetired: false
      };
      employees.push(emp);

      shifts[emp.empId] = {};
      for (let d = 0; d < totalDays; d++) {
        const colIdx = dateColStart + d;
        const cellVal = String(row[colIdx] || '').trim().toUpperCase();
        if (cellVal) {
          shifts[emp.empId][d + 1] = cellVal;
        }
      }
    }

    return { year, month, employees, shifts, supports: {} };
  } catch {
    return null;
  }
}

const MAP_FULL_TO_SHORT: Record<string, string> = {
  '면역치료실': '면역',
  '면역치료': '면역',
  '8F 면역치료': '면역',
  '안과검사실': '안과',
  '안과기능': '안과',
  '4F 안과기능': '안과',
  '수면다원검사실': '수면',
  '수면다원': '수면',
  '4F 수면다원': '수면',
  '근전도실': '근전도',
  '1F 근전도': '근전도',
  '뇌파검사실': '뇌파',
  '뇌파검사': '뇌파',
  '3F 뇌파': '뇌파',
  '소화기능검사실': '소화',
  '소화기능': '소화',
  '2F 소화기능': '소화',
  '심장기능검사실': '심기능',
  '심장기능': '심기능',
  '2F 심장기능': '심기능',
  '심장초음파실': '심초',
  '심장초음파': '심초',
  '2F 심장초음파': '심초',
  '호흡기능검사실': '호흡',
  '호흡기능': '호흡',
  '1F 호흡기능': '호흡',
  '청력기능검사실': '청력',
  '청력검사': '청력',
  'B1 청력': '청력'
};

/* ──────────────────────────────────────────────
   6. Schedule 메인 컴포넌트
   ────────────────────────────────────────────── */
// 공휴일 로직은 Schedule 컴포넌트 내부에서 상태로 관리합니다.

export default function Schedule() {
  const { 
    scheduleYear: year, 
    scheduleMonth: month, 
    setScheduleYearMonth,
    calendarMemos: memos,
    loadCalendarMemos,
    saveCalendarMemo,
    employees: rawEmployees, 
    vacations, 
    currentUser: rawCurrentUser, 
    currentDepartment, 
    addEmployee, 
    updateEmployee, 
    deleteEmployee, 
    initializeData, 
    globalVersion, 
    highlightedItemId, 
    setHighlightedItemId, 
    highlightedItemIds, 
    addHighlightedItemId, 
    removeHighlightedItemId, 
    highlightedItemTimestamp, 
    setMyLastSavedScheduleVersion 
  } = useStore();

  const hasVacationAlarm = highlightedItemIds.some(id => typeof id === 'string' && id.startsWith('vacation_'));

  const employees = useMemo(() => {
    const mapFullToShort: Record<string, string> = {
      '면역치료실': '면역',
      '면역치료': '면역',
      '8F 면역치료': '면역',
      '안과검사실': '안과',
      '안과기능': '안과',
      '4F 안과기능': '안과',
      '수면다원검사실': '수면',
      '수면다원': '수면',
      '4F 수면다원': '수면',
      '근전도실': '근전도',
      '1F 근전도': '근전도',
      '뇌파검사실': '뇌파',
      '뇌파검사': '뇌파',
      '3F 뇌파': '뇌파',
      '소화기능검사실': '소화',
      '소화기능': '소화',
      '2F 소화기능': '소화',
      '심장기능검사실': '심기능',
      '심장기능': '심기능',
      '2F 심장기능': '심기능',
      '심장초음파실': '심초',
      '심장초음파': '심초',
      '2F 심장초음파': '심초',
      '호흡기능검사실': '호흡',
      '호흡기능': '호흡',
      '1F 호흡기능': '호흡',
      '청력기능검사실': '청력',
      '청력검사': '청력',
      'B1 청력': '청력'
    };

    const normalize = (emp: any) => {
      if (!emp) return emp;
      return {
        ...emp,
        mainWorkplace: mapFullToShort[emp.mainWorkplace] || emp.mainWorkplace || '',
        subWorkplace: mapFullToShort[emp.subWorkplace] || emp.subWorkplace || '',
        department: mapFullToShort[emp.department] || emp.department || ''
      };
    };

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

  const approvedVacationsMap = useMemo(() => {
    const map: Record<string, typeof vacations[0]> = {};
    vacations.forEach(v => {
      if (v.status === '승인') {
        map[`${v.empId}_${v.vacationDate}`] = v;
      }
    });
    return map;
  }, [vacations]);

  const pendingVacationsCount = currentUser?.isManager ? vacations.filter(v => v.status === '대기' && !(v.approvedBy || '').includes(currentUser.name)).length : 0;
  const unreadVacationsCount = vacations.filter(v => !useStore.getState().readVacationIds.includes(v.id) && v.reason !== '엑셀 업로드 자동 승인').length;
  const vacationAlarmCount = highlightedItemIds.filter(id => typeof id === 'string' && id.startsWith('vacation_')).length + pendingVacationsCount + unreadVacationsCount;

  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 네이버 달력 기준 공휴일 동기화 상태
  const [holidaysDict, setHolidaysDict] = useState<Record<string, string>>({});

  useEffect(() => {
    // 해당 연도의 공휴일 객체 (예: y2026)
    const yearObj = (holidaysKr as any)[`y${year}`];
    if (yearObj) {
      const filtered: Record<string, string> = {};
      for (const [dateStr, names] of Object.entries(yearObj)) {
        const arr = names as string[];
        // 사용자의 요청에 따라 제헌절과 노동절도 공휴일(빨간 날)로 포함합니다.
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
  const [showLegend, setShowLegend] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);

  // 직원관리 모달 관련 상태
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [vacationDrawerWidth, setVacationDrawerWidth] = useState(349);
  const [isDraggingVacationDrawer, setIsDraggingVacationDrawer] = useState(false);
  const [editingEmp, setEditingEmp] = useState<any | null>(null);
  const [showRetiredList, setShowRetiredList] = useState(false); // 퇴사자 포함 보기 여부
  const [empForm, setEmpForm] = useState({
    empId: '',
    name: '',
    position: '사원',
    mainWorkplace: '',
    subWorkplace: '',
    password: '',
    isManager: false,
    isRetired: false
  });

  const isFullOff = useCallback((code: string) => {
    const c = code?.toUpperCase().trim() || '';
    return !c || ['OFF', 'NO', 'SO', '연차', '육휴', '휴직', '특휴', '태검'].includes(c);
  }, []);

  const getLeaveAmPmState = useCallback((empId: string, day: number, shiftCode: string) => {
    const shiftCodeUpper = shiftCode?.toUpperCase().trim() || '';
    if (!['HO', 'MO', '반차'].includes(shiftCodeUpper)) {
      return { isAmLeave: false, isPmLeave: false };
    }
    const vDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const vacation = approvedVacationsMap[`${empId}_${vDateStr}`];
    const vType = vacation?.vacationType || '';
    
    let isAmLeave = false;
    let isPmLeave = false;
    
    if (vType.includes('오전')) {
      isAmLeave = true;
    } else if (vType.includes('오후')) {
      isPmLeave = true;
    } else {
      // For HO/MO, default to PM leave (Morning Work)
      if (['HO', 'MO'].includes(shiftCodeUpper)) {
        isPmLeave = true;
      }
    }
    return { isAmLeave, isPmLeave };
  }, [year, month, approvedVacationsMap]);


  const [viewMode, setViewMode] = useState<'planned' | 'actual' | 'employee' | 'room' | 'calendar'>('actual');

  // 초기 상태는 일단 빈 데이터로 시작
  const [scheduleData, setScheduleData] = useState<ScheduleData>(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      employees: [],
      shifts: {},
      supports: {},
    };
  });

  const [originalDataStr, setOriginalDataStr] = useState<string>('');

  // ── 실제 변동이 반영된 데이터 (Merged State) ──
  const mergedScheduleData = useMemo(() => {
    const mergedShifts = JSON.parse(JSON.stringify(scheduleData.shifts || {}));
    const mergedSupports = JSON.parse(JSON.stringify(scheduleData.supports || {}));

    const mapFullToShort: Record<string, string> = {
      '면역치료실': '면역',
      '면역치료': '면역',
      '8F 면역치료': '면역',
      '안과검사실': '안과',
      '안과기능': '안과',
      '4F 안과기능': '안과',
      '수면다원검사실': '수면',
      '수면다원': '수면',
      '4F 수면다원': '수면',
      '근전도실': '근전도',
      '1F 근전도': '근전도',
      '뇌파검사실': '뇌파',
      '뇌파검사': '뇌파',
      '3F 뇌파': '뇌파',
      '소화기능검사실': '소화',
      '소화기능': '소화',
      '2F 소화기능': '소화',
      '심장기능검사실': '심기능',
      '심장기능': '심기능',
      '2F 심장기능': '심기능',
      '심장초음파실': '심초',
      '심장초음파': '심초',
      '2F 심장초음파': '심초',
      '호흡기능검사실': '호흡',
      '호흡기능': '호흡',
      '1F 호흡기능': '호흡',
      '청력기능검사실': '청력',
      '청력검사': '청력',
      'B1 청력': '청력'
    };
    
    // 승인된 연차를 shifts 및 supports에 병합
    vacations.forEach(v => {
      if (v.status === '승인') {
        try {
          const vDate = new Date(v.vacationDate);
          if (vDate.getFullYear() === scheduleData.year && (vDate.getMonth() + 1) === scheduleData.month) {
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
              const giver = scheduleData.employees.find(e => String(e.empId).trim() === String(v.empId).trim()) ||
                           employees.find(e => String(e.empId).trim() === String(v.empId).trim());
              if (giver) {
                const giverWorkplaceFull = giver.mainWorkplace || giver.department || '';
                const giverWorkplace = mapFullToShort[giverWorkplaceFull] || giverWorkplaceFull;

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
      ...scheduleData,
      shifts: mergedShifts,
      supports: mergedSupports
    };
  }, [scheduleData, vacations, employees]);

  const DEPARTMENTS = ['면역', '근전도', '뇌파', '안과', '심기능', '심초', '청력', '소화', '호흡', '수면'];
  const DEPT_OPTIONS = ['기능검사실', '면역', '근전도', '뇌파', '안과', '심기능', '심초', '청력', '소화', '호흡', '수면', '육아휴직'];

  // 권한 제어: 로그인한 직원이 부서장(isManager)이면서, 현재 주근무지(mainWorkplace)가 기능검사실 혹은 기타 해당 부서와 일치할 때 권한 가짐
  const shortDept = MAP_FULL_TO_SHORT[currentDepartment] || currentDepartment;
  const canEdit = currentUser.isManager && (
    currentUser.mainWorkplace === shortDept ||
    currentUser.department === shortDept ||
    currentUser.mainWorkplace === '기능검사실'
  );

  // 부서별 직원 목록 필터링 (퇴사자 포함 보기 대응)
  const filteredEmployeesForManage = useMemo(() => {
    const isRootAdmin = currentUser.mainWorkplace === '기능검사실' || currentUser.department === '기능검사실';
    return employees.filter(e => {
      if (isRootAdmin) {
        if (showRetiredList) return true;
        return !e.isRetired;
      }
      const isMyDept = (
        e.mainWorkplace === currentUser.mainWorkplace ||
        e.subWorkplace === currentUser.mainWorkplace ||
        e.department === currentUser.mainWorkplace ||
        e.mainWorkplace === currentUser.department ||
        e.subWorkplace === currentUser.department ||
        e.department === currentUser.department
      );
      if (!isMyDept) return false;
      if (showRetiredList) return true;
      return !e.isRetired;
    });
  }, [employees, currentUser.mainWorkplace, currentUser.department, showRetiredList]);

  // ── 플로팅 팝오버 상태 (test.html 스타일) ──
  const [popover, setPopover] = useState<{
    x: number;
    y: number;
    type: 'employee' | 'room' | 'calendar';
    empId: string;
    empName: string;
    roomName: string;
    day: number;
    am: string[];
    pm: string[];
  } | null>(null);

  const [toast, setToast] = useState<string>('');

  // memos are loaded from Zustand store
  useEffect(() => {
    loadCalendarMemos(year, month);
  }, [year, month, loadCalendarMemos]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // 알림 클릭 등으로 진입 시 해당 근무표 셀로 자동 스크롤 및 강조 처리
  useEffect(() => {
    if (highlightedItemId && typeof highlightedItemId === 'string') {
      const parts = highlightedItemId.split('_');
      if (parts.length === 3) {
        const [empId, dayStr, type] = parts;
        // 1. 적합한 뷰모드로 전환 (am/pm 이면 employee, shift 이면 code)
        if (type === 'am' || type === 'pm') {
          setViewMode('employee');
        } else if (type === 'shift') {
          setViewMode('actual');
        }

        // 2. 대상 엘리먼트가 렌더링되어 나타날 때까지 폴링 (최대 4초, 100ms 주기로 체크)
        const elementId = `cell-${empId}-${dayStr}-${type}`;
        let attempts = 0;
        const maxAttempts = 40; // 40 * 100ms = 4000ms (4초)

        const intervalId = setInterval(() => {
          const element = document.getElementById(elementId);
          if (element) {
            clearInterval(intervalId);
            element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          } else {
            attempts++;
            if (attempts >= maxAttempts) {
              clearInterval(intervalId);
              console.warn(`[Schedule] 스크롤 타겟 엘리먼트(${elementId})를 4초간 찾을 수 없습니다.`);
            }
          }
        }, 100);

        return () => clearInterval(intervalId);
      }
    }
  }, [highlightedItemId, highlightedItemTimestamp]);

  const getPopoverSupports = (empId: string, day: number) => {
    const emp = scheduleData.employees.find(e => String(e.empId) === String(empId));
    const shiftCode = scheduleData.shifts[empId]?.[day] || '';
    const date = new Date(year, month - 1, day);
    const dow = date.getDay();
    const isHoliday = dow === 0 || !!getHolidayName(year, month, day);
    const isHolidayHo = isHoliday && shiftCode.toUpperCase().trim() === 'HO';
    const isSatM = dow === 6 && shiftCode.toUpperCase().trim() === 'M';
    const isForceMorningOnly = isHolidayHo || isSatM;

    const { isAmLeave, isPmLeave } = getLeaveAmPmState(empId, day, shiftCode);

    const isDefaultMorningOnly = !isFullOff(shiftCode) && (
      ['M', 'M1', 'MX', 'H', 'HO', 'MO'].includes(shiftCode.toUpperCase().trim()) ||
      (dow === 6)
    );

    const amRaw = mergedScheduleData.supports?.[empId]?.[day]?.am;
    const pmRaw = mergedScheduleData.supports?.[empId]?.[day]?.pm;
    const defaultDept = emp?.mainWorkplace || emp?.department || '';
    
    let defaultAm = [defaultDept];
    let defaultPm = [defaultDept];

    if (isAmLeave) defaultAm = [];
    if (isForceMorningOnly || isPmLeave || (isDefaultMorningOnly && !isAmLeave)) defaultPm = [];

    const am = amRaw && amRaw.length > 0 ? [...amRaw] : defaultAm;
    const pm = (pmRaw && pmRaw.length > 0) ? [...pmRaw] : defaultPm;
    while (am.length < 2) am.push('');
    while (pm.length < 2) pm.push('');
    return { am, pm };
  };

  const openPopover = (e: React.MouseEvent, type: 'employee' | 'room' | 'calendar', data: {
    empId?: string; empName?: string; roomName?: string; day: number; am?: string[]; pm?: string[];
  }) => {
    if (!currentUser.isManager) {
      setToast('부서장만 근무지를 설정할 수 있습니다.');
      return;
    }

    const isRootAdmin = currentUser.mainWorkplace === '기능검사실' || currentUser.department === '기능검사실';

    if (data.empId && type !== 'room') {
      const targetEmp = employees.find(emp => String(emp.empId) === String(data.empId));
      const isDeptManager = targetEmp && (
        currentUser.mainWorkplace === targetEmp.mainWorkplace ||
        currentUser.mainWorkplace === targetEmp.department ||
        currentUser.department === targetEmp.mainWorkplace ||
        currentUser.department === targetEmp.department
      );

      if (!isRootAdmin && !isDeptManager) {
        setToast('해당 직원의 소속 부서장만 근무지를 설정할 수 있습니다.');
        return;
      }
    } else if (type === 'room') {
      if (!canEdit) {
        setToast('부서장만 근무표를 수정할 수 있습니다.');
        return;
      }
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let x = rect.left;
    let y = rect.bottom + 5;
    const popoverWidth = 288;
    const popoverHeight = 420;
    if (x + popoverWidth > window.innerWidth) x = window.innerWidth - popoverWidth - 10;
    if (x < 10) x = 10;
    if (y + popoverHeight > window.innerHeight) y = rect.top - popoverHeight - 5;
    if (y < 10) y = 10;
    setPopover({
      x, y, type,
      empId: data.empId || '',
      empName: data.empName || '',
      roomName: data.roomName || '',
      day: data.day,
      am: data.am || ['', ''],
      pm: data.pm || ['', ''],
    });
  };

  const closePopover = () => setPopover(null);

  const handlePopoverSave = () => {
    if (!popover || popover.type === 'room') return;
    const empId = popover.empId;
    const day = popover.day;
    const am = popover.am.filter(Boolean);

    // isForceMorningOnly 판단은 현재 scheduleData 기반으로 계산
    const shiftCode = scheduleData.shifts[empId]?.[day] || '';
    const dateInfo = dateInfos[day - 1];
    const isHoliday = dateInfo && (dateInfo.dow === 0 || dateInfo.isHoliday);
    const isHolidayHo = isHoliday && shiftCode.toUpperCase().trim() === 'HO';
    const isSatM = dateInfo && dateInfo.dow === 6 && shiftCode.toUpperCase().trim() === 'M';
    const isForceMorningOnly = isHolidayHo || isSatM;
    const pm = isForceMorningOnly ? [] : popover.pm.filter(Boolean);

    // pendingLocalChanges에 먼저 기록 → API sync가 이 변경을 덮어씌우지 않도록 보호
    if (!pendingLocalChanges.current) pendingLocalChanges.current = {};
    if (!pendingLocalChanges.current[empId]) pendingLocalChanges.current[empId] = {};
    pendingLocalChanges.current[empId][day] = { am, pm };

    setScheduleData(prev => {
      const newSupports = JSON.parse(JSON.stringify(prev.supports || {}));
      if (!newSupports[empId]) newSupports[empId] = {};
      newSupports[empId][day] = { am, pm };
      return { ...prev, supports: newSupports };
    });
    setToast('임시 적용되었습니다. 상단의 [저장하기] 버튼을 눌러야 알림이 전송됩니다.');
    closePopover();
  };

  const assignShiftCode = (code: string) => {
    if (!popover || popover.type === 'room') return;
    setScheduleData(prev => {
      const newShifts = { ...prev.shifts };
      if (!newShifts[popover.empId]) newShifts[popover.empId] = {};
      newShifts[popover.empId][popover.day] = code;
      return { ...prev, shifts: newShifts };
    });
    setToast(code ? `${code} 적용` : '초기화 완료');
    closePopover();
  };

  const getRoomDept = (roomName: string): string => {
    const map: Record<string, string> = {
      '8F 면역': '면역', '4F 안과': '안과', '4F 수면': '수면', '3F 뇌파': '뇌파',
      '2F 소화': '소화', '2F 심기': '심기능', '2F 심초': '심초',
      '1F 근전도': '근전도', '1F 호흡': '호흡', 'B1 청력': '청력'
    };
    return map[roomName] || '';
  };

  const toggleRoomAssignment = (empId: string, day: number, roomDept: string, period: 'am' | 'pm') => {
    if (!currentUser.isManager) {
      setToast('부서장만 근무지를 설정할 수 있습니다.');
      return;
    }

    const isRootAdmin = currentUser.mainWorkplace === '기능검사실' || currentUser.department === '기능검사실';
    const targetEmp = employees.find(emp => String(emp.empId) === String(empId));
    const isDeptManager = targetEmp && (
      currentUser.mainWorkplace === targetEmp.mainWorkplace ||
      currentUser.mainWorkplace === targetEmp.department ||
      currentUser.department === targetEmp.mainWorkplace ||
      currentUser.department === targetEmp.department
    );

    if (!isRootAdmin && !isDeptManager) {
      setToast('해당 직원의 소속 부서장만 근무지를 설정할 수 있습니다.');
      return;
    }

    if (period === 'pm') {
      const shiftCode = scheduleData.shifts[empId]?.[day] || '';
      const dateInfo = dateInfos[day - 1];
      const isHoliday = dateInfo && (dateInfo.dow === 0 || dateInfo.isHoliday);
      const isHolidayHo = isHoliday && shiftCode.toUpperCase().trim() === 'HO';
      const isSatM = dateInfo && dateInfo.dow === 6 && shiftCode.toUpperCase().trim() === 'M';
      if (isHolidayHo || isSatM) {
        setToast('해당 근무는 오후 지원 배치가 불가능합니다.');
        return;
      }
    }

    setScheduleData(prev => {
      const newSupports = JSON.parse(JSON.stringify(prev.supports || {}));
      if (!newSupports[empId]) newSupports[empId] = {};
      const emp = prev.employees.find(e => String(e.empId) === String(empId));
      const defaultDept = emp?.mainWorkplace || emp?.department || '';
      if (!newSupports[empId][day]) {
        // 수정하는 period만 초기화 (반대쪽 period를 건드리지 않아 오탐 방지)
        newSupports[empId][day] = { [period]: [defaultDept] } as { am?: string[]; pm?: string[] };
      }
      const current = [...(newSupports[empId][day][period] || [])];
      const idx = current.indexOf(roomDept);
      if (idx >= 0) {
        current.splice(idx, 1);
      } else {
        current.push(roomDept);
      }
      newSupports[empId][day] = { ...newSupports[empId][day], [period]: current };
      return { ...prev, supports: newSupports };
    });
  };





  // 로컬 미저장 변경사항 추적: handlePopoverSave 후 API sync가 덮어씌우지 못하도록 보호
  const pendingLocalChanges = useRef<Record<string, Record<number, { am: string[]; pm: string[] }>> | null>(null);
  // employees를 ref로 관리 → fetchSchedule 의존성에서 제거하여 이중 실행 방지
  const employeesRef = useRef(employees);
  employeesRef.current = employees;

  // 연월 및 직원명부 변경 시 스프레드시트로부터 근무표 로드
  useEffect(() => {
    let isMounted = true;
    const fetchSchedule = async () => {
      console.log("[Schedule Debug] fetchSchedule called. globalVersion:", globalVersion);
      const cacheKey = `cached_schedule_${year}_${month}`;
      const cached = localStorage.getItem(cacheKey);
      let hasCache = false;

      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') {
            setScheduleData(parsed);
            hasCache = true;
          }
        } catch (e) {
          console.error('[Schedule] 캐시 파싱 에러:', e);
        }
      }

      if (hasCache) {
        setIsLoading(false);
        setIsSyncing(true);
      } else {
        setIsLoading(true);
        setIsSyncing(false);
      }

      try {
        const res = await fetch(`/api/schedule?year=${year}&month=${month}&_t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('근무표 로드 실패');
        const data = await res.json();

        if (isMounted) {
          const targetEmployees = employees.length > 0
            ? employees.filter((e: Employee) => !e.isRetired)
            : DEFAULT_EMPLOYEES;

          const sortedEmployees = [...targetEmployees].sort((a, b) => {
            const indexA = data.empIds ? data.empIds.indexOf(String(a.empId)) : -1;
            const indexB = data.empIds ? data.empIds.indexOf(String(b.empId)) : -1;
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
          });

          const updatedData = {
            year,
            month,
            employees: sortedEmployees,
            shifts: data.shifts || {},
            supports: data.supports || {}
          };

          // ── 하이라이트 비교 로직 ──
          // 비교 기준: originalDataStr (서버에서 마지막으로 받은 원본 데이터)
          // prev(로컬에서 팝오버로 수정된 데이터)가 아닌 원본 기준으로 비교해야
          // 새로고침 후 팝오버로 근무지 변경 시 오탐 하이라이트가 발생하지 않음.
          const currentOriginalDataStr = originalDataStr; // 클로저로 현재 시점의 originalDataStr 캡처
          (() => {
            let prevOriginal: { shifts?: Record<string, Record<number, string>>; supports?: Record<string, Record<number, any>> } | null = null;
            if (currentOriginalDataStr) {
              try { prevOriginal = JSON.parse(currentOriginalDataStr); } catch { prevOriginal = null; }
            }

            // 이전에 서버에서 받은 적이 없으면(= 최초 로드이면) 비교 생략
            if (!prevOriginal) return;

            const newShifts = updatedData.shifts || {};
            const oldShifts = prevOriginal.shifts || {};
            const newSupports = updatedData.supports || {};
            const oldSupports = prevOriginal.supports || {};

            const changedKeys: string[] = [];

            // 1. Shifts 비교 (undefined와 빈문자열 동등 처리)
            const allShiftEmpIds = new Set([...Object.keys(newShifts), ...Object.keys(oldShifts)]);
            allShiftEmpIds.forEach(empId => {
              const empShifts = newShifts[empId] || {};
              const prevShifts = oldShifts[empId] || {};
              for (let d = 1; d <= 31; d++) {
                const newVal = empShifts[d] || '';
                const prevVal = prevShifts[d] || '';
                if (newVal !== prevVal) {
                  changedKeys.push(`${empId}_${d}_shift`);
                }
              }
            });

            // 2. Supports 비교: AM/PM을 각각 독립 정규화
            const getDefaultDept = (empId: string) => {
              const emp = (updatedData.employees || []).find(e => String(e.empId) === String(empId));
              return emp?.mainWorkplace || emp?.department || '';
            };

            const normalizeSlot = (raw: string[] | undefined, defaultDept: string): string => {
              if (!raw || raw.length === 0) return '__DEFAULT__';
              const filtered = raw.filter(v => v !== defaultDept);
              if (filtered.length === 0) return '__DEFAULT__';
              return JSON.stringify([...raw].sort());
            };

            const allEmpIds = new Set([...Object.keys(newSupports), ...Object.keys(oldSupports)]);
            allEmpIds.forEach(empId => {
              const empNew = newSupports[empId] || {};
              const empOld = oldSupports[empId] || {};
              const defaultDept = getDefaultDept(empId);

              for (let d = 1; d <= 31; d++) {
                // AM 비교
                const newAmRaw = empNew[d]?.am;
                const oldAmRaw = empOld[d]?.am;
                const newAmNorm = normalizeSlot(newAmRaw, defaultDept);
                const oldAmNorm = normalizeSlot(oldAmRaw, defaultDept);
                if (newAmNorm !== oldAmNorm) {
                  changedKeys.push(`${empId}_${d}_am`);
                }

                // PM 비교
                const newPmRaw = empNew[d]?.pm;
                const oldPmRaw = empOld[d]?.pm;
                const newPmNorm = normalizeSlot(newPmRaw, defaultDept);
                const oldPmNorm = normalizeSlot(oldPmRaw, defaultDept);
                if (newPmNorm !== oldPmNorm) {
                  changedKeys.push(`${empId}_${d}_pm`);
                }
              }
            });

            const isMySelfSaved = globalVersion !== 0 && globalVersion === useStore.getState().myLastSavedScheduleVersion;
            console.log("[Schedule Debug] isMySelfSaved:", isMySelfSaved, "changedKeys:", changedKeys);

            if (changedKeys.length > 0 && !isMySelfSaved) {
              console.log("[Schedule Debug] Adding highlights for keys:", changedKeys);
              setTimeout(() => {
                changedKeys.forEach(key => {
                  addHighlightedItemId(key);
                });
              }, 0);
            }
          })();

          setScheduleData(prev => {
            // handlePopoverSave 이후 서버에 아직 저장하지 않은 변경사항이 있으면
            // API 응답이 supports를 덮어씌우지 않도록 병합합니다.
            const hasPending = pendingLocalChanges.current !== null &&
              Object.keys(pendingLocalChanges.current).length > 0;

            if (hasPending && prev.year === year && prev.month === month) {
              const mergedSupports = JSON.parse(JSON.stringify(updatedData.supports || {}));
              const pending = pendingLocalChanges.current!;
              Object.entries(pending).forEach(([empId, days]) => {
                if (!mergedSupports[empId]) mergedSupports[empId] = {};
                Object.entries(days as Record<string, SupportAssignment>).forEach(([dayStr, support]) => {
                  mergedSupports[empId][parseInt(dayStr)] = support;
                });
              });
              return { ...updatedData, supports: mergedSupports };
            }
            return updatedData;
          });
          setOriginalDataStr(JSON.stringify({ shifts: updatedData.shifts, supports: updatedData.supports }));
          localStorage.setItem(cacheKey, JSON.stringify(updatedData));
        }
      } catch (err) {
        console.error(err);
        if (isMounted && !hasCache) {
          const fallbackData = {
            year,
            month,
            employees: employees.length > 0 ? employees.filter((e: Employee) => !e.isRetired) : DEFAULT_EMPLOYEES,
            shifts: generateSampleShifts(year, month),
            supports: {}
          };
          setScheduleData(fallbackData);
          setOriginalDataStr(JSON.stringify({ shifts: fallbackData.shifts, supports: fallbackData.supports }));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsSyncing(false);
        }
      }
    };

    fetchSchedule();
    return () => { isMounted = false; };
  }, [year, month, globalVersion]); // ← employees는 ref로 관리하여 이중 실행 방지

  // 구글 스프레드시트에 전체 근무표 저장
  const handleSaveSchedule = async () => {
    setIsSaving(true);
    setToast('저장 중입니다. 잠시만 기다려주세요...');

    let diffSummary = '';
    const changedKeys: string[] = [];
    try {
      if (originalDataStr) {
        const original = JSON.parse(originalDataStr);
        const changedEmpIds = new Set<string>();

        // shifts 비교
        Object.keys(scheduleData.shifts || {}).forEach(empId => {
          const empShifts = scheduleData.shifts[empId];
          const origShifts = original.shifts?.[empId] || {};
          for (let d = 1; d <= 31; d++) {
            if (empShifts[d] !== origShifts[d]) {
              changedEmpIds.add(empId);
              changedKeys.push(`${empId}_${d}_shift`);
            }
          }
        });
        // supports 비교
        Object.keys(scheduleData.supports || {}).forEach(empId => {
          const empSupports = scheduleData.supports?.[empId] || {};
          const origSupports = original.supports?.[empId] || {};
          const emp = scheduleData.employees.find(e => String(e.empId) === String(empId));
          const defaultDept = emp?.mainWorkplace || emp?.department || '';

          // normalizeSlot: undefined/[] 와 [defaultDept] 단독값은 동일(기본 상태)로 처리
          const normalizeSlotSave = (arr: string[] | undefined): string => {
            if (!arr || arr.length === 0) return '__DEFAULT__';
            const filtered = arr.filter(v => v && v !== defaultDept);
            if (filtered.length === 0) return '__DEFAULT__';
            return JSON.stringify([...arr].sort());
          };

          for (let d = 1; d <= 31; d++) {
            const amNorm = normalizeSlotSave(empSupports[d]?.am);
            const origAmNorm = normalizeSlotSave(origSupports[d]?.am);
            if (amNorm !== origAmNorm) {
              changedEmpIds.add(empId);
              changedKeys.push(`${empId}_${d}_am`);
            }
            const pmNorm = normalizeSlotSave(empSupports[d]?.pm);
            const origPmNorm = normalizeSlotSave(origSupports[d]?.pm);
            if (pmNorm !== origPmNorm) {
              changedEmpIds.add(empId);
              changedKeys.push(`${empId}_${d}_pm`);
            }
          }
        });

        const changedNames = Array.from(changedEmpIds).map(id => {
          const e = scheduleData.employees.find(emp => String(emp.empId) === String(id));
          return e ? e.name : id;
        });

        if (changedNames.length > 0) {
          if (changedNames.length <= 2) {
            diffSummary = `${changedNames.join(', ')} 직원의 근무표가 수정되었습니다.`;
          } else {
            diffSummary = `${changedNames[0]} 외 ${changedNames.length - 1}명의 근무표가 수정되었습니다.`;
          }
        }
      }
    } catch (e) { }

    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveSchedule',
          data: {
            year,
            month,
            employees: scheduleData.employees,
            shifts: scheduleData.shifts,
            supports: scheduleData.supports,
            diffSummary,
            editorEmpId: currentUser?.employeeId,
            firstChangedKey: changedKeys[0]
          }
        })
      });
      if (!res.ok) throw new Error('저장 실패');
      const responseData = await res.json();
      if (responseData.version) {
        setMyLastSavedScheduleVersion(responseData.version);
      }
      setToast('근무표가 성공적으로 저장되었습니다.');
      setOriginalDataStr(JSON.stringify({ shifts: scheduleData.shifts, supports: scheduleData.supports }));
      // 저장 성공 → 로컬 미저장 변경사항 초기화 (이후 API sync 정상 동작)
      pendingLocalChanges.current = null;
    } catch (err) {
      alert('근무표 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 직원 관리 모달 액션
  const handleOpenAddEmp = () => {
    setEditingEmp(null);
    setEmpForm({
      empId: '',
      name: '',
      position: '사원',
      mainWorkplace: currentUser.mainWorkplace || '기능검사실',
      subWorkplace: '',
      password: '',
      isManager: false,
      isRetired: false
    });
  };

  const handleOpenEditEmp = (emp: any) => {
    setEditingEmp(emp);
    setEmpForm({
      empId: emp.empId,
      name: emp.name,
      position: emp.position,
      mainWorkplace: emp.mainWorkplace || emp.department || '',
      subWorkplace: emp.subWorkplace || '',
      password: emp.password || '',
      isManager: emp.isManager || false,
      isRetired: emp.isRetired || false
    });
  };

  const handleSaveEmp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.empId || !empForm.name) {
      alert('사번과 이름을 모두 입력해 주세요.');
      return;
    }

    const empData = {
      empId: empForm.empId,
      name: empForm.name,
      position: empForm.position,
      department: empForm.mainWorkplace,
      mainWorkplace: empForm.mainWorkplace,
      subWorkplace: empForm.subWorkplace,
      password: empForm.password,
      isManager: empForm.isManager,
      isRetired: empForm.isRetired
    };

    try {
      if (editingEmp) {
        await updateEmployee(editingEmp.empId, empData);
        setToast('직원 정보를 수정했습니다.');
      } else {
        await addEmployee(empData);
        setToast('새 직원을 등록했습니다.');
      }
      setEditingEmp(null);
    } catch (err) {
      alert('직원 정보 저장에 실패했습니다.');
    }
  };

  const handleToggleRetire = async (emp: any) => {
    const actionText = emp.isRetired ? '재직 상태로 복구' : '퇴사 처리';
    if (!confirm(`정말로 ${emp.name} 직원을 ${actionText}하시겠습니까?`)) return;
    try {
      await updateEmployee(emp.empId, { ...emp, isRetired: !emp.isRetired });
      setToast(`${emp.name} 직원을 ${actionText}했습니다.`);
    } catch (err) {
      alert(`${actionText}에 실패했습니다.`);
    }
  };

  const handleDeleteEmp = async (empId: string) => {
    if (!confirm('정말로 이 직원을 명부에서 영구 삭제하시겠습니까? 과거 이력 정보에 영향이 갈 수 있습니다.')) return;
    try {
      await deleteEmployee(empId);
      setToast('직원을 삭제했습니다.');
      setEditingEmp(null);
    } catch (err) {
      alert('직원 삭제에 실패했습니다.');
    }
  };

  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);

  // 달력 날짜 정보 배열
  const dateInfos = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const date = new Date(year, month - 1, d);
      const dow = date.getDay();
      const holidayName = getHolidayName(year, month, d);
      return { day: d, dow, dayName: DAY_NAMES[dow], isHoliday: !!holidayName, holidayName };
    });
  }, [year, month, daysInMonth, getHolidayName]);

  // 월 변경
  const changeMonth = useCallback((diff: number) => {
    let newMonth = month + diff;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    setScheduleYearMonth(newYear, newMonth);
    setFileName('');
  }, [year, month, setScheduleYearMonth]);

  // 엑셀 업로드 핸들러
  const handleFileUpload = useCallback((file: File) => {
    setUploadError('');
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // 파일명에서 년/월 추출 (정규식 사용)
        let targetYear = new Date().getFullYear();
        let targetMonth = new Date().getMonth() + 1;

        const yearMatch = file.name.match(/(\d{4})/);
        if (yearMatch) {
          targetYear = parseInt(yearMatch[1], 10);
        }

        const monthWordMatch = file.name.match(/(\d{1,2})\s*월/);
        if (monthWordMatch) {
          targetMonth = parseInt(monthWordMatch[1], 10);
        } else {
          const yearSeparatorMatch = file.name.match(/\d{4}[\s.\-_/]+(\d{1,2})/);
          if (yearSeparatorMatch) {
            targetMonth = parseInt(yearSeparatorMatch[1], 10);
          } else {
            const numbers = file.name.match(/\d+/g);
            if (numbers) {
              const possibleMonths = numbers
                .map(n => parseInt(n, 10))
                .filter(n => n !== targetYear && n >= 1 && n <= 12);
              if (possibleMonths.length > 0) {
                targetMonth = possibleMonths[0];
              }
            }
          }
        }

        const parsed = parseExcelSchedule(workbook, targetYear, targetMonth);
        if (parsed && parsed.employees.length > 0) {
          // targetYear, targetMonth가 parsed에 확실히 적용되도록 강제 설정
          parsed.year = targetYear;
          parsed.month = targetMonth;

          setScheduleData(parsed);
          setScheduleYearMonth(targetYear, targetMonth);
          setFileName(file.name);
          setShowUploadModal(false);

          // 자동 저장 연동 (방식 2)
          try {
            const res = await fetch('/api/schedule', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                year: parsed.year,
                month: parsed.month,
                employees: parsed.employees,
                shifts: parsed.shifts,
                supports: parsed.supports || {},
                editorEmpId: currentUser?.employeeId
              })
            });
            if (!res.ok) throw new Error('자동 저장 실패');
            const responseData = await res.json();
            if (responseData.version) {
              setMyLastSavedScheduleVersion(responseData.version);
            }

            // 신규 직원 가입을 대비해 전역 직원 목록 동기화
            await initializeData();
            setToast('엑셀 근무표가 업로드 및 자동 저장되었습니다.');
          } catch (err) {
            console.error(err);
            alert('구글 스프레드시트에 근무표 자동 저장 중 오류가 발생했습니다.');
          }
        } else {
          setUploadError('엑셀 파일의 형식을 인식할 수 없습니다. 날짜 헤더(1,2,3...)와 사원명 컬럼이 있는지 확인해주세요.');
        }
      } catch (err) {
        setUploadError('파일 읽기에 실패했습니다. 올바른 엑셀 파일인지 확인해주세요.');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [initializeData, currentUser?.employeeId, setMyLastSavedScheduleVersion]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  // 셀 렌더링 유틸
  const renderShiftCell = (code: string) => {
    const upperCode = code?.toUpperCase().trim();
    if (!upperCode) return <span className="text-gray-200">-</span>;

    const redCodes = ['OFF', 'HO', 'NO', 'MO', 'SO'];
    const blueCodes = ['연차', '반차', '육휴', '태검', '특휴'];

    let textColor = 'text-gray-800';
    if (redCodes.includes(upperCode)) textColor = 'text-red-500';
    if (blueCodes.includes(upperCode)) textColor = 'text-blue-600';

    const info = SHIFT_CODES[upperCode];
    if (info) {
      return (
        <span
          className={`block w-full text-[11px] font-bold ${textColor} leading-none text-center cursor-default`}
          title={`${info.label} (${info.hours})`}
        >
          {upperCode}
        </span>
      );
    }
    // 알 수 없는 코드
    return (
      <span className="block w-full text-[11px] font-bold text-pink-600 leading-none text-center cursor-default" title="알 수 없는 코드">
        {upperCode}
      </span>
    );
  };

  // 부서 뱃지 색상
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

  // 부서 텍스트 색상
  const getDeptTextColor = (dept: string) => {
    const map: Record<string, string> = {
      '면역': 'text-purple-700',
      '근전도': 'text-teal-700',
      '근전': 'text-teal-700',
      '뇌파': 'text-green-700',
      '안과': 'text-blue-700',
      '심기능': 'text-orange-700',
      '심기': 'text-orange-700',
      '심초': 'text-orange-700',
      '청력': 'text-cyan-700',
      '소화': 'text-amber-700',
      '호흡': 'text-teal-700',
      '수면': 'text-indigo-700',
      '육아휴직': 'text-gray-500',
      '휴직': 'text-gray-500',
    };
    return map[dept] || 'text-gray-600';
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── 상단 컨트롤 바 ── */}
      <div className="shrink-0 bg-white border-b border-gray-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* 좌측: 월 네비게이션 */}
        <div className="flex items-center gap-3 md:flex-1 md:justify-start">
          <div className="flex items-center gap-1">
            <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-sm font-bold text-gray-900 min-w-[100px] text-center">{year}년 {month}월</span>
            <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          {fileName && (
            <span className="hidden md:flex text-[11px] text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 items-center gap-1">
              <FileSpreadsheet className="w-3 h-3" /> {fileName}
            </span>
          )}
        </div>

        {/* 중앙: 뷰 전환 탭 */}
        <div className="flex items-center justify-center bg-gray-100 p-1 rounded-xl relative overflow-x-auto no-scrollbar order-3 w-full mt-2 md:order-none md:w-auto md:mt-0 shrink-0">
          {(['planned', 'actual', 'employee', 'room', 'calendar'] as const).map(mode => {
            const labels = { planned: '근무예정표', actual: '근무표', employee: '직원기준', room: '검실기준', calendar: '개인캘린더' };
            const isActive = viewMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`relative px-4 py-1.5 text-xs font-bold rounded-lg transition-all z-10 shrink-0 ${isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {isActive && <div className="absolute inset-0 bg-white rounded-lg shadow-sm border border-gray-200/50 -z-10" />}
                {labels[mode]}
              </button>
            );
          })}
        </div>

        {/* 우측: 액션 버튼 */}
        <div className="flex items-center gap-2 justify-end order-2 md:order-none md:flex-1">
          <button
            onClick={() => setShowLegend(!showLegend)}
            disabled={isSaving}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors ${showLegend ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Info className="w-3.5 h-3.5" /> 근무코드 범례
          </button>
          {currentUser.isManager && (
            <button
              onClick={() => setShowEmpModal(true)}
              disabled={isSaving}
              className="px-3 py-1.5 bg-accent-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <User className="w-3.5 h-3.5" /> 직원관리
            </button>
          )}
          {canEdit && (
            <button
              onClick={handleSaveSchedule}
              disabled={isSaving}
              className={`px-3 py-1.5 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 ${isSaving ? 'animate-pulse' : ''}`} /> {isSaving ? '저장 중...' : '저장하기'}
            </button>
          )}
          <button
            onClick={() => setShowVacationModal(true)}
            disabled={isSaving}
            className="relative px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CalendarDays className="w-3.5 h-3.5" /> 연차 신청 / 내역
            {vacationAlarmCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse border-2 border-white shadow-sm">
                {vacationAlarmCount}
              </span>
            )}
          </button>
          {viewMode === 'planned' && (
            <button
              onClick={() => setShowUploadModal(true)}
              disabled={isSaving}
              className="px-3 py-1.5 bg-primary-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-3.5 h-3.5" /> 엑셀 업로드
            </button>
          )}
        </div>
      </div>

      {/* ── 범례 패널 (토글) ── */}
      {showLegend && (
        <div className="shrink-0 bg-white border-b border-gray-100 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {Object.entries(SHIFT_CODES).map(([code, info]) => (
              <div key={code} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${info.bg} ${info.border}`}>
                <span className={`text-[11px] font-bold ${info.color}`}>{code}</span>
                <span className="text-[10px] text-gray-500">{info.label}</span>
                <span className="text-[9px] text-gray-400">({info.hours})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 메인 뷰 영역 (연차 드로워 오픈 시 가로 스크롤 연동) ── */}
      <div
        className={`flex-1 flex flex-col min-h-0 overflow-hidden relative ${isDraggingVacationDrawer ? 'transition-none' : 'transition-all duration-300'
          }`}
        style={{ marginRight: showVacationModal ? `${vacationDrawerWidth}px` : 0 }}
      >
        {(viewMode === 'planned' || viewMode === 'actual') && (
          <div className="flex-1 overflow-auto relative bg-white">
            <table className="border-collapse table-fixed w-full min-w-[1000px] h-full text-center text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-30 bg-gray-50 border-r border-b border-gray-200 px-3 py-2 text-gray-500 font-bold text-[11px] w-[110px] min-w-[110px] max-w-[110px]">
                    직원 정보
                  </th>
                  {dateInfos.map(({ day, dow, dayName, isHoliday, holidayName }) => {
                    let headerBg = 'bg-gray-50';
                    let textColor = 'text-gray-700';
                    if (dow === 6) { headerBg = 'bg-blue-100/80'; textColor = 'text-blue-700 font-extrabold'; }
                    if (dow === 0 || isHoliday) { headerBg = 'bg-red-100/80'; textColor = 'text-red-600 font-extrabold'; }
                    return (
                      <th key={day} className={`sticky top-0 z-20 ${headerBg} border-r border-b border-gray-200 px-1 py-1.5 min-w-[36px] overflow-hidden`} title={holidayName || undefined}>
                        <div className={`font-bold text-xs ${textColor}`}>{day}</div>
                        <div className={`text-[10px] font-semibold ${textColor} opacity-85`}>
                          {isHoliday ? <span className="text-[9px] px-0.5 bg-red-200 text-red-800 rounded leading-none font-bold inline-block scale-90" title={holidayName!}>{holidayName}</span> : dayName}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const sortedEmployees = [...scheduleData.employees].sort((a, b) => {
                    const aIsMe = String(a.empId) === String(currentUser?.employeeId);
                    const bIsMe = String(b.empId) === String(currentUser?.employeeId);
                    if (aIsMe && !bIsMe) return -1;
                    if (!aIsMe && bIsMe) return 1;
                    return 0;
                  });
                  return sortedEmployees.map((emp) => {
                    const isMe = String(emp.empId) === String(currentUser?.employeeId);
                    return (
                  <tr key={emp.empId} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className={`sticky left-0 z-10 border-r border-gray-200 px-2 py-2 text-left ${isMe ? 'bg-blue-50' : getDeptColor(emp.mainWorkplace || emp.department).split(' ').filter(c => c.startsWith('bg-')).join(' ')}`}>
                      <div className="w-full">
                        <div className="flex items-center justify-center gap-2 w-full px-1">
                          <span className={`text-[10px] font-extrabold shrink-0 w-[45px] text-center ${getDeptTextColor(emp.mainWorkplace || emp.department)}`}>
                            {emp.mainWorkplace || emp.department}
                          </span>
                          <span className="font-extrabold text-gray-900 text-xs truncate w-[42px] text-left">
                            {emp.name}
                          </span>
                        </div>
                      </div>
                    </td>
                    {dateInfos.map(({ day, dow, isHoliday }) => {
                      let cellBg = '';
                      if (dow === 6) cellBg = 'bg-blue-50/60';
                      if (dow === 0 || isHoliday) cellBg = 'bg-red-50/60';
                      
                      const activeShifts = viewMode === 'planned' ? scheduleData.shifts : mergedScheduleData.shifts;
                      const activeSupports = viewMode === 'planned' ? scheduleData.supports : mergedScheduleData.supports;
                      const shiftCode = activeShifts[emp.empId]?.[day] || '';
                      
                      const daySupports = activeSupports?.[emp.empId]?.[day];
                      const amSupports = daySupports?.am || [];
                      const pmSupports = daySupports?.pm || [];
                      const defaultDept = emp.mainWorkplace || emp.department || '';

                      const amSupportList = amSupports.filter((s: string) => s && s !== defaultDept);
                      const pmSupportList = pmSupports.filter((s: string) => s && s !== defaultDept);
                      const hasSupport = amSupportList.length > 0 || pmSupportList.length > 0;

                      return (
                        <td
                          key={day}
                          className={`border-r border-gray-100 px-0.5 py-1.5 ${cellBg} align-middle cursor-pointer`}
                          onClick={(e) => {
                            // planned 뷰에서도 근무코드 수정은 가능하도록 지원(단, 실제 뷰에서만 연차 등이 결합되어 보임)
                            if (currentUser.isManager) {
                              const empSupports = activeSupports?.[emp.empId] || {};
                              const am = empSupports[day]?.am || [];
                              const pm = empSupports[day]?.pm || [];
                              openPopover(e, 'calendar', { empId: emp.empId, empName: emp.name, day, am, pm });
                            }
                          }}
                        >
                          <div className="flex flex-col items-center justify-center gap-0.5 min-h-[26px]">
                            {renderShiftCell(shiftCode)}
                            {hasSupport && (
                              <div className="text-[9px] scale-90 font-extrabold px-1 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded leading-none whitespace-nowrap truncate max-w-[34px]" title={`지원: AM(${amSupports.join(',')}) PM(${pmSupports.join(',')})`}>
                                {amSupportList.length > 0 ? amSupportList[0] : pmSupportList[0]}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === 'employee' && (() => {
          const getEmployeeBlocks = (empId: string) => {
            const blocks: {
              startDay: number,
              endDay: number,
              colSpan: number,
              shiftCode: string,
              isOff: boolean,
              amSupports: string[],
              pmSupports: string[],
              isSplit: boolean,
              days: { day: number, shiftCode: string }[]
            }[] = [];
            let current: any = null;

            for (let day = 1; day <= daysInMonth; day++) {
              const shiftCode = mergedScheduleData.shifts[empId]?.[day] || '';
              const off = isFullOff(shiftCode);
              const amRaw = mergedScheduleData.supports?.[empId]?.[day]?.am;
              const pmRaw = mergedScheduleData.supports?.[empId]?.[day]?.pm;
              const empObj = scheduleData.employees.find(e => String(e.empId) === String(empId));
              const defaultRoom = getRoomName(empObj?.mainWorkplace || empObj?.department || '');

              const dow = dateInfos[day - 1]?.dow;
              const isHoliday = dow === 0 || dateInfos[day - 1]?.isHoliday;
              const isHolidayHo = isHoliday && shiftCode.toUpperCase().trim() === 'HO';
              const isSatM = dow === 6 && shiftCode.toUpperCase().trim() === 'M';
              const isForceMorningOnly = isHolidayHo || isSatM;

              const { isAmLeave, isPmLeave } = getLeaveAmPmState(empId, day, shiftCode);

              const isDefaultMorningOnly = !off && (
                ['M', 'M1', 'MX', 'H', 'HO', 'MO'].includes(shiftCode.toUpperCase().trim()) ||
                (dow === 6)
              );

              let defaultAm = [defaultRoom];
              let defaultPm = [defaultRoom];
              if (isAmLeave) defaultAm = [];
              if (isForceMorningOnly || isPmLeave || (isDefaultMorningOnly && !isAmLeave)) defaultPm = [];

              const amSupports = amRaw && amRaw.length > 0 ? amRaw.map((r: string) => getRoomName(r)) : defaultAm;
              const pmSupports = pmRaw && pmRaw.length > 0 ? pmRaw.map((r: string) => getRoomName(r)) : defaultPm;
              const isSplit = amSupports.length > 1 || pmSupports.length > 1 || amSupports[0] !== pmSupports[0] || pmSupports.length === 0 || amSupports.length === 0;

              if (!current) {
                current = { startDay: day, endDay: day, colSpan: 1, shiftCode, isOff: off, amSupports, pmSupports, isSplit, days: [{ day, shiftCode }] };
              } else {
                const currentShift = current.shiftCode?.toUpperCase().trim();
                const newShift = shiftCode?.toUpperCase().trim();
                const isSameOff = current.isOff && off && currentShift === newShift && ['육휴', '휴직', '연차'].includes(newShift);
                const isSameWork = !current.isOff && !off &&
                  current.amSupports.join(',') === amSupports.join(',') &&
                  (
                    current.pmSupports.join(',') === pmSupports.join(',') ||
                    (current.pmSupports.length === 0 && pmSupports.length === 1 && pmSupports[0] === current.amSupports[0]) ||
                    (pmSupports.length === 0 && current.pmSupports.length === 1 && current.pmSupports[0] === amSupports[0])
                  );

                if (isSameOff || isSameWork) {
                  current.endDay = day;
                  current.colSpan += 1;
                  current.days.push({ day, shiftCode });
                  if (current.pmSupports.length === 0 && pmSupports.length > 0) {
                    current.pmSupports = pmSupports;
                  }
                  if (shiftCode === 'D' || current.shiftCode === 'D') {
                    current.shiftCode = 'D';
                  }
                  current.isSplit = current.amSupports.length > 1 || current.pmSupports.length > 1 || current.amSupports[0] !== current.pmSupports[0] || current.pmSupports.length === 0;
                } else {
                  blocks.push(current);
                  current = { startDay: day, endDay: day, colSpan: 1, shiftCode, isOff: off, amSupports, pmSupports, isSplit, days: [{ day, shiftCode }] };
                }
              }
            }
            if (current) blocks.push(current);
            return blocks;
          };

          return (
            <div className="flex-1 overflow-auto relative bg-white">
              <table className="border-collapse table-fixed w-full min-w-[1000px] h-full text-center text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 top-0 z-30 bg-gray-50 border-r border-b border-gray-200 px-3 py-2 text-gray-500 font-bold text-[11px] w-[110px] min-w-[110px] max-w-[110px]">
                      직원 정보
                    </th>
                    {dateInfos.map(({ day, dow, dayName, isHoliday, holidayName }) => {
                      let headerBg = 'bg-gray-50'; let textColor = 'text-gray-700';
                      if (dow === 6) { headerBg = 'bg-blue-100/80'; textColor = 'text-blue-700 font-extrabold'; }
                      if (dow === 0 || isHoliday) { headerBg = 'bg-red-100/80'; textColor = 'text-red-600 font-extrabold'; }
                      return (
                        <th key={day} className={`sticky top-0 z-20 ${headerBg} border-b border-gray-200 px-1 py-1.5 min-w-[36px] overflow-hidden`} title={holidayName || undefined}>
                          <div className={`font-bold text-xs ${textColor}`}>{day}</div>
                          <div className={`text-[10px] font-semibold ${textColor} opacity-85`}>
                            {isHoliday ? <span className="text-[9px] px-0.5 bg-red-200 text-red-800 rounded leading-none font-bold inline-block scale-90" title={holidayName!}>{holidayName}</span> : dayName}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const sortedEmployees = [...scheduleData.employees].sort((a, b) => {
                      const aIsMe = String(a.empId) === String(currentUser?.employeeId);
                      const bIsMe = String(b.empId) === String(currentUser?.employeeId);
                      if (aIsMe && !bIsMe) return -1;
                      if (!aIsMe && bIsMe) return 1;
                      return 0;
                    });
                    return sortedEmployees.map((emp) => {
                      const blocks = getEmployeeBlocks(emp.empId);
                      const isMe = String(emp.empId) === String(currentUser?.employeeId);
                      // 이번 행에서 이미 렌더링(표시)한 근무지명을 기억하기 위한 변수
                      let hasRenderedDept = false;

                      return (
                        <tr key={emp.empId} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                          <td className={`sticky left-0 z-10 border-r border-gray-200 px-2 py-2 text-left ${isMe ? 'bg-blue-50' : getDeptColor(emp.mainWorkplace || emp.department).split(' ').filter(c => c.startsWith('bg-')).join(' ')}`}>
                          <div className="w-full">
                            <div className="flex items-center justify-center gap-2 w-full px-1">
                              <span className={`text-[10px] font-extrabold shrink-0 w-[45px] text-center ${getDeptTextColor(emp.mainWorkplace || emp.department)}`}>
                                {emp.mainWorkplace || emp.department}
                              </span>
                              <span className="font-extrabold text-gray-900 text-xs truncate w-[42px] text-left">
                                {emp.name}
                              </span>
                            </div>
                          </div>
                        </td>
                        {blocks.map((block, idx) => {
                          const { shiftCode, isOff, amSupports, pmSupports, isSplit, colSpan, startDay, endDay } = block;

                          let cellBg = '';
                          let isNoShift = false;
                          if (isOff) {
                            const normShift = shiftCode?.toUpperCase().trim();
                            if (normShift === 'NO') {
                              cellBg = 'bg-transparent';
                              isNoShift = true;
                            } else {
                              const dow = dateInfos[startDay - 1]?.dow;
                              const isHoliday = dateInfos[startDay - 1]?.isHoliday;
                              if (dow === 6) cellBg = 'bg-blue-50/60';
                              if (dow === 0 || isHoliday) cellBg = 'bg-red-50/60';
                            }
                          }

                          return (
                            <td
                              key={`block-${idx}`}
                              colSpan={colSpan}
                              className={`px-0 py-1.5 align-stretch cursor-pointer transition-colors relative ${isOff
                                ? `border-r border-transparent ${isNoShift ? 'hover:bg-transparent' : 'hover:bg-primary-50'} ${cellBg}`
                                : 'border-r border-transparent hover:opacity-80'
                                }`}
                              onClick={(e) => {
                                if (isSaving) {
                                  setToast('저장 중에는 수정할 수 없습니다.');
                                  return;
                                }
                                const rect = e.currentTarget.getBoundingClientRect();
                                const clickX = e.clientX - rect.left;
                                const cellWidth = rect.width / colSpan;
                                let clickedOffset = Math.floor(clickX / cellWidth);
                                if (clickedOffset < 0) clickedOffset = 0;
                                if (clickedOffset >= colSpan) clickedOffset = colSpan - 1;
                                const clickedDay = startDay + clickedOffset;

                                const { am, pm } = getPopoverSupports(emp.empId, clickedDay);
                                openPopover(e, 'employee', { empId: emp.empId, empName: emp.name, day: clickedDay, am, pm });
                              }}
                            >
                              <div className="flex flex-col items-stretch w-full h-full p-[2px]">
                                {isOff ? (
                                  ['OFF', 'NO', 'N'].includes(shiftCode?.toUpperCase().trim()) ? null : (
                                    ['육휴', '휴직'].includes(shiftCode?.toUpperCase().trim()) ? (
                                      <div className="w-full h-full min-h-[26px] flex items-center justify-center px-1 bg-gray-50 text-gray-500 font-extrabold text-[11px] rounded-md border border-gray-200 shadow-sm">
                                        {shiftCode}
                                      </div>
                                    ) : (shiftCode?.toUpperCase().trim() === '연차') ? (
                                      <div className="w-full h-full min-h-[26px] flex items-center justify-center px-1 bg-red-50 text-red-500 font-extrabold text-[11px] rounded-md border border-red-200 shadow-sm">
                                        {shiftCode}
                                      </div>
                                    ) : (
                                      <div className="w-full h-full min-h-[26px] flex items-center justify-center">
                                        {renderShiftCell(shiftCode)}
                                      </div>
                                    )
                                  )
                                ) : (() => {
                                  // 1. 이 블록 범위(startDay ~ endDay)에 속하는 highlightedItemIds 중에서 이 직원의 AM/PM 하이라이트가 있는지 확인
                                  const amHighlightsInBlock = highlightedItemIds.filter(id =>
                                    typeof id === 'string' &&
                                    id.startsWith(`${emp.empId}_`) &&
                                    id.endsWith('_am') &&
                                    (() => {
                                      const d = Number(id.split('_')[1]);
                                      return d >= startDay && d <= endDay;
                                    })()
                                  ) as string[];

                                  const pmHighlightsInBlock = highlightedItemIds.filter(id =>
                                    typeof id === 'string' &&
                                    id.startsWith(`${emp.empId}_`) &&
                                    id.endsWith('_pm') &&
                                    (() => {
                                      const d = Number(id.split('_')[1]);
                                      return d >= startDay && d <= endDay;
                                    })()
                                  ) as string[];

                                  const isAmHighlighted = amHighlightsInBlock.length > 0;
                                  const isPmHighlighted = pmHighlightsInBlock.length > 0;

                                  // 스크롤용 대표 하이라이트 날짜 구하기 (가장 첫 번째 매칭되는 날짜)
                                  const amHighlightDay = isAmHighlighted ? Number(amHighlightsInBlock[0].split('_')[1]) : null;
                                  const pmHighlightDay = isPmHighlighted ? Number(pmHighlightsInBlock[0].split('_')[1]) : null;

                                  const isWrapperHighlighted = colSpan === 1 && (!isSplit || pmSupports.length === 0 || ['수면', 'HO', 'MO', '반차'].includes(shiftCode?.toUpperCase().trim())) && (isAmHighlighted || isPmHighlighted);

                                  return (
                                    <div
                                      id={isWrapperHighlighted ? (isAmHighlighted ? `cell-${emp.empId}-${amHighlightDay}-am` : `cell-${emp.empId}-${pmHighlightDay}-pm`) : undefined}
                                      onMouseEnter={() => {
                                        if (isWrapperHighlighted) {
                                          amHighlightsInBlock.forEach(removeHighlightedItemId);
                                          pmHighlightsInBlock.forEach(removeHighlightedItemId);
                                        }
                                      }}
                                      className={`w-full h-full min-h-[26px] flex items-stretch justify-stretch rounded-md ${isAmHighlighted || isPmHighlighted ? 'overflow-visible' : 'overflow-hidden'
                                        } shadow-sm border border-black/5 ${isWrapperHighlighted ? 'alarm-highlight' : ''
                                        } ${(isSplit && pmSupports.length > 0 && !['수면', 'HO', 'MO', '반차'].includes(shiftCode?.toUpperCase().trim()))
                                          ? 'p-0 bg-transparent flex-col border-none shadow-none'
                                          : `py-1 ${getDeptColor(amSupports[0]).split(' ').filter(c => !c.startsWith('border-')).join(' ')}`
                                        }`}
                                    >
                                      {(isSplit && pmSupports.length > 0 && !['수면', 'HO', 'MO', '반차'].includes(shiftCode?.toUpperCase().trim())) ? (
                                        <div className="flex flex-col w-full h-full justify-between gap-[2px]">
                                          {amSupports.length > 0 && (
                                            <div
                                              id={isAmHighlighted ? `cell-${emp.empId}-${amHighlightDay}-am` : undefined}
                                              onMouseEnter={() => { if (isAmHighlighted) { amHighlightsInBlock.forEach(removeHighlightedItemId); } }}
                                              className={`px-2 py-0.5 w-full flex-1 flex flex-col justify-center rounded-md shadow-sm border border-black/5 ${isAmHighlighted ? 'alarm-highlight' : ''} ${getDeptColor(amSupports[0]).split(' ').filter(c => !c.startsWith('border-')).join(' ')}`}
                                            >
                                              {amSupports.map((amSupport, sIdx) => (
                                                <span key={`am-${sIdx}`} className="block text-[10px] font-extrabold leading-tight text-left truncate">
                                                  {amSupport}
                                                </span>
                                              ))}
                                            </div>
                                          )}

                                          {pmSupports.length > 0 && (
                                            <div
                                              id={isPmHighlighted ? `cell-${emp.empId}-${pmHighlightDay}-pm` : undefined}
                                              onMouseEnter={() => { if (isPmHighlighted) { pmHighlightsInBlock.forEach(removeHighlightedItemId); } }}
                                              className={`px-2 py-0.5 w-full flex-1 flex flex-col justify-center rounded-md shadow-sm border border-black/5 ${isPmHighlighted ? 'alarm-highlight' : ''} ${getDeptColor(pmSupports[0]).split(' ').filter(c => !c.startsWith('border-')).join(' ')}`}
                                            >
                                              {pmSupports.map((pmSupport, sIdx) => (
                                                <span key={`pm-${sIdx}`} className="block text-[10px] font-extrabold leading-tight text-left truncate">
                                                  {pmSupport}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      ) : (() => {
                                        const blockDays = block.days || [];
                                        const firstNonSpecialIdx = blockDays.findIndex(bd => !['HO', 'MO', '반차'].includes(bd.shiftCode?.toUpperCase().trim()));
                                        const showSmallShift = shiftCode &&
                                          !['D', 'N', '수면', 'HO', 'MO', '반차'].includes(shiftCode?.toUpperCase().trim()) &&
                                          !(shiftCode?.toUpperCase().trim() === 'M' && dateInfos[startDay - 1]?.dow === 6);

                                        return (
                                          <div className="grid w-full h-full" style={{ gridTemplateColumns: `repeat(${colSpan}, minmax(0, 1fr))` }}>
                                            {blockDays.map((bd, i) => {
                                              const codeUpper = bd.shiftCode?.toUpperCase().trim();
                                              const thisDayAmHighlightId = `${emp.empId}_${bd.day}_am`;
                                              const thisDayPmHighlightId = `${emp.empId}_${bd.day}_pm`;
                                              const isThisDayAmHighlighted = highlightedItemIds.includes(thisDayAmHighlightId);
                                              const isThisDayPmHighlighted = highlightedItemIds.includes(thisDayPmHighlightId);
                                              const isThisDayHighlighted = isThisDayAmHighlighted || isThisDayPmHighlighted;
                                              const highlightId = isThisDayHighlighted
                                                ? (isThisDayAmHighlighted ? `cell-${emp.empId}-${bd.day}-am` : `cell-${emp.empId}-${bd.day}-pm`)
                                                : undefined;
                                              const bgClass = getDeptColor(amSupports[0]).split(' ').filter(c => !c.startsWith('border-')).join(' ');

                                              if (['HO', 'MO', '반차'].includes(codeUpper)) {
                                                const daySupports = getPopoverSupports(emp.empId, bd.day);
                                                const isPmActive = daySupports.pm.some(s => s !== '');
                                                const pmDept = daySupports.pm[0] || '';
                                                const pmBgClass = isPmActive
                                                  ? getDeptColor(pmDept).split(' ').filter(c => !c.startsWith('border-')).join(' ')
                                                  : 'bg-transparent';

                                                return (
                                                  <div key={bd.day} className="flex flex-col w-full h-full justify-between gap-[2px]">
                                                    <div
                                                      id={isThisDayAmHighlighted ? `cell-${emp.empId}-${bd.day}-am` : undefined}
                                                      onMouseEnter={() => { if (isThisDayAmHighlighted) removeHighlightedItemId(thisDayAmHighlightId); }}
                                                      className={`w-full flex-1 flex flex-col justify-center items-center rounded-md border transition-all ${isThisDayAmHighlighted
                                                        ? `alarm-highlight z-10 ${bgClass}`
                                                        : 'border-transparent'
                                                        }`}
                                                    >
                                                      <span className="block text-[11px] font-extrabold leading-none text-center truncate w-full">
                                                        {bd.shiftCode}
                                                      </span>
                                                    </div>
                                                    <div
                                                      id={isThisDayPmHighlighted ? `cell-${emp.empId}-${bd.day}-pm` : undefined}
                                                      onMouseEnter={() => { if (isThisDayPmHighlighted) removeHighlightedItemId(thisDayPmHighlightId); }}
                                                      className={`w-full flex-1 flex flex-col justify-center items-center rounded-md border transition-all ${isThisDayPmHighlighted
                                                        ? `alarm-highlight z-10 ${pmBgClass}`
                                                        : 'border-transparent'
                                                        } ${isPmActive ? pmBgClass : 'bg-transparent'}`}
                                                    >
                                                      {isPmActive && (
                                                        <span className="block text-[10px] font-extrabold leading-none text-center truncate w-full">
                                                          {pmDept}
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              } else if (i === firstNonSpecialIdx) {
                                                const deptName = shiftCode?.toUpperCase().trim() === '수면' ? '수면' : amSupports[0];
                                                const shouldShowDept = !hasRenderedDept;
                                                if (shouldShowDept) {
                                                  hasRenderedDept = true;
                                                }
                                                return (
                                                  <div
                                                    key={bd.day}
                                                    id={highlightId}
                                                    onMouseEnter={() => {
                                                      if (isThisDayHighlighted) {
                                                        if (isThisDayAmHighlighted) removeHighlightedItemId(thisDayAmHighlightId);
                                                        if (isThisDayPmHighlighted) removeHighlightedItemId(thisDayPmHighlightId);
                                                      }
                                                    }}
                                                    className={`flex flex-col justify-center w-full py-0.5 border rounded-md transition-all ${isThisDayHighlighted
                                                      ? `alarm-highlight z-10 ${bgClass}`
                                                      : 'border-transparent'
                                                      }`}
                                                  >
                                                    {showSmallShift && (
                                                      <span className="block text-[9px] font-extrabold opacity-80 leading-none text-center mb-0.5">
                                                        {shiftCode}
                                                      </span>
                                                    )}
                                                    <span className="block text-[11px] font-extrabold leading-tight text-left truncate w-full pl-1">
                                                      {shouldShowDept ? deptName : ''}
                                                    </span>
                                                  </div>
                                                );
                                              } else {
                                                return (
                                                  <div
                                                    key={bd.day}
                                                    id={highlightId}
                                                    onMouseEnter={() => {
                                                      if (isThisDayHighlighted) {
                                                        if (isThisDayAmHighlighted) removeHighlightedItemId(thisDayAmHighlightId);
                                                        if (isThisDayPmHighlighted) removeHighlightedItemId(thisDayPmHighlightId);
                                                      }
                                                    }}
                                                    className={`w-full flex flex-col justify-center items-center py-0.5 border rounded-md transition-all ${isThisDayHighlighted
                                                      ? `alarm-highlight z-10 ${bgClass}`
                                                      : 'border-transparent'
                                                      }`}
                                                  >
                                                    {showSmallShift && (
                                                      <span className="block text-[9px] font-extrabold opacity-80 leading-none text-center mb-0.5">
                                                        {shiftCode}
                                                      </span>
                                                    )}
                                                  </div>
                                                );
                                              }
                                            })}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  );
                                })()
                                }
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                      );
                    });
                  })()}
                  {/* 하단 빈 공간을 채우기 위한 더미 행 */}
                  <tr className="h-full">
                    <td colSpan={daysInMonth + 1} className="p-0 border-none bg-transparent"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })()}

        {viewMode === 'room' && (() => {
          const getFullRoomName = (dept: string) => {
            const map: Record<string, string> = {
              '면역': '8F 면역', '안과': '4F 안과', '수면': '4F 수면', '뇌파': '3F 뇌파',
              '소화': '2F 소화', '심기능': '2F 심기', '심초': '2F 심초',
              '근전도': '1F 근전도', '호흡': '1F 호흡', '청력': 'B1 청력'
            };
            return map[dept] || '';
          };
          const ROOM_ORDER = [
            '8F 면역', '4F 안과', '4F 수면', '3F 뇌파', '2F 소화',
            '2F 심기', '2F 심초', '1F 근전도', '1F 호흡', 'B1 청력'
          ];
          const myDept = currentUser?.mainWorkplace || currentUser?.department || '';
          const sortedRoomOrder = [...ROOM_ORDER].sort((a, b) => {
            const aKeyword = a.split(' ')[1] || ''; // '8F 면역' → '면역'
            const bKeyword = b.split(' ')[1] || '';
            const aIsMe = myDept && aKeyword && myDept.includes(aKeyword);
            const bIsMe = myDept && bKeyword && myDept.includes(bKeyword);
            if (aIsMe && !bIsMe) return -1;
            if (!aIsMe && bIsMe) return 1;
            return 0;
          });

          const getWorkingEmployees = (roomName: string, day: number, period: 'am' | 'pm'): Employee[] => {
            const dateInfo = dateInfos[day - 1];
            if (!dateInfo) return [];
            return scheduleData.employees.filter(emp => {
              const shiftCode = mergedScheduleData.shifts[emp.empId]?.[day] || '';
              if (isFullOff(shiftCode)) return false;

              const isHoliday = dateInfo.dow === 0 || dateInfo.isHoliday;
              const isHolidayHo = isHoliday && shiftCode.toUpperCase().trim() === 'HO';
              const isSatM = dateInfo.dow === 6 && shiftCode.toUpperCase().trim() === 'M';
              const isForceMorningOnly = isHolidayHo || isSatM;

              const { isAmLeave, isPmLeave } = getLeaveAmPmState(emp.empId, day, shiftCode);

              const isDefaultMorningOnly = ['M', 'M1', 'MX', 'H', 'HO', 'MO'].includes(shiftCode.toUpperCase().trim()) || (dateInfo.dow === 6);
              
              let defaultAm = [emp.mainWorkplace || emp.department];
              let defaultPm = [emp.mainWorkplace || emp.department];
              if (isAmLeave) defaultAm = [];
              if (isForceMorningOnly || isPmLeave || (isDefaultMorningOnly && !isAmLeave)) defaultPm = [];

              if (period === 'am') {
                const amRaw = mergedScheduleData.supports?.[emp.empId]?.[day]?.am;
                const amSupports = amRaw && amRaw.length > 0 ? amRaw : defaultAm;
                return amSupports.some((dept: string) => getFullRoomName(dept) === roomName);
              } else {
                const pmRaw = mergedScheduleData.supports?.[emp.empId]?.[day]?.pm;
                const pmSupports = pmRaw && pmRaw.length > 0 ? pmRaw : defaultPm;
                return pmSupports.some((dept: string) => getFullRoomName(dept) === roomName);
              }
            });
          };

          const getRoomPeriodBlocks = (roomName: string, period: 'am' | 'pm') => {
            const blocks: {
              startDay: number;
              endDay: number;
              colSpan: number;
              isEmpty: boolean;
              employees: Employee[];
              days: { day: number; employees: Employee[]; shiftCodes: Record<string, string> }[];
            }[] = [];
            let current: any = null;

            for (let day = 1; day <= daysInMonth; day++) {
              const workingEmps = getWorkingEmployees(roomName, day, period);
              const isEmpty = workingEmps.length === 0;

              const shiftCodes: Record<string, string> = {};
              workingEmps.forEach(emp => {
                shiftCodes[emp.empId] = mergedScheduleData.shifts[emp.empId]?.[day] || '';
              });

              if (!current) {
                current = {
                  startDay: day,
                  endDay: day,
                  colSpan: 1,
                  isEmpty,
                  employees: workingEmps,
                  days: [{ day, employees: workingEmps, shiftCodes }]
                };
              } else {
                const currentDow = dateInfos[current.startDay - 1]?.dow;
                const currentIsHoliday = dateInfos[current.startDay - 1]?.isHoliday;
                const currentBgType = (currentDow === 6) ? 'sat' : (currentDow === 0 || currentIsHoliday) ? 'sun' : 'weekday';

                const newDow = dateInfos[day - 1]?.dow;
                const newIsHoliday = dateInfos[day - 1]?.isHoliday;
                const newBgType = (newDow === 6) ? 'sat' : (newDow === 0 || newIsHoliday) ? 'sun' : 'weekday';

                const currentEmpIds = current.employees.map((e: any) => e.empId).sort().join(',');
                const newEmpIds = workingEmps.map((e: Employee) => e.empId).sort().join(',');
                const isSame = (current.isEmpty && isEmpty && currentBgType === newBgType) ||
                  (!current.isEmpty && !isEmpty && currentEmpIds === newEmpIds);

                if (isSame) {
                  current.endDay = day;
                  current.colSpan += 1;
                  current.days.push({ day, employees: workingEmps, shiftCodes });
                } else {
                  blocks.push(current);
                  current = {
                    startDay: day,
                    endDay: day,
                    colSpan: 1,
                    isEmpty,
                    employees: workingEmps,
                    days: [{ day, employees: workingEmps, shiftCodes }]
                  };
                }
              }
            }
            if (current) blocks.push(current);
            return blocks;
          };

          const renderBlocks = (blocks: any[], roomName: string, roomDept: string, isAm: boolean) => {
            return blocks.map((block, idx) => {
              const { startDay, colSpan, isEmpty, employees, days } = block;

              let cellBg = '';
              if (isEmpty) {
                const dow = dateInfos[startDay - 1]?.dow;
                const isHoliday = dateInfos[startDay - 1]?.isHoliday;
                if (dow === 6) cellBg = 'bg-blue-50/60';
                if (dow === 0 || isHoliday) cellBg = 'bg-red-50/60';
              }

              const borderClass = isAm ? '' : 'border-b border-gray-100';

              return (
                <td
                  key={`${isAm ? 'am' : 'pm'}-block-${idx}`}
                  colSpan={colSpan}
                  className={`${borderClass} px-0 py-1.5 ${cellBg} align-stretch cursor-pointer hover:bg-primary-50/50 transition-colors relative`}
                  onClick={(e) => {
                    if (isSaving) {
                      setToast('저장 중에는 수정할 수 없습니다.');
                      return;
                    }
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const cellWidth = rect.width / colSpan;
                    let clickedOffset = Math.floor(clickX / cellWidth);
                    if (clickedOffset < 0) clickedOffset = 0;
                    if (clickedOffset >= colSpan) clickedOffset = colSpan - 1;
                    const clickedDay = startDay + clickedOffset;
                    openPopover(e, 'room', { roomName, day: clickedDay });
                  }}
                >
                  {!isEmpty ? (
                    <div className="flex flex-col items-stretch w-full h-full p-[2px]">
                      {(() => {
                        const firstNonSpecialIdx = days.findIndex((d: any) => {
                          if (d.employees.length !== 1) return true;
                          const emp = d.employees[0];
                          const sc = d.shiftCodes[emp.empId] || '';
                          return !['HO', 'MO', '반차'].includes(sc.toUpperCase().trim());
                        });

                        const deptColor = (employees.length === 1)
                          ? getDeptColor(employees[0].mainWorkplace || employees[0].department).split(' ').filter(c => !c.startsWith('border-')).join(' ')
                          : getDeptColor(roomDept).split(' ').filter(c => !c.startsWith('border-')).join(' ');

                        return (
                          <div className={`w-full h-full min-h-[26px] flex items-stretch justify-stretch rounded-md overflow-hidden shadow-sm border border-black/5 py-1 ${deptColor}`}>
                            <div className="grid w-full h-full" style={{ gridTemplateColumns: `repeat(${colSpan}, minmax(0, 1fr))` }}>
                              {days.map((bd: any, i: number) => {
                                if (bd.employees.length === 0) return <div key={bd.day} className="w-full" />;

                                if (bd.employees.length === 1) {
                                  const emp = bd.employees[0];
                                  const sc = bd.shiftCodes[emp.empId] || '';
                                  const codeUpper = sc.toUpperCase().trim();

                                  if (['HO', 'MO', '반차'].includes(codeUpper)) {
                                    return (
                                      <div key={bd.day} className="flex flex-col justify-center w-full py-0.5">
                                        <span className="block text-[9px] font-extrabold opacity-80 leading-none text-center mb-0.5">
                                          {sc}
                                        </span>
                                        <span className="block text-[11px] font-extrabold leading-tight text-center truncate w-full pl-1">
                                          {emp.name}
                                        </span>
                                      </div>
                                    );
                                  } else if (i === firstNonSpecialIdx || (firstNonSpecialIdx === -1 && i === 0)) {
                                    const showSmallShift = sc && !['D', 'N', '수면', 'HO', 'MO', '반차'].includes(codeUpper) && !(codeUpper === 'M' && dateInfos[bd.day - 1]?.dow === 6);
                                    return (
                                      <div key={bd.day} className="flex flex-col justify-center w-full py-0.5">
                                        {showSmallShift && (
                                          <span className="block text-[9px] font-extrabold opacity-80 leading-none text-center mb-0.5">
                                            {sc}
                                          </span>
                                        )}
                                        <span className="block text-[11px] font-extrabold leading-tight text-left truncate w-full pl-1">
                                          {emp.name}
                                        </span>
                                      </div>
                                    );
                                  } else {
                                    const showSmallShift = sc && !['D', 'N', '수면', 'HO', 'MO', '반차'].includes(codeUpper) && !(codeUpper === 'M' && dateInfos[bd.day - 1]?.dow === 6);
                                    return (
                                      <div key={bd.day} className="w-full flex flex-col justify-center items-center py-0.5">
                                        {showSmallShift && (
                                          <span className="block text-[9px] font-extrabold opacity-80 leading-none text-center mb-0.5">
                                            {sc}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  }
                                } else {
                                  if (i === 0) {
                                    return (
                                      <div key={bd.day} className="flex flex-col justify-center w-full py-0.5">
                                        {bd.employees.map((e: Employee) => (
                                          <span key={e.empId} className="block text-[11px] font-extrabold leading-tight text-left truncate w-full pl-1">
                                            {e.name}
                                          </span>
                                        ))}
                                      </div>
                                    );
                                  } else {
                                    return <div key={bd.day} className="w-full flex flex-col justify-center items-center py-0.5" />;
                                  }
                                }
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="w-full h-full min-h-[26px] flex items-center justify-center">
                      <span className="text-gray-300">-</span>
                    </div>
                  )}
                </td>
              );
            });
          };

          return (
            <div className="flex-1 overflow-auto relative bg-white">
              <table className="border-collapse table-fixed w-full min-w-[1000px] h-full text-center text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 top-0 z-30 bg-gray-50 border-r border-b border-gray-200 px-3 py-2 text-gray-500 font-bold text-[11px] w-[110px] min-w-[110px] max-w-[110px]">
                      검사실
                    </th>
                    {dateInfos.map(({ day, dow, dayName, isHoliday, holidayName }) => {
                      let headerBg = 'bg-gray-50'; let textColor = 'text-gray-700';
                      if (dow === 6) { headerBg = 'bg-blue-100/80'; textColor = 'text-blue-700 font-extrabold'; }
                      if (dow === 0 || isHoliday) { headerBg = 'bg-red-100/80'; textColor = 'text-red-600 font-extrabold'; }
                      return (
                        <th key={day} className={`sticky top-0 z-20 ${headerBg} border-b border-gray-200 px-1 py-1.5 min-w-[36px] overflow-hidden`} title={holidayName || undefined}>
                          <div className={`font-bold text-xs ${textColor}`}>{day}</div>
                          <div className={`text-[10px] font-semibold ${textColor} opacity-85`}>
                            {isHoliday ? <span className="text-[9px] px-0.5 bg-red-200 text-red-800 rounded leading-none font-bold inline-block scale-90" title={holidayName!}>{holidayName}</span> : dayName}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sortedRoomOrder.map(roomName => {
                    const roomDept = getRoomDept(roomName);
                    const amBlocks = getRoomPeriodBlocks(roomName, 'am');
                    const pmBlocks = getRoomPeriodBlocks(roomName, 'pm');

                    return (
                      <React.Fragment key={roomName}>
                        {/* 오전(AM) 행 */}
                        <tr className="hover:bg-gray-50/50 transition-colors">
                          <td rowSpan={2} className={`sticky left-0 z-10 border-r border-gray-200 border-b border-gray-100 p-1.5 align-middle ${myDept && roomName.split(' ')[1] && myDept.includes(roomName.split(' ')[1]) ? 'bg-blue-50' : getDeptColor(roomDept).split(' ').filter(c => c.startsWith('bg-')).join(' ')}`}>
                            <div className={`flex flex-col items-center justify-center w-full h-full px-1 py-1.5 ${getDeptTextColor(roomDept)}`}>
                              <span className="text-[11px] font-bold opacity-80 mb-1 leading-none">{roomName.split(' ')[0]}</span>
                              <span className="font-extrabold text-[14px] leading-none">{roomName.split(' ')[1]}</span>
                            </div>
                          </td>
                          {renderBlocks(amBlocks, roomName, roomDept, true)}
                        </tr>
                        {/* 오후(PM) 행 */}
                        <tr className="hover:bg-gray-50/50 transition-colors">
                          {renderBlocks(pmBlocks, roomName, roomDept, false)}
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}

        {viewMode === 'calendar' && (
          <PersonalCalendar
            scheduleData={mergedScheduleData}
            isSaving={isSaving}
            openPopover={openPopover}
            getPopoverSupports={getPopoverSupports}
            showToast={setToast}
          />
        )}
      </div>

      {/* ── 엑셀 업로드 모달 ── */}
      {showUploadModal && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setShowUploadModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-primary-500" /> 엑셀 근무표 업로드
                </h3>
                <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 드래그 앤 드롭 영역 */}
              <div className="p-5">
                <div
                  className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-primary-500 hover:bg-primary-50/30 transition-all cursor-pointer"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-600 mb-1">엑셀 파일을 드래그하거나 클릭하여 선택</p>
                  <p className="text-[11px] text-gray-400">.xlsx 또는 .xls 파일 지원</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                </div>

                {uploadError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-red-600">{uploadError}</p>
                  </div>
                )}

                {/* 엑셀 형식 안내 */}
                <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                  <p className="text-[11px] font-bold text-gray-500 mb-2 flex items-center gap-1">
                    <Info className="w-3 h-3" /> 지원하는 엑셀 형식
                  </p>
                  <ul className="text-[10px] text-gray-400 space-y-1 list-disc pl-4">
                    <li>헤더에 날짜 번호(1, 2, 3, ... 30) 가 연속으로 존재해야 합니다.</li>
                    <li>사원명 또는 이름 컬럼이 있어야 합니다.</li>
                    <li>근무코드: D, OFF, M, M1, MO, N, NO, E, H, HO, S, SO 등</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── 플로팅 팝오버 (test.html 스타일) ── */}
      {popover && (
        <>
          <div className="fixed inset-0 z-40" onClick={closePopover} />
          <div
            className="fixed z-50 bg-white rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.12)] border border-gray-200 w-72 overflow-hidden"
            style={{ left: popover.x, top: popover.y }}
          >
            {/* 헤더 */}
            <div className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
              <strong className="text-xs text-gray-800 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${popover.type === 'room' ? 'bg-accent-500' : 'bg-primary-500'}`}></span>
                {popover.type === 'room' ? popover.roomName : popover.empName}
                <span className="text-gray-400 font-normal">| {month}월 {popover.day}일</span>
              </strong>
              <button onClick={closePopover} className="text-gray-400 hover:text-gray-700 transition-colors p-0.5">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3">
              {popover.type !== 'room' ? (
                <>
                  {/* 오전 근무지 */}
                  <div className="mb-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold text-[#004b8d] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#004b8d]"></span> 오전 근무지
                      </label>
                      <button
                        onClick={() => setPopover({ ...popover, am: [...popover.am, ''] })}
                        className="text-[10px] font-bold text-[#004b8d] bg-primary-50 px-1.5 py-0.5 rounded hover:bg-primary-100 transition-colors"
                      >+ 추가</button>
                    </div>
                    <div className="space-y-1.5">
                      {popover.am.map((val, idx) => (
                        <div key={`am-${idx}`} className="flex items-center gap-1.5">
                          <select
                            value={val}
                            onChange={(e) => {
                              const newAm = [...popover.am];
                              newAm[idx] = e.target.value;
                              setPopover({ ...popover, am: newAm });
                            }}
                            className={`flex-1 min-w-0 border rounded-lg px-2 py-1.5 outline-none focus:border-[#004b8d] font-bold text-xs transition-colors ${val ? getDeptColor(val) : 'border-gray-200 bg-white text-gray-700'}`}
                          >
                            <option value="" className="bg-white text-gray-700 font-medium">선택 안함</option>
                            {DEPARTMENTS.map(d => <option key={d} value={d} className={`${getDeptColor(d)} font-bold`}>{d}</option>)}
                          </select>
                          <button
                            onClick={() => {
                              const newAm = popover.am.filter((_, i) => i !== idx);
                              setPopover({ ...popover, am: newAm.length === 0 ? [''] : newAm });
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 오후 근무지 */}
                  {(() => {
                    const popoverShiftCode = scheduleData.shifts[popover.empId]?.[popover.day] || '';
                    const popoverDateInfo = dateInfos[popover.day - 1];
                    const isHoliday = popoverDateInfo && (popoverDateInfo.dow === 0 || popoverDateInfo.isHoliday);
                    const isHolidayHo = isHoliday && popoverShiftCode.toUpperCase().trim() === 'HO';
                    const isSatM = popoverDateInfo && popoverDateInfo.dow === 6 && popoverShiftCode.toUpperCase().trim() === 'M';
                    const isForceMorningOnly = isHolidayHo || isSatM;

                    if (isForceMorningOnly) return null;

                    return (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-bold text-[#ff7a00] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a00]"></span> 오후 근무지
                          </label>
                          <button
                            onClick={() => setPopover({ ...popover, pm: [...popover.pm, ''] })}
                            className="text-[10px] font-bold text-[#ff7a00] bg-accent-50 px-1.5 py-0.5 rounded hover:bg-accent-100 transition-colors"
                          >+ 추가</button>
                        </div>
                        <div className="space-y-1.5">
                          {popover.pm.map((val, idx) => (
                            <div key={`pm-${idx}`} className="flex items-center gap-1.5">
                              <select
                                value={val}
                                onChange={(e) => {
                                  const newPm = [...popover.pm];
                                  newPm[idx] = e.target.value;
                                  setPopover({ ...popover, pm: newPm });
                                }}
                                className={`flex-1 min-w-0 border rounded-lg px-2 py-1.5 outline-none focus:border-[#ff7a00] font-bold text-xs transition-colors ${val ? getDeptColor(val) : 'border-gray-200 bg-white text-gray-700'}`}
                              >
                                <option value="" className="bg-white text-gray-700 font-medium">선택 안함</option>
                                {DEPARTMENTS.map(d => <option key={d} value={d} className={`${getDeptColor(d)} font-bold`}>{d}</option>)}
                              </select>
                              <button
                                onClick={() => {
                                  const newPm = popover.pm.filter((_, i) => i !== idx);
                                  setPopover({ ...popover, pm: newPm.length === 0 ? [''] : newPm });
                                }}
                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 비우기 */}
                  <button
                    onClick={() => {
                      setScheduleData(prev => {
                        const newSupports = JSON.parse(JSON.stringify(prev.supports || {}));
                        if (newSupports[popover!.empId]) {
                          delete newSupports[popover!.empId][popover!.day];
                        }
                        return { ...prev, supports: newSupports };
                      });
                      setToast('초기화 완료');
                      closePopover();
                    }}
                    className="w-full bg-gray-50 text-gray-500 py-1.5 rounded-lg text-[10px] font-bold border border-gray-200 hover:bg-gray-100 transition-colors mb-2"
                  >
                    배치 초기화 (비우기)
                  </button>

                  {/* 취소 / 저장 */}
                  <div className="flex items-center gap-2">
                    <button onClick={closePopover} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition-colors text-xs">
                      취소
                    </button>
                    <button onClick={handlePopoverSave} className="flex-1 py-2 bg-[#004b8d] text-white rounded-lg font-bold hover:bg-[#00437f] transition-colors shadow-sm shadow-[#004b8d]/30 text-xs">
                      적용하기
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* 검실기준 뷰 전용: 직원 목록 + 오전/오후 토글 */}
                  <div className="text-[10px] text-gray-400 mb-2 font-medium">직원을 선택하여 오전/오후 배치</div>
                  <div className="space-y-0.5 max-h-[480px] overflow-y-auto no-scrollbar">
                    {(() => {
                      const roomDept = getRoomDept(popover.roomName);
                      const isOff = (code: string) => {
                        const c = code?.toUpperCase().trim() || '';
                        return !c || ['OFF', 'NO', 'MO', 'SO', '연차', '육휴', '휴직', '특휴', '태검'].includes(c);
                      };
                      return scheduleData.employees.filter(emp => {
                        const sc = scheduleData.shifts[emp.empId]?.[popover.day] || '';
                        return !isOff(sc);
                      }).map(emp => {
                        const amR = scheduleData.supports?.[emp.empId]?.[popover.day]?.am;
                        const pmR = scheduleData.supports?.[emp.empId]?.[popover.day]?.pm;
                        const amS: string[] = amR && amR.length > 0 ? amR : [emp.mainWorkplace || emp.department];
                        const pmS: string[] = pmR && pmR.length > 0 ? pmR : [emp.mainWorkplace || emp.department];
                        const isAm = amS.includes(roomDept);
                        const isPm = pmS.includes(roomDept);
                        const currentAmList = amS.filter(Boolean);
                        const currentPmList = pmS.filter(Boolean);
                        return (
                          <div key={emp.empId} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-bold px-1 py-0.5 rounded border ${getDeptColor(emp.mainWorkplace || emp.department)}`}>{emp.mainWorkplace || emp.department}</span>
                                <span className="text-[11px] font-bold text-gray-700">{emp.name}</span>
                              </div>
                              <div className="text-[9px] text-gray-400 mt-0.5 pl-1 tracking-tight">
                                오전: {currentAmList.join(', ') || '-'} • 오후: {currentPmList.join(', ') || '-'}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => toggleRoomAssignment(emp.empId, popover.day, roomDept, 'am')}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${isAm ? 'bg-[#004b8d] text-white shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                              >오전</button>
                              <button
                                onClick={() => toggleRoomAssignment(emp.empId, popover.day, roomDept, 'pm')}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${isPm ? 'bg-[#ff7a00] text-white shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                              >오후</button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── 토스트 알림 ── */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] bg-gray-800 text-white px-5 py-2.5 rounded-xl shadow-lg text-xs font-bold transition-opacity">
          {toast}
        </div>
      )}

      {/* ── 직원관리 모달 ── */}
      {showEmpModal && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50 animate-fade-in" onClick={() => setShowEmpModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] animate-slide-up">
              {/* 헤더 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <div>
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <User className="w-5 h-5 text-accent-500" /> {currentUser.mainWorkplace || currentUser.department || '부서'} 직원 관리 명부
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">부서 소속 직원의 주근무지, 보조근무지 및 부서장 권한을 설정합니다.</p>
                </div>
                <button onClick={() => setShowEmpModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 본문 (2단 레이아웃) */}
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
                {/* 1단: 직원 목록 */}
                <div className="flex-1 p-6 overflow-y-auto border-r border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-500">부서 내 직원 목록 ({
                        filteredEmployeesForManage.length
                      }명)</span>
                      <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg">
                        <input
                          type="checkbox"
                          id="showRetiredCheckbox"
                          checked={showRetiredList}
                          onChange={(e) => setShowRetiredList(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-accent-500 border-gray-300 focus:ring-accent-500 cursor-pointer"
                        />
                        <label htmlFor="showRetiredCheckbox" className="text-[10px] font-bold text-gray-600 cursor-pointer">
                          퇴사자 포함
                        </label>
                      </div>
                    </div>
                    <button
                      onClick={handleOpenAddEmp}
                      className="px-2.5 py-1.5 bg-primary-50 text-[#004b8d] hover:bg-primary-100 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> 신규 직원 추가
                    </button>
                  </div>

                  <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm bg-white">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-400 font-semibold">
                          <th className="px-3 py-2.5">사번</th>
                          <th className="px-3 py-2.5">이름</th>
                          <th className="px-3 py-2.5">직급</th>
                          <th className="px-3 py-2.5">주근무지</th>
                          <th className="px-3 py-2.5">보조근무지</th>
                          <th className="px-3 py-2.5 text-center">부서장</th>
                          <th className="px-3 py-2.5 text-right">관리</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEmployeesForManage
                          .map((emp) => (
                            <tr key={emp.empId} className={`border-b border-gray-50 hover:bg-gray-50/30 transition-colors ${emp.isRetired ? 'bg-gray-50/70 opacity-60' : ''}`}>
                              <td className={`px-3 py-3 font-semibold ${emp.isRetired ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{emp.empId}</td>
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-1.5">
                                  <span className={`font-bold ${emp.isRetired ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{emp.name}</span>
                                  {emp.isRetired && <span className="text-[9px] font-bold bg-gray-200 text-gray-500 rounded px-1 py-0.5 leading-none">퇴사</span>}
                                </div>
                              </td>
                              <td className={`px-3 py-3 ${emp.isRetired ? 'text-gray-400' : 'text-gray-500'}`}>{emp.position}</td>
                              <td className="px-3 py-3">
                                <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border ${getDeptColor(emp.mainWorkplace || emp.department)}`}>
                                  {emp.mainWorkplace || emp.department}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                {emp.subWorkplace ? (
                                  <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border ${getDeptColor(emp.subWorkplace)}`}>
                                    {emp.subWorkplace}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-center">
                                {emp.isManager ? (
                                  <span className="text-accent-500 font-bold bg-orange-50 border border-orange-200 rounded-md px-1 py-0.5 text-[9px]">부서장</span>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button onClick={() => handleOpenEditEmp(emp)} className="p-1 text-gray-400 hover:text-primary-600 rounded hover:bg-primary-50 transition-colors" title="수정">
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleToggleRetire(emp)}
                                    className={`p-1 rounded transition-colors ${emp.isRetired ? 'text-green-500 hover:bg-green-50 hover:text-green-600' : 'text-orange-500 hover:bg-orange-50 hover:text-orange-600'}`}
                                    title={emp.isRetired ? '재직상태로 복구' : '퇴사 처리 (아카이브)'}
                                  >
                                    {emp.isRetired ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                                  </button>
                                  <button onClick={() => handleDeleteEmp(emp.empId)} className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors" title="영구 삭제">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        {filteredEmployeesForManage.length === 0 && (
                          <tr>
                            <td colSpan={7} className="text-center py-12 text-gray-400">
                              등록된 부서 직원이 없습니다. 신규 직원을 등록해 주세요.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2단: 입력 폼 */}
                <div className="w-full md:w-[320px] bg-gray-50/50 p-6 overflow-y-auto flex flex-col shrink-0 border-t md:border-t-0 md:border-l border-gray-100">
                  <h4 className="font-bold text-gray-900 text-sm mb-4">
                    {editingEmp ? '직원 정보 수정' : '신규 직원 등록'}
                  </h4>

                  <form onSubmit={handleSaveEmp} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">사번</label>
                      <input
                        type="text"
                        disabled={!!editingEmp}
                        placeholder="사번 입력"
                        value={empForm.empId}
                        onChange={(e) => setEmpForm({ ...empForm, empId: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent-500 bg-white font-medium disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">이름</label>
                      <input
                        type="text"
                        placeholder="이름 입력"
                        value={empForm.name}
                        onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent-500 bg-white font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">직급</label>
                      <select
                        value={empForm.position}
                        onChange={(e) => setEmpForm({ ...empForm, position: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent-500 bg-white font-medium"
                      >
                        {['사원', '주임', '선임주임', '계장', '대리', '과장', '차장', '부장', '임상병리사'].map(pos => (
                          <option key={pos} value={pos}>{pos}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">주근무지</label>
                      <select
                        value={empForm.mainWorkplace}
                        onChange={(e) => setEmpForm({ ...empForm, mainWorkplace: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent-500 bg-white font-medium"
                      >
                        <option value="">선택 안함</option>
                        {DEPT_OPTIONS.filter(d => d !== '육아휴직').map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">보조근무지 (선택)</label>
                      <select
                        value={empForm.subWorkplace}
                        onChange={(e) => setEmpForm({ ...empForm, subWorkplace: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent-500 bg-white font-medium"
                      >
                        <option value="">없음</option>
                        {DEPT_OPTIONS.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">로그인 비밀번호</label>
                      <input
                        type="password"
                        placeholder={editingEmp ? "변경할 비밀번호 입력 (공란 유지 시 기존 비밀번호)" : "초기 비밀번호 설정"}
                        value={empForm.password}
                        onChange={(e) => setEmpForm({ ...empForm, password: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent-500 bg-white font-medium"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="isManagerCheckbox"
                        checked={empForm.isManager}
                        onChange={(e) => setEmpForm({ ...empForm, isManager: e.target.checked })}
                        className="w-4 h-4 rounded text-accent-500 border-gray-200 focus:ring-accent-500 cursor-pointer"
                      />
                      <label htmlFor="isManagerCheckbox" className="text-xs font-semibold text-gray-700 cursor-pointer">
                        부서장 권한 부여
                      </label>
                    </div>

                    {editingEmp && (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="isRetiredCheckbox"
                          checked={empForm.isRetired}
                          onChange={(e) => setEmpForm({ ...empForm, isRetired: e.target.checked })}
                          className="w-4 h-4 rounded text-[#ff7a00] border-gray-200 focus:ring-[#ff7a00] cursor-pointer"
                        />
                        <label htmlFor="isRetiredCheckbox" className="text-xs font-semibold text-gray-700 cursor-pointer">
                          퇴사 처리 (Archive)
                        </label>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                      {editingEmp && (
                        <button
                          type="button"
                          onClick={handleOpenAddEmp}
                          className="flex-1 py-2 bg-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-300 transition-colors text-xs"
                        >
                          신규 등록으로
                        </button>
                      )}
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition-colors shadow-sm text-xs"
                      >
                        {editingEmp ? '정보 수정' : '새 직원 등록'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── 연차 관리 모달 ── */}
      {showVacationModal && (
        <VacationModal
          onClose={() => setShowVacationModal(false)}
          width={vacationDrawerWidth}
          setWidth={setVacationDrawerWidth}
          setIsDragging={setIsDraggingVacationDrawer}
        />
      )}
    </div>
  );
}
