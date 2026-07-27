'use client';

import { useEffect, useRef } from 'react';

interface Bucket {
  label: string;
  count: number;
}

interface Props {
  total: number;
  buckets: Bucket[];
}

/* ── Lieflat F9 Rung Waterfall — overdue aging ──
   Left bar = total overdue, fixed max height. Right bars break down by bucket.
*/
export default function RungWaterfall({ total, buckets }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || total === 0) return;

    svg.innerHTML = '';

    const NS = 'http://www.w3.org/2000/svg';
    const el = (tag: string, attrs: Record<string, string>) => {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      svg.appendChild(n);
      return n;
    };
    const txt = (x: number, y: number, text: string, attrs: Record<string, string> = {}) => {
      const n = el('text', { x: String(x), y: String(y), ...attrs });
      n.textContent = text;
      return n;
    };
    const tip = (node: SVGElement, text: string) => {
      const t = document.createElementNS(NS, 'title');
      t.textContent = text;
      node.appendChild(t);
    };
    const rnd = (i: number, k: number) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;

    const INK = '#1C1C1A';
    const MUTED = '#8F8E88';
    const GRID = '#DEDDD6';

    const columns = [{ label: '逾期总计', count: total, isTotal: true }, ...buckets.map(b => ({ ...b, isTotal: false }))];
    const n = columns.length;
    if (n < 2) return;

    const base = 220;
    const maxBarH = 160;
    const MAX_RUNGS = 28; // fixed visual density — not 1:1 with tasks
    const HW = 11;
    const w = 320;
    const x0 = (i: number) => 48 + i * ((w - 96) / (n - 1));

    // Total bar always MAX_RUNGS rungs. Buckets get proportional rung count.
    const rungCounts = columns.map(col =>
      col.isTotal ? MAX_RUNGS : col.count > 0 ? Math.max(1, Math.round((col.count / total) * MAX_RUNGS)) : 0
    );
    const barHeights = columns.map((col, i) =>
      col.isTotal ? maxBarH : col.count > 0 ? Math.max(3, Math.round((col.count / total) * maxBarH)) : 0
    );
    const steps = columns.map((col, i) =>
      rungCounts[i] > 0 ? barHeights[i] / rungCounts[i] : 0
    );

    // Bucket cumulative top position (they descend from the top)
    let cumTop = base - maxBarH;

    columns.forEach((col, i) => {
      const x = x0(i);
      const rungs = rungCounts[i];
      const barH = barHeights[i];
      const step = steps[i];

      if (col.isTotal) {
        // Total bar: always MAX_RUNGS rungs filling maxBarH
        for (let k = 0; k < rungs; k++) {
          const y = base - k * step;
          const rw = HW - 1.2 + rnd(k + 1, i + 2) * 2.4;
          const line = el('line', {
            x1: String(x - rw), y1: String(y),
            x2: String(x + rw), y2: String(y),
            stroke: INK, 'stroke-width': '1',
            opacity: String(0.55 + rnd(k + 2, i + 4) * 0.45),
          });
          line.style.animationDelay = `${i * 0.1 + k * 0.012}s`;
          line.classList.add('fade-in');
        }
      } else {
        // Bucket bar: proportional rungs from cumTop down
        const bucketBase = cumTop + barH;
        for (let k = 0; k < rungs; k++) {
          const y = bucketBase - k * step;
          const rw = HW - 1.2 + rnd(k + 1, i + 2) * 2.4;
          const line = el('line', {
            x1: String(x - rw), y1: String(y),
            x2: String(x + rw), y2: String(y),
            stroke: INK, 'stroke-width': '1',
            opacity: String(0.55 + rnd(k + 2, i + 4) * 0.45),
          });
          line.style.animationDelay = `${i * 0.1 + k * 0.012}s`;
          line.classList.add('fade-in');
        }

        // Hand-off dashed line
        const prevX = x0(i - 1);
        el('line', {
          x1: String(prevX + HW + 2), y1: String(cumTop),
          x2: String(x - HW - 2), y2: String(cumTop),
          stroke: GRID, 'stroke-width': '0.7',
          'stroke-dasharray': '2 3',
          opacity: '0.8',
        });
      }

      // Count label above bar (before cumTop advances)
      const labelY = col.isTotal ? base - maxBarH - 8 : cumTop - 8;

      if (!col.isTotal) {
        cumTop = cumTop + barH;
      }
      const num = txt(x, labelY, String(col.count), {
        'font-size': '10', 'font-weight': '800', fill: INK,
        'text-anchor': 'middle',
      });
      tip(num, `${col.label}: ${col.count} 个`);

      // Column label below baseline — larger
      txt(x, base + 16, col.label, {
        'font-size': '10', 'font-weight': '700', fill: MUTED,
        'text-anchor': 'middle', 'letter-spacing': '.06em',
      });
    });

    // Baseline
    el('line', {
      x1: '28', y1: String(base + 3),
      x2: String(w - 28), y2: String(base + 3),
      stroke: GRID, 'stroke-width': '0.8',
    });
  }, [total, buckets]);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400">
        没有逾期任务
      </div>
    );
  }

  const svgH = 245;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 320 ${svgH}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-auto"
    />
  );
}
