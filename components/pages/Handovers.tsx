import { useStore } from '@/store/useStore';
import { Search, ArrowRight, Pencil, Trash2, Plus, Pin, ChevronDown, AlertCircle, Heart, MessageCircle } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Handover } from '@/lib/dummyData';
import { createPortal } from 'react-dom';
import { formatDateTime, getDeptColor } from '@/lib/utils';

export default function Handovers() {
  const {
    handovers, handoverSearchQuery, setHandoverSearchQuery, signHandover,
    currentUser, addHandover, editHandover, deleteHandover, approveHandover,
    highlightedItemId, setHighlightedItemId, highlightedItemIds, removeHighlightedItemId,
    employees, currentDepartment, workplaces, currentRoom, setCurrentRoom,
    handoverDrawerMode, selectedHandover, setHandoverDrawerMode,
    addComment, isLoading, markAsRead
  } = useStore();

  const [mounted, setMounted] = useState(false);
  const [empIds, setEmpIds] = useState<Record<number, string>>({});

  // Alias for selectedHandover
  const currentHandover = selectedHandover;

  // Drawer states
  const [isPinned, setIsPinned] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(500);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Record<number, boolean>>({});
  const [commentInput, setCommentInput] = useState('');

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formReceiver, setFormReceiver] = useState('');


  const activeManagers = useMemo(() => {
    return (employees || []).filter(e => e.isManager && !e.isRetired);
  }, [employees]);

  const activeEmployees = useMemo(() => {
    return (employees || []).filter(e => !e.isRetired).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [employees]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update form states when drawer opens
  useEffect(() => {
    if (handoverDrawerMode === 'create') {
      setFormTitle('');
      setFormContent('');
      setFormReceiver('');
    } else if (handoverDrawerMode === 'edit' && currentHandover) {
      setFormTitle(currentHandover.title || '');
      setFormContent(currentHandover.content);
      setFormReceiver(currentHandover.receiver);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoverDrawerMode]);

  // Handle click outside to close drawer
  useEffect(() => {
    if (isPinned || !handoverDrawerMode) return;

    const handleClickOutside = (e: MouseEvent) => {
      const drawer = document.getElementById('handover-drawer');
      if (drawer && drawer.contains(e.target as Node)) {
        return;
      }

      const target = e.target as HTMLElement;
      if (
        target.closest('[id^="handover-"]') ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('.plus-btn')
      ) {
        return;
      }

      setHandoverDrawerMode(null);
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPinned, handoverDrawerMode, setHandoverDrawerMode]);

  // Handle Dragging
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

  const getApprovalState = (h: Handover) => {
    const isApprovedStr = String(h.isApproved || '').trim();
    if (isApprovedStr.toUpperCase() === 'TRUE') {
      return {
        approvedNames: activeManagers.map(m => m.name),
        isFullyApproved: true,
        count: activeManagers.length,
        total: activeManagers.length
      };
    }
    const approvedNames = isApprovedStr ? isApprovedStr.split(',').map(x => x.trim()).filter(Boolean) : [];
    const isFullyApproved = activeManagers.length > 0 && activeManagers.every(m => approvedNames.includes(m.name));
    return {
      approvedNames,
      isFullyApproved,
      count: approvedNames.length,
      total: activeManagers.length
    };
  };

  useEffect(() => {
    if (highlightedItemId) {
      const element = document.getElementById(`handover-${highlightedItemId}`);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    }
  }, [highlightedItemId, handovers]);

  const filteredHandovers = useMemo(() => {
    return [...handovers].reverse().filter(h => {
      // 근무지 필터링
      if (currentRoom !== '전체' && currentRoom !== 'All') {
        const selectedWorkplace = workplaces.find(w => w.id === currentRoom);
        if (selectedWorkplace) {
          if (!h.mainWorkplace || h.mainWorkplace !== selectedWorkplace.name) {
            return false;
          }
        }
      }

      const q = handoverSearchQuery.trim().toLowerCase();
      if (!q) return true;

      return (
        (h.mainWorkplace || '').toLowerCase().includes(q) ||
        h.sender.toLowerCase().includes(q) ||
        h.content.toLowerCase().includes(q) ||
        (h.isSigned && '서명 완료'.includes(q)) ||
        (h.isSigned && h.signedEmpId && String(h.signedEmpId).toLowerCase().includes(q)) ||
        (h.isSigned && h.signedAt && String(h.signedAt).toLowerCase().includes(q))
      );
    });
  }, [handovers, handoverSearchQuery, currentUser, currentRoom, workplaces]);

  const columns = useMemo(() => {
    return [
      { id: 'sign_pending', title: '서명 전', description: '인계 대상자의 서명을 대기 중입니다.' },
      { id: 'completed', title: '서명완료', description: '서명이 완료된 인수인계입니다.' }
    ];
  }, []);

  const groupedHandovers = useMemo(() => {
    const result: Record<string, Handover[]> = {
      sign_pending: [],
      completed: []
    };

    filteredHandovers.forEach(h => {
      if (!h.isSigned) {
        result.sign_pending.push(h);
      } else {
        result.completed.push(h);
      }
    });

    return result;
  }, [filteredHandovers]);

  const canEdit = (h: Handover) => {
    return currentUser.name === h.sender && !h.isSigned;
  };

  const canDelete = (h: Handover) => {
    return (currentUser.name === h.sender && !h.isSigned) || currentUser.isManager;
  };

  const handleDelete = (h: Handover, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('정말로 삭제하시겠습니까?')) {
      deleteHandover(h.id);
      if (selectedHandover?.id === h.id) {
        setHandoverDrawerMode(null);
      }
    }
  };

  const handleCommentSubmit = (handoverId: number) => {
    if (!commentInput.trim()) return;
    const comment = {
      id: String(Date.now()),
      author: currentUser.name || '사용자',
      content: commentInput.trim(),
      date: formatDateTime(new Date()),
    };
    addComment('handover', handoverId, comment);
    setCommentInput('');
  };

  const handleCommentIconClick = (h: Handover, e: React.MouseEvent) => {
    e.stopPropagation();
    setHandoverDrawerMode('edit', h);
    setTimeout(() => {
      const input = document.getElementById('handover-comment-input');
      if (input) input.focus();
    }, 300);
  };

  const handleApprove = (h: Handover, e: React.MouseEvent) => {
    e.stopPropagation();
    const { approvedNames } = getApprovalState(h);
    const hasApproved = approvedNames.includes(currentUser.name);

    let newApprovedNames: string[];
    if (hasApproved) {
      if (!confirm('승인을 취소하시겠습니까?')) return;
      newApprovedNames = approvedNames.filter(name => name !== currentUser.name);
    } else {
      if (!confirm('이 인수인계를 승인하시겠습니까?')) return;
      newApprovedNames = [...approvedNames, currentUser.name];
    }

    approveHandover(h.id, newApprovedNames.join(', '));
  };

  const handleDrawerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (handoverDrawerMode === 'create') {
      addHandover({
        sender: currentUser.name || '사용자',
        receiver: formReceiver || '대상자 미지정',
        content: formContent,
        date: formatDateTime(new Date()),
        isSigned: false,
        signedEmpId: '',
        signedAt: '',
        title: formTitle || '제목 없음',
        mainWorkplace: currentUser.mainWorkplace || currentUser.department || '기능검사실'
      });
    } else if (handoverDrawerMode === 'edit' && selectedHandover) {
      editHandover(selectedHandover.id, {
        title: formTitle,
        content: formContent,
        receiver: formReceiver
      });
    }
    setHandoverDrawerMode(null);
  };

  const isFormEditable = handoverDrawerMode === 'create' || (currentHandover && canEdit(currentHandover));

  const renderDrawer = () => {
    if (!handoverDrawerMode) return null;

    return (
      <div
        id="handover-drawer"
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
          <form onSubmit={handleDrawerSubmit} className="w-full h-[calc(100vh-56px)] flex flex-col overflow-hidden bg-white">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-gray-900 text-lg">
                {handoverDrawerMode === 'create' ? '새 인수인계 등록' : (isFormEditable ? '인수인계 수정' : '인수인계 상세')}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPinned(!isPinned)}
                  className={`hidden md:inline-flex p-1.5 rounded-lg transition-colors ${isPinned ? 'text-[#004b8d] bg-blue-50 hover:bg-blue-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                  title={isPinned ? '고정 해제' : '우측 고정'}
                >
                  <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
                </button>
                <button type="button" onClick={() => setHandoverDrawerMode(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100">✕</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              <div className="space-y-1.5 shrink-0">
                <label className="block text-xs font-bold text-gray-400">제목</label>
                {isFormEditable ? (
                  <input
                    type="text"
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    placeholder="예: 야간 당직 특이사항"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#004b8d] focus:bg-white focus:ring-4 focus:ring-[#004b8d]/10 transition-all outline-none text-base font-medium"
                    required
                  />
                ) : (
                  <div className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-base font-medium text-gray-900">
                    {formTitle}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 flex flex-col min-w-0">
                <label className="block text-xs font-bold text-gray-400">인수자 이름</label>
                <div className="relative">
                  <select
                    required
                    value={formReceiver}
                    onChange={e => setFormReceiver(e.target.value)}
                    disabled={!isFormEditable}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#004b8d] focus:bg-white focus:ring-4 focus:ring-[#004b8d]/10 transition-all outline-none text-sm font-medium appearance-none cursor-pointer disabled:opacity-80 pr-8"
                  >
                    <option value="" disabled>직원 선택</option>
                    {activeEmployees.map(emp => (
                      <option key={emp.empId} value={emp.name}>
                        {emp.name} {emp.mainWorkplace || emp.department}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5 flex flex-col flex-1 min-h-0 w-full">
                <label className="block text-xs font-bold text-gray-400 shrink-0">내용</label>
                {isFormEditable ? (
                  <textarea
                    value={formContent}
                    onChange={e => setFormContent(e.target.value)}
                    placeholder="인계할 내용을 상세히 적어주세요..."
                    className="w-full flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#004b8d] focus:bg-white focus:ring-4 focus:ring-[#004b8d]/10 transition-all outline-none resize-none text-base font-medium leading-relaxed min-h-[160px]"
                    required
                  />
                ) : (
                  <div className="w-full flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base font-medium text-gray-700 leading-relaxed min-h-[160px] whitespace-pre-wrap overflow-y-auto">
                    {formContent}
                  </div>
                )}
              </div>

              {isFormEditable && (
                <div className="bg-[#ff7a00]/5 rounded-xl p-3 text-base text-[#cc6200] border border-[#ff7a00]/10 flex gap-2 shrink-0">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="font-bold">등록 후 대상자가 직접 서명하여 확인해야 합니다.</p>
                </div>
              )}

              {/* 원래 폼 전송 버튼 제거 (최하단 고정바로 이동) */}

              {handoverDrawerMode === 'edit' && currentHandover && (
                <div className="border-t border-gray-100 pt-4 mt-2 shrink-0">
                  <h5 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-lg">
                    <span>댓글</span>
                    <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-sm">
                      {currentHandover.comments?.length || 0}
                    </span>
                  </h5>
                  <div className="space-y-3 mb-3 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
                    {currentHandover.comments?.map(c => (
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
                    {(!currentHandover.comments || currentHandover.comments.length === 0) && (
                      <div className="text-center py-4 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                        <p className="text-base text-gray-400">등록된 댓글이 없습니다.<br />첫 댓글을 남겨보세요!</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="handover-comment-input"
                      value={commentInput}
                      onChange={e => setCommentInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          handleCommentSubmit(currentHandover.id);
                        }
                      }}
                      placeholder="댓글을 입력하세요..."
                      className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-base focus:border-[#004b8d] focus:ring-2 focus:ring-[#004b8d]/20 outline-none transition-all bg-gray-50 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleCommentSubmit(currentHandover.id)}
                      className="px-5 py-2.5 bg-[#004b8d] text-white text-base font-bold rounded-xl hover:bg-[#003c71] transition-all shadow-md active:scale-95 whitespace-nowrap"
                    >
                      등록
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. 최하단 고정 버튼 영역 */}
            <div className="px-5 py-3 border-t border-gray-100 bg-white flex justify-end gap-2.5 shrink-0">
              {isFormEditable ? (
                <>
                  <button type="button" onClick={() => setHandoverDrawerMode(null)} className="h-9 px-4 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">취소</button>
                  <button type="submit" className="h-9 px-4 text-sm font-bold text-white bg-[#004b8d] rounded-xl hover:bg-[#003c71] transition-all shadow-md">
                    {handoverDrawerMode === 'create' ? '등록하기' : '수정 완료'}
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setHandoverDrawerMode(null)} className="h-9 px-4 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">닫기</button>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderCard = (h: Handover) => {
    const isHighlighted = h.id === highlightedItemId || highlightedItemIds.includes(h.id);
    const borderClass = h.isSigned ? "border-gray-200" : "border-orange-300 border-[1.5px]";

    return (
      <div
        key={h.id}
        id={`handover-${h.id}`}
        onClick={() => {
          setHandoverDrawerMode('edit', h);
          if (!h.readBy?.includes(currentUser.name)) {
            markAsRead('handover', h.id, currentUser.name);
          }
        }}
        onMouseEnter={() => {
          if (h.id === highlightedItemId) setHighlightedItemId(null);
          if (highlightedItemIds.includes(h.id)) removeHighlightedItemId(h.id);
        }}
        className={`bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all border cursor-pointer ${borderClass}`}
      >
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`px-2 py-0.5 rounded-md text-xs font-bold whitespace-nowrap border ${getDeptColor(h.mainWorkplace || '')}`}>{h.mainWorkplace || '미분류'}</span>
            <div className="text-xs text-gray-400 font-medium whitespace-nowrap">{h.date}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canDelete(h) && (
              <button onClick={(e) => handleDelete(h, e)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors" title="삭제">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-800">
          <span className="px-2 py-1 bg-gray-100 rounded-md">인계: {h.sender}</span>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <span className="px-2 py-1 bg-blue-50 text-primary-700 rounded-md">인수: {h.receiver}</span>
        </div>

        {h.title && (
          <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
            {h.title}
            {!h.readBy?.includes(currentUser.name) && (
              <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]" title="새로운 인수인계"></span>
            )}
          </h3>
        )}
        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line break-all mb-4">{h.content}</p>

        {h.isSigned ? (
          <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-xl text-center text-xs sm:text-sm text-gray-500 font-bold" onClick={(e) => e.stopPropagation()}>
            🟢 서명 완료 (확인자: {h.signedEmpId} / 일시: {h.signedAt})
          </div>
        ) : (
          <div className="mt-2 pt-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs sm:text-sm text-gray-600 font-medium mb-2 text-center">"위 인계 사항을 모두 숙지하였으며, 이에 서명합니다."</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="이름 입력"
                maxLength={20}
                value={empIds[h.id] || ''}
                onChange={(e) => setEmpIds(prev => ({ ...prev, [h.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const inputName = empIds[h.id]?.trim();
                    if (!inputName) return;
                    if (currentUser.name !== h.receiver) {
                      alert("지정된 인수자 본인만 서명할 수 있습니다.");
                      return;
                    }
                    if (inputName !== currentUser.name) {
                      alert("로그인한 본인의 이름을 정확히 입력해 주세요.");
                      return;
                    }
                    signHandover(h.id, inputName);
                  }
                }}
                className="flex-1 min-w-0 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-all text-center"
              />
              <button
                onClick={() => {
                  const inputName = empIds[h.id]?.trim();
                  if (!inputName) return;
                  if (currentUser.name !== h.receiver) {
                    alert("지정된 인수자 본인만 서명할 수 있습니다.");
                    return;
                  }
                  if (inputName !== currentUser.name) {
                    alert("로그인한 본인의 이름을 정확히 입력해 주세요.");
                    return;
                  }
                  signHandover(h.id, inputName);
                }}
                className="px-3 sm:px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white font-bold text-xs sm:text-sm rounded-lg transition-colors shadow-sm whitespace-nowrap shrink-0"
              >
                서명하기
              </button>
            </div>
          </div>
        )}

        {/* 말풍선 인터랙션 바 */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50" onClick={e => e.stopPropagation()}>
          <button
            onClick={(e) => handleCommentIconClick(h, e)}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-blue-500 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{h.comments?.length || 0}</span>
          </button>
        </div>

        {/* 스레드식 답글 목록 */}
        {(h.comments && h.comments.length > 0) && (
          <div className="mt-4 pt-3 border-t border-gray-100/50" onClick={e => e.stopPropagation()}>
            {/* 작성자 댓글 기본 노출 */}
            {(() => {
              const authorComments = (h.comments || []).filter(c => c.author === h.sender);
              const otherComments = (h.comments || []).filter(c => c.author !== h.sender);
              const isExpanded = !!expandedReplies[h.id];

              // 기본 노출할 목록: 확장 시 전체 노출, 미확장 시 작성자 댓글만 노출
              const visibleComments = isExpanded ? (h.comments || []) : authorComments;

              return (
                <div className="space-y-3 relative pl-4 border-l-2 border-gray-100 ml-2 mt-2">
                  {visibleComments.map((c) => {
                    const isAuthorComment = c.author === h.sender;
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
                        onClick={() => setExpandedReplies(prev => ({ ...prev, [h.id]: !prev[h.id] }))}
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

  const isPinnedActive = isPinned && handoverDrawerMode !== null;

  return (
    <div className={`fade-enter flex ${isPinnedActive
        ? 'w-full max-w-none mx-0 pl-4 sm:pl-6 pr-0 py-0 flex-row gap-6 h-[calc(100vh-60px)] md:h-[calc(100vh-56px)]'
        : 'p-4 sm:p-6 h-[calc(100vh-60px)] md:h-[calc(100vh-88px)] flex-col max-w-[1400px] mx-auto w-full'
      }`}>

      <div className={`flex-1 min-w-0 flex flex-col ${isPinnedActive ? 'py-4 sm:py-6' : ''}`}>
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 whitespace-nowrap">인수인계 내역</h2>
          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full whitespace-nowrap">
            총 {filteredHandovers.length}건
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex gap-1 pb-1">
              <button onClick={() => setCurrentRoom('전체')} className={`relative flex-1 flex items-center justify-center py-1.5 px-2 rounded-lg border transition-all cursor-pointer text-center overflow-hidden ${currentRoom === '전체'
                  ? "border-accent-500 bg-accent-50 shadow-sm shadow-orange-100/50"
                  : "border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 shadow-sm"
                }`}>
                <span className={`text-xs sm:text-sm font-bold truncate leading-tight ${currentRoom === '전체'
                    ? "text-accent-600"
                    : "text-gray-600"
                  }`}>전체</span>
              </button>
              {workplaces.filter(w => w.id !== '전체').map(workplace => {
                const isActive = currentRoom === workplace.id;
                const baseClass = `relative flex-1 flex flex-col py-1 px-1 rounded-lg border transition-all cursor-pointer text-center justify-center items-center ${isActive ? "border-accent-500 bg-accent-50 shadow-sm shadow-orange-100/50" : "border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 shadow-sm"
                  }`;
                const floorText = isActive ? "text-accent-500" : "text-gray-400";
                const labelText = isActive ? "text-accent-600 font-bold" : "text-gray-600 font-medium";
                const hasUnread = handovers.some(h => h.mainWorkplace === workplace.name && !h.readBy?.includes(currentUser.name));

                return (
                  <button key={workplace.id} onClick={() => setCurrentRoom(workplace.id)} className={baseClass} title={workplace.name}>
                    <span className={`text-[8px] sm:text-[9px] font-bold ${floorText} truncate leading-tight w-full`}>{workplace.floor}</span>
                    <span className={`text-[9px] sm:text-[10px] ${labelText} leading-tight truncate w-full px-1`}>{workplace.name}</span>
                    {hasUnread && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_4px_rgba(239,68,68,0.5)] z-10"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-48 sm:w-56 shrink-0 relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <Search className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="검색..."
              value={handoverSearchQuery}
              onChange={(e) => setHandoverSearchQuery(e.target.value)}
              className="w-full py-1.5 pl-8 pr-3 bg-gray-100 rounded-xl text-xs sm:text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-accent-500 border border-transparent focus:border-accent-500 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 relative">
          <div className="flex gap-4 overflow-x-auto h-full pb-4 snap-x snap-mandatory">
            {columns.map(col => {
              const list = groupedHandovers[col.id] || [];
              return (
                <div key={col.id} className="min-w-[360px] sm:min-w-[400px] w-[420px] max-w-[90vw] flex-shrink-0 flex flex-col bg-gray-50/50 rounded-2xl border border-gray-100 p-3 h-full snap-center">
                  <div className="flex items-center justify-between px-2 py-2 mb-2 shrink-0">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2" title={col.description}>
                      {col.title}
                      <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">
                        {list.length}
                      </span>
                    </h3>
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
                    ) : list.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {list.map(renderCard)}
                      </div>
                    ) : (
                      <div className="h-24 border border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-xs font-bold text-gray-400 bg-white/50">
                        내역 없음
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isPinned && handoverDrawerMode && (
        <div style={{ width: `${drawerWidth}px`, minWidth: '320px', maxWidth: '50%' }} className="shrink-0 h-full hidden md:block">
          {renderDrawer()}
        </div>
      )}

      {mounted && handoverDrawerMode && !isPinned && createPortal(
        renderDrawer(),
        document.body
      )}

    </div>
  );
}
