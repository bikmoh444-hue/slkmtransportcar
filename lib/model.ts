export type Locale = 'fr' | 'ar';
export type RecordData = {
    id: string;
    origin_city_id?: string | null;
    destination_city_id?: string | null;
    city_id?: string | null;
    key: string;
    label_fr: string;
    label_ar: string;
    data: Record<string, unknown>;
    sort_order: number;
    is_active: boolean;
};
export type Content = Record<string, RecordData[]>;
export const tables = ['site_settings', 'navigation_items', 'hero_slides', 'page_sections', 'services', 'fleet_items', 'network_maps', 'cities', 'transport_lines', 'agencies', 'seo_settings'] as const;
export function label(row: RecordData, locale: Locale) { return locale === 'ar' ? row.label_ar : row.label_fr; }
export function field(row: RecordData | undefined, key: string, locale?: Locale): string { const v = row?.data[locale ? `${key}_${locale}` : key]; return typeof v === 'string' ? v : ''; }
