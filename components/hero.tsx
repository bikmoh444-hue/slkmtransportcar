'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react';
import type { Locale, RecordData } from '@/lib/model';
import { label, field } from '@/lib/model';
import { Media } from './media';
export function Hero({ slides, locale }: {
    slides: RecordData[];
    locale: Locale;
}) {
    const [index, setIndex] = useState(0), [paused, setPaused] = useState(false);
    const start = useRef<number | null>(null);
    const current = slides[index] || slides[0];
    useEffect(() => { if (paused || matchMedia('(prefers-reduced-motion: reduce)').matches || slides.length < 2)
        return; const id = setInterval(() => { if (!document.hidden)
        setIndex(i => (i + 1) % slides.length); }, 6000); return () => clearInterval(id); }, [paused, slides.length]);
    if (!current)
        return null;
    const go = (n: number) => setIndex(i => (i + n + slides.length) % slides.length);
    return <section id="accueil" className="hero" aria-roledescription={locale === 'fr' ? 'carrousel' : 'عرض شرائح'} aria-label={locale === 'fr' ? 'Services SLKM' : 'خدمات SLKM'} onTouchStart={e => { start.current = e.touches[0].clientX; }} onTouchEnd={e => { if (start.current !== null) {
        const delta = e.changedTouches[0].clientX - start.current;
        if (Math.abs(delta) > 45)
            go((delta < 0 ? 1 : -1) * (locale === 'ar' ? -1 : 1));
        start.current = null;
    } }}>
    <div className="hero-visual" key={current.key}>
    <Media src={field(current, 'image')} mobileSrc={field(current, 'mobile_image')} alt={field(current, 'alt', locale) || label(current, locale)} hero focal={field(current, 'focal')} mobileFocal={field(current, 'mobile_focal')}/>
    </div>
    <div className="hero-shade"/>
    <div className="container hero-content" key={`content-${current.key}`}>
    <p className="eyebrow light">
    <span />{field(current, 'label', locale)}</p>
    <h1>{label(current, locale)}</h1>
    <p className="hero-description">{field(current, 'body', locale)}</p>
    <div className="actions">
    <a className="button primary" href={field(current, 'href') || '#contact'}>{field(current, 'cta', locale)}<ArrowRight size={18}/>
    </a>{field(current, 'secondary_cta', locale) && field(current, 'secondary_href') && <a className="hero-secondary" href={field(current, 'secondary_href')}>{field(current, 'secondary_cta', locale)}<ArrowRight size={17}/>
        </a>}</div>
    </div>
    <div className="container hero-bottom">
    <span className="hero-caption">SLKM <span>—</span> {locale === 'fr' ? 'Transport & Logistique' : 'النقل والخدمات اللوجستية'}</span>
    <div className="carousel-controls">
    <button className="icon-button" onClick={() => go(-1)} aria-label={locale === 'fr' ? 'Slide précédente' : 'الشريحة السابقة'}>
    <ArrowLeft size={18}/>
    </button>{slides.map((s, i) => <button key={s.key} className={`dot ${i === index ? 'active' : ''}`} aria-label={`${locale === 'fr' ? 'Afficher la slide' : 'عرض الشريحة'} ${i + 1}`} aria-current={i === index} onClick={() => setIndex(i)}/>)}<button className="icon-button" onClick={() => go(1)} aria-label={locale === 'fr' ? 'Slide suivante' : 'الشريحة التالية'}>
    <ArrowRight size={18}/>
    </button>
    <button className="icon-button" onClick={() => setPaused(!paused)} aria-label={paused ? (locale === 'fr' ? 'Reprendre' : 'استئناف') : (locale === 'fr' ? 'Suspendre' : 'إيقاف مؤقت')}>{paused ? <Play size={16}/> : <Pause size={16}/>}</button>
    </div>
    </div>
    </section>;
}
