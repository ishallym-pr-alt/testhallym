"use client";

import React, { useState } from 'react';
import { useStore, Vacation } from '@/store/useStore';
import { X, CheckCircle, XCircle, Pencil, Trash2, ChevronDown } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const formatDateToString = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function VacationModal({
  onClose,
  width,
  setWidth,
  setIsDragging
}: {
  onClose: () => void;
  width: number;
  setWidth: (w: number) => void;
  setIsDragging?: (dragging: boolean) => void;
}) {
  const { currentUser, vacations, employees: rawEmployees, addVacation, updateVacationStatus, editVacation, deleteVacation, highlightedItemIds, removeHighlightedItemId } = useStore();

  const pendingVacationsCount = currentUser.isManager ? vacations.filter(v => v.status === '대기').length : 0;
  const vacationAlarmCount = highlightedItemIds.filter(id => typeof id === 'string' && id.startsWith('vacation_')).length + pendingVacationsCount;

  // 퇴사하지 않은 자기 자신 제외한 직원 리스트
  const availableEmployees = React.useMemo(() => {
    return (rawEmployees || [])
      .filter((emp: any) => {
        const isRetired = emp.isRetired === true || String(emp.isRetired).toUpperCase() === 'TRUE';
        return String(emp.empId).trim() !== String(currentUser.employeeId).trim() && !isRetired;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [rawEmployees, currentUser.employeeId]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging?.(true);
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      const newWidth = Math.max(349, Math.min(window.innerWidth * 0.85, startWidth + deltaX));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging?.(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  const [activeTab, setActiveTab] = useState<'form' | 'list'>('form');
  const [showExcelVacations, setShowExcelVacations] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'current_next'>('current_next');

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const filteredByDate = vacations.filter(v => {
    if (dateFilter === 'all') return true;
    
    // v.vacationDate가 "2026-07-01" 또는 Date 객체 형태일 때 연/월 추출
    const d = new Date(v.vacationDate);
    const vYear = d.getFullYear();
    const vMonth = d.getMonth() + 1; // 0~11 이므로 +1
    
    // 현재 월(7월)과 다음 월(8월) 구하기 (12월일 때 연도 넘어가는 예외 처리 포함)
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    
    const isCurrentMonth = (vYear === currentYear && vMonth === currentMonth);
    const isNextMonth = (vYear === nextYear && vMonth === nextMonth);
    
    return isCurrentMonth || isNextMonth;
  });

  const normalVacations = filteredByDate.filter(v => v.reason !== '엑셀 업로드 자동 승인');
  const excelVacations = filteredByDate.filter(v => v.reason === '엑셀 업로드 자동 승인');

  // 신청 폼 상태 (Range Picker)
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  const [formType, setFormType] = useState('종일연차');
  const [formReason, setFormReason] = useState('');
  const [formHandoverEmpId, setFormHandoverEmpId] = useState('');

  // 수정 상태
  const [editingVac, setEditingVac] = useState<Vacation | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState('종일연차');
  const [editReason, setEditReason] = useState('');
  const [editHandoverEmpId, setEditHandoverEmpId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) {
      alert('신청 기간(시작일)을 선택해 주세요.');
      return;
    }

    const datesToApply: string[] = [];
    if (startDate && !endDate) {
      datesToApply.push(formatDateToString(startDate));
    } else if (startDate && endDate) {
      let curr = new Date(startDate.getTime());
      const last = new Date(endDate.getTime());
      while (curr <= last) {
        datesToApply.push(formatDateToString(curr));
        curr.setDate(curr.getDate() + 1);
      }
    }

    if (datesToApply.length === 0) {
      alert('신청 기간을 선택해 주세요.');
      return;
    }

    // 각 날짜별로 연차 신청
    datesToApply.forEach((dateStr) => {
      addVacation({
        empId: currentUser.employeeId,
        name: currentUser.name,
        department: currentUser.department,
        mainWorkplace: currentUser.mainWorkplace,
        subWorkplace: currentUser.subWorkplace,
        vacationDate: dateStr,
        vacationType: formType,
        reason: formReason,
        handoverEmpId: formHandoverEmpId || '',
      });
    });

    alert(`${datesToApply.length}건의 연차가 신청되었습니다.`);
    setDateRange([null, null]);
    setFormReason('');
    setFormHandoverEmpId('');
    setActiveTab('list');
  };

  const handleApprove = (id: string) => {
    if (confirm('승인하시겠습니까? 근무표에 자동 연동됩니다.')) {
      updateVacationStatus(id, '승인');
    }
  };

  const handleReject = (id: string) => {
    if (confirm('반려하시겠습니까?')) {
      updateVacationStatus(id, '반려');
    }
  };

  const handleRevert = (id: string) => {
    if (confirm('승인/반려를 취소하고 대기 상태로 되돌리시겠습니까?')) {
      updateVacationStatus(id, '대기');
    }
  };

  const canEditVac = (v: Vacation) => currentUser.employeeId === v.empId && v.status === '대기';
  const canDeleteVac = (v: Vacation) => (currentUser.employeeId === v.empId && v.status === '대기') || currentUser.isManager;

  const handleEditVac = (v: Vacation) => {
    setEditingVac(v);
    setEditDate(v.vacationDate);
    setEditType(v.vacationType);
    setEditReason(v.reason);
    setEditHandoverEmpId(v.handoverEmpId || '');
  };

  const handleEditVacSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVac) return;
    editVacation(editingVac.id, { 
      vacationDate: editDate, 
      vacationType: editType, 
      reason: editReason,
      handoverEmpId: editHandoverEmpId || ''
    });
    setEditingVac(null);
  };

  const handleDeleteVac = (v: Vacation) => {
    if (confirm('정말로 삭제하시겠습니까?')) deleteVacation(v.id);
  };

  const renderVacationCard = (v: Vacation) => {
    const isHighlighted = highlightedItemIds.includes(`vacation_${v.id}`) || (currentUser.isManager && v.status === '대기');
    let statusColor = 'text-orange-500';
    if (v.status === '승인') statusColor = 'text-green-600';
    if (v.status === '반려') statusColor = 'text-red-500';

    const isTypeFull = v.vacationType === '종일연차';
    const isTypeMO = v.vacationType.includes('MO');
    const isTypeHO = v.vacationType.includes('HO');
    
    let typeBg = 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (isTypeFull) typeBg = 'bg-blue-50 text-blue-700 border-blue-100';
    else if (isTypeMO) typeBg = 'bg-purple-50 text-purple-700 border-purple-100';
    else if (isTypeHO) typeBg = 'bg-indigo-50 text-indigo-700 border-indigo-100';

    return (
      <div
        key={v.id}
        className={`rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-2.5 relative animate-fade-in ${
          isHighlighted ? 'ring-2 ring-orange-400 bg-orange-50/30' : 'border border-gray-100 bg-white'
        }`}
        onMouseEnter={() => {
          if (highlightedItemIds.includes(`vacation_${v.id}`)) {
            removeHighlightedItemId(`vacation_${v.id}`);
          }
        }}
      >
        {/* 헤더: 일자 및 상태 배지 */}
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-gray-400">{v.vacationDate}</span>
          <span className={`inline-flex items-center gap-1 font-bold text-xs ${statusColor}`}>
            {v.status === '승인' && <CheckCircle className="w-3.5 h-3.5" />}
            {v.status === '반려' && <XCircle className="w-3.5 h-3.5" />}
            {v.status}
          </span>
        </div>

        {/* 본문: 신청자 정보 및 연차 구분 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-extrabold text-sm text-gray-800 truncate">{v.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-gray-50 border border-gray-200 text-gray-500 rounded font-bold shrink-0">
              {v.mainWorkplace || v.department}
            </span>
          </div>
          <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-bold shrink-0 ${typeBg}`}>
            {v.vacationType}
          </span>
        </div>

        {/* 사유 */}
        {v.reason && (
          <div className="text-xs text-gray-500 bg-gray-50/80 rounded-lg p-2.5 leading-relaxed border border-gray-100/50 break-all">
            {v.reason}
          </div>
        )}

        {/* 인수자 정보 */}
        {v.handoverEmpId && (
          <div className="text-xs text-gray-500 bg-blue-50/30 rounded-lg px-2.5 py-1.5 border border-blue-100/50 flex justify-between items-center">
            <span className="font-semibold text-gray-600">인수자(대타)</span>
            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
              {rawEmployees.find(e => String(e.empId).trim() === String(v.handoverEmpId).trim())?.name || v.handoverEmpId}
            </span>
          </div>
        )}

        {/* 관리/액션 영역 */}
        <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-gray-50">
          {/* 부서장 결재 (대기 상태일 때) */}
          {currentUser.isManager && v.status === '대기' && (
            <>
              <button
                onClick={() => handleApprove(v.id)}
                className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-bold border border-green-200 transition-colors"
              >
                승인
              </button>
              <button
                onClick={() => handleReject(v.id)}
                className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold border border-red-200 transition-colors"
              >
                반려
              </button>
            </>
          )}
          {/* 부서장 결재 취소 */}
          {currentUser.isManager && v.status !== '대기' && (
            <button
              onClick={() => handleRevert(v.id)}
              className="px-3 py-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg text-xs font-bold border border-orange-200 transition-colors"
            >
              되돌리기
            </button>
          )}
          {/* 작성자 본인 수정/삭제 (대기 상태일 때만) */}
          {canEditVac(v) && (
            <button
              onClick={() => handleEditVac(v)}
              className="p-1.5 text-gray-400 hover:text-[#004b8d] rounded-lg hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100"
              title="수정"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {canDeleteVac(v) && (
            <button
              onClick={() => handleDeleteVac(v)}
              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
              title="삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        className="fixed right-0 top-0 bottom-0 h-full bg-white border-l border-gray-200 shadow-[-10px_0_30px_rgba(0,0,0,0.1)] z-40 flex flex-col animate-slide-in-right md:w-auto w-full"
        style={{ width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${width}px` : '100%' }}
      >
        {/* 드래그 크기조절 핸들 (좌측 경계면) */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary-500/40 active:bg-primary-500 transition-colors z-50 hidden md:flex items-center justify-center group"
        >
          <div className="w-[2px] h-8 bg-gray-300 group-hover:bg-primary-500 group-active:bg-primary-600 rounded-full transition-colors"></div>
        </div>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div>
            <h3 className="font-bold text-gray-900 text-base">연차 신청 및 내역</h3>
            <p className="text-xs text-gray-500 mt-0.5">연차를 신청하고 진행 상태를 확인합니다.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 헤더 */}
        <div className="flex border-b border-gray-100 px-6 pt-2 shrink-0">
          <button
            onClick={() => setActiveTab('form')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'form' ? 'border-[#004b8d] text-[#004b8d]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            연차 신청하기
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'list' ? 'border-[#004b8d] text-[#004b8d]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <span className="relative">
              신청 내역 조회
              {vacationAlarmCount > 0 && (
                <span className="absolute -top-1 -right-2 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse" />
              )}
            </span>
          </button>
        </div>

        {/* 본문 영역 */}
        <div className={`flex-1 overflow-y-auto p-6 bg-white ${activeTab === 'form' ? 'pb-28 md:pb-6' : ''}`}>
          {activeTab === 'form' && (
            <div className="max-w-md mx-auto">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">신청자</label>
                  <input
                    type="text"
                    disabled
                    value={`${currentUser.name} (${currentUser.mainWorkplace || currentUser.department})`}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50 text-gray-600 font-medium cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">신청 기간 (시작일 ~ 종료일)</label>
                  <DatePicker
                    selectsRange={true}
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(update) => {
                      setDateRange(update as [Date | null, Date | null]);
                    }}
                    isClearable={true}
                    dateFormat="yyyy-MM-dd"
                    placeholderText="날짜 범위를 선택해 주세요"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:border-[#004b8d] focus:ring-1 focus:ring-[#004b8d] outline-none transition-all bg-white font-medium text-gray-700"
                    wrapperClassName="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">연차 구분</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {['종일연차', '오전반차', '오후반차', '토요일 오전 MO', '토요일 오후 MO', '대체 오전 HO', '대체 오후 HO'].map(type => (
                      <label key={type} className={`flex items-center justify-center p-3 border rounded-xl cursor-pointer transition-all text-center ${formType === type ? 'border-[#004b8d] bg-blue-50 text-[#004b8d] font-bold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}>
                        <input
                          type="radio"
                          name="vacationType"
                          value={type}
                          checked={formType === type}
                          onChange={() => setFormType(type)}
                          className="hidden"
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">사유 (선택)</label>
                  <textarea
                    rows={3}
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    placeholder="사유를 입력하세요"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:border-[#004b8d] focus:ring-1 focus:ring-[#004b8d] outline-none transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">인수자 (대타 - 선택)</label>
                  <select
                    value={formHandoverEmpId}
                    onChange={(e) => setFormHandoverEmpId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:border-[#004b8d] focus:ring-1 focus:ring-[#004b8d] outline-none transition-all bg-white font-medium text-gray-700"
                  >
                    <option value="">선택 안 함</option>
                    {availableEmployees.map((emp) => (
                      <option key={emp.empId} value={emp.empId}>
                        {emp.name} ({emp.mainWorkplace || emp.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-10 md:relative md:p-0 md:bg-transparent md:border-none md:shadow-none shadow-[0_-4px_12px_rgba(0,0,0,0.05)] pt-2 shrink-0">
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-[#004b8d] text-white rounded-xl font-bold hover:bg-[#003c71] transition-colors shadow-lg shadow-[#004b8d]/20"
                  >
                    연차 신청하기
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg w-fit text-xs font-medium">
                <button
                  onClick={() => setDateFilter('current_next')}
                  className={`px-3 py-1.5 rounded-md transition-colors ${dateFilter === 'current_next' ? 'bg-white text-gray-800 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  이번 달/다음 달 보기
                </button>
                <button
                  onClick={() => setDateFilter('all')}
                  className={`px-3 py-1.5 rounded-md transition-colors ${dateFilter === 'all' ? 'bg-white text-gray-800 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  전체보기
                </button>
              </div>

              {normalVacations.length > 0 ? (
                [...normalVacations].reverse().map(renderVacationCard)
              ) : (
                excelVacations.length === 0 && (
                  <div className="text-center py-16 text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                    신청된 연차 내역이 없습니다.
                  </div>
                )
              )}

              {excelVacations.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowExcelVacations(!showExcelVacations)}
                    className="w-full flex items-center justify-between p-3.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-700 text-sm">엑셀 업로드 자동 승인 내역</span>
                      <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs font-bold">
                        {excelVacations.length}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-500 transition-transform ${showExcelVacations ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {showExcelVacations && (
                    <div className="mt-4 space-y-4 p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                      {[...excelVacations].reverse().map(renderVacationCard)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 연차 수정 모달 */}
      {editingVac && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[60]" onClick={() => setEditingVac(null)} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-base">연차 수정</h3>
                <button onClick={() => setEditingVac(null)} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
              </div>
              <form onSubmit={handleEditVacSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">신청 일자</label>
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:border-[#004b8d] focus:ring-1 focus:ring-[#004b8d] outline-none transition-all" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">연차 구분</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {['종일연차', '오전반차', '오후반차', '토요일 오전 MO', '토요일 오후 MO', '대체 오전 HO', '대체 오후 HO'].map(type => (
                      <label key={type} className={`flex items-center justify-center p-3 border rounded-xl cursor-pointer transition-all text-center ${editType === type ? 'border-[#004b8d] bg-blue-50 text-[#004b8d] font-bold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        <input type="radio" name="editVacType" value={type} checked={editType === type} onChange={() => setEditType(type)} className="hidden" />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">사유</label>
                  <textarea value={editReason} onChange={e => setEditReason(e.target.value)} rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:border-[#004b8d] focus:ring-1 focus:ring-[#004b8d] outline-none transition-all resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">인수자 (대타 - 선택)</label>
                  <select
                    value={editHandoverEmpId}
                    onChange={(e) => setEditHandoverEmpId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:border-[#004b8d] focus:ring-1 focus:ring-[#004b8d] outline-none transition-all bg-white font-medium text-gray-700"
                  >
                    <option value="">선택 안 함</option>
                    {availableEmployees.map((emp) => (
                      <option key={emp.empId} value={emp.empId}>
                        {emp.name} ({emp.mainWorkplace || emp.department})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setEditingVac(null)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">취소</button>
                  <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-[#004b8d] rounded-xl hover:bg-[#003c71] transition-all">수정 완료</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
