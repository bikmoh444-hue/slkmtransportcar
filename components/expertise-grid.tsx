'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import type { Locale } from '@/lib/model';

export function ExpertiseGrid({ children, locale }: { children: ReactNode; locale: Locale }) {
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = track.current;
    if (!node) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, last = 0, direction = 1, position = 0;
    const animate = (now: number) => {
      const elapsed = Math.min(now - (last || now), 50);
      last = now;
      if (!reduced.matches && !document.hidden && !node.matches(':hover, :focus-within') && node.getBoundingClientRect().bottom > 0 && node.getBoundingClientRect().top < innerHeight) {
        const max = node.scrollWidth - node.clientWidth;
        if (Math.abs(Math.abs(node.scrollLeft) - position) > 2) position = Math.abs(node.scrollLeft);
        position = Math.max(0, Math.min(max, position + direction * elapsed * .018));
        node.scrollLeft = locale === 'ar' ? -position : position;
        if (position >= max) direction = -1;
        if (position <= 0) direction = 1;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [locale]);
  return <div className="expertise-showcase"><div ref={track} className="services-grid services-autoplay" id="services-track" tabIndex={0} aria-label={locale === 'ar' ? 'خدمات SLKM' : 'Services SLKM'}>{children}</div></div>;
}
