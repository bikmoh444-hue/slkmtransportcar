import { field, type RecordData } from '@/lib/model';
export function Organization({ settings }: {
    settings: RecordData | undefined;
}) {
    if(!settings)return null;
    const normalize = (value: string) => value.replace(/[^0-9+]/g, '').replace(/^0/, '+212');
    const data = {
        '@context': 'https://schema.org', '@type': 'Organization', name: settings.label_fr, alternateName: settings.label_ar,
        telephone: [field(settings, 'phone'), field(settings, 'mobile')].filter(Boolean).map(normalize),
        email: field(settings, 'email'),
        ...(process.env.NEXT_PUBLIC_SITE_URL ? { url: process.env.NEXT_PUBLIC_SITE_URL } : {}),
        sameAs: [field(settings, 'facebook'), field(settings, 'instagram')].filter(Boolean)
    };
    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}/>;
}
