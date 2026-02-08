
export type UserMode = 'teacher' | 'student';

export interface Student {
  id: number;
  number: number;
  name: string;
  nfcId: string;
  createdAt: string;
}

export type DayOfWeek = '0' | '1' | '2' | '3' | '4' | '5' | '6' | 'everyday';

export interface Homework {
  id: number;
  title: string;
  dayOfWeek: DayOfWeek[]; // 配列に変更
  description: string;
  createdAt: string;
}

export interface HomeworkSubmission {
  id: string;
  homeworkId: number;
  studentId: number;
  studentNumber: number;
  studentName: string;
  nfcId: string;
  touchRecorded: boolean;
  touchRecordedAt: string | null;
  touchDate: string | null;
  touchTime: string | null;
  checked: boolean;
  checkedAt: string | null;
  submittedDate: string | null;
  submittedTime: string | null;
}

export interface AppSettings {
  password: string;
}

export interface BackupData {
  timestamp: string;
  version: string;
  students: Student[];
  homework: Homework[];
  homeworkSubmissions: HomeworkSubmission[];
  settings: AppSettings;
}
