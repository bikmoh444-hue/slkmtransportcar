'use client';
import { useRef } from 'react';
import { Maximize2, X } from 'lucide-react';
import type { Locale } from '@/lib/model';
import { Media } from './media';
import Image from './resilient-image';
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
