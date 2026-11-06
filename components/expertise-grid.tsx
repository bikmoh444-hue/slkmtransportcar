'use client';
import { Children, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Locale } from '@/lib/model';

export function ExpertiseGrid({ children, locale }: { children: ReactNode; locale: Locale }) {
  const cards = Children.toArray(children);
  const [expanded, setExpanded] = useState(false);
  return <div className="expertise-showcase">
    <div className="services-grid" id="services-track">{cards.slice(0, 4)}</div>
    {cards.length > 4 && <>
      <div id="expertise-extra" className={`expertise-extra ${expanded ? 'expanded' : ''}`} inert={!expanded} aria-hidden={!expanded}>
        <div><div className="services-grid">{cards.slice(4)}</div></div>
      </div>
      <button className="button expertise-toggle" aria-expanded={expanded} aria-controls="expertise-extra" onClick={() => setExpanded(!expanded)}>{locale === 'ar' ? (expanded ? 'عرض أقل' : 'عرض الكل') : (expanded ? 'Voir moins' : 'Voir tout')}<ChevronDown size={18}/></button>
    </>}
  </div>;
}
