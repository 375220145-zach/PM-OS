'use client';

import { useState, useRef } from 'react';
import { importExcelToGraph } from '@/lib/graph/excel-importer';

interface Props {
  onComplete: () => void;
}

export default function KBImportPanel({ onComplete }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ nodes: number; edges: number; images: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      setResult({ nodes: 0, edges: 0, images: 0, errors: ['请选择 .xlsx 文件'] });
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const r = await importExcelToGraph(file);
      setResult({
        nodes: r.nodes.length,
        edges: r.edges.length,
        images: r.images.length,
        errors: r.errors,
      });
      if (r.errors.length === 0) {
        setTimeout(() => onComplete(), 1000);
      }
    } catch (e) {
      setResult({ nodes: 0, edges: 0, images: 0, errors: [(e as Error).message] });
    } finally {
      setImporting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-indigo-300 bg-indigo-50'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          className="hidden"
        />

        {importing ? (
          <div className="text-sm text-gray-500">正在导入知识库...</div>
        ) : (
          <div>
            <svg className="w-6 h-6 mx-auto mb-1.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 11l5 5 5-5M12 4v12"/>
            </svg>
            <div className="text-sm text-gray-600">
              拖拽 Excel 文件到此处，或点击选择
            </div>
            <div className="text-xs text-gray-400 mt-1">
              支持 .xlsx 格式，导入知识库 sheet
            </div>
          </div>
        )}
      </div>

      {result && (
        <div className={`mt-2 p-2 rounded text-xs ${result.errors.length > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {result.errors.length > 0 ? (
            result.errors.map((e, i) => <div key={i}>{e}</div>)
          ) : (
            <div>
              导入成功：{result.nodes} 个节点、{result.edges} 条边
              {result.images > 0 && `、${result.images} 张图片`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
