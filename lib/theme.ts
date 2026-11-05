import type {CSSProperties} from 'react';

export const THEME_VERSION=2;
export const themeDefaults={blue:'#08648B',logo_blue:'#0865B8',deep_blue:'#101C33',orange:'#C46200',orange_hover:'#A95000',background:'#F6F8FA',surface:'#FFFFFF',border:'#E3E8EF',text:'#111827',muted:'#6B7789'} as const;
export type ThemeKey=keyof typeof themeDefaults;
export function themeData(data:Record<string,unknown>={}):Record<string,unknown>{
 // A stored legacy palette must not override this redesign. Subsequent administrator
 // edits take precedence once explicitly saved with the current theme version.
 const current=Number(data.theme_version)===THEME_VERSION;
 const colors=Object.fromEntries(Object.entries(themeDefaults).map(([key,fallback])=>[key,current&&typeof data[key]==='string'&&/^#[0-9a-f]{6}$/i.test(data[key] as string)?data[key]:fallback]));
 const content={...data};delete content.yellow;
 return {...content,...colors,theme_version:THEME_VERSION};
}
export function themeStyle(data:Record<string,unknown>={}):CSSProperties{
 const theme=themeData(data);
 return {'--blue':theme.blue,'--logo-blue':theme.logo_blue,'--deep-blue':theme.deep_blue,'--orange':theme.orange,'--orange-hover':theme.orange_hover,'--pale':theme.background,'--surface':theme.surface,'--border':theme.border,'--text':theme.text,'--muted':theme.muted} as CSSProperties;
}
