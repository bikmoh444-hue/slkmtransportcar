import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { AnimatedBackgroundLines } from '@/components/animated-background-lines';
import { getContent } from '@/lib/content';
import { publicIdentity } from '@/lib/security/settings';
import { themeStyle } from '@/lib/theme';

export default async function PublicLayout({ children, params }: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'fr' && locale !== 'ar') notFound();
  const content = await getContent();
  return <div className="public-background-shell" style={themeStyle(publicIdentity(content)?.data)}>
    <AnimatedBackgroundLines/>
    <div className="public-background-content">{children}</div>
  </div>;
}
