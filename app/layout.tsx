import './globals.css';
import './public-mobile.css';
import localFont from 'next/font/local';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
export const metadata: Metadata = { title: 'SLKM — Transport et Logistique', icons: {icon: '/icon.svg'}, robots: { index: false, follow: false } };
const latin = localFont({ src: [{ path: './fonts/PlusJakartaSans-Regular.woff2', weight: '400' }, { path: './fonts/PlusJakartaSans-SemiBold.woff2', weight: '600' }, { path: './fonts/PlusJakartaSans-Bold.woff2', weight: '700' }], variable: '--font-latin', display: 'swap' });
const arabic = localFont({ src: './fonts/Cairo-Variable.woff2', variable: '--font-arabic', display: 'swap', weight: '200 1000', preload: false });
export default async function RootLayout({ children }: {
    children: React.ReactNode;
}) {
    const h = await headers();
    const ar = h.get('x-locale') === 'ar';
    return <html lang={ar ? 'ar' : 'fr'} dir={ar ? 'rtl' : 'ltr'} className={`${latin.variable} ${arabic.variable}`}>
    <body>{children}</body>
    </html>;
}
