'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Project, Member } from '@/types';
import { db } from '@/db/database';
import AppShell from '@/components/layout/AppShell';
import ProjectHeader from '@/components/layout/ProjectHeader';
import Button from '@/components/shared/Button';
import EmptyState from '@/components/shared/EmptyState';

export default function MembersPage() {
  const params = useParams();
  const id = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    db.projects.get(id).then(p => {
      setProject(p ?? null);
      setMembers(p?.members ?? []);
    });
  }, [id]);

  async function addMember() {
    setMembers([...members, { name: '', role: '', estimatedHours: 0, actualHours: 0 }]);
    setSaved(false);
  }

  function updateMember(index: number, field: keyof Member, value: string | number | undefined) {
    const next = [...members];
    next[index] = { ...next[index], [field]: field === 'estimatedHours' || field === 'actualHours' ? (Number(value) || 0) : value };
    setMembers(next);
    setSaved(false);
  }

  function removeMember(index: number) {
    setMembers(members.filter((_, i) => i !== index));
    setSaved(false);
  }

  async function save() {
    if (!project) return;
    await db.projects.update(id, { members, updatedAt: Date.now() });
    setProject({ ...project, members, updatedAt: Date.now() });
    setSaved(true);
  }

  const totalEstHours = members.reduce((s, m) => s + (m.estimatedHours ?? 0), 0);
  const totalActHours = members.reduce((s, m) => s + (m.actualHours ?? 0), 0);

  return (
    <AppShell>
      <ProjectHeader projectId={id} />
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">项目成员</h2>
            <div className="flex gap-4 mt-1 text-sm text-gray-500">
              <span>{members.length} 名成员</span>
              <span>预估总工时: {totalEstHours}h</span>
              <span>实际总工时: {totalActHours}h</span>
            </div>
          </div>
          <div className="flex gap-3">
            {!saved && (
              <>
                <Button variant="secondary" onClick={() => {
                  db.projects.get(id).then(p => setMembers(p?.members ?? []));
                  setSaved(true);
                }}>取消</Button>
                <Button onClick={save}>保存</Button>
              </>
            )}
            <Button variant={saved ? 'primary' : 'secondary'} onClick={addMember}>+ 添加成员</Button>
          </div>
        </div>

        {members.length === 0 ? (
          <EmptyState icon="users" title="暂无成员" description="添加项目团队成员，统计预估和实际工时" />
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 text-left">
                  <th className="px-4 py-3">姓名</th>
                  <th className="px-4 py-3">角色</th>
                  <th className="px-4 py-3">邮箱</th>
                  <th className="px-4 py-3">电话</th>
                  <th className="px-4 py-3 text-right">项目预计耗时(h)</th>
                  <th className="px-4 py-3 text-right">项目实际耗时(h)</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="px-4 py-2">
                      <input value={m.name} onChange={e => updateMember(i, 'name', e.target.value)}
                        placeholder="姓名" className="bg-gray-100 border border-gray-200 rounded px-2 py-1 text-gray-700 text-xs w-20" />
                    </td>
                    <td className="px-4 py-2">
                      <input value={m.role} onChange={e => updateMember(i, 'role', e.target.value)}
                        placeholder="如：结构工程师" className="bg-gray-100 border border-gray-200 rounded px-2 py-1 text-gray-700 text-xs w-28" />
                    </td>
                    <td className="px-4 py-2">
                      <input value={m.email ?? ''} onChange={e => updateMember(i, 'email', e.target.value)}
                        placeholder="email" className="bg-gray-100 border border-gray-200 rounded px-2 py-1 text-gray-700 text-xs w-32" />
                    </td>
                    <td className="px-4 py-2">
                      <input value={m.phone ?? ''} onChange={e => updateMember(i, 'phone', e.target.value)}
                        placeholder="电话" className="bg-gray-100 border border-gray-200 rounded px-2 py-1 text-gray-700 text-xs w-24" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input type="number" value={m.estimatedHours ?? 0} onChange={e => updateMember(i, 'estimatedHours', Number(e.target.value))}
                        className="bg-gray-100 border border-gray-200 rounded px-2 py-1 text-gray-700 text-xs w-24 text-right" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input type="number" value={m.actualHours ?? 0} onChange={e => updateMember(i, 'actualHours', Number(e.target.value))}
                        className="bg-gray-100 border border-gray-200 rounded px-2 py-1 text-gray-700 text-xs w-24 text-right" />
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={() => removeMember(i)} className="text-red-600 hover:text-red-300 text-xs">删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
