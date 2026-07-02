import { create } from 'zustand';
import { Notice, Handover, EquipmentIssue, Employee } from '@/lib/dummyData';
import { formatDateTime } from '@/lib/utils';

const SHORT_TO_FULL_WORKPLACE: Record<string, string> = {
  '면역': '면역치료실',
  '안과': '안과검사실',
  '수면': '수면다원검사실',
  '근전도': '근전도실',
  '뇌파': '뇌파검사실',
  '소화': '소화기능검사실',
  '심기능': '심장기능검사실',
  '심초': '심장초음파실',
  '호흡': '호흡기능검사실',
  '청력': '청력기능검사실',
  '외안부': '안과검사실'
};

interface User {
  employeeId: string;
  name: string;
  position: string;
  department: string;
  mainWorkplace: string;
  subWorkplace: string;
  isManager: boolean;
  isRetired: boolean;
}

export interface Vacation {
  id: string;
  empId: string;
  name: string;
  department: string;
  mainWorkplace: string;
  subWorkplace: string;
  vacationDate: string;
  vacationType: string;
  reason: string;
  status: '대기' | '승인' | '반려';
  createdAt: string;
  handoverEmpId?: string; // 인수자(대타) 사번
  approvedBy?: string; // 승인한 부서장 명단 (콤마로 구분)
}

export interface Workplace {
  id: string;
  name: string;
  floor: string;
}

interface AppState {
  isLoggedIn: boolean;
  currentUser: User;
  currentPage: 'notices' | 'handovers' | 'schedule' | 'equipment' | 'stats' | 'calendar';
  highlightedItemId: number | string | null;
  highlightedItemIds: (number | string)[];
  highlightedItemTimestamp: number;
  readVacationIds: string[];

  // Calendar/Schedule Sync
  scheduleYear: number;
  scheduleMonth: number;
  calendarMemos: Record<string, string>;

  // Data
  notices: Notice[];
  handovers: Handover[];
  equipmentIssues: EquipmentIssue[];
  employees: Employee[];
  vacations: Vacation[];
  workplaces: Workplace[];

  // Loading & Error
  isDataLoaded: boolean;
  isLoading: boolean;
  isMutating: boolean;
  isGlobalSyncing: boolean;
  globalVersion: number;
  myLastSavedScheduleVersion: number;

  // Filters
  currentDepartment: string;
  currentRoom: string;
  currentFloor: string;
  currentNoticeCategory: string;

  // Search Queries
  noticeSearchQuery: string;
  handoverSearchQuery: string;
  equipmentSearchQuery: string;

  // Drawer States
  noticeDrawerMode: 'create' | 'edit' | null;
  selectedNotice: Notice | null;
  handoverDrawerMode: 'create' | 'edit' | null;
  selectedHandover: Handover | null;

  // Actions
  login: (employeeId: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  markVacationAsRead: (id: string) => void;
  setReadVacationIds: (ids: string[]) => void;
  restoreSession: () => void;
  setCurrentPage: (page: AppState['currentPage']) => void;
  setHighlightedItemId: (id: number | string | null) => void;
  addHighlightedItemId: (id: number | string) => void;
  removeHighlightedItemId: (id: number | string) => void;
  clearHighlightedItemIds: () => void;
  setCurrentRoom: (room: string) => void;
  setCurrentNoticeCategory: (category: string) => void;
  setNoticeSearchQuery: (query: string) => void;
  setHandoverSearchQuery: (query: string) => void;
  setEquipmentSearchQuery: (query: string) => void;
  setNoticeDrawerMode: (mode: 'create' | 'edit' | null, notice?: Notice | null) => void;
  setHandoverDrawerMode: (mode: 'create' | 'edit' | null, handover?: Handover | null) => void;

  // Data Initialization (서버에서 초기 데이터 로드)
  initializeData: () => Promise<void>;
  syncData: () => Promise<void>;
  setGlobalVersion: (version: number) => void;
  setMyLastSavedScheduleVersion: (version: number) => void;
  setIsMutating: (isMutating: boolean) => void;

  // CRUD Actions (낙관적 업데이트 + 백그라운드 API 호출)
  signHandover: (id: number, employeeId: string) => void;
  addNotice: (notice: Omit<Notice, 'id'>) => void;
  addHandover: (handover: Omit<Handover, 'id'>) => void;
  addEquipmentIssue: (issue: Omit<EquipmentIssue, 'id' | 'confirmedUsers'>) => void;
  confirmEquipment: (id: number) => void;
  changeEquipmentStatus: (id: number, newStatus: string) => void;
  addComment: (type: 'notice' | 'handover' | 'equipment', targetId: number, comment: any) => void;
  markAsRead: (category: 'notice' | 'handover' | 'equipment', id: number, userName: string) => void;
  addEmployee: (employee: Omit<Employee, 'no'>) => void;
  updateEmployee: (employeeId: string, updatedFields: Partial<Employee>) => void;
  deleteEmployee: (employeeId: string) => void;

  addVacation: (vacation: Omit<Vacation, 'id' | 'status' | 'createdAt'>) => void;
  updateVacationStatus: (id: string, status: '대기' | '승인' | '반려' | '승인취소') => void;

  // 수정/삭제/승인 액션
  editNotice: (id: number, fields: Partial<Notice>) => void;
  deleteNotice: (id: number) => void;

  editHandover: (id: number, fields: Partial<Handover>) => void;
  deleteHandover: (id: number) => void;
  approveHandover: (id: number, isApproved: string) => void;

  editEquipment: (id: number, fields: Partial<EquipmentIssue>) => void;
  deleteEquipment: (id: number) => void;
  approveEquipment: (id: number, isApproved: boolean) => void;

  editVacation: (id: string, fields: Partial<Vacation>) => void;
  deleteVacation: (id: string) => void;

  setScheduleYearMonth: (year: number, month: number) => void;
  loadCalendarMemos: (year: number, month: number) => void;
  saveCalendarMemo: (year: number, month: number, key: string, text: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  isLoggedIn: false,
  currentUser: { employeeId: '', name: '', position: '', department: '', mainWorkplace: '', subWorkplace: '', isManager: false, isRetired: false },
  currentPage: 'notices',
  highlightedItemId: null,
  scheduleYear: new Date().getFullYear(),
  scheduleMonth: new Date().getMonth() + 1,
  calendarMemos: {},
  highlightedItemIds: typeof window !== 'undefined' ? (() => {
    try {
      return JSON.parse(localStorage.getItem('highlighted_item_ids') || '[]');
    } catch {
      return [];
    }
  })() : [],
  highlightedItemTimestamp: 0,
  readVacationIds: [],

  // 초기값은 빈 배열로 설정
  notices: [],
  handovers: [],
  equipmentIssues: [],
  employees: [],
  vacations: [],
  workplaces: [],

  isDataLoaded: false,
  isLoading: false,
  isMutating: false,
  isGlobalSyncing: false,
  globalVersion: 0,
  myLastSavedScheduleVersion: 0,

  currentDepartment: '기능검사실',
  currentRoom: '전체',
  currentFloor: 'All',
  currentNoticeCategory: '전체',

  noticeSearchQuery: '',
  handoverSearchQuery: '',
  equipmentSearchQuery: '',

  noticeDrawerMode: null,
  selectedNotice: null,
  handoverDrawerMode: null,
  selectedHandover: null,

  login: async (employeeId, password = '') => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empId: employeeId, password }),
      });
      if (!res.ok) {
        let errMsg = '서버 응답 오류';
        try {
          const errData = await res.json();
          if (errData && errData.error) {
            errMsg = errData.error;
          }
        } catch { }
        throw new Error(errMsg);
      }
      const result = await res.json();
      if (result.success && result.employee) {
        const emp = result.employee;
        const currentUser = {
          employeeId: String(emp.empId).trim(),
          name: emp.name,
          position: emp.position,
          department: emp.department,
          mainWorkplace: emp.mainWorkplace,
          subWorkplace: emp.subWorkplace,
          isManager: emp.isManager === true || String(emp.isManager).toUpperCase() === 'TRUE',
          isRetired: emp.isRetired === true || String(emp.isRetired).toUpperCase() === 'TRUE'
        };
        const currentDepartment = emp.mainWorkplace || emp.department || '기능검사실';

        set({
          isLoggedIn: true,
          currentUser,
          currentDepartment
        });

        if (typeof window !== 'undefined') {
          const expiryTime = Date.now() + 10 * 60 * 60 * 1000; // 10시간 뒤 만료
          localStorage.setItem('logged_in_user', JSON.stringify(currentUser));
          localStorage.setItem('is_logged_in', 'true');
          localStorage.setItem('current_department', currentDepartment);
          localStorage.setItem('session_expiry', String(expiryTime));
        }

        return { success: true };
      } else {
        return { success: false, error: result.error || '로그인 정보가 일치하지 않습니다.' };
      }
    } catch (e: any) {
      return { success: false, error: e.message || '네트워크 오류가 발생했습니다.' };
    }
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('logged_in_user');
      localStorage.removeItem('is_logged_in');
      localStorage.removeItem('current_department');
      localStorage.removeItem('session_expiry');
      localStorage.removeItem('highlighted_item_ids');
    }
    set({ isLoggedIn: false, currentUser: { employeeId: '', name: '', position: '', department: '', mainWorkplace: '', subWorkplace: '', isManager: false, isRetired: false }, currentPage: 'notices', highlightedItemId: null, highlightedItemIds: [] });
  },
  restoreSession: () => {
    if (typeof window === 'undefined') return;
    const isLoggedInStr = localStorage.getItem('is_logged_in');
    const loggedInUserStr = localStorage.getItem('logged_in_user');
    const currentDept = localStorage.getItem('current_department');
    const expiryStr = localStorage.getItem('session_expiry');

    if (isLoggedInStr === 'true' && loggedInUserStr && expiryStr) {
      const now = Date.now();
      const expiry = Number(expiryStr);

      if (now < expiry) {
        try {
          const user = JSON.parse(loggedInUserStr);
          set({
            isLoggedIn: true,
            currentUser: user,
            currentDepartment: currentDept || user.mainWorkplace || user.department || '기능검사실'
          });
        } catch (e) {
          console.error('[Store] 로컬 세션 복구 실패:', e);
        }
      } else {
        console.warn('[Store] 로그인 세션이 만료되었습니다. (10시간 경과)');
        localStorage.removeItem('logged_in_user');
        localStorage.removeItem('is_logged_in');
        localStorage.removeItem('current_department');
        localStorage.removeItem('session_expiry');
      }
    }
  },
  setGlobalVersion: (version) => set({ globalVersion: version }),
  setMyLastSavedScheduleVersion: (version) => set({ myLastSavedScheduleVersion: version }),
  setIsMutating: (isMutating) => set({ isMutating }),
  setCurrentPage: (page) => set({
    currentPage: page,
    noticeDrawerMode: null,
    selectedNotice: null,
    handoverDrawerMode: null,
    selectedHandover: null
  }),
  setHighlightedItemId: (id) => set((state) => {
    if (id === null) {
      return { highlightedItemId: null, highlightedItemTimestamp: 0 };
    }
    const nextIds = state.highlightedItemIds.includes(id) ? state.highlightedItemIds : [...state.highlightedItemIds, id];
    if (typeof window !== 'undefined') {
      localStorage.setItem('highlighted_item_ids', JSON.stringify(nextIds));
    }
    return {
      highlightedItemId: id,
      highlightedItemTimestamp: Date.now(),
      highlightedItemIds: nextIds
    };
  }),
  addHighlightedItemId: (id) => set((state) => {
    const nextIds = state.highlightedItemIds.includes(id) ? state.highlightedItemIds : [...state.highlightedItemIds, id];
    if (typeof window !== 'undefined') {
      localStorage.setItem('highlighted_item_ids', JSON.stringify(nextIds));
    }
    return { highlightedItemIds: nextIds };
  }),
  removeHighlightedItemId: (id) => set((state) => {
    const nextIds = state.highlightedItemIds.filter(x => x !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('highlighted_item_ids', JSON.stringify(nextIds));
    }
    return {
      highlightedItemIds: nextIds,
      highlightedItemId: state.highlightedItemId === id ? null : state.highlightedItemId,
      highlightedItemTimestamp: state.highlightedItemId === id ? 0 : state.highlightedItemTimestamp
    };
  }),
  markVacationAsRead: (id) => set((state) => {
    if (state.readVacationIds.includes(id)) return state;
    const nextIds = [...state.readVacationIds, id];
    if (typeof window !== 'undefined') {
      localStorage.setItem(`read_vacations_${state.currentUser.employeeId}`, JSON.stringify(nextIds));
    }
    return { readVacationIds: nextIds };
  }),
  setReadVacationIds: (ids) => set({ readVacationIds: ids }),
  clearHighlightedItemIds: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('highlighted_item_ids');
    }
    set({ highlightedItemIds: [], highlightedItemId: null, highlightedItemTimestamp: 0 });
  },
  setCurrentRoom: (room) => set({ currentRoom: room }),
  setCurrentNoticeCategory: (category) => set({ currentNoticeCategory: category }),
  setNoticeSearchQuery: (query) => set({ noticeSearchQuery: query }),
  setHandoverSearchQuery: (query) => set({ handoverSearchQuery: query }),
  setEquipmentSearchQuery: (query) => set({ equipmentSearchQuery: query }),
  setNoticeDrawerMode: (mode, notice = null) => set({ noticeDrawerMode: mode, selectedNotice: notice }),
  setHandoverDrawerMode: (mode, handover = null) => set({ handoverDrawerMode: mode, selectedHandover: handover }),

  /* ──────────────────────────────────────────────
     서버 초기 데이터 로드
     ────────────────────────────────────────────── */
  initializeData: async () => {
    if (get().isDataLoaded || get().isLoading) return;

    // 로컬 스토리지에서 이전 캐시 검사
    const cachedNotices = localStorage.getItem('cached_notices');
    const cachedHandovers = localStorage.getItem('cached_handovers');
    const cachedEquipment = localStorage.getItem('cached_equipment');
    const cachedEmployees = localStorage.getItem('cached_employees');
    const cachedVacations = localStorage.getItem('cached_vacations');
    const cachedWorkplaces = localStorage.getItem('cached_workplaces');

    const cacheUpdates: Partial<AppState> = {};
    let hasCache = false;

    if (cachedNotices) { try { cacheUpdates.notices = JSON.parse(cachedNotices); hasCache = true; } catch { } }
    if (cachedHandovers) { try { cacheUpdates.handovers = JSON.parse(cachedHandovers); hasCache = true; } catch { } }
    if (cachedEquipment) { try { cacheUpdates.equipmentIssues = JSON.parse(cachedEquipment); hasCache = true; } catch { } }
    if (cachedEmployees) { try { cacheUpdates.employees = JSON.parse(cachedEmployees); hasCache = true; } catch { } }
    if (cachedVacations) { try { cacheUpdates.vacations = JSON.parse(cachedVacations); hasCache = true; } catch { } }
    if (cachedWorkplaces) { try { cacheUpdates.workplaces = JSON.parse(cachedWorkplaces); hasCache = true; } catch { } }

    // 캐시가 있으면 UI에 즉시 로드하고, 스피너 로딩은 하지 않고 백그라운드 싱크로 처리
    if (hasCache) {
      set({ ...cacheUpdates, isDataLoaded: true, isGlobalSyncing: true });
    } else {
      set({ isLoading: true, isGlobalSyncing: false });
    }

    try {
      const [noticesRes, handoversRes, equipmentRes, employeesRes, vacationsRes, workplacesRes] = await Promise.allSettled([
        fetch('/api/notices'),
        fetch('/api/handovers'),
        fetch('/api/equipment'),
        fetch('/api/employees'),
        fetch('/api/vacations'),
        fetch('/api/workplaces'),
      ]);

      const updates: Partial<AppState> = {};

      if (noticesRes.status === 'fulfilled' && noticesRes.value.ok) {
        const data = await noticesRes.value.json();
        updates.notices = data;
        localStorage.setItem('cached_notices', JSON.stringify(data));
      }
      if (handoversRes.status === 'fulfilled' && handoversRes.value.ok) {
        const data = await handoversRes.value.json();
        updates.handovers = data;
        localStorage.setItem('cached_handovers', JSON.stringify(data));
      }
      if (equipmentRes.status === 'fulfilled' && equipmentRes.value.ok) {
        const data = await equipmentRes.value.json();
        updates.equipmentIssues = data;
        localStorage.setItem('cached_equipment', JSON.stringify(data));
      }
      if (employeesRes.status === 'fulfilled' && employeesRes.value.ok) {
        const data = await employeesRes.value.json();
        updates.employees = data;
        localStorage.setItem('cached_employees', JSON.stringify(data));
      }
      if (vacationsRes.status === 'fulfilled' && vacationsRes.value.ok) {
        const data = await vacationsRes.value.json();
        updates.vacations = data;
        localStorage.setItem('cached_vacations', JSON.stringify(data));
      }
      if (workplacesRes.status === 'fulfilled' && workplacesRes.value.ok) {
        const data = await workplacesRes.value.json();
        updates.workplaces = data;
        localStorage.setItem('cached_workplaces', JSON.stringify(data));
      }

      set({ ...updates, isDataLoaded: true, isLoading: false, isGlobalSyncing: false });
    } catch (error) {
      console.error('[Store] 초기 데이터 로드 실패 — 더미 데이터로 폴백합니다:', error);
      set({ isDataLoaded: true, isLoading: false, isGlobalSyncing: false });
    }
  },

  syncData: async () => {
    if (get().isMutating || get().isGlobalSyncing) return;

    let stillSyncing = true;
    const timer = setTimeout(() => {
      if (stillSyncing) {
        set({ isGlobalSyncing: true });
      }
    }, 500);

    try {
      const nowTs = Date.now();
      const [noticesRes, handoversRes, equipmentRes, employeesRes, vacationsRes, workplacesRes] = await Promise.allSettled([
        fetch(`/api/notices?_t=${nowTs}`, { cache: 'no-store' }),
        fetch(`/api/handovers?_t=${nowTs}`, { cache: 'no-store' }),
        fetch(`/api/equipment?_t=${nowTs}`, { cache: 'no-store' }),
        fetch(`/api/employees?_t=${nowTs}`, { cache: 'no-store' }),
        fetch(`/api/vacations?_t=${nowTs}`, { cache: 'no-store' }),
        fetch(`/api/workplaces?_t=${nowTs}`, { cache: 'no-store' }),
      ]);

      stillSyncing = false;
      clearTimeout(timer);

      const updates: Partial<AppState> = {};

      if (noticesRes.status === 'fulfilled' && noticesRes.value.ok) {
        const data = await noticesRes.value.json();
        const oldData = get().notices;
        const currentUserName = get().currentUser.name;

        const mergedData = data.map((newItem: Notice) => {
          const oldItem = oldData.find(item => item.id === newItem.id);
          if (oldItem) {
            const hasRecentComment = (oldItem as any)._commentMutatedAt && (Date.now() - (oldItem as any)._commentMutatedAt < 30000);

            const comments = hasRecentComment && (oldItem.comments || []).length > (newItem.comments || []).length
              ? oldItem.comments
              : newItem.comments;

            return {
              ...newItem,
              comments,
              _commentMutatedAt: (oldItem as any)._commentMutatedAt
            };
          }
          return newItem;
        });

        mergedData.forEach((newItem: Notice) => {
          const oldItem = oldData.find(item => item.id === newItem.id);
          if ((!oldItem || JSON.stringify(oldItem) !== JSON.stringify(newItem)) && String(newItem.author).trim() !== String(currentUserName).trim()) {
            get().addHighlightedItemId(newItem.id);
          }
        });

        if (JSON.stringify(oldData) !== JSON.stringify(mergedData)) {
          updates.notices = mergedData;
          localStorage.setItem('cached_notices', JSON.stringify(mergedData));

          const updatedSelectedNotice = get().selectedNotice
            ? mergedData.find((item: Notice) => item.id === get().selectedNotice?.id) || null
            : null;
          updates.selectedNotice = updatedSelectedNotice;
        }
      }

      if (handoversRes.status === 'fulfilled' && handoversRes.value.ok) {
        const data = await handoversRes.value.json();
        const oldData = get().handovers;
        const currentUserName = get().currentUser.name;

        const mergedData = data.map((newItem: Handover) => {
          const oldItem = oldData.find(item => item.id === newItem.id);
          if (oldItem) {
            const hasRecentComment = (oldItem as any)._commentMutatedAt && (Date.now() - (oldItem as any)._commentMutatedAt < 30000);

            const comments = hasRecentComment && (oldItem.comments || []).length > (newItem.comments || []).length
              ? oldItem.comments
              : newItem.comments;

            return {
              ...newItem,
              comments,
              _commentMutatedAt: (oldItem as any)._commentMutatedAt
            };
          }
          return newItem;
        });

        mergedData.forEach((newItem: Handover) => {
          const oldItem = oldData.find(item => item.id === newItem.id);
          const isSender = String(newItem.sender).trim() === String(currentUserName).trim();
          const isSigner = newItem.isSigned && String(newItem.signedEmpId).trim() === String(currentUserName).trim();

          const activeManagers = get().employees.filter(e => e.isManager && !e.isRetired);
          const approvedNames = newItem.isApproved ? String(newItem.isApproved).split(',').map(x => x.trim()).filter(Boolean) : [];
          const isFullyApproved = activeManagers.length > 0 && activeManagers.every(m => approvedNames.includes(m.name));

          const canSee = isFullyApproved || get().currentUser.isManager || isSender;

          if (canSee && (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(newItem)) && !isSender && !isSigner) {
            get().addHighlightedItemId(newItem.id);
          }
        });

        if (JSON.stringify(oldData) !== JSON.stringify(mergedData)) {
          updates.handovers = mergedData;
          localStorage.setItem('cached_handovers', JSON.stringify(mergedData));

          const updatedSelectedHandover = get().selectedHandover
            ? mergedData.find((item: Handover) => item.id === get().selectedHandover?.id) || null
            : null;
          updates.selectedHandover = updatedSelectedHandover;
        }
      }

      if (equipmentRes.status === 'fulfilled' && equipmentRes.value.ok) {
        const data = await equipmentRes.value.json();
        const oldData = get().equipmentIssues;
        const currentUserName = get().currentUser.name;

        const mergedData = data.map((newItem: EquipmentIssue) => {
          const oldItem = oldData.find(item => item.id === newItem.id);
          if (oldItem) {
            const hasRecentComment = (oldItem as any)._commentMutatedAt && (Date.now() - (oldItem as any)._commentMutatedAt < 30000);

            const comments = hasRecentComment && (oldItem.comments || []).length > (newItem.comments || []).length
              ? oldItem.comments
              : newItem.comments;

            return {
              ...newItem,
              comments,
              _commentMutatedAt: (oldItem as any)._commentMutatedAt
            };
          }
          return newItem;
        });

        mergedData.forEach((newItem: EquipmentIssue) => {
          const oldItem = oldData.find(item => item.id === newItem.id);
          const isReporter = String(newItem.reporter).trim() === String(currentUserName).trim();
          if ((!oldItem || JSON.stringify(oldItem) !== JSON.stringify(newItem)) && !isReporter) {
            get().addHighlightedItemId(newItem.id);
          }
        });

        if (JSON.stringify(oldData) !== JSON.stringify(mergedData)) {
          updates.equipmentIssues = mergedData;
          localStorage.setItem('cached_equipment', JSON.stringify(mergedData));
        }
      }

      if (employeesRes.status === 'fulfilled' && employeesRes.value.ok) {
        const data = await employeesRes.value.json();



        const oldData = get().employees;
        if (JSON.stringify(oldData) !== JSON.stringify(data)) {
          updates.employees = data;
          localStorage.setItem('cached_employees', JSON.stringify(data));
        }
      }

      if (vacationsRes.status === 'fulfilled' && vacationsRes.value.ok) {
        const data = await vacationsRes.value.json();
        const oldData = get().vacations;
        const currentUser = get().currentUser;
        const isInitialSync = oldData.length === 0;

        const lsKey = `read_vacations_${currentUser.employeeId}`;
        let currentReadIds: string[] | null = null;
        if (typeof window !== 'undefined') {
          try { currentReadIds = JSON.parse(localStorage.getItem(lsKey) || 'null'); } catch {}
          if (!currentReadIds && data.length > 0) {
            currentReadIds = data.map((v: Vacation) => v.id);
            localStorage.setItem(lsKey, JSON.stringify(currentReadIds));
          }
        }
        (updates as any).readVacationIds = currentReadIds || [];

        if (!isInitialSync) {
          data.forEach((newItem: Vacation) => {
            const oldItem = oldData.find(item => item.id === newItem.id);

            let shouldHighlight = false;

            // 1. [신청] 새 연차이면서 status가 대기이고 부서장일 때 (단, 신청자 본인 제외)
            if (!oldItem && newItem.status === '대기' && currentUser.isManager === true && newItem.empId !== currentUser.employeeId) {
              shouldHighlight = true;
            }
            // 2. [승인] 상태가 변경되어 승인 상태가 되었을 때
            else if (oldItem && oldItem.status !== newItem.status && newItem.status === '승인') {
              // 1. 작성자 본인에게는 내역 모달용 알림
              if (newItem.empId === currentUser.employeeId) {
                get().addHighlightedItemId(`vacation_${newItem.id}`);
              }
              // 2. 승인자를 제외한 모든 직원에게 근무일정(Work Schedule) 알림 전송
              get().addHighlightedItemId(`workschedule_vacation_${newItem.id}`);
            }
            // 3. [되돌리기] 승인 상태였던 내 연차가 대기 상태가 되었을 때
            else if (oldItem && oldItem.status === '승인' && newItem.status === '대기' && newItem.empId === currentUser.employeeId) {
              shouldHighlight = true;
            }
            // 4. [반려] 상태가 변경되어 반려 상태가 된 내 연차일 때
            else if (oldItem && oldItem.status !== newItem.status && newItem.status === '반려' && newItem.empId === currentUser.employeeId) {
              shouldHighlight = true;
            }

            if (shouldHighlight) {
              get().addHighlightedItemId(`vacation_${newItem.id}`);
            }
          });
        }

        if (JSON.stringify(oldData) !== JSON.stringify(data)) {
          updates.vacations = data;
          localStorage.setItem('cached_vacations', JSON.stringify(data));
        }
      }

      if (workplacesRes.status === 'fulfilled' && workplacesRes.value.ok) {
        const data = await workplacesRes.value.json();
        const oldData = get().workplaces;
        if (JSON.stringify(oldData) !== JSON.stringify(data)) {
          updates.workplaces = data;
          localStorage.setItem('cached_workplaces', JSON.stringify(data));
        }
      }

      set({ ...updates, isGlobalSyncing: false });

      const updatedEmployees = get().employees;
      const currentUser = get().currentUser;

      if (currentUser && currentUser.employeeId && updatedEmployees && updatedEmployees.length > 0) {
        const myNewInfo = updatedEmployees.find((e: any) => String(e.empId).trim() === String(currentUser.employeeId).trim());

        if (myNewInfo) {
          if (
            currentUser.isManager !== myNewInfo.isManager ||
            currentUser.department !== myNewInfo.department ||
            currentUser.mainWorkplace !== myNewInfo.mainWorkplace ||
            currentUser.subWorkplace !== myNewInfo.subWorkplace
          ) {
            const updatedUser = {
              ...currentUser,
              isManager: myNewInfo.isManager,
              department: myNewInfo.department,
              mainWorkplace: myNewInfo.mainWorkplace,
              subWorkplace: myNewInfo.subWorkplace,
            };
            set({ currentUser: updatedUser });
            localStorage.setItem('logged_in_user', JSON.stringify(updatedUser));
          }
        }
      }
    } catch (error) {
      stillSyncing = false;
      clearTimeout(timer);
      console.error('[Store] 백그라운드 데이터 동기화 실패:', error);
      set({ isGlobalSyncing: false });
    }
  },

  /* ──────────────────────────────────────────────
     공지사항 (Notices)
     ────────────────────────────────────────────── */
  addNotice: (notice) => {
    set({ isMutating: true });
    const tempId = Date.now();
    const optimisticItem: Notice = { id: tempId, ...notice };
    const previousNotices = get().notices;

    // 낙관적 업데이트
    set({ notices: [optimisticItem, ...previousNotices] });

    // 백그라운드 API 호출
    fetch('/api/notices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...notice, authorEmpId: get().currentUser.employeeId }),
    }).then(async (res) => {
      if (!res.ok) throw new Error('Failed');
      const saved = await res.json();
      set((state) => ({
        notices: state.notices.map(n => n.id === tempId ? saved : n),
      }));
    }).catch(() => {
      set({ notices: previousNotices });
      console.error('[Store] 공지사항 등록 실패 — 롤백합니다.');
    }).finally(() => setTimeout(() => set({ isMutating: false }), 2000)); // replaced
  },

  editNotice: (id, fields) => {
    set({ isMutating: true });
    const prev = get().notices;
    set((state) => ({
      notices: state.notices.map(n => n.id === id ? { ...n, ...fields } : n),
    }));
    fetch('/api/notices', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'edit', id, ...fields }),
    }).catch(() => {
      set({ notices: prev });
      console.error('[Store] 공지사항 수정 실패 — 롤백합니다.');
    }).finally(() => setTimeout(() => set({ isMutating: false }), 2000)); // replaced
  },

  deleteNotice: (id) => {
    set({ isMutating: true });
    const prev = get().notices;
    const selectedNotice = get().selectedNotice;
    const isCurrentSelected = selectedNotice?.id === id;

    set((state) => ({
      notices: state.notices.filter(n => n.id !== id),
      ...(isCurrentSelected ? { selectedNotice: null, noticeDrawerMode: null } : {})
    }));

    fetch(`/api/notices?id=${id}`, { method: 'DELETE' })
      .then(async (res) => {
        if (!res.ok) throw new Error('삭제 실패');
        try {
          const verRes = await fetch(`/api/version?_t=${Date.now()}`);
          if (verRes.ok) {
            const verData = await verRes.json();
            set({ globalVersion: verData.version });
          }
        } catch (e) { }
      })
      .catch((err) => {
        set({ notices: prev, ...(isCurrentSelected ? { selectedNotice, noticeDrawerMode: 'edit' } : {}) });
        console.error('[Store] 공지사항 삭제 실패 — 롤백합니다.', err);
      }).finally(() => setTimeout(() => set({ isMutating: false }), 2000)); // replaced
  },



  /* ──────────────────────────────────────────────
     인수인계 (Handovers)
     ────────────────────────────────────────────── */
  addHandover: (handover) => {
    set({ isMutating: true });
    const tempId = Date.now();
    const optimisticItem: Handover = { id: tempId, ...handover };
    const previousHandovers = get().handovers;

    set({ handovers: [optimisticItem, ...previousHandovers] });

    fetch('/api/handovers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...handover, senderEmpId: get().currentUser.employeeId }),
    }).then(async (res) => {
      if (!res.ok) throw new Error('Failed');
      const saved = await res.json();
      set((state) => ({
        handovers: state.handovers.map(h => h.id === tempId ? saved : h),
      }));
    }).catch(() => {
      set({ handovers: previousHandovers });
      console.error('[Store] 인수인계 등록 실패 — 롤백합니다.');
    }).finally(() => setTimeout(() => set({ isMutating: false }), 2000)); // replaced
  },

  signHandover: (id, employeeId) => {
    set({ isMutating: true });
    const signedAt = formatDateTime(new Date());
    const previousHandovers = get().handovers;

    // 낙관적 업데이트
    set((state) => ({
      handovers: state.handovers.map(h =>
        h.id === id
          ? { ...h, isSigned: true, signedEmpId: employeeId, signedAt }
          : h
      ),
    }));

    // 백그라운드 API 호출
    fetch('/api/handovers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sign', id, signedEmpId: employeeId, signedAt }),
    }).catch(() => {
      set({ handovers: previousHandovers });
      console.error('[Store] 인수인계 서명 실패 — 롤백합니다.');
    }).finally(() => setTimeout(() => set({ isMutating: false }), 2000)); // replaced
  },

  editHandover: (id, fields) => {
    set({ isMutating: true });
    const prev = get().handovers;
    set((state) => ({
      handovers: state.handovers.map(h => h.id === id ? { ...h, ...fields } : h),
    }));
    fetch('/api/handovers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'edit', id, ...fields }),
    }).catch(() => {
      set({ handovers: prev });
      console.error('[Store] 인수인계 수정 실패 — 롤백합니다.');
    }).finally(() => setTimeout(() => set({ isMutating: false }), 2000)); // replaced
  },

  deleteHandover: (id) => {
    set({ isMutating: true });
    const prev = get().handovers;
    const selectedHandover = get().selectedHandover;
    const isCurrentSelected = selectedHandover?.id === id;

    set((state) => ({
      handovers: state.handovers.filter(h => h.id !== id),
      ...(isCurrentSelected ? { selectedHandover: null, handoverDrawerMode: null } : {})
    }));

    fetch(`/api/handovers?id=${id}`, { method: 'DELETE' })
      .then(async (res) => {
        if (!res.ok) throw new Error('삭제 실패');
        try {
          const verRes = await fetch(`/api/version?_t=${Date.now()}`);
          if (verRes.ok) {
            const verData = await verRes.json();
            set({ globalVersion: verData.version });
          }
        } catch (e) { }
      })
      .catch((err) => {
        set({ handovers: prev, ...(isCurrentSelected ? { selectedHandover, handoverDrawerMode: 'edit' } : {}) });
        console.error('[Store] 인수인계 삭제 실패 — 롤백합니다.', err);
      }).finally(() => setTimeout(() => set({ isMutating: false }), 2000)); // replaced
  },

  approveHandover: (id, isApproved) => {
    set({ isMutating: true });
    const prev = get().handovers;
    const handover = prev.find(h => h.id === id);
    const sender = handover ? handover.sender : '';
    const title = handover ? handover.title : '';
    const content = handover ? handover.content : '';

    set((state) => ({
      handovers: state.handovers.map(h => h.id === id ? { ...h, isApproved } : h),
    }));
    fetch('/api/handovers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', id, isApproved, sender, title, content }),
    }).catch(() => {
      set({ handovers: prev });
      console.error('[Store] 인수인계 승인 처리 실패 — 롤백합니다.');
    }).finally(() => setTimeout(() => set({ isMutating: false }), 2000)); // replaced
  },

  /* ──────────────────────────────────────────────
     장비 이슈 (Equipment Issues)
     ────────────────────────────────────────────── */
  addEquipmentIssue: (issue) => {
    set({ isMutating: true });
    const tempId = Date.now();
    const currentUser = get().currentUser;
    const optimisticItem: EquipmentIssue = {
      id: tempId,
      ...issue,
      status: issue.status || '신고됨',
      date: issue.date || formatDateTime(new Date()),
      endDate: issue.endDate || '',
      confirmedUsers: [currentUser.name],
      mainWorkplace: currentUser.mainWorkplace || currentUser.department || '',
      comments: [],
    };
    const previousIssues = get().equipmentIssues;

    set({ equipmentIssues: [optimisticItem, ...previousIssues] });

    fetch('/api/equipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...optimisticItem,
        reporter: issue.reporter || currentUser.name,
        reporterEmpId: currentUser.employeeId,
      }),
    }).then(async (res) => {
      if (!res.ok) throw new Error('Failed');
      const saved = await res.json();
      set((state) => ({
        equipmentIssues: state.equipmentIssues.map(eq => eq.id === tempId ? saved : eq),
      }));
    }).catch(() => {
      set({ equipmentIssues: previousIssues });
      console.error('[Store] 고장접수 등록 실패 — 롤백합니다.');
    }).finally(() => setTimeout(() => set({ isMutating: false }), 2000)); // replaced
  },

  confirmEquipment: (id) => {
    set({ isMutating: true });
    const userName = get().currentUser.name || '사용자';
    const previousIssues = get().equipmentIssues;

    set((state) => ({
      equipmentIssues: state.equipmentIssues.map(eq =>
        eq.id === id && !eq.confirmedUsers.includes(userName)
          ? { ...eq, confirmedUsers: [...eq.confirmedUsers, userName] }
          : eq
      ),
    }));

    fetch('/api/equipment', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'confirm', userName }),
    }).catch(() => {
      set({ equipmentIssues: previousIssues });
      console.error('[Store] 확인 처리 실패 — 롤백합니다.');
    }).finally(() => setTimeout(() => set({ isMutating: false }), 2000)); // replaced
  },

  changeEquipmentStatus: (id, newStatus) => {
    set({ isMutating: true });
    const previousIssues = get().equipmentIssues;
    const isCompleted = ['조치완료', '정상복구', '폐기'].includes(newStatus);
    const todayStr = isCompleted ? formatDateTime(new Date()) : '';

    set((state) => ({
      equipmentIssues: state.equipmentIssues.map(eq =>
        eq.id === id ? { ...eq, status: newStatus, endDate: isCompleted ? todayStr : eq.endDate } : eq
      ),
    }));

    fetch('/api/equipment', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'changeStatus', newStatus, endDate: isCompleted ? todayStr : undefined }),
    }).catch(() => {
      set({ equipmentIssues: previousIssues });
      console.error('[Store] 상태 변경 실패 — 롤백합니다.');
    }).finally(() => setTimeout(() => set({ isMutating: false }), 2000)); // replaced
  },

  addComment: (type, targetId, comment) => {
    set({ isMutating: true });
    const userEmpId = get().currentUser.employeeId;

    if (type === 'equipment') {
      const previousIssues = get().equipmentIssues;
      const issue = previousIssues.find((eq) => eq.id === targetId);
      if (!issue) return;
      const updatedComments = [...(issue.comments || []), comment];

      set((state) => ({
        equipmentIssues: state.equipmentIssues.map((eq) =>
          eq.id === targetId ? { ...eq, comments: updatedComments, _commentMutatedAt: Date.now() } : eq
        ),
      }));

      fetch('/api/equipment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetId, action: 'edit', comments: updatedComments, commentAuthorEmpId: userEmpId }),
      }).catch(() => {
        set({ equipmentIssues: previousIssues });
        console.error('[Store] 장비 댓글 추가 실패 — 롤백합니다.');
      }).finally(() => setTimeout(() => set({ isMutating: false }), 2000)); // replaced
    } else if (type === 'notice') {
      const previousNotices = get().notices;
      const notice = previousNotices.find((n) => n.id === targetId);
      if (!notice) return;
      const updatedComments = [...(notice.comments || []), comment];

      set((state) => ({
        notices: state.notices.map((n) =>
          n.id === targetId ? { ...n, comments: updatedComments, _commentMutatedAt: Date.now() } : n
        ),
        selectedNotice: state.selectedNotice && state.selectedNotice.id === targetId
          ? { ...state.selectedNotice, comments: updatedComments }
          : state.selectedNotice
      }));

      fetch('/api/notices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetId, action: 'edit', comments: updatedComments, commentAuthorEmpId: userEmpId }),
      }).catch(() => {
        set({ notices: previousNotices });
        console.error('[Store] 공지 댓글 추가 실패 — 롤백합니다.');
      }).finally(() => setTimeout(() => set({ isMutating: false }), 2000)); // replaced
    } else if (type === 'handover') {
      const previousHandovers = get().handovers;
      const handover = previousHandovers.find((h) => h.id === targetId);
      if (!handover) return;
      const updatedComments = [...(handover.comments || []), comment];

      set((state) => ({
        handovers: state.handovers.map((h) =>
          h.id === targetId ? { ...h, comments: updatedComments, _commentMutatedAt: Date.now() } : h
        ),
        selectedHandover: state.selectedHandover && state.selectedHandover.id === targetId
          ? { ...state.selectedHandover, comments: updatedComments }
          : state.selectedHandover
      }));

      fetch('/api/handovers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetId, action: 'edit', comments: updatedComments, commentAuthorEmpId: userEmpId }),
      }).catch(() => {
        set({ handovers: previousHandovers });
        console.error('[Store] 인수인계 댓글 추가 실패 — 롤백합니다.');
      }).finally(() => setTimeout(() => set({ isMutating: false }), 2000)); // replaced
    }
  },

  markAsRead: (category, id, userName) => {
    set({ isMutating: true });
    if (category === 'notice') {
      const prevNotices = get().notices;
      const target = prevNotices.find(n => n.id === id);
      if (!target || (target.readBy && target.readBy.includes(userName))) return;

      const newReadBy = [...(target.readBy || []), userName];
      set(state => ({
        notices: state.notices.map(n => n.id === id ? { ...n, readBy: newReadBy } : n),
        selectedNotice: state.selectedNotice?.id === id ? { ...state.selectedNotice, readBy: newReadBy } : state.selectedNotice
      }));

      fetch('/api/notices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAsRead', id, userName })
      }).catch(() => {
        set({ notices: prevNotices });
        console.error('[Store] 공지 읽음 처리 실패 — 롤백합니다.');
      }).finally(() => setTimeout(() => set({ isMutating: false }), 2000)); // replaced
    } else if (category === 'handover') {
      const prevHandovers = get().handovers;
      const target = prevHandovers.find(h => h.id === id);
      if (!target || (target.readBy && target.readBy.includes(userName))) return;

      const newReadBy = [...(target.readBy || []), userName];
      set(state => ({
        handovers: state.handovers.map(h => h.id === id ? { ...h, readBy: newReadBy } : h),
        selectedHandover: state.selectedHandover?.id === id ? { ...state.selectedHandover, readBy: newReadBy } : state.selectedHandover
      }));

      fetch('/api/handovers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAsRead', id, userName })
      }).catch(() => {
        set({ handovers: prevHandovers });
        console.error('[Store] 인수인계 읽음 처리 실패 — 롤백합니다.');
      }).finally(() => setTimeout(() => set({ isMutating: false }), 2000)); // replaced
    } else if (category === 'equipment') {
      const prevEquipments = get().equipmentIssues;
      const target = prevEquipments.find(eq => eq.id === id);
      if (!target || (target.readBy && target.readBy.includes(userName))) return;

      const newReadBy = [...(target.readBy || []), userName];
      set(state => ({
        equipmentIssues: state.equipmentIssues.map(eq => eq.id === id ? { ...eq, readBy: newReadBy } : eq)
      }));

      fetch('/api/equipment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAsRead', id, userName })
      }).catch(() => {
        set({ equipmentIssues: prevEquipments });
        console.error('[Store] 장비 읽음 처리 실패 — 롤백합니다.');
      }).finally(() => setTimeout(() => set({ isMutating: false }), 2000)); // replaced
    }
  },

  editEquipment: (id, fields) => {
    set({ isMutating: true });
    const prev = get().equipmentIssues;
    set((state) => ({
      equipmentIssues: state.equipmentIssues.map(eq => eq.id === id ? { ...eq, ...fields } : eq),
    }));
    fetch('/api/equipment', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'edit', id, ...fields }),
    }).catch(() => {
      set({ equipmentIssues: prev });
      console.error('[Store] 장비 이슈 수정 실패 — 롤백합니다.');
    }).finally(() => setTimeout(() => set({ isMutating: false }), 2000)); // replaced
  },

  deleteEquipment: (id) => {
    set({ isMutating: true });
    const prev = get().equipmentIssues;
    set((state) => ({
      equipmentIssues: state.equipmentIssues.filter(eq => eq.id !== id),
    }));
    fetch(`/api/equipment?id=${id}`, { method: 'DELETE' })
      .then(async (res) => {
        if (!res.ok) throw new Error('삭제 실패');
        try {
          const verRes = await fetch(`/api/version?_t=${Date.now()}`);
          if (verRes.ok) {
            const verData = await verRes.json();
            set({ globalVersion: verData.version });
          }
        } catch (e) { }
      })
      .catch((err) => {
        set({ equipmentIssues: prev });
        console.error('[Store] 장비 이슈 삭제 실패 — 롤백합니다.', err);
      }).finally(() => setTimeout(() => set({ isMutating: false }), 2000)); // replaced
  },

  approveEquipment: (id, isApproved) => {
    set({ isMutating: true });
    const prev = get().equipmentIssues;
    set((state) => ({
      equipmentIssues: state.equipmentIssues.map(eq => eq.id === id ? { ...eq, isApproved } : eq),
    }));
    fetch('/api/equipment', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', id, isApproved }),
    }).catch(() => {
      set({ equipmentIssues: prev });
      console.error('[Store] 장비 승인 처리 실패 — 롤백합니다.');
    }).finally(() => setTimeout(() => set({ isMutating: false }), 2000)); // replaced
  },

  /* ──────────────────────────────────────────────
     직원 (Employees)
     ────────────────────────────────────────────── */
  addEmployee: (employee) => {
    set({ isMutating: true });
    const mainWorkplace = SHORT_TO_FULL_WORKPLACE[employee.mainWorkplace] || employee.mainWorkplace;
    const subWorkplace = SHORT_TO_FULL_WORKPLACE[employee.subWorkplace] || employee.subWorkplace;
    const mappedEmployee = { ...employee, mainWorkplace, subWorkplace };

    const nextNo = get().employees.length > 0 ? Math.max(...get().employees.map(e => e.no)) + 1 : 1;
    const optimisticItem: Employee = { ...mappedEmployee, no: nextNo, isRetired: false };
    const previousEmployees = get().employees;

    set({ employees: [...previousEmployees, optimisticItem] });

    fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mappedEmployee),
    }).then(async (res) => {
      if (!res.ok) throw new Error('Failed');
      const saved = await res.json();
      set((state) => ({
        employees: state.employees.map(e => e.no === nextNo ? { ...e, no: saved.no } : e),
      }));
    }).catch(() => {
      set({ employees: previousEmployees });
      console.error('[Store] 직원 추가 실패 — 롤백합니다.');
    }).finally(() => setTimeout(() => set({ isMutating: false }), 2000)); // replaced
  },

  updateEmployee: (employeeId, updatedFields) => {
    set({ isMutating: true });
    const fieldsCopy = { ...updatedFields };
    if (fieldsCopy.mainWorkplace) fieldsCopy.mainWorkplace = SHORT_TO_FULL_WORKPLACE[fieldsCopy.mainWorkplace] || fieldsCopy.mainWorkplace;
    if (fieldsCopy.subWorkplace) fieldsCopy.subWorkplace = SHORT_TO_FULL_WORKPLACE[fieldsCopy.subWorkplace] || fieldsCopy.subWorkplace;

    const previousEmployees = get().employees;

    set((state) => ({
      employees: state.employees.map(e => e.empId === employeeId ? { ...e, ...fieldsCopy } : e),
    }));

    fetch('/api/employees', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empId: employeeId, ...fieldsCopy }),
    }).catch(() => {
      set({ employees: previousEmployees });
      console.error('[Store] 직원 수정 실패 — 롤백합니다.');
    }).finally(() => setTimeout(() => set({ isMutating: false }), 2000)); // replaced
  },

  deleteEmployee: (employeeId) => {
    set({ isMutating: true });
    const previousEmployees = get().employees;

    set((state) => ({
      employees: state.employees.filter(e => e.empId !== employeeId),
    }));

    fetch(`/api/employees?empId=${employeeId}`, {
      method: 'DELETE',
    }).catch(() => {
      set({ employees: previousEmployees });
      console.error('[Store] 직원 삭제 실패 — 롤백합니다.');
    }).finally(() => setTimeout(() => set({ isMutating: false }), 2000)); // replaced
  },

  /* ──────────────────────────────────────────────
     연차 관리 (Vacations)
     ────────────────────────────────────────────── */
  addVacation: (vacation) => {
    set({ isMutating: true });
    const tempId = String(Date.now()) + '_' + Math.random().toString(36).substr(2, 9);
    const optimisticItem: Vacation = {
      id: tempId,
      ...vacation,
      status: '대기',
      createdAt: formatDateTime(new Date()),
    };
    const previousVacations = get().vacations;

    set({ vacations: [optimisticItem, ...previousVacations] });

    fetch('/api/vacations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vacation),
    }).then(async (res) => {
      if (!res.ok) throw new Error('Failed');
      const saved = await res.json();
      set((state) => ({
        vacations: state.vacations.map(v => v.id === tempId ? { ...optimisticItem, id: String(saved.id) } : v),
      }));
      if (saved.version) {
        set({ globalVersion: saved.version });
      }
    }).catch(() => {
      set({ vacations: previousVacations });
      console.error('[Store] 연차 신청 실패 — 롤백합니다.');
    }).finally(() => setTimeout(() => set({ isMutating: false }), 2000)); // replaced
  },

  updateVacationStatus: (id, status) => {
    set({ isMutating: true });
    const previousVacations = get().vacations;
    const currentUser = get().currentUser;
    const activeManagers = get().employees.filter(e => e.isManager && !e.isRetired).map(m => m.name);

    set((state) => ({
      vacations: state.vacations.map(v => {
        if (v.id === id) {
          let newApprovedBy = v.approvedBy ? v.approvedBy.split(',').map(x => x.trim()).filter(Boolean) : [];
          let newStatus = v.status;
          
          if (status === '승인') {
            if (!newApprovedBy.includes(currentUser.name)) newApprovedBy.push(currentUser.name);
            const allApproved = activeManagers.length > 0 && activeManagers.every(m => newApprovedBy.includes(m));
            newStatus = allApproved ? '승인' : '대기';
          } else if (status === '승인취소') {
            newApprovedBy = newApprovedBy.filter(n => n !== currentUser.name);
            newStatus = '대기';
          } else if (status === '대기') {
            newApprovedBy = [];
            newStatus = '대기';
          } else if (status === '반려') {
            newStatus = '반려';
          }
          return { ...v, status: newStatus as any, approvedBy: newApprovedBy.join(', ') };
        }
        return v;
      }),
    }));

    fetch('/api/vacations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, userName: currentUser.name }),
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || '연차 상태 변경에 실패했습니다.');
      }
      if (data.version) set({ globalVersion: data.version });
    }).catch((err) => {
      set({ vacations: previousVacations });
      console.error('[Store] 연차 상태 변경 실패 — 롤백합니다.', err);
      alert('승인 처리 중 오류가 발생했습니다: ' + err.message);
    }).finally(() => setTimeout(() => set({ isMutating: false }), 2000));
  },

  editVacation: (id, fields) => {
    set({ isMutating: true });
    const prev = get().vacations;
    set((state) => ({
      vacations: state.vacations.map(v => v.id === id ? { ...v, ...fields } : v),
    }));
    fetch('/api/vacations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'edit', id, ...fields }),
    }).then(async (res) => {
      const data = await res.json();
      if (data.version) set({ globalVersion: data.version });
    }).catch(() => {
      set({ vacations: prev });
      console.error('[Store] 연차 수정 실패 — 롤백합니다.');
    }).finally(() => setTimeout(() => set({ isMutating: false }), 2000)); // replaced
  },

  deleteVacation: (id) => {
    set({ isMutating: true });
    const prev = get().vacations;
    set((state) => ({
      vacations: state.vacations.filter(v => v.id !== id),
    }));
    fetch(`/api/vacations?id=${id}`, { method: 'DELETE' }).then(async (res) => {
      const data = await res.json();
      if (data.version) set({ globalVersion: data.version });
    }).catch(() => {
      set({ vacations: prev });
      console.error('[Store] 연차 삭제 실패 — 롤백합니다.');
    }).finally(() => setTimeout(() => set({ isMutating: false }), 2000)); // replaced
  },

  setScheduleYearMonth: (year, month) => {
    set({ scheduleYear: year, scheduleMonth: month });
    get().loadCalendarMemos(year, month);
  },

  loadCalendarMemos: (year, month) => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`calendar_memos_${year}_${month}`);
      let memos = {};
      if (saved) {
        try { memos = JSON.parse(saved); } catch (e) { }
      }
      set({ calendarMemos: memos });
    }
  },

  saveCalendarMemo: (year, month, key, text) => {
    if (typeof window !== 'undefined') {
      const storageKey = `calendar_memos_${year}_${month}`;
      const saved = localStorage.getItem(storageKey);
      let memos: Record<string, string> = {};
      if (saved) {
        try { memos = JSON.parse(saved); } catch (e) { }
      }
      if (text.trim()) {
        memos[key] = text.trim();
      } else {
        delete memos[key];
      }
      localStorage.setItem(storageKey, JSON.stringify(memos));
      set({ calendarMemos: memos });
    }
  },
}));
