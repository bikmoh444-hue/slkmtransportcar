'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Menu, X, Pause, Play, Maximize2 } from 'lucide-react';
import type { Locale, RecordData } from '@/lib/model';
import { label, field } from '@/lib/model';
import { Media } from './media';
import Image from 'next/image';
export function Language({ locale }: {
    locale: Locale;
}) { return <a className="language" href={locale === 'fr' ? '/ar' : '/fr'} onClick={e => { e.preventDefault(); location.href = `/${locale === 'fr' ? 'ar' : 'fr'}${location.hash}`; }} lang={locale === 'fr' ? 'ar' : 'fr'}>{locale === 'fr' ? 'العربية' : 'FR'}</a>; }
export function Navigation({ items, locale }: {
    items: RecordData[];
    locale: Locale;
}) {
    const [open, setOpen] = useState(false);
    return <>
    <button className="menu-toggle icon-button" aria-expanded={open} aria-controls="main-nav" aria-label={locale === 'fr' ? 'Menu de navigation' : 'قائمة التنقل'} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    <nav id="main-nav" className={open ? 'open' : ''}>{items.map(x => <a key={x.key} href={field(x, 'target')} onClick={() => setOpen(false)}>{label(x, locale)}</a>)}</nav>
    </>;
}
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
    <div className="container hero-content">
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
export function MapView({ src, title, locale }: {
    src: string;
    title: string;
    locale: Locale;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    return <>
    <button className="map-preview" disabled={!src} onClick={() => ref.current?.showModal()} aria-label={`${locale === 'fr' ? 'Agrandir' : 'تكبير'} — ${title}`}>
    {src?<Image className="network-map-image" src={src} alt={title} width={1600} height={1200} sizes="(max-width: 768px) 100vw, 550px"/>:<Media alt={title} contain/>}{src && <span>
        <Maximize2 size={17}/>{locale === 'fr' ? 'Agrandir la carte' : 'تكبير الخريطة'}</span>}{!src && <span>{locale === 'fr' ? 'Carte à intégrer' : 'الخريطة في انتظار الإدراج'}</span>}</button>
    <dialog ref={ref} className="map-dialog" onClick={e => { if (e.target === e.currentTarget)
        ref.current?.close(); }}>
    <div>
    <button className="icon-button" onClick={() => ref.current?.close()} aria-label={locale === 'fr' ? 'Fermer' : 'إغلاق'}>
    <X />
    </button>
    <h3>{title}</h3>{src && <Media src={src} alt={title} contain/>}</div>
    </dialog>
    </>;
}
export function ScrollControls({ id, locale }: {
    id: string;
    locale: Locale;
}) {
    return <div className="scroll-controls">{[-1, 1].map(n => <button className="icon-button" key={n} aria-label={n === -1 ? (locale === 'fr' ? 'Précédent' : 'السابق') : (locale === 'fr' ? 'Suivant' : 'التالي')} onClick={() => { const el = document.getElementById(id); if (el)
            el.scrollBy({ left: n * (locale === 'ar' ? -1 : 1) * el.clientWidth * .85, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }}>{n === -1 ? <ArrowLeft size={18}/> : <ArrowRight size={18}/>}</button>)}</div>;
}
export { ComplaintForm } from './complaint-form';
