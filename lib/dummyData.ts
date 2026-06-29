export interface NoticeRoom {
  id: string;
  label: string;
  floor: string;
  hasNew: boolean;
}

export interface Notice {
  id: number;
  title: string;
  content: string;
  date: string;
  author: string;
  category: string; // 목적별 카테고리
  isImportant?: boolean;
  comments?: Comment[];
  likes?: string[];
  readBy?: string[];
}

export interface Handover {
  id: number;
  sender: string;
  receiver: string;
  content: string;
  date: string;
  isSigned: boolean;
  signedEmpId: string;
  signedAt: string;
  title?: string;
  mainWorkplace?: string;
  isApproved?: string;
  comments?: Comment[];
  likes?: string[];
  readBy?: string[];
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  date: string;
}

export interface EquipmentIssue {
  id: number;
  room: string;
  equipmentName: string;
  title?: string;
  content: string;
  status: string;
  reporter: string;
  date: string;
  endDate?: string;
  confirmedUsers: string[];
  department?: string;
  mainWorkplace?: string;
  category: '의료장비 고장' | '연동프로그램' | '소모품';
  isApproved?: boolean;
  comments?: Comment[];
  likes?: string[];
  readBy?: string[];
}


export const noticeRooms: NoticeRoom[] = [
  { id: '전체', label: '전체 보기', floor: 'All', hasNew: false },
  { id: '8F 면역치료', label: '면역치료실', floor: '8F', hasNew: false },
  { id: '4F 안과기능', label: '안과검사실', floor: '4F', hasNew: false },
  { id: '4F 수면다원', label: '수면다원검사실', floor: '4F', hasNew: false },
  { id: '4F 외안부', label: '외안부', floor: '4F', hasNew: false },
  { id: '3F 뇌파', label: '뇌파검사실', floor: '3F', hasNew: false },
  { id: '2F 소화기능', label: '소화기능검사실', floor: '2F', hasNew: false },
  { id: '2F 심장기능', label: '심장기능검사실', floor: '2F', hasNew: false },
  { id: '2F 심장초음파', label: '심장초음파실', floor: '2F', hasNew: false },
  { id: '1F 근전도', label: '근전도실', floor: '1F', hasNew: false },
  { id: '1F 호흡기능', label: '호흡기능검사실', floor: '1F', hasNew: false },
  { id: 'B1 청력', label: '청력기능검사실', floor: 'B1', hasNew: false }
];

export const initialNotices: Notice[] = [];

export const initialHandovers: Handover[] = [];

export const teamMembers: string[] = [];

export const initialEquipmentIssues: EquipmentIssue[] = [];

export interface Employee {
  no: number;
  empId: string;
  name: string;
  position: string;
  department: string;
  mainWorkplace: string;
  subWorkplace: string;
  password?: string;
  isManager: boolean;
  isRetired: boolean;
}

export const initialEmployees: Employee[] = [];


