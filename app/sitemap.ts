import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap { const url = process.env.NEXT_PUBLIC_SITE_URL; return url ? ['fr', 'ar'].map(locale => ({ url: `${url}/${locale}`, alternates: { languages: { fr: `${url}/fr`, ar: `${url}/ar` } } })) : []; }
