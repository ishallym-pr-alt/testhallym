import { useStore } from '@/store/useStore';
import { Search, Calendar, User as UserIcon, Pencil, Trash2, ShieldCheck, ShieldOff, KanbanSquare, GitCommit, Plus, Pin, Heart, MessageCircle } from 'lucide-react';
import { EquipmentIssue, noticeRooms } from '@/lib/dummyData';
import { formatDateTime } from '@/lib/utils';
import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import EquipmentHeader from './EquipmentHeader';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const EQUIPMENT_GROUPS = [
  {
    roomLabel: '면역치료',
    groupName: '면역치료실',
    equipments: ['고압산소 치료기', '고주파온열 치료기']
  },
  {
    roomLabel: '안과기능',
    groupName: '안과검사실',
    equipments: [
      '안경도수기',
      '시력측정기',
      '굴절력 측정기',
      '안압계',
      '각막내피세포장치',
      '시야검사기',
      '안저카메라',
      '광각안저카메라',
      '백내장 검사장비',
      '안구광학단층촬영기',
      '안과용초음파영상진단장치'
    ]
  },
  {
    roomLabel: '근전도실',
    groupName: '근전도실',
    equipments: ['근전도장비', '자동혈압계', '악력계', '전동식 진료대']
  },
  {
    roomLabel: '소화기능',
    groupName: '소화기능검사실',
    equipments: ['초음파 간섬유화 진단장치', '요소호흡검사기', '호기가스분석기', '고해상도 내압 측정기']
  },
  {
    roomLabel: '청력검사',
    groupName: '청력기능검사실',
    equipments: [
      '범용유발성응답용자극장치',
      '비디오안진계',
      'V-Hit',
      '청각유발반응측정장치',
      '임피던스청력검사기',
      '청력검사기',
      '요실금치료기(바이오피드백)'
    ]
  },
  {
    roomLabel: '심장기능',
    groupName: '심장기능검사실',
    equipments: ['심전도기', '동맥경화기', 'Holter', 'Mobile Holter', 'BP', 'Ring BP', 'TMT']
  },
  {
    roomLabel: '호흡기능',
    groupName: '호흡기능검사실',
    equipments: ['폐기능검사장비', '호기산화질소 측정기', '코통기기능검사 측정기']
  },
  {
    roomLabel: '뇌파검사',
    groupName: '뇌파검사실',
    equipments: ['뇌파기', '뇌혈류초음파기', '적외선 체온열 진단기']
  },
  {
    roomLabel: '심초음파',
    groupName: '심장초음파실',
    equipments: [
      '심장초음파영상진단장치',
      '심장초음파영상진단장치(Portable)',
      '무선 심장초음파진단기',
      'EKG monitor',
      '경식도초음파 프로브'
    ]
  },
  {
    roomLabel: '수면다원',
    groupName: '수면다원검사실',
    equipments: ['수면다원검사장치', '양압기']
  }
];

const getMatchedGroupIndex = (mainWorkplace?: string, department?: string) => {
  const target = (mainWorkplace || department || '').replace(/\s+/g, '');
  if (!target) return -1;
  return EQUIPMENT_GROUPS.findIndex(g =>
    g.groupName.replace(/\s+/g, '').includes(target) ||
    target.includes(g.groupName.replace(/\s+/g, '')) ||
    g.roomLabel.replace(/\s+/g, '').includes(target) ||
    target.includes(g.roomLabel.replace(/\s+/g, ''))
  );
};

const STATUS_STAGES = [
  { id: '할 일', title: '할 일', dbStatuses: ['신고됨'], defaultStatus: '신고됨' },
  { id: '진행 중', title: '진행 중', dbStatuses: ['수리중'], defaultStatus: '수리중' },
  { id: '완료', title: '완료', dbStatuses: ['조치완료', '정상복구', '폐기'], defaultStatus: '조치완료' },
];

function parseCustomDate(dateStr: string) {
  if (!dateStr) return new Date();
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  const match = dateStr.match(/(\d{4})[\.년-]\s*(\d{1,2})[\.월-]\s*(\d{1,2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date();
}

function toDateInputValue(dateStr: string) {
  if (!dateStr) return '';
  const d = parseCustomDate(dateStr);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function Equipment() {
  const { equipmentIssues, equipmentSearchQuery, setEquipmentSearchQuery, currentUser, confirmEquipment, changeEquipmentStatus, editEquipment, deleteEquipment, approveEquipment, addEquipmentIssue, addComment, highlightedItemId, setHighlightedItemId, highlightedItemIds, removeHighlightedItemId, isLoading, employees, markAsRead } = useStore();

  const userName = currentUser.name || '사용자';

  const teamMembers = useMemo(() => {
    return employees.filter(e => !e.isRetired).map(e => e.name);
  }, [employees]);
  const [activeView, setActiveView] = useState<'plan' | 'roadmap'>('plan');

  // Modal states
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Record<number, boolean>>({});

  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formRoom, setFormRoom] = useState('');
  const [formEquipName, setFormEquipName] = useState('');
  const [formCategory, setFormCategory] = useState<'의료장비 고장' | '연동프로그램' | '소모품'>('의료장비 고장');
  const [formStatus, setFormStatus] = useState('신고됨');
  const [formDate, setFormDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');

  const [selectedIssue, setSelectedIssue] = useState<EquipmentIssue | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [mounted, setMounted] = useState(false);

  const currentIssue = useMemo(() => {
    if (!selectedIssue) return null;
    return equipmentIssues.find(eq => eq.id === selectedIssue.id) || selectedIssue;
  }, [equipmentIssues, selectedIssue]);

  const [drawerWidth, setDrawerWidth] = useState(550);
  const [isDragging, setIsDragging] = useState(false);
  const [isEquipDropdownOpen, setIsEquipDropdownOpen] = useState(false);

  useEffect(() => {
    if (!isEquipDropdownOpen) return;

    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest('#equip-dropdown-container') &&
        !target.closest('input[placeholder*="의료장비명"]') &&
        !target.closest('.equip-list-toggle-btn')
      ) {
        setIsEquipDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleOutside, true);
    return () => document.removeEventListener('click', handleOutside, true);
  }, [isEquipDropdownOpen]);

  useEffect(() => {
    if (isEquipDropdownOpen) {
      const matchedIndex = getMatchedGroupIndex(currentUser.mainWorkplace, currentUser.department);
      if (matchedIndex !== -1) {
        setTimeout(() => {
          const container = document.getElementById('equip-dropdown-container');
          const element = document.getElementById(`equip-group-${matchedIndex}`);
          if (container && element) {
            container.scrollTop = Math.max(0, element.offsetTop - 8);
          }
        }, 100);
      }
    }
  }, [isEquipDropdownOpen, currentUser.mainWorkplace, currentUser.department]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isPinned || (!modalMode && !selectedIssue)) return;

    const handleClickOutside = (e: MouseEvent) => {
      const drawer = document.getElementById('equipment-drawer');
      if (drawer && drawer.contains(e.target as Node)) {
        return;
      }

      const target = e.target as HTMLElement;
      if (
        target.closest('[id^="equipment-"]') ||
        target.closest('button') ||
        target.closest('a')
      ) {
        return;
      }

      closeModal();
      setSelectedIssue(null);
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPinned, modalMode, selectedIssue]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 320;
      const maxWidth = window.innerWidth * 0.9;
      setDrawerWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  // 알림 클릭으로 진입 시 해당 항목으로 스크롤 및 댓글 모달 띄우기 처리
  useEffect(() => {
    if (highlightedItemId) {
      const issue = equipmentIssues.find(eq => eq.id === highlightedItemId);
      if (issue) {
        // 모달 띄우기
        setSelectedIssue(issue);

        // plan 뷰로 자동 전환
        setActiveView('plan');

        // 해당 카드 엘리먼트로 스크롤
        setTimeout(() => {
          const element = document.getElementById(`equipment-${highlightedItemId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 400);
      }
    }
  }, [highlightedItemId, equipmentIssues]);

  const filteredRooms = useMemo(() => noticeRooms.filter(r => r.id !== '전체'), []);

  const handleCommentSubmit = (issueId: number) => {
    if (!commentInput.trim()) return;
    const comment = {
      id: String(Date.now()),
      author: currentUser.name || '사용자',
      content: commentInput.trim(),
      date: formatDateTime(new Date()),
    };
    addComment('equipment', issueId, comment);
    setCommentInput('');
  };

  const handleCommentIconClick = (eq: EquipmentIssue, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIssue(eq);
    setModalMode(null);
    setTimeout(() => {
      const input = document.getElementById('equipment-comment-input');
      if (input) input.focus();
    }, 300);
  };

  const openCreateModal = (defaultStatus: string) => {
    setModalMode('create');
    setEditingId(null);
    setSelectedIssue(null);
    setFormTitle('');
    setFormContent('');
    setFormRoom(filteredRooms[0]?.label || '기능검사');
    setFormEquipName('');
    setFormCategory('의료장비 고장');
    setFormStatus(defaultStatus);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormEndDate('');
  };

  const openEditModal = (eq: EquipmentIssue, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setModalMode('edit');
    setEditingId(eq.id);
    setFormTitle(eq.title || '');
    setFormContent(eq.content || '');
    setFormRoom(eq.room || filteredRooms[0]?.label || '기능검사');
    setFormEquipName(eq.equipmentName || '');
    setFormCategory(eq.category || '의료장비 고장');
    setFormStatus(eq.status || '신고됨');
    setFormDate(toDateInputValue(eq.date) || new Date().toISOString().split('T')[0]);
    setFormEndDate(toDateInputValue(eq.endDate || ''));
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setIsPinned(false);
    setIsEquipDropdownOpen(false);
  };

  const combineDateWithCurrentTime = (dateStr: string) => {
    if (!dateStr) return '';
    if (dateStr.includes(' ')) return dateStr;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${dateStr} ${hh}:${mm}:${ss}`;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalDate = combineDateWithCurrentTime(formDate);
    const finalEndDate = combineDateWithCurrentTime(formEndDate);

    if (modalMode === 'create') {
      addEquipmentIssue({
        title: formTitle,
        content: formContent,
        room: formRoom,
        equipmentName: formEquipName,
        category: formCategory,
        status: formStatus,
        date: finalDate,
        endDate: finalEndDate,
        department: currentUser.department,
        mainWorkplace: currentUser.mainWorkplace || currentUser.department,
        reporter: currentUser.name,
      });
    } else if (modalMode === 'edit' && editingId !== null) {
      editEquipment(editingId, {
        title: formTitle,
        content: formContent,
        room: formRoom,
        equipmentName: formEquipName,
        category: formCategory,
        status: formStatus,
        date: finalDate,
        endDate: finalEndDate,
      });
      if (selectedIssue && selectedIssue.id === editingId) {
        setSelectedIssue(prev => prev ? { ...prev, title: formTitle, content: formContent, room: formRoom, equipmentName: formEquipName, category: formCategory, status: formStatus, date: finalDate, endDate: finalEndDate } : null);
      }
    }
    closeModal();
  };

  const filteredEquipment = useMemo(() => {
    return [...equipmentIssues].reverse().filter(eq => {
      const q = equipmentSearchQuery.trim().toLowerCase();
      if (!q) return true;

      const unconfirmedUsers = teamMembers.filter(m => !eq.confirmedUsers.includes(m));
      const hasUnconfirmedUser = unconfirmedUsers.some(name => name.toLowerCase().includes(q));
      const confirmedCount = eq.confirmedUsers.length;
      const totalCount = teamMembers.length;
      const userConfirmed = eq.confirmedUsers.includes(userName);

      let actionBtnText = "";
      if (eq.status === '신고됨') actionBtnText = "수리중 전환";
      else if (eq.status === '수리중') actionBtnText = "조치완료 전환";

      return (
        eq.room.toLowerCase().includes(q) ||
        eq.equipmentName.toLowerCase().includes(q) ||
        eq.content.toLowerCase().includes(q) ||
        (eq.category && eq.category.toLowerCase().includes(q)) ||
        (eq.status && eq.status.toLowerCase().includes(q)) ||
        (eq.date && eq.date.toLowerCase().includes(q)) ||
        (eq.title && eq.title.toLowerCase().includes(q)) ||
        (eq.reporter && eq.reporter.toLowerCase().includes(q)) ||
        (actionBtnText && actionBtnText.toLowerCase().includes(q)) ||
        (q === '확인완료' && userConfirmed) ||
        ('미확인자'.includes(q) && confirmedCount < totalCount) ||
        ('확인자'.includes(q) && confirmedCount > 0) ||
        hasUnconfirmedUser
      );
    });
  }, [equipmentIssues, equipmentSearchQuery, userName]);

  const groupedData = useMemo(() => {
    const result: Record<string, EquipmentIssue[]> = {};
    STATUS_STAGES.forEach(stage => {
      result[stage.id] = [];
    });

    filteredEquipment.forEach(eq => {
      let stageId = '할 일';
      if (['수리중'].includes(eq.status)) stageId = '진행 중';
      else if (['조치완료', '정상복구', '폐기'].includes(eq.status)) stageId = '완료';

      result[stageId].push(eq);
    });

    return result;
  }, [filteredEquipment]);

  const timelineDays = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = -15; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  const canEdit = (eq: EquipmentIssue) => currentUser.name === eq.reporter && !eq.isApproved;
  const canDelete = (eq: EquipmentIssue) => (currentUser.name === eq.reporter && !eq.isApproved) || currentUser.isManager;

  const handleDelete = (eq: EquipmentIssue, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('정말로 삭제하시겠습니까?')) {
      deleteEquipment(eq.id);
      if (editingId === eq.id) {
        setModalMode(null);
        setEditingId(null);
      }
    }
  };

  const handleApprove = (eq: EquipmentIssue, e: React.MouseEvent) => {
    e.stopPropagation();
    if (eq.isApproved) {
      if (confirm('승인을 취소하시겠습니까?')) approveEquipment(eq.id, false);
    } else {
      if (confirm('이 장비 이슈를 승인하시겠습니까?')) approveEquipment(eq.id, true);
    }
  };

  const renderCard = (eq: EquipmentIssue) => {
    let catBg = '', catText = '';
    if (eq.category === '소모품') { catBg = 'bg-green-50 border-green-200'; catText = 'text-green-700'; }
    else if (eq.category === '의료장비 고장') { catBg = 'bg-orange-50 border-orange-200'; catText = 'text-orange-700'; }
    else if (eq.category === '연동프로그램') { catBg = 'bg-blue-50 border-blue-200'; catText = 'text-blue-700'; }

    const isResolved = ['조치완료', '정상복구', '폐기'].includes(eq.status);
    const cardBorder = isResolved ? 'border-gray-200 opacity-70 bg-gray-50' : 'border-gray-200';

    const confirmCount = eq.confirmedUsers.length;
    const totalMembers = teamMembers.length;
    const userConfirmed = eq.confirmedUsers.includes(userName);
    const unconfirmedUsers = teamMembers.filter(m => !eq.confirmedUsers.includes(m));
    const unconfirmedText = unconfirmedUsers.length > 0 ? `미확인: ${unconfirmedUsers.join(', ')}` : '전원 확인 완료';

    const isHighlighted = eq.id === highlightedItemId || highlightedItemIds.includes(eq.id);
    const highlightClass = isHighlighted
      ? 'alarm-highlight shadow-md shadow-orange-100'
      : cardBorder;

    return (
      <div
        key={eq.id}
        id={`equipment-${eq.id}`}
        onMouseEnter={() => {
          if (eq.id === highlightedItemId) {
            setHighlightedItemId(null);
          }
          if (highlightedItemIds.includes(eq.id)) {
            removeHighlightedItemId(eq.id);
          }
        }}
        className={`bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${highlightClass}`}
        onClick={() => {
          setSelectedIssue(eq);
          setModalMode(null);
          if (!eq.readBy?.includes(currentUser.name)) {
            markAsRead('equipment', eq.id, currentUser.name);
          }
        }}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className={`px-2 py-0.5 rounded-md border text-xs font-bold whitespace-nowrap ${catBg} ${catText}`}>
              {eq.category}
            </span>
            {eq.isApproved && (
              <span className="px-1.5 py-0.5 rounded-md bg-green-50 text-green-600 text-[10px] font-bold whitespace-nowrap border border-green-200">✓ 승인됨</span>
            )}
            {!eq.isApproved && (
              <span className="px-1.5 py-0.5 rounded-md bg-yellow-50 text-yellow-600 text-[10px] font-bold whitespace-nowrap border border-yellow-200">대기</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 -mt-1 -mr-1">
            {canEdit(eq) && (
              <button onClick={(e) => openEditModal(eq, e)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors" title="수정">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {canDelete(eq) && (
              <button onClick={(e) => handleDelete(eq, e)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors" title="삭제">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            {currentUser.isManager && (
              <button onClick={(e) => handleApprove(eq, e)} className={`p-1.5 rounded-lg transition-colors ${eq.isApproved ? 'text-green-600 hover:text-orange-500 hover:bg-orange-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`} title={eq.isApproved ? '승인 취소' : '승인'}>
                {eq.isApproved ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1 mb-2">
          <span className="w-fit px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold whitespace-nowrap">{eq.room}</span>
          <h3 className="text-gray-900 font-bold text-sm sm:text-base leading-tight break-keep flex items-center gap-2">
            {eq.title || eq.equipmentName}
            {!eq.readBy?.includes(currentUser.name) && (
              <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]" title="새로운 이슈"></span>
            )}
          </h3>
        </div>

        <p className="text-gray-600 text-xs sm:text-sm leading-relaxed line-clamp-3 mb-3">{eq.content}</p>

        <div className="flex items-center gap-3 text-[11px] text-gray-400 font-medium mb-3">
          <span className="flex items-center gap-1 whitespace-nowrap"><Calendar className="w-3 h-3" />{eq.date}</span>
          <span className="flex items-center gap-1 whitespace-nowrap"><UserIcon className="w-3 h-3" />{eq.reporter}</span>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="relative inline-block group">
              <span className={`text-[11px] font-bold ${confirmCount === totalMembers ? 'text-green-600' : 'text-[#ff7a00]'} cursor-help border-b border-dashed border-gray-300`}>
                확인 {confirmCount}/{totalMembers}
              </span>
              <div className="hidden group-hover:block absolute bottom-full left-0 mb-1.5 px-2 py-1 bg-gray-800 text-white text-[10px] rounded shadow-lg whitespace-nowrap z-20">
                {unconfirmedText}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {!isResolved && !userConfirmed && (
                <button onClick={(e) => { e.stopPropagation(); confirmEquipment(eq.id); }} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold rounded-lg transition-colors">
                  확인
                </button>
              )}
              {eq.status === '신고됨' && (
                <button onClick={(e) => { e.stopPropagation(); changeEquipmentStatus(eq.id, '수리중'); }} className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg hover:bg-blue-100 transition-colors border border-blue-200">
                  수리중 ➔
                </button>
              )}
              {eq.status === '수리중' && (
                <button onClick={(e) => { e.stopPropagation(); changeEquipmentStatus(eq.id, '조치완료'); }} className="px-2 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-lg hover:bg-green-100 transition-colors border border-green-200">
                  조치완료 ✓
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 말풍선 인터랙션 바 */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50" onClick={e => e.stopPropagation()}>
          <button
            onClick={(e) => handleCommentIconClick(eq, e)}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-blue-500 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{eq.comments?.length || 0}</span>
          </button>
        </div>

        {/* 스레드식 답글 목록 */}
        {(eq.comments && eq.comments.length > 0) && (
          <div className="mt-4 pt-3 border-t border-gray-100/50" onClick={e => e.stopPropagation()}>
            {/* 작성자 댓글 기본 노출 */}
            {(() => {
              const authorComments = (eq.comments || []).filter(c => c.author === eq.reporter);
              const otherComments = (eq.comments || []).filter(c => c.author !== eq.reporter);
              const isExpanded = !!expandedReplies[eq.id];

              // 기본 노출할 목록: 확장 시 전체 노출, 미확장 시 작성자 댓글만 노출
              const visibleComments = isExpanded ? (eq.comments || []) : authorComments;

              return (
                <div className="space-y-3 relative pl-4 border-l-2 border-gray-100 ml-2 mt-2">
                  {visibleComments.map((c) => {
                    const isAuthorComment = c.author === eq.reporter;
                    return (
                      <div key={c.id} className="relative flex items-start gap-2.5 text-xs">
                        {/* 연결용 왼쪽 수평 브랜치 라인 */}
                        <div className="absolute -left-[18px] top-3.5 w-2.5 h-0.5 bg-gray-100" />

                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${isAuthorComment
                            ? 'bg-blue-50 text-[#004b8d] border border-blue-100'
                            : 'bg-gray-100 text-gray-600'
                          }`}>
                          {c.author[0]}
                        </div>
                        <div className="flex-1 bg-gray-50/50 p-2 rounded-xl border border-gray-100/50">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="font-bold text-gray-800 flex items-center gap-1">
                              {c.author}
                              {isAuthorComment && (
                                <span className="text-[9px] bg-blue-50 text-blue-600 px-1 rounded-md border border-blue-100">작성자</span>
                              )}
                            </span>
                            <span className="text-[9px] text-gray-400">{formatDateTime(c.date)}</span>
                          </div>
                          <p className="text-gray-700 leading-relaxed break-all">{c.content}</p>
                        </div>
                      </div>
                    );
                  })}

                  {/* 답글 보기 / 접기 버튼 */}
                  {otherComments.length > 0 && (
                    <div className="pt-1">
                      <button
                        onClick={() => setExpandedReplies(prev => ({ ...prev, [eq.id]: !prev[eq.id] }))}
                        className="text-xs font-bold text-[#004b8d] hover:text-[#003c71] flex items-center gap-1 transition-colors pl-8 relative"
                      >
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-0.5 bg-gray-100" />
                        {isExpanded ? '답글 접기' : `답글 보기 (${otherComments.length}개 더 보기)`}
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  const renderDrawerForm = () => {
    return (
      <div
        id="equipment-drawer"
        style={{ width: isPinned ? '100%' : `${drawerWidth}px`, maxWidth: '100%' }}
        className={`bg-white flex flex-col h-full ${isPinned ? 'relative border-l border-gray-200' : 'fixed top-14 bottom-0 right-0 z-50 shadow-2xl border-l border-gray-100 rounded-l-3xl'}`}
      >
        <div
          onMouseDown={handleMouseDown}
          className="absolute top-0 bottom-0 left-0 w-2.5 cursor-col-resize -translate-x-1/2 z-50 hover:bg-orange-500/25 active:bg-orange-500/40 transition-all flex items-center justify-center group"
          title="드래그하여 크기 조절"
        >
          <div className="w-1 h-8 rounded-full bg-gray-300 group-hover:bg-orange-50 group-active:bg-orange-600 transition-all opacity-0 group-hover:opacity-100" />
        </div>

        <div className="w-full flex flex-col overflow-hidden rounded-l-3xl">
          <form onSubmit={handleFormSubmit} className="w-full h-[calc(100vh-56px)] flex flex-col overflow-hidden bg-white">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-gray-900 text-lg">{modalMode === 'create' ? '장비 이슈 등록' : '장비 이슈 수정'}</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPinned(!isPinned)}
                  className={`hidden md:inline-flex p-1.5 rounded-lg transition-colors ${isPinned ? 'text-[#004b8d] bg-blue-50 hover:bg-blue-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                  title={isPinned ? '고정 해제' : '우측 고정'}
                >
                  <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
                </button>
                <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">✕</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              <div className="flex flex-wrap gap-2 mb-1 shrink-0">
                <select value={formRoom} onChange={e => setFormRoom(e.target.value)} className="px-2 py-1 bg-gray-100 rounded text-xs font-bold text-gray-600 outline-none cursor-pointer border border-transparent hover:border-gray-300 focus:border-[#004b8d] transition-colors appearance-none text-center" required>
                  {filteredRooms.map(r => (
                    <option key={r.id} value={r.label}>{r.label}</option>
                  ))}
                </select>
                <select value={formCategory} onChange={e => setFormCategory(e.target.value as any)} className="px-2 py-1 bg-orange-50 rounded text-xs font-bold text-orange-600 outline-none cursor-pointer border border-transparent hover:border-orange-300 focus:border-orange-500 transition-colors appearance-none text-center" required>
                  <option value="의료장비 고장">의료장비 고장</option>
                  <option value="연동프로그램">연동프로그램</option>
                  <option value="소모품">소모품</option>
                </select>
                <select value={formStatus} onChange={e => setFormStatus(e.target.value)} className="px-2 py-1 bg-blue-50 rounded text-xs font-bold text-blue-600 outline-none cursor-pointer border border-transparent hover:border-blue-300 focus:border-blue-500 transition-colors appearance-none text-center" required>
                  <option value="신고됨">할 일 (신고됨)</option>
                  <option value="수리중">진행 중 (수리중)</option>
                  <option value="조치완료">조치완료</option>
                  <option value="정상복구">정상복구</option>
                  <option value="폐기">폐기</option>
                </select>
              </div>

              <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="이슈 제목을 입력하세요" className="w-full text-lg font-bold text-gray-900 border-b border-dashed border-gray-200 hover:border-gray-300 focus:border-[#004b8d] outline-none bg-transparent placeholder-gray-300 transition-colors py-1 shrink-0" required />

              <div className="relative mb-2 shrink-0">
                <div className="flex items-center justify-between gap-2 border-b border-dashed border-gray-200 hover:border-gray-300 focus-within:border-[#004b8d] transition-colors py-1">
                  <input
                    type="text"
                    value={formEquipName}
                    onChange={e => setFormEquipName(e.target.value)}
                    onFocus={() => setIsEquipDropdownOpen(true)}
                    placeholder="의료장비명 (예: 초음파 기기 1번)"
                    className="flex-1 text-sm text-gray-900 outline-none bg-transparent placeholder-gray-300"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setIsEquipDropdownOpen(!isEquipDropdownOpen)}
                    className="equip-list-toggle-btn px-2 py-0.5 text-[11px] bg-gray-100 hover:bg-[#004b8d]/10 hover:text-[#004b8d] rounded-md text-gray-600 transition-colors font-bold whitespace-nowrap"
                  >
                    {isEquipDropdownOpen ? '닫기' : '선택'}
                  </button>
                </div>

                {isEquipDropdownOpen && (
                  <div
                    id="equip-dropdown-container"
                    className="absolute left-0 right-0 mt-1 max-h-[240px] overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-2 custom-scrollbar"
                  >
                    {EQUIPMENT_GROUPS.map((group, gIdx) => (
                      <div key={group.groupName} id={`equip-group-${gIdx}`} className="mb-3 last:mb-0">
                        <div className="text-[10px] font-bold text-gray-400 px-2 py-1 bg-gray-50 rounded-md mb-1 flex items-center justify-between">
                          <span>{group.groupName}</span>
                          {getMatchedGroupIndex(currentUser.mainWorkplace, currentUser.department) === gIdx && (
                            <span className="text-[9px] bg-blue-50 text-[#004b8d] px-1 rounded font-bold border border-blue-100/50">내 근무지</span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 px-1">
                          {group.equipments.map(eq => (
                            <button
                              key={eq}
                              type="button"
                              onClick={() => {
                                setFormEquipName(eq);
                                setFormRoom(group.roomLabel);
                                setIsEquipDropdownOpen(false);
                              }}
                              className={`text-left text-xs px-2 py-1 rounded-md transition-colors truncate ${formEquipName === eq
                                  ? 'bg-blue-50 text-[#004b8d] font-bold'
                                  : 'text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                              {eq}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <textarea value={formContent} onChange={e => setFormContent(e.target.value)} placeholder="자세한 내용이나 증상을 기록합니다..." className="w-full flex-1 bg-gray-50 p-4 rounded-xl text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border border-gray-100 hover:border-gray-200 focus:border-[#004b8d] focus:bg-white outline-none resize-none placeholder-gray-400 transition-all shadow-inner min-h-[140px]" required />

              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500 font-medium bg-gray-50/50 p-2.5 rounded-xl border border-gray-50 shrink-0">
                <span className="flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5 text-gray-400" />{modalMode === 'create' ? currentUser.name : (selectedIssue?.reporter || currentUser.name)}</span>
                <label className="flex items-center gap-1.5 cursor-pointer group">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#004b8d] transition-colors" />
                  <span className="text-gray-400 group-hover:text-[#004b8d] transition-colors">신고일:</span>
                  <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="bg-transparent border-b border-dashed border-gray-300 hover:border-[#004b8d] focus:border-[#004b8d] outline-none text-gray-700 font-medium cursor-pointer transition-colors" required />
                </label>
                <label className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-100 cursor-pointer hover:bg-green-100 transition-colors">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>종료일:</span>
                  <input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} className="bg-transparent border-b border-dashed border-green-300 hover:border-green-600 focus:border-green-600 outline-none text-green-700 font-bold cursor-pointer transition-colors" />
                </label>
              </div>
            </div>

            {/* 3. 최하단 고정 버튼 영역 */}
            <div className="px-5 py-3 border-t border-gray-100 bg-white flex justify-end gap-2.5 shrink-0">
              <button type="button" onClick={closeModal} className="h-9 px-4 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">취소</button>
              <button type="submit" className="h-9 px-4 text-sm font-bold text-white bg-[#004b8d] rounded-xl hover:bg-[#003c71] transition-all shadow-md">{modalMode === 'create' ? '새 글 등록' : '수정 완료'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderDetailDrawer = () => {
    if (!currentIssue) return null;
    return (
      <div
        id="equipment-drawer"
        style={{ width: isPinned ? '100%' : `${drawerWidth}px`, maxWidth: '100%' }}
        className={`bg-white flex flex-col h-full ${isPinned ? 'relative border-l border-gray-200' : 'fixed top-14 bottom-0 right-0 z-50 shadow-2xl border-l border-gray-100 rounded-l-3xl'}`}
      >
        <div
          onMouseDown={handleMouseDown}
          className="absolute top-0 bottom-0 left-0 w-2.5 cursor-col-resize -translate-x-1/2 z-50 hover:bg-orange-500/25 active:bg-orange-500/40 transition-all flex items-center justify-center group"
          title="드래그하여 크기 조절"
        >
          <div className="w-1 h-8 rounded-full bg-gray-300 group-hover:bg-orange-50 group-active:bg-orange-600 transition-all opacity-0 group-hover:opacity-100" />
        </div>

        <div className="w-full flex flex-col overflow-hidden rounded-l-3xl">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
            <h3 className="font-bold text-gray-900 text-lg">장비 이슈 상세</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPinned(!isPinned)}
                className={`hidden md:inline-flex p-1.5 rounded-lg transition-colors ${isPinned ? 'text-[#004b8d] bg-blue-50 hover:bg-blue-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                title={isPinned ? '고정 해제' : '우측 고정'}
              >
                <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
              </button>
              {canEdit(currentIssue) && (
                <button onClick={() => { openEditModal(currentIssue); }} className="text-gray-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-50">
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setSelectedIssue(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100">✕</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            <div className="flex gap-2 mb-1">
              <span className="px-2 py-1 bg-gray-100 rounded text-sm font-bold text-gray-600">{currentIssue.room}</span>
              <span className="px-2 py-1 bg-orange-50 rounded text-sm font-bold text-orange-600">{currentIssue.category}</span>
              <span className="px-2 py-1 bg-blue-50 rounded text-sm font-bold text-blue-600">{currentIssue.status}</span>
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-1">{currentIssue.title || currentIssue.equipmentName}</h4>
            <p className="text-base text-gray-500 mb-2">{currentIssue.equipmentName}</p>
            <div className="bg-gray-50 p-4 rounded-xl text-lg text-gray-700 whitespace-pre-wrap leading-relaxed border border-gray-100 min-h-[140px]">
              {currentIssue.content}
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-base text-gray-500 font-medium bg-gray-50/50 p-3 rounded-xl border border-gray-50">
              <span className="flex items-center gap-1.5"><UserIcon className="w-4 h-4 text-gray-400" />{currentIssue.reporter}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-gray-400" />{formatDateTime(currentIssue.date)}</span>
              {currentIssue.endDate && <span className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-0.5 rounded-md"><Calendar className="w-4 h-4" />종료: {formatDateTime(currentIssue.endDate)}</span>}
            </div>

            <div className="border-t border-gray-100 pt-4 mt-2">
              <h5 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-lg">
                <span>댓글</span>
                <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-sm">{currentIssue.comments?.length || 0}</span>
              </h5>
              <div className="space-y-3 mb-3 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
                {currentIssue.comments?.map(c => (
                  <div key={c.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500 font-bold">{c.author[0]}</div>
                        {c.author}
                      </span>
                      <span className="text-xs text-gray-400">{formatDateTime(c.date)}</span>
                    </div>
                    <p className="text-base text-gray-700 leading-relaxed pl-7.5">{c.content}</p>
                  </div>
                ))}
                {(!currentIssue.comments || currentIssue.comments.length === 0) && (
                  <div className="text-center py-4 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                    <p className="text-base text-gray-400">등록된 댓글이 없습니다.<br />첫 댓글을 남겨보세요!</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="equipment-comment-input"
                  value={commentInput}
                  onChange={e => setCommentInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      handleCommentSubmit(currentIssue.id);
                    }
                  }}
                  placeholder="댓글을 입력하세요..."
                  className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-base focus:border-[#004b8d] focus:ring-2 focus:ring-[#004b8d]/20 outline-none transition-all bg-gray-50 focus:bg-white"
                />
                <button
                  onClick={() => handleCommentSubmit(currentIssue.id)}
                  className="px-5 py-2.5 bg-[#004b8d] text-white text-base font-bold rounded-xl hover:bg-[#003c71] transition-all shadow-md active:scale-95 whitespace-nowrap"
                >
                  등록
                </button>
              </div>
            </div>
          </div>

          {/* 3. 최하단 고정 버튼 영역 */}
          <div className="px-5 py-3 border-t border-gray-100 bg-white flex justify-end gap-2.5 shrink-0">
            <button type="button" onClick={() => setSelectedIssue(null)} className="h-9 px-4 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">닫기</button>
          </div>
        </div>
      </div>
    );
  };

  const isPinnedActive = isPinned && (modalMode !== null || selectedIssue !== null);

  return (
    <div className={`fade-enter flex ${isPinnedActive
        ? activeView === 'roadmap'
          ? 'w-full max-w-none mx-0 p-0 flex-row h-[calc(100vh-56px)] md:h-[calc(100vh-56px)]'
          : 'w-full max-w-none mx-0 pl-4 sm:pl-6 pr-0 py-0 flex-row gap-6 h-[calc(100vh-56px)] md:h-[calc(100vh-56px)]'
        : activeView === 'roadmap'
          ? 'w-full max-w-none mx-0 p-0 flex-col h-[calc(100vh-56px)] md:h-[calc(100vh-56px)]'
          : 'w-full p-4 sm:p-6 max-w-[1400px] mx-auto flex-col h-[calc(100vh-60px)] md:h-[calc(100vh-88px)]'
      }`}>
      <div className={`flex-1 min-w-0 flex flex-col h-full ${isPinnedActive && activeView !== 'roadmap' ? 'py-4 sm:py-6' : ''}`}>
        <div className={activeView === 'roadmap' ? 'px-4 sm:px-6 pt-4 sm:pt-6' : ''}>
          <EquipmentHeader
            activeView={activeView}
            setActiveView={setActiveView}
            searchQuery={equipmentSearchQuery}
            setSearchQuery={setEquipmentSearchQuery}
            filteredCount={filteredEquipment.length}
            onViewChange={() => setModalMode(null)}
          />
        </div>

        <div className="flex-1 min-h-0 relative">
          {activeView === 'plan' ? (
            <div className="flex gap-4 overflow-x-auto h-full pb-4 snap-x snap-mandatory">
              {STATUS_STAGES.map(stage => {
                const issues = groupedData[stage.id] || [];
                return (
                  <div key={stage.id} className="min-w-[360px] sm:min-w-[400px] w-[420px] max-w-[90vw] flex-shrink-0 flex flex-col bg-gray-50/50 rounded-2xl border border-gray-100 p-3 h-full snap-center">
                    <div className="flex items-center justify-between px-2 py-2 mb-2 shrink-0 group">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        {stage.title}
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">
                          {issues.length}
                        </span>
                      </h3>
                      <button
                        onClick={() => openCreateModal(stage.defaultStatus)}
                        className="p-1.5 rounded-lg bg-gray-200/50 hover:bg-[#004b8d] text-gray-500 hover:text-white transition-colors"
                        title="새 글 작성"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                      {isLoading ? (
                        <div className="flex flex-col gap-3">
                          {Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-pulse space-y-3">
                              <div className="w-1/3 h-4 bg-gray-200 rounded" />
                              <div className="w-full h-3 bg-gray-100 rounded" />
                              <div className="w-5/6 h-3 bg-gray-100 rounded" />
                              <div className="flex gap-2 pt-1">
                                <div className="w-12 h-3 bg-gray-100 rounded" />
                                <div className="w-16 h-3 bg-gray-100 rounded" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : issues.length > 0 ? (
                        <div className="flex flex-col gap-3">
                          {issues.map(renderCard)}
                        </div>
                      ) : (
                        <div className="h-24 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-xs font-bold text-gray-400 bg-white/50">
                          이슈 없음
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`h-full bg-white flex flex-col overflow-hidden ${activeView === 'roadmap'
                ? 'border-t border-gray-200 rounded-none'
                : isPinnedActive
                  ? 'border border-gray-200 rounded-2xl shadow-sm'
                  : 'border-t border-gray-200 rounded-none'
              }`}>
              <div className="overflow-auto flex-1 custom-scrollbar relative">
                <div className="min-w-max">
                  <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-30">
                    <div className="w-[280px] shrink-0 sticky left-0 bg-gray-50 z-40 border-r border-gray-200 p-3 font-bold text-gray-700 flex items-center">
                      계층 구조 목록
                    </div>
                    <div className="flex">
                      {timelineDays.map(d => {
                        const todayStr = mounted ? dayjs().tz('Asia/Seoul').format('YYYY-MM-DD') : '';
                        const isToday = todayStr ? dayjs(d).tz('Asia/Seoul').format('YYYY-MM-DD') === todayStr : false;
                        return (
                          <div key={d.toISOString()} className={`w-12 shrink-0 border-r border-gray-100 p-2 flex flex-col items-center justify-center ${isToday ? 'bg-[#004b8d]/10' : ''}`}>
                            <span className={`text-[10px] font-bold uppercase ${isToday ? 'text-[#004b8d]' : 'text-gray-400'}`}>
                              {d.toLocaleDateString('en-US', { weekday: 'short' })}
                            </span>
                            <span className={`text-sm font-bold ${isToday ? 'text-[#004b8d]' : 'text-gray-700'}`}>
                              {d.getDate()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {STATUS_STAGES.map(stage => {
                    const issues = groupedData[stage.id] || [];
                    return (
                      <div key={stage.id}>
                        <div className="flex bg-gray-50/60 border-b border-gray-200">
                          <div className="w-[280px] shrink-0 sticky left-0 bg-gray-50/90 z-20 border-r border-gray-200 p-2 pl-4 font-bold text-gray-800 text-sm flex items-center">
                            {stage.title}
                            <span className="ml-2 px-1.5 py-0.5 bg-gray-200 text-gray-600 text-[10px] rounded-full">
                              {issues.length}
                            </span>
                          </div>
                          <div className="flex">
                            {timelineDays.map(d => <div key={d.toISOString()} className="w-12 shrink-0 border-r border-gray-100" />)}
                          </div>
                        </div>

                        {issues.length > 0 ? (
                          issues.map(eq => {
                            const eqDate = parseCustomDate(eq.date);

                            let duration = 3;
                            let barColor = 'bg-[#ff7a00]';
                            if (stage.id === '진행 중') { duration = 5; barColor = 'bg-[#004b8d]'; }
                            if (stage.id === '완료') { duration = 1; barColor = 'bg-gray-400'; }

                            const startIndex = timelineDays.findIndex(d =>
                              d.getFullYear() === eqDate.getFullYear() &&
                              d.getMonth() === eqDate.getMonth() &&
                              d.getDate() === eqDate.getDate()
                            );

                            return (
                              <div key={eq.id} className="flex border-b border-gray-50 bg-white group relative hover:bg-gray-50/50 transition-colors">
                                <div className="w-[280px] shrink-0 sticky left-0 bg-white group-hover:bg-gray-50/50 z-20 border-r border-gray-200 p-2 pl-8 flex flex-col justify-center gap-0.5 overflow-hidden">
                                  <span className="text-xs font-bold text-gray-800 truncate" title={eq.equipmentName}>{eq.equipmentName}</span>
                                  <span className="text-[10px] text-gray-500 truncate">{eq.room} • {eq.reporter}</span>
                                </div>
                                <div className="flex relative">
                                  {timelineDays.map(d => {
                                    const todayStr = mounted ? dayjs().tz('Asia/Seoul').format('YYYY-MM-DD') : '';
                                    const isToday = todayStr ? dayjs(d).tz('Asia/Seoul').format('YYYY-MM-DD') === todayStr : false;
                                    return <div key={d.toISOString()} className={`w-12 shrink-0 border-r border-gray-50 ${isToday ? 'bg-[#004b8d]/5 border-l border-r border-l-[#004b8d]/20 border-r-[#004b8d]/20' : ''}`} />;
                                  })}

                                  {startIndex !== -1 && (
                                    <div
                                      className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-full shadow-sm flex items-center px-3 ${barColor} text-white text-[10px] font-bold whitespace-nowrap overflow-hidden transition-all hover:brightness-110 cursor-pointer z-10 opacity-90 hover:opacity-100`}
                                      style={{
                                        left: `${startIndex * 48 + 4}px`,
                                        width: `${duration * 48 - 8}px`,
                                        maxWidth: `${Math.max(40, (timelineDays.length - startIndex) * 48 - 8)}px`
                                      }}
                                      title={`${eq.equipmentName} (${eq.date})`}
                                      onClick={(e) => openEditModal(eq, e)}
                                    >
                                      {duration > 1 ? eq.reporter : ''}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="flex border-b border-gray-50 bg-white">
                            <div className="w-[280px] shrink-0 sticky left-0 bg-white z-20 border-r border-gray-200 p-2 pl-8 flex items-center text-xs text-gray-400 italic">
                              등록된 이슈가 없습니다.
                            </div>
                            <div className="flex">
                              {timelineDays.map(d => {
                                const todayStr = mounted ? dayjs().tz('Asia/Seoul').format('YYYY-MM-DD') : '';
                                const isToday = todayStr ? dayjs(d).tz('Asia/Seoul').format('YYYY-MM-DD') === todayStr : false;
                                return <div key={d.toISOString()} className={`w-12 shrink-0 border-r border-gray-50 ${isToday ? 'bg-[#004b8d]/5' : ''}`} />;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isPinned && (modalMode || selectedIssue) && (
        <div style={{ width: `${drawerWidth}px`, minWidth: '320px', maxWidth: '50%' }} className="shrink-0 h-full hidden md:block">
          {modalMode ? renderDrawerForm() : renderDetailDrawer()}
        </div>
      )}

      {mounted && modalMode && !isPinned && createPortal(
        renderDrawerForm(),
        document.body
      )}

      {mounted && selectedIssue && !modalMode && !isPinned && createPortal(
        renderDetailDrawer(),
        document.body
      )}
    </div>
  );
}
