import { nanoid } from 'nanoid';

export function generateId(): string {
  return nanoid(12);
}

export function now(): number {
  return Date.now();
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateShort(ts: number): string {
  return new Date(ts).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  });
}

export function daysBetween(a: number, b: number): number {
  return Math.ceil((b - a) / (1000 * 60 * 60 * 24));
}

export function addDays(ts: number, days: number): number {
  return ts + days * 1000 * 60 * 60 * 24;
}

export const STATUS_COLORS: Record<string, string> = {
  'backlog': '#6b7280',
  'todo': '#9ca3af',
  'in-progress': '#3b82f6',
  'done': '#22c55e',
  'pending': '#9ca3af',
  'completed': '#22c55e',
  'delayed': '#ef4444',
  'active': '#3b82f6',
  'archived': '#6b7280',
  'terminated': '#ef4444',
};

export const PRIORITY_COLORS: Record<string, string> = {
  'P0': '#ef4444',
  'P1': '#f59e0b',
  'P2': '#3b82f6',
};

export const RISK_COLORS: Record<string, string> = {
  'none': '#6b7280',
  'low': '#22c55e',
  'medium': '#f59e0b',
  'high': '#ef4444',
};

export const STATUS_LABELS: Record<string, string> = {
  'backlog': '待规划',
  'todo': '待开始',
  'in-progress': '进行中',
  'done': '已完成',
  'pending': '待处理',
  'completed': '已完成',
  'delayed': '已延期',
  'active': '进行中',
  'archived': '已归档',
  'terminated': '已终止',
  'analyzing': '分析中',
  'draft': '草稿',
  'confirmed': '已确认',
  'converted': '已转任务',
};
