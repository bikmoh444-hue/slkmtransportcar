'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function VisitTracker() {
    const path = usePathname();
    useEffect(() => {
        if (navigator.doNotTrack === '1')
            return;
        let visitor = '';
        let session = '';
        try {
            const now = Date.now();
            visitor = localStorage.getItem('slkm-visitor') || '';
            const expires = Number(localStorage.getItem('slkm-visitor-expiry'));
            if (!visitor || expires < now) {
                visitor = crypto.randomUUID();
                localStorage.setItem('slkm-visitor', visitor);
                localStorage.setItem('slkm-visitor-expiry', String(now + 30 * 86400000));
            }
            session = sessionStorage.getItem('slkm-session') || '';
            if (!session) {
                session = crypto.randomUUID();
                sessionStorage.setItem('slkm-session', session);
            }
        }
        catch {
            return;
        }
        const payload = JSON.stringify({ visitor, session, path });
        let idle: number | undefined;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const send = () => {
            try {
                if (navigator.sendBeacon?.('/api/visits', new Blob([payload], { type: 'application/json' })))
                    return;
            }
            catch { /* Fall back to fetch below. */ }
            void fetch('/api/visits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
                keepalive: true
            }).catch(() => { });
        };
        const schedule = () => {
            if ('requestIdleCallback' in window)
                idle = window.requestIdleCallback(send, { timeout: 4000 });
            else
                timer = setTimeout(send, 2000);
        };
        let loaded: (() => void) | undefined;
        if (document.readyState === 'complete')
            schedule();
        else {
            loaded = schedule;
            window.addEventListener('load', loaded, { once: true });
        }
        return () => {
            if (loaded)
                window.removeEventListener('load', loaded);
            if (idle !== undefined)
                window.cancelIdleCallback?.(idle);
            if (timer)
                clearTimeout(timer);
        };
    }, [path]);
    return null;
}
