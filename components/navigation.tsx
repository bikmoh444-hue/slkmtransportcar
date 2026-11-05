'use client';
import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import type { Locale, RecordData } from '@/lib/model';
import { label, field } from '@/lib/model';
export function Language({ locale }: {
    locale: Locale;
}) { return <a className="language" href={locale === 'fr' ? '/ar' : '/fr'} onClick={e => { e.preventDefault(); location.href = `/${locale === 'fr' ? 'ar' : 'fr'}${location.hash}`; }} lang={locale === 'fr' ? 'ar' : 'fr'}>{locale === 'fr' ? 'العربية' : 'FR'}</a>; }
export function Navigation({ items, locale }: {
    items: RecordData[];
    locale: Locale;
}) {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState('#accueil');
    const toggle = useRef<HTMLButtonElement>(null);
    const nav = useRef<HTMLElement>(null);
    useEffect(() => {
        const sync = () => setActive(location.hash || '#accueil');
        sync();
        window.addEventListener('hashchange', sync);
        return () => window.removeEventListener('hashchange', sync);
    }, []);
    useEffect(() => {
        if (!open) return;
        const close = (event: KeyboardEvent) => {
            if (event.key === 'Escape') { setOpen(false); toggle.current?.focus(); }
        };
        const outside = (event: PointerEvent) => {
            if (event.target instanceof Node && !nav.current?.contains(event.target) && !toggle.current?.contains(event.target)) setOpen(false);
        };
        const focus = (event: FocusEvent) => {
            if (event.target instanceof Node && !nav.current?.contains(event.target) && !toggle.current?.contains(event.target)) setOpen(false);
        };
        const desktop = matchMedia('(min-width: 1151px)');
        const resize = () => { if (desktop.matches) setOpen(false); };
        document.addEventListener('keydown', close);
        document.addEventListener('pointerdown', outside);
        document.addEventListener('focusin', focus);
        desktop.addEventListener('change', resize);
        return () => {
            document.removeEventListener('keydown', close);
            document.removeEventListener('pointerdown', outside);
            document.removeEventListener('focusin', focus);
            desktop.removeEventListener('change', resize);
        };
    }, [open]);
    return <>
    <button ref={toggle} className="menu-toggle icon-button" aria-expanded={open} aria-controls="main-nav" aria-label={locale === 'fr' ? 'Menu de navigation' : 'قائمة التنقل'} onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); requestAnimationFrame(() => nav.current?.querySelector('a')?.focus()); } }} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    <nav ref={nav} id="main-nav" aria-label={locale === 'fr' ? 'Menu de navigation' : 'قائمة التنقل'} className={open ? 'open' : ''}>{items.map((x, i) => <a key={x.key} style={{ '--nav-index': i } as React.CSSProperties} href={field(x, 'target')} aria-current={active === field(x, 'target') ? 'location' : undefined} onClick={() => { setActive(field(x, 'target')); setOpen(false); if (matchMedia('(max-width: 1150px)').matches) toggle.current?.focus(); }}>{label(x, locale)}</a>)}</nav>
    </>;
}
