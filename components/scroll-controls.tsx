'use client';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Locale } from '@/lib/model';
export function ScrollControls({ id, locale }: {
    id: string;
    locale: Locale;
}) {
    return <div className="scroll-controls">{[-1, 1].map(n => <button className="icon-button" key={n} aria-label={n === -1 ? (locale === 'fr' ? 'Précédent' : 'السابق') : (locale === 'fr' ? 'Suivant' : 'التالي')} onClick={() => { const el = document.getElementById(id); if (el)
            el.scrollBy({ left: n * (locale === 'ar' ? -1 : 1) * el.clientWidth * .85, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }}>{n === -1 ? <ArrowLeft size={18}/> : <ArrowRight size={18}/>}</button>)}</div>;
}
