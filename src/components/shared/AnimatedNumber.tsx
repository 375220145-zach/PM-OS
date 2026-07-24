'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface Props {
  value: number;
  duration?: number;
  className?: string;
  formatter?: (val: number) => string;
}

export default function AnimatedNumber({ value, duration = 0.8, className = '', formatter }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevValue = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obj = { val: prevValue.current };
    const fmt = formatter || ((v: number) => Math.round(v).toString());

    gsap.to(obj, {
      val: value,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = fmt(obj.val);
      },
    });

    prevValue.current = value;

    return () => {
      gsap.killTweensOf(obj);
    };
  }, [value, duration, formatter]);

  return <span ref={ref} className={className}>{formatter ? formatter(0) : '0'}</span>;
}
