
import { Student, Homework, HomeworkSubmission, AppSettings, ClassId } from './types';

const getClassKey = (baseKey: string, classId?: ClassId | null) => {
  return classId ? `${baseKey}_${classId}` : baseKey;
};

const KEYS = {
  STUDENTS: 'school_students',
  HOMEWORK: 'school_homework',
  HOMEWORK_SUBMISSIONS: 'school_homework_submissions',
  SETTINGS: 'school_settings'
};

const get = <T,>(key: string): T | null => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};

const set = (key: string, value: any): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const Storage = {
  getStudents: (classId?: ClassId | null): Student[] => {
    const key = getClassKey(KEYS.STUDENTS, classId);
    return get<Student[]>(key) || [];
  },
  saveStudents: (data: Student[], classId?: ClassId | null) => {
    const key = getClassKey(KEYS.STUDENTS, classId);
    set(key, data);
  },

  getHomework: (classId?: ClassId | null): Homework[] => {
    const key = getClassKey(KEYS.HOMEWORK, classId);
    const list = get<Homework[]>(key) || [];
    // 互換性維持: dayOfWeekが配列でない場合は配列に変換
    return list.map(hw => ({
        ...hw,
        dayOfWeek: Array.isArray(hw.dayOfWeek) ? hw.dayOfWeek : [hw.dayOfWeek as any]
    }));
  },
  saveHomework: (data: Homework[], classId?: ClassId | null) => {
    const key = getClassKey(KEYS.HOMEWORK, classId);
    set(key, data);
  },

  getHomeworkSubmissions: (classId?: ClassId | null): HomeworkSubmission[] => {
    const key = getClassKey(KEYS.HOMEWORK_SUBMISSIONS, classId);
    return get<HomeworkSubmission[]>(key) || [];
  },
  saveHomeworkSubmissions: (data: HomeworkSubmission[], classId?: ClassId | null) => {
    const key = getClassKey(KEYS.HOMEWORK_SUBMISSIONS, classId);
    set(key, data);
  },

  getSettings: (): AppSettings => get<AppSettings>(KEYS.SETTINGS) || {
    password: 'teacher2026'
  },
  saveSettings: (data: AppSettings) => set(KEYS.SETTINGS, data),

  formatDate: (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  formatTime: (date: Date) => {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  },

  clear: () => {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  },

  initializeDefaults: () => {
    if (Storage.getStudents().length > 0) return;

    const students: Student[] = [
      { id: 1, number: 1, name: '山田 太郎', nfcId: 'NFC001', createdAt: new Date().toISOString() },
      { id: 2, number: 2, name: '佐藤 花子', nfcId: 'NFC002', createdAt: new Date().toISOString() },
      { id: 3, number: 3, name: '鈴木 一郎', nfcId: 'NFC003', createdAt: new Date().toISOString() },
      { id: 4, number: 4, name: '田中 美咲', nfcId: 'NFC004', createdAt: new Date().toISOString() },
      { id: 5, number: 5, name: '伊藤 健太', nfcId: 'NFC005', createdAt: new Date().toISOString() }
    ];
    Storage.saveStudents(students);

    const homework: Homework[] = [
      { id: 1, title: '算数プリント', dayOfWeek: ['everyday'], description: '教科書p.20-21の問題を解く', createdAt: new Date().toISOString() },
      { id: 2, title: '漢字練習', dayOfWeek: ['1', '3', '5'], description: '新出漢字を練習する', createdAt: new Date().toISOString() },
      { id: 3, title: '音読', dayOfWeek: ['everyday'], description: '国語の教科書を音読する', createdAt: new Date().toISOString() }
    ];
    Storage.saveHomework(homework);
  }
};
