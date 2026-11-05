import { field, label, type Content, type Locale } from '@/lib/model';
export function NetworkRecords({ content, locale, type }: {
    content: Content;
    locale: Locale;
    type: 'voyageurs' | 'messagerie';
}) {
    const ar = locale === 'ar';
    const rows = [...(content.cities || []), ...(content.transport_lines || []), ...(content.agencies || [])].filter(x => x.data.verified === true && (x.data.type || 'voyageurs') === type);
    if (!rows.length)
        return null;
    return <div className="verified-records snap-track">{rows.map(row => <article key={`${row.id}-${row.key}`}>
        <h3>{label(row, locale)}</h3>{Array.isArray(row.data.agency_ids)&&<p>{content.agencies.filter(agency=>agency.data.verified===true&&(row.data.agency_ids as string[]).includes(agency.id)).map(agency=>label(agency,locale)).join(', ')}</p>}{(row.origin_city_id||row.destination_city_id)&&<p>{[row.origin_city_id,row.destination_city_id].map(id=>content.cities.find(city=>city.id===id)).filter(Boolean).map(city=>label(city!,locale)).join(' → ')}</p>}{row.city_id&&<p>{content.cities.filter(city=>city.id===row.city_id).map(city=>label(city,locale)).join(', ')}</p>}{['body', 'city', 'address', 'hours', 'activity'].map(k => field(row, k, locale) && <p key={k}>{field(row, k, locale)}</p>)}{field(row, 'phone') && <a href={`tel:${field(row, 'phone').replace(/[^0-9+]/g, '')}`}>
            <bdi>{field(row, 'phone')}</bdi>
            </a>}{field(row, 'whatsapp') && <a href={`https://wa.me/${field(row, 'whatsapp').replace(/\D/g, '')}`}>{ar ? 'واتساب' : 'WhatsApp'}</a>}</article>)}</div>;
}
