import { useStore } from '@/store/useStore';
import { Search, Calendar, User, Pencil, Trash2, Plus, Pin, AlertCircle, Check, Heart, MessageCircle } from 'lucide-react';
import { Notice } from '@/lib/dummyData';
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { formatDateTime } from '@/lib/utils';

export default function Notices() {
  const { 
    notices, currentNoticeCategory, setCurrentNoticeCategory, noticeSearchQuery, setNoticeSearchQuery, 
    currentUser, addNotice, editNotice, deleteNotice, 
    highlightedItemId, setHighlightedItemId, highlightedItemIds, removeHighlightedItemId,
    noticeDrawerMode, selectedNotice, setNoticeDrawerMode,
    addComment, toggleLike, isLoading, markAsRead
  } = useStore();

  const [mounted, setMounted] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(500);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Record<number, boolean>>({});
  const [commentInput, setCommentInput] = useState('');

  const currentNotice = useMemo(() => {
    if (!selectedNotice) return null;
    return notices.find(n => n.id === selectedNotice.id) || selectedNotice;
  }, [notices, selectedNotice]);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formIsImportant, setFormIsImportant] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update form states when drawer opens
  useEffect(() => {
    if (noticeDrawerMode === 'create') {
      setFormTitle('');
      setFormContent('');
      setFormCategory('기능검사팀 공지');
      setFormIsImportant(false);
    } else if (noticeDrawerMode === 'edit' && currentNotice) {
      setFormTitle(currentNotice.title);
      setFormContent(currentNotice.content);
      setFormCategory(currentNotice.category || '기능검사팀 공지');
      setFormIsImportant(currentNotice.isImportant || false);
    }
  }, [noticeDrawerMode, currentNotice, currentUser.mainWorkplace]);

  // Handle click outside to close drawer
  useEffect(() => {
    if (isPinned || !noticeDrawerMode) return;

    const handleClickOutside = (e: MouseEvent) => {
      const drawer = document.getElementById('notice-drawer');
      if (drawer && drawer.contains(e.target as Node)) {
        return;
      }
      
      const target = e.target as HTMLElement;
      if (
        target.closest('[id^="notice-"]') || 
        target.closest('button') || 
        target.closest('a') ||
        target.closest('#create-notice-btn')
      ) {
        return;
      }
      
      setNoticeDrawerMode(null);
    };

    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isPinned, noticeDrawerMode, setNoticeDrawerMode]);

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

  // Highlight effect
  useEffect(() => {
    if (highlightedItemId) {
      const element = document.getElementById(`notice-${highlightedItemId}`);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    }
  }, [highlightedItemId, notices]);

  const filteredNotices = useMemo(() => {
    return notices
      .filter(n => {
        if (currentNoticeCategory !== '전체') {
          if (n.category !== currentNoticeCategory) return false;
        }
        const query = noticeSearchQuery.trim().toLowerCase();
        if (!query) return true;
        return (
          n.title.toLowerCase().includes(query) ||
          n.content.toLowerCase().includes(query) ||
          n.date.includes(query)
        );
      })
      .sort((a, b) => {
        const aImp = a.isImportant ? 1 : 0;
        const bImp = b.isImportant ? 1 : 0;
        if (aImp !== bImp) {
          return bImp - aImp;
        }
        return b.date.localeCompare(a.date);
      });
  }, [notices, currentNoticeCategory, noticeSearchQuery]);

  const isAllActive = currentNoticeCategory === '전체';

  const allBaseClass = `w-full relative flex items-center justify-center py-2 sm:py-2.5 rounded-xl border transition-all cursor-pointer text-center overflow-hidden ${isAllActive
      ? "border-accent-500 bg-accent-50 shadow-sm shadow-orange-100/50"
      : "border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 shadow-sm"
    }`;
  const allTextClass = isAllActive ? "text-accent-600 font-bold" : "text-gray-700 font-medium";

  const canEdit = (n: Notice) => currentUser.name === n.author;
  const canDelete = (n: Notice) => currentUser.name === n.author || currentUser.isManager;

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (noticeDrawerMode === 'create') {
      addNotice({
        title: formTitle || '제목 없음',
        content: formContent,
        author: currentUser.name || '사용자',
        date: formatDateTime(new Date()),
        category: formCategory,
        isImportant: formIsImportant,
      });
    } else if (noticeDrawerMode === 'edit' && selectedNotice) {
      editNotice(selectedNotice.id, { 
        title: formTitle, 
        content: formContent,
        category: formCategory,
        isImportant: formIsImportant
      });
    }
    setNoticeDrawerMode(null);
  };

  const handleDelete = (n: Notice, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('정말로 삭제하시겠습니까?')) {
      deleteNotice(n.id);
      if (selectedNotice?.id === n.id) {
        setNoticeDrawerMode(null);
      }
    }
  };

  const handleCommentSubmit = (noticeId: number) => {
    if (!commentInput.trim()) return;
    const comment = {
      id: String(Date.now()),
      author: currentUser.name || '사용자',
      content: commentInput.trim(),
      date: formatDateTime(new Date()),
    };
    addComment('notice', noticeId, comment);
    setCommentInput('');
  };

  const handleCommentIconClick = (n: Notice, e: React.MouseEvent) => {
    e.stopPropagation();
    setNoticeDrawerMode('edit', n);
    setTimeout(() => {
      const input = document.getElementById('notice-comment-input');
      if (input) input.focus();
    }, 300);
  };

  const isFormEditable = noticeDrawerMode === 'create' || (currentNotice && canEdit(currentNotice));

  const renderDrawer = () => {
    if (!noticeDrawerMode) return null;

    return (
      <div 
        id="notice-drawer"
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

        <div className="w-full h-full flex flex-col overflow-hidden rounded-l-3xl">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
            <h3 className="font-bold text-gray-900 text-xl">
              {noticeDrawerMode === 'create' ? '새 공지사항 등록' : (isFormEditable ? '공지사항 수정' : '공지사항 상세')}
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
              <button type="button" onClick={() => setNoticeDrawerMode(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100">✕</button>
            </div>
          </div>
          
          <div className="p-5 flex flex-col flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4">
             <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="flex flex-wrap gap-2 mb-1">
                  <select 
                    value={formCategory} 
                    onChange={e => setFormCategory(e.target.value)} 
                    disabled={!isFormEditable}
                    className="px-3.5 py-2 bg-blue-50 rounded-lg text-base font-bold text-blue-600 outline-none cursor-pointer border border-transparent hover:border-blue-300 focus:border-blue-500 transition-colors appearance-none text-center disabled:opacity-80" 
                    required
                  >
                    <option value="기능검사팀 공지">기능검사팀 공지</option>
                    <option value="검사실별 공지">검사실별 공지</option>
                    <option value="병원 공지">병원 공지</option>
                    <option value="감염관리">감염관리</option>
                    <option value="건의사항">건의사항</option>
                  </select>
                </div>
                
                {isFormEditable ? (
                  <input 
                    type="text" 
                    value={formTitle} 
                    onChange={e => setFormTitle(e.target.value)} 
                    placeholder="공지 제목을 입력하세요" 
                    className="w-full text-2xl font-bold text-gray-900 border-b border-dashed border-gray-200 hover:border-gray-300 focus:border-[#004b8d] outline-none bg-transparent placeholder-gray-300 transition-colors py-1" 
                    required 
                  />
                ) : (
                  <div className="w-full text-2xl font-bold text-gray-900 py-1 border-b border-gray-100 break-words">
                    {formTitle}
                  </div>
                )}
                
                {isFormEditable ? (
                  <textarea 
                    value={formContent} 
                    onChange={e => setFormContent(e.target.value)} 
                    placeholder="자세한 공지 내용을 기록합니다..." 
                    rows={5} 
                    className="w-full bg-gray-50 p-4 rounded-xl text-lg text-gray-700 whitespace-pre-wrap leading-relaxed border border-gray-100 hover:border-gray-200 focus:border-[#004b8d] focus:bg-white outline-none resize-none placeholder-gray-400 transition-all shadow-inner" 
                    required 
                  />
                ) : (
                  <div className="w-full bg-gray-50 p-4 rounded-xl text-lg text-gray-700 whitespace-pre-wrap leading-relaxed border border-gray-100 min-h-[140px]">
                    {formContent}
                  </div>
                )}
                
                <div className="flex flex-wrap items-center justify-between gap-3 mt-3 bg-gray-50/50 p-2.5 rounded-xl border border-gray-50 text-base">
                  {isFormEditable ? (
                    <label className="inline-flex items-center gap-2 cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          checked={formIsImportant} 
                          onChange={e => setFormIsImportant(e.target.checked)} 
                          className="peer sr-only" 
                        />
                        <div className={`w-5.5 h-5.5 rounded border transition-all bg-white shadow-sm flex items-center justify-center ${formIsImportant ? 'border-[#ff7a00]' : 'border-gray-300'} group-hover:border-[#ff7a00]/50`}>
                          <Check className={`w-4 h-4 text-[#ff7a00] transition-all duration-200 ${formIsImportant ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`} strokeWidth={3} />
                        </div>
                      </div>
                      <span className="text-base font-bold text-gray-700 flex items-center gap-1.5">
                        <AlertCircle className="w-4.5 h-4.5 text-[#ff7a00]"/> 
                        중요 공지로 등록
                      </span>
                    </label>
                  ) : (
                    formIsImportant ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-bold text-base border border-red-100">
                        <AlertCircle className="w-4.5 h-4.5"/> 
                        중요 공지사항
                      </div>
                    ) : (
                      <div />
                    )
                  )}

                  <div className="flex items-center gap-3 text-base text-gray-500 font-medium">
                    <span className="flex items-center gap-1.5">
                      <User className="w-4 h-4 text-gray-400" />
                      {noticeDrawerMode === 'create' ? currentUser.name : currentNotice?.author}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {noticeDrawerMode === 'create' ? formatDateTime(new Date()) : currentNotice?.date}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2.5 pt-3 mt-2 border-t border-gray-100 shrink-0">
                  {isFormEditable ? (
                    <>
                      <button type="button" onClick={() => setNoticeDrawerMode(null)} className="px-5 py-2.5 text-base font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">취소</button>
                      <button type="submit" className="px-5 py-2.5 text-base font-bold text-white bg-[#004b8d] rounded-xl hover:bg-[#003c71] transition-all shadow-md">
                        {noticeDrawerMode === 'create' ? '새 글 등록' : '수정 완료'}
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setNoticeDrawerMode(null)} className="px-5 py-2.5 text-base font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">닫기</button>
                  )}
                </div>
             </form>

             {noticeDrawerMode === 'edit' && currentNotice && (
               <div className="border-t border-gray-100 pt-4 mt-2 space-y-4">
                 <h5 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-lg">
                   <span>댓글</span>
                   <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-sm">
                     {currentNotice.comments?.length || 0}
                   </span>
                 </h5>
                 <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1.5 custom-scrollbar">
                   {currentNotice.comments?.map(c => (
                     <div key={c.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                       <div className="flex justify-between items-center mb-1">
                         <span className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                           <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500 font-bold">{c.author[0]}</div>
                           {c.author}
                         </span>
                         <span className="text-xs text-gray-400">{formatDateTime(c.date)}</span>
                       </div>
                       <p className="text-base text-gray-700 leading-relaxed pl-7.5 break-all">{c.content}</p>
                     </div>
                   ))}
                   {(!currentNotice.comments || currentNotice.comments.length === 0) && (
                     <div className="text-center py-4 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                       <p className="text-base text-gray-400">등록된 댓글이 없습니다.<br/>첫 댓글을 남겨보세요!</p>
                     </div>
                   )}
                 </div>
                 
                 <div className="flex gap-2">
                   <input 
                     type="text" 
                     id="notice-comment-input"
                     value={commentInput} 
                     onChange={e => setCommentInput(e.target.value)} 
                     onKeyDown={e => {
                       if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                         e.preventDefault();
                         handleCommentSubmit(currentNotice.id);
                       }
                     }}
                     placeholder="댓글을 입력하세요..." 
                     className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-base focus:border-[#004b8d] focus:ring-2 focus:ring-[#004b8d]/20 outline-none transition-all bg-gray-50 focus:bg-white"
                   />
                   <button 
                     type="button"
                     onClick={() => handleCommentSubmit(currentNotice.id)} 
                     className="px-5 py-2.5 bg-[#004b8d] text-base font-bold text-white rounded-xl hover:bg-[#003c71] transition-all shadow-md active:scale-95 whitespace-nowrap"
                   >
                     등록
                   </button>
                 </div>
               </div>
             )}
          </div>
        </div>
      </div>
    );
  };

  const isPinnedActive = isPinned && noticeDrawerMode !== null;

  return (
    <div className={`fade-enter flex ${
      isPinnedActive 
        ? 'w-full max-w-none mx-0 pl-4 sm:pl-6 pr-0 py-0 flex-row gap-6 h-[calc(100vh-60px)] md:h-[calc(100vh-56px)]' 
        : 'w-full p-4 sm:p-6 max-w-6xl mx-auto flex-col'
    }`}>
      <div className={`flex-1 min-w-0 flex flex-col ${isPinnedActive ? 'py-4 sm:py-6 overflow-y-auto custom-scrollbar' : ''}`}>
        
        <div id="notice-filter-container" className="mb-5 space-y-2">
          <div className="flex gap-2 mb-3">
            <div className="flex-1 grid grid-cols-2 gap-2">
              <button onClick={() => setCurrentNoticeCategory('전체')} className={allBaseClass}>
                <span className={`text-xs sm:text-sm ${allTextClass}`}>전체 보기</span>
              </button>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="검색..."
                  value={noticeSearchQuery}
                  onChange={(e) => setNoticeSearchQuery(e.target.value)}
                  className="w-full h-full pl-9 pr-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-accent-500 border border-transparent focus:border-accent-500 transition-all"
                />
              </div>
            </div>
            <button 
              id="create-notice-btn"
              onClick={() => setNoticeDrawerMode('create')}
              className="shrink-0 px-4 flex items-center justify-center gap-2 bg-[#004b8d] hover:bg-[#003c71] text-white rounded-xl shadow-sm transition-all text-sm font-bold active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">새 공지사항</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {["기능검사팀 공지", "검사실별 공지", "병원 공지", "감염관리", "건의사항"].map(cat => {
              const isActive = currentNoticeCategory === cat;
              const baseClass = `relative flex flex-col py-2 px-1 rounded-xl border transition-all cursor-pointer text-center overflow-hidden justify-center items-center ${isActive ? "border-accent-500 bg-accent-50 shadow-sm shadow-orange-100/50" : "border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 shadow-sm"}`;
              const labelText = isActive ? "text-accent-600 font-bold" : "text-gray-700 font-medium";

              return (
                <button key={cat} onClick={() => setCurrentNoticeCategory(cat)} className={baseClass} title={cat}>
                  <span className={`text-[11px] sm:text-xs ${labelText} leading-tight truncate w-full`}>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 pb-12" id="notice-list-container">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-pulse space-y-3">
                <div className="flex gap-2">
                  <div className="w-16 h-5 bg-gray-200 rounded" />
                  <div className="w-1/3 h-5 bg-gray-200 rounded" />
                </div>
                <div className="w-full h-4 bg-gray-100 rounded" />
                <div className="w-5/6 h-4 bg-gray-100 rounded" />
                <div className="flex gap-3 pt-2">
                  <div className="w-20 h-3 bg-gray-100 rounded" />
                  <div className="w-16 h-3 bg-gray-100 rounded" />
                </div>
              </div>
            ))
          ) : filteredNotices.length > 0 ? (
            filteredNotices.map(n => {
              const isHighlighted = n.id === highlightedItemId || highlightedItemIds.includes(n.id);
              return (
                <div 
                  key={n.id} 
                  id={`notice-${n.id}`} 
                  onClick={() => {
                    setNoticeDrawerMode('edit', n);
                    if (!n.readBy?.includes(currentUser.name)) {
                      markAsRead('notice', n.id, currentUser.name);
                    }
                  }}
                  onMouseEnter={() => {
                    if (n.id === highlightedItemId) setHighlightedItemId(null);
                    if (highlightedItemIds.includes(n.id)) removeHighlightedItemId(n.id);
                  }}
                  className={`bg-white rounded-2xl p-4 sm:p-5 shadow-sm border transition-all cursor-pointer ${
                    isHighlighted 
                      ? 'alarm-highlight shadow-md shadow-orange-100' 
                      : 'border-gray-100 hover:shadow-md hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {(() => {
                        const getCategoryBadgeClass = (category: string) => {
                          switch (category) {
                            case '기능검사팀 공지':
                              return 'bg-blue-50 text-blue-700 border-blue-200';
                            case '검사실별 공지':
                              return 'bg-purple-50 text-purple-700 border-purple-200';
                            case '병원 공지':
                              return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                            case '감염관리':
                              return 'bg-red-50 text-red-700 border-red-200 animate-pulse';
                            case '건의사항':
                              return 'bg-amber-50 text-amber-700 border-amber-200';
                            default:
                              return 'bg-gray-50 text-gray-700 border-gray-200';
                          }
                        };
                        return (
                          <span className={`px-2 py-0.5 rounded-md border text-xs font-bold whitespace-nowrap ${getCategoryBadgeClass(n.category || '')}`}>
                            {n.category || '기능검사팀 공지'}
                          </span>
                        );
                      })()}
                      {n.isImportant && (
                        <span className="px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 text-[10px] font-bold whitespace-nowrap border border-red-200">📌 중요</span>
                      )}
                      <h3 className="text-gray-900 font-bold text-base line-clamp-1 flex items-center gap-2">
                        {n.title}
                        {!n.readBy?.includes(currentUser.name) && (
                          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]" title="새로운 공지"></span>
                        )}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {canDelete(n) && (
                        <button onClick={(e) => handleDelete(n, e)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors" title="삭제">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed mb-3">{n.content}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{n.date}</span>
                    <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{n.author}</span>
                  </div>

                  {/* 하트 & 말풍선 인터랙션 바 */}
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => toggleLike('notice', n.id, currentUser.name)}
                      className={`flex items-center gap-1.5 text-xs font-bold transition-all ${
                        n.likes?.includes(currentUser.name) 
                          ? 'text-red-500 scale-110' 
                          : 'text-gray-400 hover:text-red-500'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${n.likes?.includes(currentUser.name) ? 'fill-current' : ''}`} />
                      <span>{n.likes?.length || 0}</span>
                    </button>
                    <button 
                      onClick={(e) => handleCommentIconClick(n, e)}
                      className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{n.comments?.length || 0}</span>
                    </button>
                  </div>

                  {/* 스레드식 답글 목록 */}
                  {((n.comments && n.comments.length > 0) || (n.likes && n.likes.length > 0)) && (
                    <div className="mt-4 pt-3 border-t border-gray-100/50" onClick={e => e.stopPropagation()}>
                      {/* 작성자 댓글 기본 노출 */}
                      {(() => {
                        const authorComments = (n.comments || []).filter(c => c.author === n.author);
                        const otherComments = (n.comments || []).filter(c => c.author !== n.author);
                        const isExpanded = !!expandedReplies[n.id];
                        
                        // 기본 노출할 목록: 확장 시 전체 노출, 미확장 시 작성자 댓글만 노출
                        const visibleComments = isExpanded ? (n.comments || []) : authorComments;
                        
                        return (
                          <div className="space-y-3 relative pl-4 border-l-2 border-gray-100 ml-2 mt-2">
                            {visibleComments.map((c) => {
                              const isAuthorComment = c.author === n.author;
                              return (
                                <div key={c.id} className="relative flex items-start gap-2.5 text-xs">
                                  {/* 연결용 왼쪽 수평 브랜치 라인 */}
                                  <div className="absolute -left-[18px] top-3.5 w-2.5 h-0.5 bg-gray-100" />
                                  
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                    isAuthorComment 
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
                                  onClick={() => setExpandedReplies(prev => ({ ...prev, [n.id]: !prev[n.id] }))}
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
            })
          ) : (
            <div className="py-10 text-center text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm">
              등록된 공지사항이 없습니다.
            </div>
          )}
        </div>
      </div>

      {isPinned && noticeDrawerMode && (
        <div style={{ width: `${drawerWidth}px`, minWidth: '320px', maxWidth: '50%' }} className="shrink-0 h-full hidden md:block">
          {renderDrawer()}
        </div>
      )}

      {mounted && noticeDrawerMode && !isPinned && createPortal(
        renderDrawer(),
        document.body
      )}
    </div>
  );
}
