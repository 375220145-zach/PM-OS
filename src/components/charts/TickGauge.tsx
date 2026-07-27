'use client';

import { useEffect, useRef } from 'react';

interface Detail {
  label: string;
  onTime: number;
  total: number;
}

interface Props {
  rate: number;
  details?: Detail[];
}

/* ── Lieflat F11 Tick Gauge — scaled up for dashboard ── */
export default function TickGauge({ rate, details }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

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
    const rnd = (i: number, k: number) => Math.abs(((i * 73856093) ^ (k * 19349663)) % 1000) / 1000;
    const D2R = Math.PI / 180;
    const pol = (cx: number, cy: number, r: number, deg: number) =>
      [cx + r * Math.cos(deg * D2R), cy + r * Math.sin(deg * D2R)] as const;

    const INK = '#1C1C1A';
    const MUTED = '#8F8E88';
    const nTicks = 100;
    const cx = 200, cy = 190, R0 = 108;
    const A0 = -195, SW = 210;

    // Tick marks
    for (let k = 0; k < nTicks; k++) {
      const a = A0 + (k / nTicks) * SW;
      const inked = k < Math.round(rate);
      const len = inked ? 15 + rnd(k + 1, 3) * 7 : 6 + rnd(k + 1, 7) * 3;
      const [x1, y1] = pol(cx, cy, R0, a);
      const [x2, y2] = pol(cx, cy, R0 + len, a);
      const line = el('line', {
        x1: String(x1), y1: String(y1),
        x2: String(x2), y2: String(y2),
        stroke: inked ? INK : '#CFCEC7',
        'stroke-width': inked ? '1' : '0.6',
      });
      line.style.animationDelay = `${k * 0.01}s`;
      line.classList.add('fade-in');
    }

    // Milestone dots at 25/50/75/100
    [25, 50, 75, 100].forEach(m => {
      const a = A0 + (m / 100) * SW;
      const [dx, dy] = pol(cx, cy, R0 - 8, a);
      const [tx2, ty2] = pol(cx, cy, R0 - 24, a);
      el('circle', { cx: String(dx), cy: String(dy), r: '1.2', fill: '#B0AFA9' });
      txt(tx2, ty2 + 4, String(m), {
        'font-size': '8.5', 'font-weight': '600', fill: '#C6C5BF',
        'text-anchor': 'middle',
      });
    });

    // Inked tip bead
    const aT = A0 + (Math.round(rate) / 100) * SW;
    const [ex, ey] = pol(cx, cy, R0 + 24, aT);
    el('circle', { cx: String(ex), cy: String(ey), r: '2.8', fill: INK });

    // Center percentage — larger
    txt(cx, cy - 4, `${rate}%`, {
      'font-size': '42', 'font-weight': '800', fill: INK,
      'text-anchor': 'middle',
    });

    // Subtitle
    const remaining = 100 - Math.round(rate);
    txt(cx, cy + 20, remaining > 0 ? `${remaining} TICKS TO 100%` : 'ALL TICKS INKED', {
      'font-size': '9', 'font-weight': '600', fill: MUTED,
      'text-anchor': 'middle', 'letter-spacing': '.1em',
    });

    // Detail lines below
    if (details && details.length > 0) {
      const detailY = cy + 60;
      const totalW = details.length * 170;
      const startX = cx - totalW / 2 + 85;

      details.forEach((d, i) => {
        const dx = startX + i * 170;
        const dRate = d.total > 0 ? Math.round((d.onTime / d.total) * 100) : 0;
        const barW = 72, barH = 5;
        const barX = dx - 36;
        el('rect', {
          x: String(barX), y: String(detailY), width: String(barW), height: String(barH),
          rx: '2.5', fill: '#E8E7E2',
        });
        if (dRate > 0) {
          el('rect', {
            x: String(barX), y: String(detailY), width: String(barW * dRate / 100), height: String(barH),
            rx: '2.5', fill: INK,
          });
        }
        txt(dx, detailY - 8, `${d.label}：${d.onTime}/${d.total} 准时`, {
          'font-size': '12', 'font-weight': '600', fill: MUTED,
          'text-anchor': 'middle', 'letter-spacing': '.04em',
        });
      });
    }
  }, [rate, details]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 400 330"
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-auto"
    />
  );
}
