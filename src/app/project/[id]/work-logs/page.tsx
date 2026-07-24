'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import type { WorkLogEntry } from '@/types';
import { db } from '@/db/database';
import AppShell from '@/components/layout/AppShell';
import ProjectHeader from '@/components/layout/ProjectHeader';
import Button from '@/components/shared/Button';
import Modal from '@/components/shared/Modal';
import EmptyState from '@/components/shared/EmptyState';
import { generateId } from '@/lib/utils';

export default function WorkLogsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [logs, setLogs] = useState<WorkLogEntry[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newItems, setNewItems] = useState<string[]>(['']);
  const [editing, setEditing] = useState<WorkLogEntry | null>(null);
  const [editItems, setEditItems] = useState<string[]>(['']);
  const [editingItem, setEditingItem] = useState<{ logId: string; idx: number } | null>(null);
  const [showFormatHelp, setShowFormatHelp] = useState(false);
  const editContentRef = useRef<HTMLDivElement>(null);

  function sortLogs(list: WorkLogEntry[]): WorkLogEntry[] {
    return [...list].sort((a, b) => {
      const aDone = (a.items ?? []).length > 0 && (a.items ?? []).every(i => i.done);
      const bDone = (b.items ?? []).length > 0 && (b.items ?? []).every(i => i.done);
      if (aDone && !bDone) return 1;
      if (!aDone && bDone) return -1;
      return b.createdAt - a.createdAt;
    });
  }

  useEffect(() => {
    db.workLogs.where('projectId').equals(projectId).reverse().sortBy('createdAt').then(list => setLogs(sortLogs(list)));
  }, [projectId]);

  // --- New log ---
  function addNewLine() { setNewItems([...newItems, '']); }
  function removeNewLine(i: number) { setNewItems(newItems.filter((_, idx) => idx !== i)); }
  function updateNewLine(i: number, v: string) {
    const next = [...newItems]; next[i] = v; setNewItems(next);
  }

  async function saveNew() {
    const items = (newItems.filter(t => t.trim())).map(t => ({ text: t.trim(), done: false }));
    if (items.length === 0) return;
    const entry: WorkLogEntry = {
      id: generateId(),
      projectId,
      items,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.workLogs.put(entry);
    setLogs(sortLogs([entry, ...logs]));
    setShowNew(false);
    setNewItems(['']);
  }

  // --- Edit ---
  function openEdit(log: WorkLogEntry) {
    setEditing(log);
    setEditItems((log.items ?? []).map(i => i.text));
  }
  function addEditLine() { setEditItems([...editItems, '']); }
  function removeEditLine(i: number) { setEditItems(editItems.filter((_, idx) => idx !== i)); }
  function updateEditLine(i: number, v: string) { setEditItems(editItems.map((x, idx) => idx === i ? v : x)); }

  async function saveEdit() {
    if (!editing) return;
    const items = editItems.filter(t => t.trim()).map(t => {
      const existing = (editing.items ?? []).find(i => i.text === t);
      return { text: t.trim(), done: existing?.done ?? false };
    });
    if (items.length === 0) return;
    const updated: WorkLogEntry = { ...editing, items, updatedAt: Date.now() };
    setLogs(sortLogs(logs.map(l => l.id === updated.id ? updated : l)));
    setEditing(null);
  }

  // --- Toggle item ---
  async function toggleItem(logId: string, itemIdx: number) {
    const log = logs.find(l => l.id === logId);
    if (!log || !log.items) return;
    const items = log.items.map((item, i) =>
      i === itemIdx ? { ...item, done: !item.done } : item
    );
    const updated = { ...log, items, updatedAt: Date.now() };
    setLogs(sortLogs(logs.map(l => l.id === logId ? updated : l)));
  }

  // --- Rich text helpers (marked ↔ HTML) ---
  function markedToHtml(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/==(.+?)==/g, '<mark class="bg-amber-500/20 text-amber-200 px-0.5 rounded">$1</mark>')
      .replace(/~~(.+?)~~/g, '<s>$1</s>')
      .replace(/\n/g, '<br>');
  }
  function htmlToMarked(html: string): string {
    const d = document.createElement('div');
    d.innerHTML = html;
    function walk(n: Node): string {
      if (n.nodeType === Node.TEXT_NODE) return n.textContent ?? '';
      if (n.nodeType !== Node.ELEMENT_NODE) return '';
      const el = n as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const inner = Array.from(el.childNodes).map(walk).join('');
      if (['b', 'strong'].includes(tag)) return `**${inner}**`;
      if (tag === 'mark') return `==${inner}==`;
      if (tag === 'span' && el.style.backgroundColor) return `==${inner}==`;
      if (['s', 'strike', 'del'].includes(tag)) return `~~${inner}~~`;
      if (['br', 'p'].includes(tag)) return inner + '\n';
      if (tag === 'div') return inner + '\n';
      return inner;
    }
    return Array.from(d.childNodes).map(walk).join('').trim();
  }

  // --- Inline edit item (contentEditable WYSIWYG) ---
  function startEditItem(logId: string, idx: number, _currentText: string) {
    setEditingItem({ logId, idx });
  }
  // Initialize contentEditable innerHTML after mount
  useEffect(() => {
    if (!editingItem || !editContentRef.current) return;
    const log = logs.find(l => l.id === editingItem.logId);
    const text = log?.items[editingItem.idx]?.text ?? '';
    editContentRef.current.innerHTML = markedToHtml(text);
  }, [editingItem]);

  async function saveEditItem() {
    if (!editingItem || !editContentRef.current) return;
    const { logId, idx } = editingItem;
    const marked = htmlToMarked(editContentRef.current.innerHTML);
    const log = logs.find(l => l.id === logId);
    if (!log) return;
    const items = log.items.map((item, i) => i === idx ? { ...item, text: marked } : item);
    const updated: WorkLogEntry = { ...log, items, updatedAt: Date.now() };
    await db.workLogs.put(updated);
    setLogs(sortLogs(logs.map(l => l.id === logId ? updated : l)));
    setEditingItem(null);
  }
  function cancelEditItem() { setEditingItem(null); }

  // Word-like toolbar commands
  function execBold() { editContentRef.current?.focus(); document.execCommand('bold'); }
  function execStrike() { editContentRef.current?.focus(); document.execCommand('strikeThrough'); }
  function execHighlight() {
    const div = editContentRef.current; if (!div) return;
    div.focus();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);

    // Check if selection is INSIDE a highlight → toggle OFF
    let n: Node | null = range.commonAncestorContainer;
    let insideHighlight: Element | null = null;
    while (n && n !== div) {
      const el = n as Element;
      if (el.tagName === 'MARK' || (el as HTMLElement).style?.backgroundColor) {
        insideHighlight = el; break;
      }
      n = n.parentNode;
    }

    if (insideHighlight) {
      // Toggle OFF: extract selected text and insert after the highlight element
      const text = range.toString();
      range.deleteContents();
      // After deleteContents, range is collapsed. Find mark near collapsed position.
      let p: Node | null = range.startContainer;
      let hp: Element | null = null;
      while (p && p !== div) {
        if ((p as Element).tagName === 'MARK' || (p as HTMLElement).style?.backgroundColor) {
          hp = p as Element; break;
        }
        p = p.parentNode;
      }
      const tn = document.createTextNode(text);
      if (hp) {
        hp.parentNode?.insertBefore(tn, hp.nextSibling);
        if (!hp.textContent?.trim()) hp.remove();
      } else {
        range.insertNode(tn);
      }
      range.selectNode(tn);
      return;
    }

    // Toggle ON
    document.execCommand('hiliteColor', false, '#fbbf24');
  }
  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  }
  function handleEditBlur(e: React.FocusEvent<HTMLDivElement>) {
    const target = e.relatedTarget as HTMLElement;
    if (target?.closest('.edit-toolbar')) return;
    saveEditItem();
  }

  // --- Markup renderer ---
  interface TextSegment { text: string; type: 'bold' | 'highlight' | 'strikethrough' | 'normal'; }
  function parseMarkup(text: string): TextSegment[] {
    const segments: TextSegment[] = [];
    const regex = /(\*\*(.+?)\*\*|==(.+?)==|~~(.+?)~~)/g;
    let last = 0, match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > last) segments.push({ text: text.slice(last, match.index), type: 'normal' });
      if (match[2]) segments.push({ text: match[2], type: 'bold' });
      else if (match[3]) segments.push({ text: match[3], type: 'highlight' });
      else if (match[4]) segments.push({ text: match[4], type: 'strikethrough' });
      last = match.index + match[0].length;
    }
    if (last < text.length) segments.push({ text: text.slice(last), type: 'normal' });
    return segments;
  }
  function RenderItemText({ text }: { text: string }) {
    const segments = parseMarkup(text);
    return <>{segments.map((s, i) => {
      const inner = s.type === 'normal' ? s.text : <RenderItemText text={s.text} />;
      if (s.type === 'bold') return <strong key={i} className="font-semibold text-[18px]">{inner}</strong>;
      if (s.type === 'highlight') return <mark key={i} className="bg-amber-500/20 text-amber-200 px-0.5 rounded">{inner}</mark>;
      if (s.type === 'strikethrough') return <span key={i} className="line-through text-gray-500">{inner}</span>;
      return <span key={i}>{s.text}</span>;
    })}</>;
  }

  // --- Delete log ---
  async function remove(logId: string) {
    await db.workLogs.delete(logId);
    setLogs(logs.filter(l => l.id !== logId));
  }

  // --- Stats (defensive) ---
  const totalItems = logs.reduce((s, l) => s + (l.items ?? []).length, 0);
  const doneItems = logs.reduce((s, l) => s + (l.items ?? []).filter(i => i.done).length, 0);

  function formatTime(ts: number) {
    return new Date(ts).toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <AppShell>
      <ProjectHeader projectId={projectId} />
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">工作记录</h2>
            <p className="text-sm text-gray-400 mt-1">
              {logs.length} 条记录 · {doneItems}/{totalItems} 已完成
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFormatHelp(!showFormatHelp)}
              className="text-[11px] text-gray-400 hover:text-gray-700 border border-gray-200 rounded px-2 py-1 relative">
              Aa 格式
            </button>
            <Button onClick={() => setShowNew(true)}>+ 新建记录</Button>
          </div>
        </div>

        {showFormatHelp && (
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-xs text-gray-400 flex items-center gap-4">
            <span>鼠标选中文字 → 点 <strong className="text-gray-700">B</strong> <mark className="bg-amber-500/20 text-amber-200 px-0.5 rounded">Hl</mark> <span className="line-through">S</span> 渲染，点第二次取消</span>
            <span className="text-gray-600">| 粘帖自动去格式 · Esc 取消 · 点击其他地方保存</span>
          </div>
        )}

        {logs.length === 0 ? (
          <EmptyState
            icon="notebook"
            title="暂无工作记录"
            description="以 todo list 的形式记录项目中的待办事项、遇到的问题、下一步计划等"
            action={{ label: '新建第一条记录', onClick: () => setShowNew(true) }}
          />
        ) : (
          <div className="space-y-4">
            {logs.map(log => {
              const safeItems = log.items ?? [];
              const logDone = safeItems.filter(i => i.done).length;
              return (
                <div key={log.id} className="bg-white border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{formatTime(log.createdAt)}</span>
                      <span className="text-xs text-gray-600">
                        {logDone}/{safeItems.length}
                      </span>
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${safeItems.length > 0 ? (logDone / safeItems.length) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(log)} className="text-xs text-gray-400 hover:text-gray-700">编辑</button>
                      <button onClick={() => remove(log.id)} className="text-xs text-red-700 hover:text-red-600">删除</button>
                    </div>
                  </div>
                  <div className="px-5 py-3 space-y-1">
                    {safeItems.map((item, idx) => {
                      const isInlineEdit = editingItem?.logId === log.id && editingItem?.idx === idx;
                      return (
                        <div key={idx} className="flex items-start gap-3 py-1 group/item">
                          <input
                            type="checkbox"
                            checked={item.done}
                            onChange={() => toggleItem(log.id, idx)}
                            className="mt-1 w-4 h-4 rounded border-gray-300 bg-gray-100 text-green-500 focus:ring-green-500 focus:ring-offset-0 cursor-pointer shrink-0"
                          />
                          {isInlineEdit ? (
                            <div className="flex-1 space-y-1">
                              <div className="edit-toolbar flex items-center gap-1">
                                <button onMouseDown={e => e.preventDefault()} onClick={execBold}
                                  className="text-xs font-bold text-gray-400 hover:text-white bg-gray-100 rounded px-1.5 py-0.5 border border-gray-200">B</button>
                                <button onMouseDown={e => e.preventDefault()} onClick={execHighlight}
                                  className="text-xs text-gray-400 hover:text-white bg-gray-100 rounded px-1.5 py-0.5 border border-gray-200">Hl</button>
                                <button onMouseDown={e => e.preventDefault()} onClick={execStrike}
                                  className="text-xs text-gray-400 hover:text-white bg-gray-100 rounded px-1.5 py-0.5 border border-gray-200 line-through">S</button>
                              </div>
                              <div ref={editContentRef}
                                contentEditable suppressContentEditableWarning
                                onBlur={handleEditBlur}
                                onPaste={handlePaste}
                                onKeyDown={e => { if (e.key === 'Escape') cancelEditItem(); }}
                                className="w-full bg-gray-100 border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 min-h-[2.5rem] outline-none"
                                role="textbox" />
                            </div>
                          ) : (
                            <>
                              <span
                                className={`text-sm flex-1 ${
                                  item.done
                                    ? 'text-gray-400 line-through'
                                    : 'text-gray-700'
                                }`}
                              >
                                <RenderItemText text={item.text} />
                              </span>
                              <button
                                onClick={() => startEditItem(log.id, idx, item.text)}
                                className="text-[11px] text-gray-600 hover:text-gray-700 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0 px-1"
                                title="修改本条"
                              > <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="inline-block"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Log Modal */}
      <Modal open={showNew} onClose={() => { setShowNew(false); setNewItems(['']); }}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">新建工作记录</h3>
          <div className="space-y-2 mb-4">
            {newItems.map((item, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-gray-400 mt-2.5 text-sm">•</span>
                <input
                  value={item}
                  onChange={e => updateNewLine(i, e.target.value)}
                  placeholder="输入待办事项..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                />
                {newItems.length > 1 && (
                  <button onClick={() => removeNewLine(i)} className="text-gray-600 hover:text-red-600 text-sm px-1"> <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="inline-block"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                )}
              </div>
            ))}
          </div>
          <button onClick={addNewLine} className="text-sm text-blue-600 hover:text-blue-500 mb-4 inline-block">+ 添加一行</button>
          <div className="flex justify-end gap-3 mt-4 border-t border-gray-200 pt-4">
            <Button variant="secondary" onClick={() => { setShowNew(false); setNewItems(['']); }}>取消</Button>
            <Button onClick={saveNew} disabled={!newItems.some(t => t.trim())}>保存</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">编辑工作记录</h3>
          <div className="space-y-2 mb-4">
            {editItems.map((item, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-gray-400 mt-2.5 text-sm">•</span>
                <input
                  value={item}
                  onChange={e => updateEditLine(i, e.target.value)}
                  placeholder="输入待办事项..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                />
                {editItems.length > 1 && (
                  <button onClick={() => removeEditLine(i)} className="text-gray-600 hover:text-red-600 text-sm px-1"> <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="inline-block"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                )}
              </div>
            ))}
          </div>
          <button onClick={addEditLine} className="text-sm text-blue-600 hover:text-blue-500 mb-4 inline-block">+ 添加一行</button>
          <div className="flex justify-end gap-3 mt-4 border-t border-gray-200 pt-4">
            <Button variant="secondary" onClick={() => setEditing(null)}>取消</Button>
            <Button onClick={saveEdit} disabled={!editItems.some(t => t.trim())}>保存</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
