'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon, { type IconName } from '../shared/Icon';
import { saveScrollBeforeNav } from './AppShell';

type ModuleKey = 'overview' | 'schedule' | 'mil' | 'members' | 'bom' | 'budget' | 'procurement' | 'cert' | 'meetings' | 'retro' | 'changes';

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  tooltip?: string;
}

interface ModuleGroup {
  name: string;
  storageKey: string;
  items: { key: ModuleKey; label: string; href: string }[];
}

const GLOBAL_LINKS: NavItem[] = [
  { href: '/', label: '工作台', icon: 'layout-dashboard' },
  { href: '/projects', label: '项目列表', icon: 'folder' },
  { href: '/my-tasks', label: '我的待办', icon: 'clipboard-list' },
  { href: '/work-logs', label: '工作记录', icon: 'notebook' },
  { href: '/weekly-report', label: '周报', icon: 'file-text' },
];

const MODULE_GROUPS: ModuleGroup[] = [
  {
    name: '计划与执行',
    storageKey: 'pmos-sidebar-plan',
    items: [
      { key: 'overview', label: '总览', href: '' },
      { key: 'schedule', label: '进度', href: '/schedule' },
      { key: 'mil', label: 'MIL', href: '/mil' },
      { key: 'members', label: '成员', href: '/members' },
    ],
  },
  {
    name: '成本与供应链',
    storageKey: 'pmos-sidebar-supply',
    items: [
      { key: 'bom', label: 'BOM', href: '/bom' },
      { key: 'budget', label: '成本', href: '/budget' },
      { key: 'procurement', label: '采购策略', href: '/procurement' },
      { key: 'cert', label: '认证', href: '/cert' },
    ],
  },
  {
    name: '沟通与复盘',
    storageKey: 'pmos-sidebar-comm',
    items: [
      { key: 'meetings', label: '会议', href: '/meetings' },
      { key: 'retro', label: '复盘', href: '/retro' },
      { key: 'changes', label: '变更', href: '/changes' },
    ],
  },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const projectId = pathname.match(/\/project\/([^/]+)/)?.[1];

  // Initialize collapse state from localStorage
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const saved: Record<string, boolean> = {};
    MODULE_GROUPS.forEach(g => {
      const v = localStorage.getItem(g.storageKey);
      saved[g.storageKey] = v === 'true';
    });
    setCollapsed(saved);
  }, []);

  const toggleGroup = useCallback((storageKey: string) => {
    setCollapsed(prev => {
      const next = !prev[storageKey];
      localStorage.setItem(storageKey, String(next));
      return { ...prev, [storageKey]: next };
    });
  }, []);

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-100">
        <Link
          href="/"
          onClick={onNavigate}
          className="text-lg font-bold text-gray-800 hover:text-indigo-600 transition-colors"
        >
          PM <span className="text-indigo-600 border-b-2 border-indigo-400">OS</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {/* Global nav */}
        {GLOBAL_LINKS.map(link => {
          const isActive = link.href === '/'
            ? pathname === '/'
            : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              scroll={false}
              onClick={() => { saveScrollBeforeNav(); onNavigate?.(); }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 border-l-2 border-indigo-600 -ml-[2px] font-medium'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-l-2 border-transparent -ml-[2px]'
              }`}
            >
              <Icon name={link.icon} size={18} stroke={isActive ? 2 : 1.5} />
              <span>{link.label}</span>
            </Link>
          );
        })}

        {/* Module groups — only visible when inside a project */}
        {projectId && MODULE_GROUPS.map(group => {
          const isGroupCollapsed = collapsed[group.storageKey] === true;
          return (
            <div key={group.storageKey} className="pt-2">
              {/* Group header — clickable, text-only */}
              <button
                onClick={() => toggleGroup(group.storageKey)}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-600 transition-colors"
              >
                <Icon
                  name="chevron-down"
                  size={12}
                  stroke={2}
                  className={`transition-transform ${isGroupCollapsed ? '-rotate-90' : ''}`}
                />
                <span>{group.name}</span>
              </button>

              {/* Group items */}
              {!isGroupCollapsed && (
                <div className="mt-0.5 space-y-0.5">
                  {group.items.map(item => {
                    const fullHref = `/project/${projectId}${item.href}`;
                    const isActive = pathname === fullHref || (item.href !== '' && pathname.startsWith(fullHref + '/'));
                    return (
                      <Link
                        key={item.key}
                        href={fullHref}
                        scroll={false}
                        onClick={() => { saveScrollBeforeNav(); onNavigate?.(); }}
                        title={item.label}
                        className={`flex items-center px-4 py-1.5 rounded-r-lg text-sm transition-colors ml-3 ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-700 border-l-2 border-indigo-600 -ml-[1px] font-medium'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 border-l-2 border-transparent -ml-[1px]'
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer version */}
      <div className="p-3 border-t border-gray-100">
        <div className="text-xs text-gray-400 text-center">
          PM OS <span className="text-indigo-400">v0.2</span>
        </div>
      </div>
    </aside>
  );
}
